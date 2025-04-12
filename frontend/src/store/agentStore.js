import { create } from 'zustand';
import axios from 'axios';

const useAgentStore = create((set, get) => ({
  agents: [],
  loading: false,
  error: null,
  currentChatAgent: null,
  chatMessages: [],

  fetchAgents: async () => {
    set({ loading: true, error: null });
    
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/agents/`);
      set({ agents: response.data, loading: false });
    } catch (error) {
      console.error('Error fetching agents:', error);
      set({ 
        error: error.message || 'Failed to fetch agents', 
        loading: false 
      });
    }
  },
  
  createAgent: async (agent) => {
    set({ loading: true, error: null });
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/agents/`, agent);
      set((state) => ({ 
        agents: [...state.agents, response.data], 
        loading: false 
      }));
      return response.data;
    } catch (error) {
      console.error('Error creating agent:', error);
      set({ 
        error: error.message || 'Failed to create agent', 
        loading: false 
      });
      throw error;
    }
  },
  
  deleteAgent: async (id) => {
    set({ loading: true, error: null });
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/agents/${id}/`);
      set((state) => ({ 
        agents: state.agents.filter(agent => agent.id !== id), 
        loading: false 
      }));
    } catch (error) {
      console.error('Error deleting agent:', error);
      set({ 
        error: error.message || 'Failed to delete agent', 
        loading: false 
      });
      throw error;
    }
  },

  setCurrentChatAgent: (agent) => {
    set({ 
      currentChatAgent: agent, 
      chatMessages: [] 
    });
  },

  addMessage: (message) => {
    set((state) => ({ 
      chatMessages: [...state.chatMessages, message] 
    }));
  },
  
  updateMessage: (messageId, updates) => {
    set((state) => {
      const updatedMessages = state.chatMessages.map(message => {
        if (message.messageId === messageId) {
          return { ...message, ...updates };
        }
        return message;
      });
      
      return { chatMessages: updatedMessages };
    });
  },

  removeMessageAt: (index) => {
    set((state) => {
      const newMessages = [...state.chatMessages];
      if (index >= 0 && index < newMessages.length) {
        newMessages.splice(index, 1);
      }
      return { chatMessages: newMessages };
    });
  },
  
  removeMessageById: (messageId) => {
    set((state) => ({
      chatMessages: state.chatMessages.filter(message => message.messageId !== messageId)
    }));
  },

  clearMessages: () => {
    set({ chatMessages: [] });
  }
}));

export default useAgentStore; 