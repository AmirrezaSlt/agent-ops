import httpx
import json
import logging
import asyncio
import uuid
from django.http import StreamingHttpResponse, JsonResponse
from ..models import Message

# Configure logging
logger = logging.getLogger(__name__)

class AgentService:
    """Service for handling agent communication and interactions"""
    
    async def regular_response(self, conversation, request_data, chat_endpoint):
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
                    from .conversation_service import ConversationService
                    conversation_service = ConversationService()
                    return conversation_service.regular_response(conversation, request_data.get('messages', []))
                
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
            from .conversation_service import ConversationService
            conversation_service = ConversationService()
            return conversation_service.regular_response(conversation, request_data.get('messages', []))
    
    def stream_response(self, conversation, request_data, chat_endpoint):
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
                                from .conversation_service import ConversationService
                                conversation_service = ConversationService()
                                default_response = conversation_service.stream_response(conversation, request_data.get('messages', []))
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
                    from .conversation_service import ConversationService
                    conversation_service = ConversationService()
                    default_response = conversation_service.stream_response(conversation, request_data.get('messages', []))
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
            from .conversation_service import ConversationService
            conversation_service = ConversationService()
            return conversation_service.stream_response(conversation, request_data.get('messages', [])) 