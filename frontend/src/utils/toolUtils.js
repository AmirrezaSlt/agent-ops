/**
 * Utility functions for processing tool messages, responses, and errors
 */

/**
 * Parses tool output content to extract output or error information
 * @param {string} content - Raw content from tool output
 * @returns {Object} - Processed result with output, error, and display properties
 */
export const parseToolOutput = (content) => {
  // Default result
  const result = {
    output: '',
    error: '',
    hasError: false,
    displayContent: content || '',
    isValidResponse: false
  };
  
  // If content is empty or undefined, return early
  if (!content) {
    return result;
  }
  
  // Check if content contains tool_output tags
  if (content.includes('<tool_output>')) {
    // Use a greedy regex pattern to capture everything between the tags
    const responsePattern = /<tool_output>([\s\S]*?)<\/tool_output>/;
    const match = content.match(responsePattern);
    
    if (match) {
      let parsedContent = match[1].trim();
      result.displayContent = parsedContent || content;
      
      try {
        // Try to parse as JSON
        const responseObject = JSON.parse(parsedContent);
        result.isValidResponse = true;
        
        // Check if there's an error field with content
        if (responseObject.error && responseObject.error.trim()) {
          result.error = responseObject.error;
          result.hasError = true;
          result.displayContent = responseObject.error;
        } 
        // Use the output field if it exists and is not empty
        else if (responseObject.output && responseObject.output.trim()) {
          result.output = responseObject.output;
          result.displayContent = responseObject.output;
        } 
        // If output is empty but error exists
        else if (responseObject.output === "" && responseObject.error) {
          result.error = responseObject.error;
          result.hasError = true;
          result.displayContent = responseObject.error;
        }
        // Ensure we always keep some content
        else {
          // If no parseable output or error, use the original JSON string
          result.output = parsedContent;
          result.displayContent = parsedContent || content;
        }
      } catch (e) {
        // If parsing fails, just use the content between tags
        console.error('Failed to parse tool_output JSON:', e);
        result.output = parsedContent;
        result.displayContent = parsedContent || content;
      }
    } else {
      // No match found between tags, use the whole content
      result.displayContent = content;
    }
  } else {
    // No tool_output tags, use the content as is
    result.output = content;
    result.displayContent = content;
  }
  
  return result;
};

/**
 * Parses tool error content
 * @param {string} content - Raw content from tool error
 * @returns {Object} - Processed result with error information
 */
export const parseToolError = (content) => {
  // Default result
  const result = {
    error: '',
    hasError: false,
    displayContent: content
  };
  
  // Check if content contains tool_error tags
  if (content.includes('<tool_error>')) {
    const errorPattern = /<tool_error>([\s\S]*?)<\/tool_error>/;
    const match = content.match(errorPattern);
    
    if (match) {
      try {
        // Try to parse as JSON
        const errorObject = JSON.parse(match[1]);
        
        // Extract error message
        result.error = errorObject.message || errorObject.error || match[1];
        result.hasError = true;
        result.displayContent = result.error;
      } catch (e) {
        // If parsing fails, just use the content between tags
        console.error('Failed to parse tool_error JSON:', e);
        result.error = match[1];
        result.hasError = true;
        result.displayContent = result.error;
      }
    }
  }
  
  return result;
};

/**
 * Checks if the content contains a tool output
 * @param {string} content - Content to check
 * @returns {boolean} - True if content contains a tool output
 */
export const hasToolOutput = (content) => {
  return content.includes('<tool_output>');
};

/**
 * Checks if the content contains a tool error
 * @param {string} content - Content to check
 * @returns {boolean} - True if content contains a tool error
 */
export const hasToolError = (content) => {
  return content.includes('<tool_error>');
}; 