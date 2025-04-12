from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgentViewSet, ConversationViewSet, health_check, ChatCompletionView, get_conversation

router = DefaultRouter()
router.register(r'agents', AgentViewSet)
router.register(r'conversations', ConversationViewSet, basename='conversation-viewset')

urlpatterns = [
    path('', include(router.urls)),
    path('health-check/', health_check, name='health-check'),
    path('v1/chat/completions/', ChatCompletionView.as_view(), name='chat-completions'),
    path('conversations/detail/<uuid:conversation_id>/', get_conversation, name='get-conversation-detail'),
] 