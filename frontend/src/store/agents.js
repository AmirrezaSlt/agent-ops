import { defineStore } from 'pinia'
import axios from 'axios'

export const useAgentStore = defineStore('agents', {
  state: () => ({
    agents: [],
    loading: false,
    error: null,
    currentChatAgent: null,
    chatMessages: []
  }),
  
  actions: {
    async fetchAgents() {
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/agents/`)
        this.agents = response.data
      } catch (error) {
        this.error = error.message || 'Failed to fetch agents'
        console.error('Error fetching agents:', error)
      } finally {
        this.loading = false
      }
    },
    
    async createAgent(agent) {
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/agents/`, agent)
        this.agents.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.message || 'Failed to create agent'
        console.error('Error creating agent:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async deleteAgent(id) {
      this.loading = true
      this.error = null
      
      try {
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/agents/${id}/`)
        this.agents = this.agents.filter(agent => agent.id !== id)
      } catch (error) {
        this.error = error.message || 'Failed to delete agent'
        console.error('Error deleting agent:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    setCurrentChatAgent(agent) {
      this.currentChatAgent = agent
      this.chatMessages = []
    },

    addMessage(message) {
      this.chatMessages.push(message)
    },

    removeMessageAt(index) {
      if (index >= 0 && index < this.chatMessages.length) {
        this.chatMessages.splice(index, 1)
      }
    },

    clearMessages() {
      this.chatMessages = []
    }
  }
}) 