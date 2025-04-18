from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
import json
import logging
from django.http import StreamingHttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from .models import Agent, Conversation, Message
from .serializers import AgentSerializer, ConversationSerializer, MessageSerializer
from .services.agent_service import AgentService
from .services.conversation_service import ConversationService

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
    
    def __init__(self, *args, **kwargs):
        super(ChatCompletionView, self).__init__(*args, **kwargs)
        self.agent_service = AgentService()
        self.conversation_service = ConversationService()
    
    def post(self, request):
        # Log the request data
        logger.info(f"Received chat completion request")
        
        # Process conversation
        conversation, user_messages = self.conversation_service.process_conversation(request.data)
        
        # Check if streaming is requested (default to true for better UX)
        should_stream = request.data.get('stream', True)
        
        # Check if an agent is specified for the conversation
        if conversation.agent:
            agent_id = conversation.agent.id
            try:
                agent = Agent.objects.get(id=agent_id)
                # Get the agent's endpoint - use your AI agent endpoint
                # Default to a fallback URL if none is specified
                agent_url = getattr(agent, 'endpoint_url', None)
                chat_endpoint = agent_url if agent_url else 'http://host.docker.internal:8000/v1/chat/completions'
                
                logger.info(f"Using agent {agent.name} with endpoint {chat_endpoint}")
                
                if should_stream:
                    return self.agent_service.stream_response(conversation, request.data, chat_endpoint)
                else:
                    return self.agent_service.regular_response(conversation, request.data, chat_endpoint)
            except Agent.DoesNotExist:
                logger.error(f"Agent with ID {agent_id} not found")
                # Fall back to default responses if the agent is not found
                if should_stream:
                    return self.conversation_service.stream_response(conversation, user_messages)
                else:
                    return self.conversation_service.regular_response(conversation, user_messages)
        else:
            # Use default responses if no agent is specified
            if should_stream:
                return self.conversation_service.stream_response(conversation, user_messages)
            else:
                return self.conversation_service.regular_response(conversation, user_messages)