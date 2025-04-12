import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'

// Create a mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'agents',
      component: { template: '<div>Mock Agent List</div>' }
    }
  ]
})

describe('App.vue', () => {
  it('renders properly', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, createPinia()]
      }
    })
    
    // Check that header is rendered
    expect(wrapper.text()).toContain('AgentOps')
    expect(wrapper.text()).toContain('AI Agent Management Platform')
    
    // Check that header has correct classes
    const header = wrapper.find('header')
    expect(header.classes()).toContain('bg-blue-600')
    expect(header.classes()).toContain('text-white')
  })
}) 