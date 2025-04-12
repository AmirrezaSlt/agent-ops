from django.test import TestCase
from agentops.agents.models import Agent


class AgentModelTest(TestCase):
    """Test module for the Agent model"""

    def setUp(self):
        Agent.objects.create(
            name="Test Agent", role="Assistant"
        )
        Agent.objects.create(
            name="Test Agent 2", role="Researcher"
        )

    def test_agent_str_representation(self):
        agent1 = Agent.objects.get(name="Test Agent")
        agent2 = Agent.objects.get(name="Test Agent 2")
        
        self.assertEqual(str(agent1), "Test Agent - Assistant")
        self.assertEqual(str(agent2), "Test Agent 2 - Researcher")
    
    def test_agent_creation(self):
        agent = Agent.objects.get(name="Test Agent")
        self.assertEqual(agent.name, "Test Agent")
        self.assertEqual(agent.role, "Assistant")
        
        # Check that created_at and updated_at are populated
        self.assertIsNotNone(agent.created_at)
        self.assertIsNotNone(agent.updated_at) 