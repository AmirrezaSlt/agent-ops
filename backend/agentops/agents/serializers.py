from rest_framework import serializers
from .models import Agent, Conversation, Message


class AgentSerializer(serializers.ModelSerializer):
    chat_endpoint = serializers.SerializerMethodField()

    class Meta:
        model = Agent
        fields = ['id', 'name', 'role', 'created_at', 'updated_at', 'chat_endpoint']
        read_only_fields = ['id', 'created_at', 'updated_at', 'chat_endpoint']
    
    def get_chat_endpoint(self, obj):
        # Return a constant endpoint for all agents
        return 'http://host.docker.internal:8000/v1/chat/completions'


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'title', 'created_at', 'updated_at', 'messages']
        read_only_fields = ['id', 'created_at', 'updated_at'] 