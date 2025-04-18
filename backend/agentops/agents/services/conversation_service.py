import json
import logging
import uuid
import time
from datetime import datetime
from django.http import StreamingHttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from ..models import Conversation, Message, Agent

# Configure logging
logger = logging.getLogger(__name__)

class ConversationService:
    """Service for handling conversation processing and generating default responses"""
    
    def process_conversation(self, request_data):
        """Process conversation from request data"""
        # Get conversation ID if it exists, otherwise create a new conversation
        conversation_id = request_data.get('conversation_id')
        agent_id = request_data.get('agent_id')
        
        try:
            if conversation_id:
                conversation = get_object_or_404(Conversation, id=conversation_id)
                logger.info(f"Using existing conversation with ID: {conversation_id}")
            else:
                conversation = Conversation.objects.create()
                logger.info(f"Created new conversation with ID: {conversation.id}")
                
                # If agent_id is provided, associate the conversation with the agent
                if agent_id:
                    try:
                        agent = Agent.objects.get(id=agent_id)
                        conversation.agent = agent
                        conversation.save()
                        logger.info(f"Associated conversation {conversation.id} with agent {agent.name}")
                    except Agent.DoesNotExist:
                        logger.warning(f"Agent with ID {agent_id} not found, continuing without agent association")
                # If no agent_id but we have default agents, use the first one
                elif not agent_id and not conversation.agent:
                    default_agent = Agent.objects.first()
                    if default_agent:
                        conversation.agent = default_agent
                        conversation.save()
                        logger.info(f"Associated conversation {conversation.id} with default agent {default_agent.name}")
        except Exception as e:
            logger.error(f"Error processing conversation ID: {str(e)}")
            raise e

        # Store user message in the conversation
        user_messages = []
        if 'messages' in request_data:
            for message_data in request_data['messages']:
                # Only create a new message if it's not already in the conversation
                # This prevents duplicates when reconnecting to existing conversations
                if message_data.get('role') == 'user':
                    Message.objects.create(
                        conversation=conversation,
                        role=message_data.get('role', 'user'),
                        content=message_data.get('content', '')
                    )
                    user_messages.append(message_data.get('content', ''))
        
        return conversation, user_messages
    
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
                current_time = datetime.now().strftime("%H:%M:%S")
                response_content = f"The current server time is {current_time}. Note that I don't have access to your local time zone information."
            elif "date" in last_message or "day" in last_message:
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
                current_time = datetime.now().strftime("%H:%M:%S")
                response_content = f"The current server time is {current_time}. Note that I don't have access to your local time zone information."
            elif "date" in last_message or "day" in last_message:
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