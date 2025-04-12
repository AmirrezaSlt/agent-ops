import { create } from 'zustand';
import { getAllConversations, getConversation, deleteConversation as apiDeleteConversation } from '../api/endpoints/conversationApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9080/agent-ops/api';

const useConversationStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  loading: false,
  error: null,

  // Fetch all conversations
  fetchConversations: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getAllConversations();
      set({ conversations: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Fetch a single conversation by ID
  fetchConversation: async (conversationId) => {
    set({ loading: true, error: null });
    try {
      const data = await getConversation(conversationId);
      set({ currentConversation: data, loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // Set current conversation
  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation });
  },

  // Clear current conversation
  clearCurrentConversation: () => {
    set({ currentConversation: null });
  },

  // Update the conversations list with a new conversation
  updateConversationsList: (conversation) => {
    const { conversations } = get();
    // Check if conversation already exists in the list
    const exists = conversations.some(c => c.id === conversation.id);
    
    if (exists) {
      // Update existing conversation
      set({
        conversations: conversations.map(c => 
          c.id === conversation.id ? conversation : c
        )
      });
    } else {
      // Add new conversation to the list
      set({
        conversations: [conversation, ...conversations]
      });
    }
  },

  // Get conversation title (first user message or fallback to ID)
  getConversationTitle: (conversation) => {
    if (!conversation) return 'New Conversation';
    
    if (conversation.title) return conversation.title;
    
    // Find first user message
    const firstUserMessage = conversation.messages?.find(m => m.role === 'user');
    if (firstUserMessage) {
      // Truncate long messages
      const content = firstUserMessage.content;
      return content.length > 30 ? content.substring(0, 30) + '...' : content;
    }
    
    return `Conversation ${conversation.id.substring(0, 8)}`;
  },

  // Delete a conversation
  deleteConversation: async (id) => {
    if (!id) return false;
    
    set({ loading: true, error: null });
    
    try {
      await apiDeleteConversation(id);
      
      // Update the conversations list
      const conversations = get().conversations.filter(c => c.id !== id);
      
      // Clear current conversation if it was the deleted one
      if (get().currentConversation?.id === id) {
        set({ currentConversation: null });
      }
      
      set({ conversations, loading: false });
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      return false;
    }
  }
}));

export default useConversationStore; 