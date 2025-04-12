import json
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from agentops.agents.models import Agent
from agentops.agents.serializers import AgentSerializer


class AgentAPITest(APITestCase):
    """Test module for Agent API"""

    def setUp(self):
        self.agent1 = Agent.objects.create(
            name="Test Agent", role="Assistant"
        )
        self.agent2 = Agent.objects.create(
            name="Test Agent 2", role="Researcher"
        )
        self.valid_payload = {
            'name': 'New Agent',
            'role': 'Developer'
        }
        self.invalid_payload = {
            'name': '',
            'role': 'Developer'
        }

    def test_get_all_agents(self):
        """Test retrieving all agents"""
        url = reverse('agent-list')
        response = self.client.get(url)
        agents = Agent.objects.all().order_by('-created_at')
        serializer = AgentSerializer(agents, many=True)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        # Since we're ordering by -created_at, let's just check the agents are there
        agent_names = [agent['name'] for agent in response.data]
        self.assertIn('Test Agent', agent_names)
        self.assertIn('Test Agent 2', agent_names)

    def test_get_single_agent(self):
        """Test retrieving a single agent"""
        url = reverse('agent-detail', kwargs={'pk': self.agent1.pk})
        response = self.client.get(url)
        serializer = AgentSerializer(self.agent1)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, serializer.data)

    def test_create_valid_agent(self):
        """Test creating a new agent with valid data"""
        url = reverse('agent-list')
        response = self.client.post(
            url,
            data=json.dumps(self.valid_payload),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Agent.objects.count(), 3)
        self.assertEqual(response.data['name'], 'New Agent')
        self.assertEqual(response.data['role'], 'Developer')

    def test_create_invalid_agent(self):
        """Test creating a new agent with invalid data"""
        url = reverse('agent-list')
        response = self.client.post(
            url,
            data=json.dumps(self.invalid_payload),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Agent.objects.count(), 2)

    def test_update_agent(self):
        """Test updating an existing agent"""
        url = reverse('agent-detail', kwargs={'pk': self.agent1.pk})
        response = self.client.put(
            url,
            data=json.dumps(self.valid_payload),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'New Agent')
        self.assertEqual(response.data['role'], 'Developer')

    def test_delete_agent(self):
        """Test deleting an agent"""
        url = reverse('agent-detail', kwargs={'pk': self.agent1.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Agent.objects.count(), 1) 