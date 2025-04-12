from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
import httpx
import json
import logging
import asyncio
import uuid
from django.http import StreamingHttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from .models import Agent, Conversation, Message
from .serializers import AgentSerializer, ConversationSerializer, MessageSerializer

# Configure logging
logger = logging.getLogger(__name__)

class AgentViewSet(viewsets.ModelViewSet):
    queryset = Agent.objects.all().order_by('-created_at')
    serializer_class = AgentSerializer
    permission_classes = [AllowAny]  # For simplicity in this example. Use IsAuthenticated in production. 

class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all().order_by('-created_at')
    serializer_class = ConversationSerializer
    permission_classes = [AllowAny]

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})

@api_view(['GET'])
@permission_classes([AllowAny])
def get_conversation(request, conversation_id):
    try:
        logger.info(f"Fetching conversation with ID: {conversation_id}")
        conversation = Conversation.objects.get(id=conversation_id)
        serializer = ConversationSerializer(conversation)
        logger.info(f"Successfully fetched conversation: {conversation_id}")
        return Response(serializer.data)
    except Conversation.DoesNotExist:
        logger.error(f"Conversation not found with ID: {conversation_id}")
        return Response({"error": "Conversation not found"}, status=404)
    except Exception as e:
        logger.error(f"Error fetching conversation {conversation_id}: {str(e)}")
        return Response({"error": str(e)}, status=500)

class ChatCompletionView(APIView):
    permission_classes = [AllowAny]  # Adjust as needed for your security requirements
    
    def post(self, request):
        # Log the request data
        logger.info(f"Received chat completion request")
        
        # Get conversation ID if it exists, otherwise create a new conversation
        conversation_id = request.data.get('conversation_id')
        
        try:
            if conversation_id:
                conversation = get_object_or_404(Conversation, id=conversation_id)
                logger.info(f"Using existing conversation with ID: {conversation_id}")
            else:
                conversation = Conversation.objects.create()
                logger.info(f"Created new conversation with ID: {conversation.id}")
        except Exception as e:
            logger.error(f"Error processing conversation ID: {str(e)}")
            return JsonResponse({"error": str(e)}, status=400)

        # Store user message in the conversation
        user_messages = []
        if 'messages' in request.data:
            for message_data in request.data['messages']:
                # Only create a new message if it's not already in the conversation
                # This prevents duplicates when reconnecting to existing conversations
                if message_data.get('role') == 'user':
                    Message.objects.create(
                        conversation=conversation,
                        role=message_data.get('role', 'user'),
                        content=message_data.get('content', '')
                    )
                    user_messages.append(message_data.get('content', ''))
        
        # Check if streaming is requested (default to true for better UX)
        should_stream = request.data.get('stream', True)
        
        # Check if an agent is specified for the conversation
        if conversation.agent:
            agent_id = conversation.agent.id
            try:
                agent = Agent.objects.get(id=agent_id)
                # Use the agent's chat endpoint from the serializer
                chat_endpoint = 'http://host.docker.internal:8000/v1/chat/completions'
                logger.info(f"Using agent {agent.name} with endpoint {chat_endpoint}")
                
                if should_stream:
                    return self.agent_stream_response(conversation, request.data, chat_endpoint)
                else:
                    return self.agent_regular_response(conversation, request.data, chat_endpoint)
            except Agent.DoesNotExist:
                logger.error(f"Agent with ID {agent_id} not found")
                # Fall back to default responses if the agent is not found
                if should_stream:
                    return self.stream_response(conversation, user_messages)
                else:
                    return self.regular_response(conversation, user_messages)
        else:
            # Use default responses if no agent is specified
            if should_stream:
                return self.stream_response(conversation, user_messages)
            else:
                return self.regular_response(conversation, user_messages)
    
    async def agent_regular_response(self, conversation, request_data, chat_endpoint):
        """Forward the request to the agent and return the response"""
        logger.info(f"Making regular request to agent endpoint: {chat_endpoint}")
        
        try:
            async with httpx.AsyncClient() as client:
                # Forward the request to the agent
                response = await client.post(
                    chat_endpoint, 
                    json=request_data, 
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code != 200:
                    logger.error(f"Agent returned error: {response.status_code} - {response.text}")
                    return self.regular_response(conversation, request_data.get('messages', []))
                
                # Process the response
                agent_response = response.json()
                
                # Store the assistant's response in the conversation
                if 'choices' in agent_response and len(agent_response['choices']) > 0:
                    assistant_message = agent_response['choices'][0].get('message', {})
                    if assistant_message.get('content'):
                        Message.objects.create(
                            conversation=conversation,
                            role='assistant',
                            content=assistant_message.get('content', '')
                        )
                
                # Include the conversation ID in the response
                agent_response['conversation_id'] = str(conversation.id)
                
                logger.info(f"Successfully forwarded request to agent and received response")
                return JsonResponse(agent_response)
                
        except Exception as e:
            logger.error(f"Error communicating with agent: {str(e)}")
            # Fall back to default response
            return self.regular_response(conversation, request_data.get('messages', []))
    
    async def agent_stream_response(self, conversation, request_data, chat_endpoint):
        """Forward the streaming request to the agent and stream the response"""
        logger.info(f"Making streaming request to agent endpoint: {chat_endpoint}")
        
        try:
            # Create a temporary streaming response middleware
            response_content = []
            
            async def generate():
                try:
                    async with httpx.AsyncClient() as client:
                        async with client.stream('POST', chat_endpoint, json=request_data, headers={'Content-Type': 'application/json'}) as response:
                            if response.status_code != 200:
                                logger.error(f"Agent returned error: {response.status_code}")
                                # Fall back to default streaming response
                                default_response = self.stream_response(conversation, request_data.get('messages', []))
                                async for chunk in default_response.streaming_content:
                                    yield chunk
                                return
                            
                            async for chunk in response.aiter_bytes():
                                # Store the chunk for later processing
                                response_content.append(chunk.decode('utf-8'))
                                # Forward the chunk to the client
                                yield chunk.decode('utf-8')
                            
                            # After streaming, extract the assistant's message and store it
                            try:
                                full_response = ''.join(response_content)
                                # Parse event stream format
                                message_content = ""
                                for line in full_response.split('\n'):
                                    if line.startswith('data: ') and line != 'data: [DONE]':
                                        try:
                                            data = json.loads(line[6:])
                                            if 'choices' in data and data['choices']:
                                                content = data['choices'][0].get('delta', {}).get('content', '')
                                                if content:
                                                    message_content += content
                                        except json.JSONDecodeError:
                                            continue
                                
                                if message_content:
                                    logger.info(f"Storing assistant message: {message_content[:50]}...")
                                    Message.objects.create(
                                        conversation=conversation,
                                        role='assistant',
                                        content=message_content
                                    )
                            except Exception as e:
                                logger.error(f"Error extracting assistant message: {str(e)}")
                except Exception as e:
                    logger.error(f"Error in streaming from agent: {str(e)}")
                    # Fall back to default streaming response
                    default_response = self.stream_response(conversation, request_data.get('messages', []))
                    async for chunk in default_response.streaming_content:
                        yield chunk
            
            logger.info(f"Setting up streaming response from agent")
            return StreamingHttpResponse(
                streaming_content=generate(),
                content_type='text/event-stream'
            )
        except Exception as e:
            logger.error(f"Error setting up agent streaming: {str(e)}")
            # Fall back to default response
            return self.stream_response(conversation, request_data.get('messages', []))

    def regular_response(self, conversation, user_messages):
        """Generate a response for the conversation"""
        # In a real implementation, you would call your AI service here
        response_content = ""
        
        # If user asked something, provide a response
        if user_messages:
            last_message = user_messages[-1].strip().lower()
            # Generate a response based on the user's input
            if "hello" in last_message or "hi" in last_message or "hey" in last_message:
                response_content = "Hello! How can I help you today?"
            elif "help" in last_message:
                response_content = "I'm here to help! You can ask me questions about this system, how to use the chat, or about the conversation history feature."
            elif "thank" in last_message:
                response_content = "You're welcome! Is there anything else you'd like to know?"
            elif "how are you" in last_message:
                response_content = "I'm functioning well, thank you for asking! How can I assist you today?"
            elif "what can you do" in last_message or "capabilities" in last_message:
                response_content = "I can help you manage conversations, store chat history, and provide information about this system. I'm a demonstration of a conversation management system rather than a full AI assistant."
            elif "weather" in last_message or "forecast" in last_message:
                response_content = "I don't have real-time weather data, but I can tell you that weather forecasting involves collecting data from satellites, weather stations, and other sensors to predict atmospheric conditions."
            elif "time" in last_message:
                from datetime import datetime
                current_time = datetime.now().strftime("%H:%M:%S")
                response_content = f"The current server time is {current_time}. Note that I don't have access to your local time zone information."
            elif "date" in last_message or "day" in last_message:
                from datetime import datetime
                current_date = datetime.now().strftime("%A, %B %d, %Y")
                response_content = f"Today is {current_date} according to the server's calendar."
            elif "joke" in last_message:
                jokes = [
                    "Why don't scientists trust atoms? Because they make up everything!",
                    "Why did the scarecrow win an award? Because he was outstanding in his field!",
                    "Why don't skeletons fight each other? They don't have the guts!",
                    "What did one wall say to the other wall? I'll meet you at the corner!",
                    "Why did the bicycle fall over? Because it was two tired!"
                ]
                import random
                response_content = random.choice(jokes)
            elif "agent" in last_message or "agents" in last_message:
                response_content = "This system allows you to create and manage AI agents. Each agent can have a name and role. You can chat with these agents and your conversations will be saved for future reference."
            elif "conversation" in last_message or "history" in last_message:
                response_content = "This system stores your conversation history. You can view past conversations, continue them later, and delete them when you no longer need them."
            else:
                response_content = "I'm a demonstration assistant for the conversation storage system. I can respond to basic queries, but I don't have the full capabilities of a real AI assistant. Try asking about agents, conversations, or the system features."
        else:
            response_content = "Hello! How can I help you today?"
            
        # Store assistant's response in the conversation
        Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=response_content
        )
        
        response_data = {
            "id": str(uuid.uuid4()),
            "object": "chat.completion",
            "created": int(conversation.created_at.timestamp()),
            "model": "conversation-storage-model",
            "conversation_id": str(conversation.id),
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response_content
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": len(' '.join(user_messages)),
                "completion_tokens": len(response_content),
                "total_tokens": len(' '.join(user_messages)) + len(response_content)
            }
        }
        
        logger.info(f"Provided response for conversation ID: {conversation.id}")
        return JsonResponse(response_data)
        
    def stream_response(self, conversation, user_messages):
        """Generate a streaming response for the conversation"""
        # In a real implementation, you would call your AI service here
        response_content = ""
        
        # If user asked something, provide a response
        if user_messages:
            last_message = user_messages[-1].strip().lower()
            # Generate a response based on the user's input
            if "hello" in last_message or "hi" in last_message or "hey" in last_message:
                response_content = "Hello! How can I help you today?"
            elif "help" in last_message:
                response_content = "I'm here to help! You can ask me questions about this system, how to use the chat, or about the conversation history feature."
            elif "thank" in last_message:
                response_content = "You're welcome! Is there anything else you'd like to know?"
            elif "how are you" in last_message:
                response_content = "I'm functioning well, thank you for asking! How can I assist you today?"
            elif "what can you do" in last_message or "capabilities" in last_message:
                response_content = "I can help you manage conversations, store chat history, and provide information about this system. I'm a demonstration of a conversation management system rather than a full AI assistant."
            elif "weather" in last_message or "forecast" in last_message:
                response_content = "I don't have real-time weather data, but I can tell you that weather forecasting involves collecting data from satellites, weather stations, and other sensors to predict atmospheric conditions."
            elif "time" in last_message:
                from datetime import datetime
                current_time = datetime.now().strftime("%H:%M:%S")
                response_content = f"The current server time is {current_time}. Note that I don't have access to your local time zone information."
            elif "date" in last_message or "day" in last_message:
                from datetime import datetime
                current_date = datetime.now().strftime("%A, %B %d, %Y")
                response_content = f"Today is {current_date} according to the server's calendar."
            elif "joke" in last_message:
                jokes = [
                    "Why don't scientists trust atoms? Because they make up everything!",
                    "Why did the scarecrow win an award? Because he was outstanding in his field!",
                    "Why don't skeletons fight each other? They don't have the guts!",
                    "What did one wall say to the other wall? I'll meet you at the corner!",
                    "Why did the bicycle fall over? Because it was two tired!"
                ]
                import random
                response_content = random.choice(jokes)
            elif "agent" in last_message or "agents" in last_message:
                response_content = "This system allows you to create and manage AI agents. Each agent can have a name and role. You can chat with these agents and your conversations will be saved for future reference."
            elif "conversation" in last_message or "history" in last_message:
                response_content = "This system stores your conversation history. You can view past conversations, continue them later, and delete them when you no longer need them."
            else:
                response_content = "I'm a demonstration assistant for the conversation storage system. I can respond to basic queries, but I don't have the full capabilities of a real AI assistant. Try asking about agents, conversations, or the system features."
        else:
            response_content = "Hello! How can I help you today!"
            
        # Store assistant's response in the conversation
        Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=response_content
        )
        
        def generate():
            response_id = str(uuid.uuid4())
            # First chunk - start of response
            start_chunk = {
                "id": response_id,
                "object": "chat.completion.chunk",
                "created": int(conversation.created_at.timestamp()),
                "model": "conversation-storage-model",
                "conversation_id": str(conversation.id),
                "choices": [
                    {
                        "index": 0,
                        "delta": {
                            "role": "assistant"
                        },
                        "finish_reason": None
                    }
                ]
            }
            yield f"data: {json.dumps(start_chunk)}\n\n"
            
            # Break the message into words to simulate streaming
            words = response_content.split()
            for i, word in enumerate(words):
                word_with_space = word + (" " if i < len(words) - 1 else "")
                chunk = {
                    "id": response_id,
                    "object": "chat.completion.chunk",
                    "created": int(conversation.created_at.timestamp()),
                    "model": "conversation-storage-model",
                    "conversation_id": str(conversation.id),
                    "choices": [
                        {
                            "index": 0,
                            "delta": {
                                "content": word_with_space
                            },
                            "finish_reason": None
                        }
                    ]
                }
                yield f"data: {json.dumps(chunk)}\n\n"
                import time
                time.sleep(0.1)  # Simulate realistic typing speed
            
            # Final chunk
            end_chunk = {
                "id": response_id,
                "object": "chat.completion.chunk",
                "created": int(conversation.created_at.timestamp()),
                "model": "conversation-storage-model",
                "conversation_id": str(conversation.id),
                "choices": [
                    {
                        "index": 0,
                        "delta": {},
                        "finish_reason": "stop"
                    }
                ]
            }
            yield f"data: {json.dumps(end_chunk)}\n\n"
            yield f"data: [DONE]\n\n"
        
        logger.info(f"Setting up streaming response for conversation ID: {conversation.id}")
        return StreamingHttpResponse(
            streaming_content=generate(),
            content_type='text/event-stream'
        )