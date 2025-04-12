import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AgentTable from '../components/AgentTable';
import AgentForm from '../components/AgentForm';
import useAgentStore from '../store/agentStore';

function AgentList() {
  const [showAddForm, setShowAddForm] = useState(false);
  const navigate = useNavigate();
  
  const { 
    agents, 
    loading, 
    error, 
    fetchAgents, 
    createAgent, 
    deleteAgent,
    setCurrentChatAgent
  } = useAgentStore();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleAddAgent = () => {
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
  };

  const handleSubmitForm = async (formData) => {
    try {
      await createAgent(formData);
    } catch (error) {
      console.error('Failed to add agent:', error);
      // Error is already handled in the store
    }
  };

  const handleDeleteAgent = async (id) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      try {
        await deleteAgent(id);
      } catch (error) {
        console.error('Failed to delete agent:', error);
        // Error is already handled in the store
      }
    }
  };

  const handleChatWithAgent = (agent) => {
    setCurrentChatAgent(agent);
    navigate('/chat');
  };

  return (
    <div>
      <AgentTable
        agents={agents}
        loading={loading}
        error={error}
        onAddAgent={handleAddAgent}
        onDeleteAgent={handleDeleteAgent}
        onChatWithAgent={handleChatWithAgent}
      />
      
      <AgentForm
        open={showAddForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
}

export default AgentList;