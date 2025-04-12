import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAgentStore } from '../store/agents'
import axios from 'axios'

// Mock axios
vi.mock('axios')

describe('Agent Store', () => {
  let store
  
  beforeEach(() => {
    // Create a fresh Pinia instance and store before each test
    setActivePinia(createPinia())
    store = useAgentStore()
    
    // Reset all axios mocks
    vi.resetAllMocks()
  })
  
  it('has the correct initial state', () => {
    expect(store.agents).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
  })
  
  it('fetches agents successfully', async () => {
    // Mock API response
    const mockAgents = [
      { id: 1, name: 'Test Agent', role: 'Assistant' },
      { id: 2, name: 'Test Agent 2', role: 'Researcher' }
    ]
    
    axios.get.mockResolvedValue({ data: mockAgents })
    
    // Call the action
    await store.fetchAgents()
    
    // Check that axios.get was called with the right URL
    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/agents/'))
    
    // Check that the store state was updated correctly
    expect(store.agents).toEqual(mockAgents)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
  })
  
  it('handles fetch agents errors', async () => {
    // Mock API error
    const errorMessage = 'Network Error'
    axios.get.mockRejectedValue(new Error(errorMessage))
    
    // Call the action
    await store.fetchAgents()
    
    // Check that the store state was updated correctly
    expect(store.agents).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe(errorMessage)
  })
  
  it('creates an agent successfully', async () => {
    // Mock agent data and response
    const newAgent = { name: 'New Agent', role: 'Developer' }
    const createdAgent = { id: 1, ...newAgent, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' }
    
    axios.post.mockResolvedValue({ data: createdAgent })
    
    // Call the action
    const result = await store.createAgent(newAgent)
    
    // Check that axios.post was called with the right arguments
    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/agents/'), newAgent)
    
    // Check that the store state was updated correctly
    expect(store.agents).toContainEqual(createdAgent)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
    
    // Check that the action returned the created agent
    expect(result).toEqual(createdAgent)
  })
  
  it('deletes an agent successfully', async () => {
    // Setup initial state
    store.agents = [
      { id: 1, name: 'Test Agent', role: 'Assistant' },
      { id: 2, name: 'Test Agent 2', role: 'Researcher' }
    ]
    
    axios.delete.mockResolvedValue({})
    
    // Call the action
    await store.deleteAgent(1)
    
    // Check that axios.delete was called with the right URL
    expect(axios.delete).toHaveBeenCalledTimes(1)
    expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/agents/1/'))
    
    // Check that the store state was updated correctly
    expect(store.agents).toHaveLength(1)
    expect(store.agents[0].id).toBe(2)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
  })
}) 