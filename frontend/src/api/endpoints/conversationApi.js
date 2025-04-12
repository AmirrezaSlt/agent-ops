/**
 * Conversation API endpoints
 */
import { API_BASE_URL, handleResponse, HTTP_METHODS } from '../config/apiConfig';

/**
 * Fetch all conversations
 * @returns {Promise<Array>} List of conversations
 */
export const getAllConversations = async () => {
  try {
    console.log('Fetching all conversations');
    const response = await fetch(`${API_BASE_URL}/conversations/`);
    await handleResponse(response);
    const data = await response.json();
    console.log(`Successfully fetched ${data.length} conversations`);
    return data;
  } catch (error) {
    console.error('Error in getAllConversations:', error);
    throw error;
  }
};

/**
 * Fetch a single conversation by ID
 * @param {string} conversationId - The ID of the conversation to fetch
 * @returns {Promise<Object>} Conversation data
 */
export const getConversation = async (conversationId) => {
  try {
    console.log(`Fetching conversation with ID: ${conversationId}`);
    const response = await fetch(`${API_BASE_URL}/conversations/detail/${conversationId}/`);
    await handleResponse(response);
    const data = await response.json();
    console.log(`Successfully fetched conversation: ${conversationId}`);
    return data;
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    throw error;
  }
};

/**
 * Delete a conversation
 * @param {string} conversationId - The ID of the conversation to delete
 * @returns {Promise<boolean>} Success status
 */
export const deleteConversation = async (conversationId) => {
  try {
    console.log(`Deleting conversation with ID: ${conversationId}`);
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/`, {
      method: HTTP_METHODS.DELETE,
    });
    await handleResponse(response);
    console.log(`Successfully deleted conversation: ${conversationId}`);
    return true;
  } catch (error) {
    console.error(`Error deleting conversation ${conversationId}:`, error);
    throw error;
  }
}; 