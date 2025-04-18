import { MESSAGE_TYPES } from '../api/endpoints/chatApi';

/**
 * Determine message type from content
 * @param {string} content - The content to analyze
 * @returns {Object} Message type and extracted content
 */
export const determineMessageType = (content) => {
  if (!content) {
    return {
      messageType: MESSAGE_TYPES.ASSISTANT,
      extractedContent: ''
    };
  }
  
  // Check for tool call patterns
  if (content.includes('<function_calls>') || 
      content.includes('<tool>') || 
      content.includes('<invoke') || 
      content.includes('<tool:')) {
    return {
      messageType: MESSAGE_TYPES.TOOL_CALL,
      extractedContent: content
    };
  }
  
  // Check for tool output
  if (content.includes('<tool_output>')) {
    // Extract and process tool output content
    const match = content.match(/<tool_output>([\s\S]*?)(?:<\/tool_output>|$)/);
    let toolOutput = match ? match[1] : content.replace('<tool_output>', '');
    
    // Parse JSON output with error handling
    try {
      if (toolOutput.trim().startsWith('{') && toolOutput.trim().endsWith('}')) {
        const parsed = JSON.parse(toolOutput);
        
        // Handle error fields
        if (parsed.error !== undefined && parsed.output !== undefined) {
          toolOutput = parsed.error ? `Error: ${parsed.error}` : parsed.output;
        }
      }
    } catch (e) {
      // If not parseable JSON, use as is
    }
    
    return {
      messageType: MESSAGE_TYPES.TOOL_OUTPUT,
      extractedContent: toolOutput
    };
  }
  
  // Check for thinking content
  if (content.includes('<thinking>')) {
    // Extract content between thinking tags if it has them
    const match = content.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/);
    return {
      messageType: MESSAGE_TYPES.THINKING,
      extractedContent: match && match[1] ? match[1].trim() : content.replace(/<thinking>/, '')
    };
  }
  
  // Default to assistant message
  return {
    messageType: MESSAGE_TYPES.ASSISTANT,
    extractedContent: cleanContent(content)
  };
};

/**
 * Process thinking content to extract relevant parts
 * @param {string} content - The thinking content
 * @returns {string} The processed content
 */
export const processThinkingContent = (content) => {
  if (!content) return '';
  
  // Remove any remaining thinking tags
  return content
    .replace(/<thinking>/g, '')
    .replace(/<\/thinking>/g, '')
    .trim();
};

/**
 * Process assistant content to extract relevant parts
 * @param {string} content - The assistant content
 * @returns {string} The processed content
 */
export const processAssistantContent = (content) => {
  if (!content) return '';
  
  return cleanContent(content);
};

/**
 * Clean all tags from content
 * @param {string} content - The content to clean
 * @returns {string} - The cleaned content
 */
export const cleanContent = (content) => {
  if (!content) return '';
  
  return content
    .replace(/<answer>/g, '')
    .replace(/<\/answer>/g, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '') // Remove complete thinking sections
    .replace(/<thinking>[\s\S]*/g, '') // Remove partial thinking sections
    .replace(/<\/thinking>/g, '') // Remove thinking end tags
    .replace(/<tool_output>[\s\S]*?<\/tool_output>/g, '') // Remove complete tool outputs
    .replace(/<tool_output>[\s\S]*/g, '') // Remove partial tool outputs
    .replace(/<\/tool_output>/g, '') // Remove tool output end tags
    .replace(/<tool>[\s\S]*?<\/tool>/g, '') // Remove complete tool calls
    .replace(/<tool>[\s\S]*/g, '') // Remove partial tool calls
    .replace(/<\/tool>/g, '') // Remove tool end tags
    .replace(/<function_calls>[\s\S]*?<\/function_calls>/g, '') // Remove complete function calls
    .replace(/<function_calls>[\s\S]*/g, '') // Remove partial function calls
    .replace(/<\/function_calls>/g, '') // Remove function calls end tags
    .trim();
};

/**
 * Process tool content to extract tool name and arguments
 * @param {string} content - The tool call content
 * @returns {Object|null} Parsed tool information or null if invalid
 */
export const processToolContent = (content) => {
  if (!content) return null;
  
  // Try to extract JSON tool format first
  try {
    // Look for tool content in various formats
    const jsonMatch = content.match(/<tool>([\s\S]*?)<\/tool>/s) ||
                     (content.trim().startsWith('{') && content.trim().endsWith('}') ? 
                       [content, content] : null);
                       
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed && parsed.name) {
          return {
            name: parsed.name,
            args: parsed.args || {}
          };
        }
      } catch (e) {
        console.warn('Failed to parse tool JSON:', e);
      }
    }
  } catch (e) {}
  
  // Try antml function call format
  try {
    const funcMatch = content.match(/<invoke name="([^"]+)">/);
    if (funcMatch && funcMatch[1]) {
      const name = funcMatch[1];
      
      // Find parameters
      const args = {};
      const paramMatches = Array.from(content.matchAll(/<parameter name="([^"]+)">([\s\S]*?)<\/antml:parameter>/g));
      
      for (const match of paramMatches) {
        const [_, paramName, paramValue] = match;
        args[paramName] = paramValue.trim();
      }
      
      return { name, args };
    }
  } catch (e) {}
  
  // Try function call format
  try {
    const funcMatch = content.match(/<invoke name="([^"]+)">/);
    if (funcMatch && funcMatch[1]) {
      const name = funcMatch[1];
      
      // Find parameters
      const args = {};
      const paramMatches = Array.from(content.matchAll(/<parameter name="([^"]+)">([\s\S]*?)<\/parameter>/g));
      
      for (const match of paramMatches) {
        const [_, paramName, paramValue] = match;
        args[paramName] = paramValue.trim();
      }
      
      return { name, args };
    }
  } catch (e) {}
  
  // As a fallback, check for known tool names
  if (content.includes('code_executor')) {
    return { 
      name: 'code_executor', 
      args: { raw: content }
    };
  }
  
  // Ultimate fallback, use a generic name
  return {
    name: 'unknown_tool',
    args: { raw: content }
  };
}; 