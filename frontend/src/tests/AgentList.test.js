import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AgentList from '../views/AgentList.vue'
import { useAgentStore } from '../store/agents'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: { id: 1, name: 'New Agent', role: 'Developer' } })),
    delete: vi.fn(() => Promise.resolve({}))
  }
}))

describe('AgentList.vue', () => {
  let store
  
  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    store = useAgentStore()
    
    // Mock store actions
    store.fetchAgents = vi.fn(() => {
      store.agents = [
        { id: 1, name: 'Test Agent', role: 'Assistant', created_at: '2023-01-01T00:00:00Z' },
        { id: 2, name: 'Test Agent 2', role: 'Researcher', created_at: '2023-01-02T00:00:00Z' }
      ]
      store.loading = false
    })
    
    store.createAgent = vi.fn((agent) => {
      const newAgent = { 
        id: 3, 
        name: agent.name, 
        role: agent.role, 
        created_at: new Date().toISOString() 
      }
      store.agents.push(newAgent)
      return newAgent
    })
    
    store.deleteAgent = vi.fn((id) => {
      store.agents = store.agents.filter(agent => agent.id !== id)
    })
  })
  
  it('renders the component properly', async () => {
    // Add some agents to the store before mounting
    store.agents = [
      { id: 1, name: 'Test Agent', role: 'Assistant', created_at: '2023-01-01T00:00:00Z' },
      { id: 2, name: 'Test Agent 2', role: 'Researcher', created_at: '2023-01-02T00:00:00Z' }
    ]
    
    const wrapper = mount(AgentList, {
      global: {
        plugins: [createPinia()]
      }
    })
    
    // We need to wait for the component to mount and execute its lifecycle hooks
    await flushPromises()
    
    // Check that the component has the right title
    expect(wrapper.find('h2').text()).toBe('AI Agents')
    
    // Check that the Add Agent button exists with the right text
    expect(wrapper.find('button').text()).toBe('Add Agent')
    
    // Verify fetchAgents was called
    expect(store.fetchAgents).toHaveBeenCalled()
  })
  
  it('shows agents when they are loaded', async () => {
    // Add some agents to the store before mounting
    store.agents = [
      { id: 1, name: 'Test Agent', role: 'Assistant', created_at: '2023-01-01T00:00:00Z' },
      { id: 2, name: 'Test Agent 2', role: 'Researcher', created_at: '2023-01-02T00:00:00Z' }
    ]
    
    const wrapper = mount(AgentList, {
      global: {
        plugins: [createPinia()]
      }
    })
    
    // We need to wait for the component to mount and execute its lifecycle hooks
    await flushPromises()
    
    // Now the table should be visible
    expect(wrapper.find('table').exists()).toBe(true)
    
    // Check that the table shows all agents
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(2)
    
    // Check content of first row (may vary due to ordering)
    const cellTexts = rows[0].findAll('td').map(td => td.text())
    expect(cellTexts).toContain('Test Agent') || expect(cellTexts).toContain('Test Agent 2')
  })
  
  it('opens the add agent form when button is clicked', async () => {
    // Add some agents to the store before mounting
    store.agents = [
      { id: 1, name: 'Test Agent', role: 'Assistant', created_at: '2023-01-01T00:00:00Z' }
    ]
    
    const wrapper = mount(AgentList, {
      global: {
        plugins: [createPinia()]
      }
    })
    
    // Make sure the component is fully mounted
    await flushPromises()
    
    // Modal should not be visible initially
    expect(wrapper.find('form').exists()).toBe(false)
    
    // Click the Add Agent button
    await wrapper.find('button').trigger('click')
    
    // Modal and form should now be visible
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('form h3').text()).toBe('Add New Agent')
    
    // Check form inputs
    expect(wrapper.find('#name').exists()).toBe(true)
    expect(wrapper.find('#role').exists()).toBe(true)
  })
  
  it('adds a new agent when form is submitted', async () => {
    // Add some agents to the store before mounting
    store.agents = [
      { id: 1, name: 'Test Agent', role: 'Assistant', created_at: '2023-01-01T00:00:00Z' }
    ]
    
    const wrapper = mount(AgentList, {
      global: {
        plugins: [createPinia()]
      }
    })
    
    // Make sure the component is fully mounted
    await flushPromises()
    
    // Click the Add Agent button to show the form
    await wrapper.find('button').trigger('click')
    
    // Fill in the form
    await wrapper.find('#name').setValue('New Test Agent')
    await wrapper.find('#role').setValue('Tester')
    
    // Submit the form
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    
    // Check that createAgent was called with the right data
    expect(store.createAgent).toHaveBeenCalledWith({ 
      name: 'New Test Agent', 
      role: 'Tester' 
    })
    
    // Check that the modal was closed
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(false)
  })
}) 