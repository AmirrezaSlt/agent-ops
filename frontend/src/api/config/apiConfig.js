/**
 * API Configuration
 */

// Get API base URL from environment or use default
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9080/agent-ops/api';

// HTTP methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
};

// Default request options
export const defaultOptions = {
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * Error handling for API responses
 * @param {Response} response - Fetch API response object
 * @returns {Promise} - Either throws an error or returns the response
 */
export const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`HTTP error! status: ${response.status}`, errorText);
    
    // Handle common error codes
    let errorMessage;
    if (response.status === 404) {
      errorMessage = 'Resource not found. This could mean the endpoint is not configured correctly.';
    } else if (response.status === 401 || response.status === 403) {
      errorMessage = "Authentication or authorization error. You may need to log in again.";
    } else if (response.status >= 500) {
      errorMessage = "Server error. Please try again later or contact support.";
    } else {
      errorMessage = `Request failed with status ${response.status}: ${errorText.substring(0, 100)}...`;
    }
    
    throw new Error(errorMessage);
  }
  
  return response;
}; 