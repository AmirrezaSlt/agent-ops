/**
 * Utility functions for processing messages in the chat interface
 */
import { hasToolOutput, parseToolOutput, hasToolError, parseToolError } from './toolUtils';

/**
 * Extracts tool information from message content
 * @param {string} content - The message content to parse
 * @returns {Object} - Tool information or empty object if no tool found
 */
export const extractToolInfo = (content) => {
  if (!content) return { textContent: '', hasToolCall: false };
  
  // Check if content contains a tool call (try various formats)
  const toolCallPatterns = [
    /<function_calls>[\s\S]*?<\/antml:function_calls>/,
    /<function_calls>[\s\S]*?<\/function_calls>/,
    /<tool:[\s\S]*?<\/tool>/,
    /<tool>[\s\S]*?<\/tool>/  // Simple tool tag format
  ];
  
  let toolMatch = null;
  let matchingPattern = null;
  
  for (const pattern of toolCallPatterns) {
    const match = content.match(pattern);
    if (match) {
      toolMatch = match;
      matchingPattern = pattern;
      break;
    }
  }
  
  if (!toolMatch) return { textContent: content, hasToolCall: false };
  
  // Extract the tool call part and the text content
  const toolCallContent = toolMatch[0];
  const textContent = content.replace(matchingPattern, '').trim();
  
  // Check if this is the simple <tool> format with JSON
  if (toolCallContent.startsWith('<tool>') && toolCallContent.endsWith('</tool>')) {
    try {
      // Extract the JSON content between the tool tags
      const jsonContent = toolCallContent.replace('<tool>', '').replace('</tool>', '').trim();
      
      // Parse the JSON to get tool info
      const parsedTool = JSON.parse(jsonContent);
      
      if (parsedTool && parsedTool.name) {
        return {
          hasToolCall: true,
          toolName: parsedTool.name,
          args: parsedTool.args || {},
          textContent
        };
      }
    } catch (e) {
      console.error('Failed to parse JSON in tool tag:', e);
    }
  }
  
  // If simple tool format didn't work, continue with regex extraction
  // Extract tool name using regex patterns
  const namePatterns = [
    /<invoke name="([^"]+)">/,
    /<tool:([^>]+)>/,
    /name="([^"]+)"/
  ];
  
  let toolName = 'Tool Call';  // Default name
  
  for (const pattern of namePatterns) {
    const match = toolCallContent.match(pattern);
    if (match && match[1]) {
      toolName = match[1];
      break;
    }
  }
  
  // Extract parameters with multiple possible patterns
  const args = {};
  const paramPatterns = [
    /<parameter name="([^"]+)">([\s\S]*?)<\/antml:parameter>/g,
    /<parameter name="([^"]+)">([\s\S]*?)<\/parameter>/g
  ];
  
  for (const pattern of paramPatterns) {
    let paramMatch;
    let patternCopy = new RegExp(pattern);
    while ((paramMatch = patternCopy.exec(toolCallContent)) !== null) {
      const [, paramName, paramValue] = paramMatch;
      
      // Try to parse as JSON if possible
      try {
        const jsonValue = JSON.parse(paramValue);
        args[paramName] = jsonValue;
      } catch (e) {
        // If not valid JSON, store as string
        args[paramName] = paramValue;
      }
    }
    
    // If we found parameters with this pattern, no need to try others
    if (Object.keys(args).length > 0) break;
  }
  
  return {
    hasToolCall: true,
    toolName,
    args,
    textContent
  };
};

/**
 * Processes thinking content from a message
 * @param {string} content - The message content 
 * @returns {Object} - Object with extracted thinking content and remaining text
 */
export const extractThinkingContent = (content) => {
  if (!content) return { hasThinking: false, textContent: '', thinkingContent: '' };
  
  // Check for thinking tags - handle both complete and incomplete tags
  const thinkingPatterns = [
    /<thinking>([\s\S]*?)<\/thinking>/,   // Complete thinking tag
    /<thinking>([\s\S]*?)<\/thinking/,    // Incomplete closing tag
    /<thinking>([\s\S]*)/                 // Only opening tag
  ];
  
  // Try each pattern in order
  let match = null;
  for (const pattern of thinkingPatterns) {
    match = content.match(pattern);
    if (match) break;
  }
  
  if (!match) return { hasThinking: false, textContent: content, thinkingContent: '' };
  
  // Extract thinking content and remaining text
  const thinkingContent = match[1].trim();
  
  // Remove the entire matched section for textContent
  let textContent = content.replace(match[0], '').trim();
  
  // Also clean any stray tags from the text content
  textContent = cleanTagsFromContent(textContent);
  
  return {
    hasThinking: true,
    thinkingContent,
    textContent
  };
};

/**
 * Processes a message to extract tool calls, thinking content, and format properly
 * @param {Object} message - The message to process
 * @returns {Object} - The processed message
 */
export const processMessage = (message) => {
  if (message.type !== 'assistant' && message.role !== 'assistant') return message;
  
  // Process message content to extract structured data
  const processedMessage = { ...message };
  
  // First clean out any special tags that shouldn't be displayed
  const cleanedContent = cleanTagsFromContent(message.content);
  processedMessage.content = cleanedContent;
  
  // First check for thinking content
  const thinkingInfo = extractThinkingContent(message.content);
  if (thinkingInfo.hasThinking) {
    processedMessage.isThinking = true;
    processedMessage.content = thinkingInfo.thinkingContent;
    processedMessage.textContent = thinkingInfo.textContent;
    return processedMessage;
  }
  
  // Then check for tool calls if no thinking found
  const toolInfo = extractToolInfo(message.content);
  if (toolInfo.hasToolCall) {
    // Check if there's also an error
    let toolError = null;
    let hasToolErrorFlag = false;
    
    if (hasToolError(message.content)) {
      const errorInfo = parseToolError(message.content);
      if (errorInfo.hasError) {
        toolError = errorInfo.error;
        hasToolErrorFlag = true;
      }
    }
    
    return {
      ...processedMessage,
      ...toolInfo,
      ...(hasToolErrorFlag ? { 
        toolError,
        hasToolError: true 
      } : {}),
      hasTool: true
    };
  }
  
  // Also check for tool responses
  if (hasToolOutput(message.content)) {
    const responseInfo = parseToolOutput(message.content);
    return {
      ...processedMessage,
      toolOutput: responseInfo.output,
      toolError: responseInfo.error,
      hasToolOutput: true,
      hasToolError: responseInfo.hasError,
      textContent: responseInfo.displayContent
    };
  }
  
  return processedMessage;
};

/**
 * Cleans all special tags from content to ensure proper display
 * @param {string} content - The content to clean
 * @returns {string} - The cleaned content
 */
export const cleanTagsFromContent = (content) => {
  if (!content) return '';
  
  return content
    // Remove thinking-related tags
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '') // Complete thinking sections
    .replace(/<thinking>[\s\S]*?<\/thinking/g, '')  // Incomplete closing tag
    .replace(/<thinking>/g, '')                     // Opening tag
    .replace(/<\/thinking>/g, '')                   // Closing tag
    .replace(/<\/thinking/g, '')                    // Incomplete closing tag
    
    // Remove answer-related tags
    .replace(/<answer>/g, '')                       // Opening tag
    .replace(/<\/answer>/g, '')                     // Closing tag
    .replace(/<\/answer/g, '')                      // Incomplete closing tag
    
    // Remove tool-related tags
    .replace(/<\/?tool>/g, '')
    .replace(/<\/?tool_output>/g, '')
    .replace(/<\/?tool_error>/g, '')
    .trim();
};

/**
 * Processes a tool output and links it to a tool call
 * @param {Object} message - The tool output message
 * @param {Array} messages - The array of all messages
 * @returns {Object|null} - The processed message or null if merged with a previous message
 */
export const processToolOutput = (message, messages) => {
  if (message.type !== 'function_result' && message.type !== 'tool_output') return message;
  
  // Find the last tool call message
  const lastToolCallIndex = messages.findIndex(m => 
    (m.type === 'assistant' || m.role === 'assistant') && (m.hasTool || m.hasToolCall)
  );
  
  if (lastToolCallIndex !== -1) {
    // Update the tool call message with the response
    const toolCallMessage = messages[lastToolCallIndex];
    
    // Parse the tool response if needed
    if (hasToolOutput(message.content)) {
      const responseInfo = parseToolOutput(message.content);
      toolCallMessage.toolOutput = responseInfo.output;
      toolCallMessage.toolError = responseInfo.error;
      toolCallMessage.hasToolError = responseInfo.hasError;
    } else {
      toolCallMessage.toolOutput = message.content;
    }
    
    // Return null to indicate this message has been processed
    // and should not be added separately
    return null;
  }
  
  // If we can't find a matching tool call, format as a standalone message
  return {
    type: 'tool_output',
    content: message.content,
    timestamp: message.timestamp || new Date().toISOString()
  };
};

/**
 * Updates messages array to properly link tool calls with outputs
 * @param {Array} messages - The array of messages to process
 * @returns {Array} - The updated messages array
 */
export const updateMessagesWithToolOutputs = (messages) => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return [];
  }
  
  // Start by processing any tool output tags in message content
  const processedMessages = messages.map(message => {
    // Skip if not a message or already processed
    if (!message.content || message.hasBeenProcessed) {
      return message;
    }
    
    // Process thinking content
    const thinkingInfo = extractThinkingContent(message.content);
    if (thinkingInfo.hasThinking) {
      return {
        ...message,
        isThinking: true,
        content: thinkingInfo.thinkingContent,
        textContent: thinkingInfo.textContent,
        hasBeenProcessed: true
      };
    }
    
    // Process tool calls
    const toolInfo = extractToolInfo(message.content);
    if (toolInfo.hasToolCall) {
      // Check if there's also an error
      let toolError = null;
      let hasToolErrorFlag = false;
      
      if (hasToolError(message.content)) {
        const errorInfo = parseToolError(message.content);
        if (errorInfo.hasError) {
          toolError = errorInfo.error;
          hasToolErrorFlag = true;
        }
      }
      
      return {
        ...message,
        ...toolInfo,
        ...(hasToolErrorFlag ? { 
          toolError,
          hasToolError: true 
        } : {}),
        hasTool: true,
        hasBeenProcessed: true
      };
    }
    
    // Process tool outputs
    const toolOutputInfo = extractToolOutputContent(message.content);
    if (toolOutputInfo.hasToolOutput) {
      return {
        ...message,
        toolOutput: toolOutputInfo.outputContent,
        textContent: toolOutputInfo.textContent,
        hasToolOutput: true,
        hasBeenProcessed: true
      };
    }
    
    return message;
  });
  
  // Second pass - link tool calls with their outputs
  const toolCalls = processedMessages.filter(m => 
    m.hasTool || m.type === 'function_call' || m.hasToolCall || m.isTool
  );
  
  const toolOutputs = processedMessages.filter(m => 
    m.hasToolOutput || m.type === 'function_result' || m.type === 'tool_output' || m.isToolOutput
  );
  
  // Map of tool call message IDs to their matched tool output
  const toolOutputMap = {};
  
  // Try to link by parentToolId first
  toolOutputs.forEach(output => {
    if (output.parentToolId) {
      toolOutputMap[output.parentToolId] = output;
    }
  });
  
  // Then try linking by sequence proximity
  toolCalls.forEach(toolCall => {
    // Skip if already has an output linked
    if (toolOutputMap[toolCall.messageId]) return;
    
    if (toolCall.sequence !== undefined) {
      // Find output with closest higher sequence
      const possibleOutputs = toolOutputs
        .filter(output => 
          output.sequence !== undefined && 
          output.sequence > toolCall.sequence &&
          output.sequence < Math.ceil(toolCall.sequence) + 1 &&
          !Object.values(toolOutputMap).includes(output)
        )
        .sort((a, b) => a.sequence - b.sequence);
      
      if (possibleOutputs.length > 0) {
        toolOutputMap[toolCall.messageId] = possibleOutputs[0];
      }
    }
  });
  
  // Finally, try matching any remaining unlinked outputs to tool calls by order
  const linkedOutputIds = new Set(Object.values(toolOutputMap).map(output => output.messageId));
  const remainingOutputs = toolOutputs.filter(output => !linkedOutputIds.has(output.messageId));
  
  if (remainingOutputs.length > 0 && toolCalls.length > 0) {
    for (const toolCall of toolCalls) {
      if (!toolOutputMap[toolCall.messageId] && remainingOutputs.length > 0) {
        toolOutputMap[toolCall.messageId] = remainingOutputs.shift();
      }
    }
  }
  
  // Create a final result with tool outputs embedded
  return processedMessages.map(message => {
    // If it's a tool call, attach the corresponding output
    if ((message.hasTool || message.type === 'function_call') && message.messageId && toolOutputMap[message.messageId]) {
      return {
        ...message,
        toolOutput: toolOutputMap[message.messageId].content || toolOutputMap[message.messageId].toolOutput,
        linkedOutputId: toolOutputMap[message.messageId].messageId
      };
    }
    
    // If it's a tool output that's already linked, mark it
    if ((message.hasToolOutput || message.type === 'function_result' || message.type === 'tool_output') && 
        message.messageId && 
        Object.values(toolOutputMap).some(output => output.messageId === message.messageId)) {
      return {
        ...message,
        isLinkedToolOutput: true
      };
    }
    
    return message;
  });
};

/**
 * Cleans message content of any special tags
 * @param {string} content - The content to clean
 * @returns {string} - The cleaned content
 */
export const cleanContent = (content) => {
  if (!content) return '';
  
  // Remove various tags that might be in the content
  return content
    .replace(/<\/?tool>/g, '')
    .replace(/<\/?tool_output>/g, '')
    .replace(/<\/?tool_error>/g, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '') // Remove thinking sections
    .replace(/<thinking>[\s\S]*?<\/thinking/g, '')  // Handle incomplete thinking tags
    .replace(/<\/?thinking>/g, '')  // Remove standalone thinking tags
    .replace(/<\/?thinking/g, '')   // Remove incomplete thinking tags
    .replace(/<\/answer>/g, '')     // Remove answer closing tags
    .replace(/<\/answer/g, '')      // Remove incomplete answer closing tags
    .replace(/<answer>/g, '')       // Remove answer opening tags
    .trim();
};

/**
 * Extracts tool output content from message content
 * @param {string} content - The message content to parse
 * @returns {Object} - Tool output information or empty object if no tool output found
 */
export const extractToolOutputContent = (content) => {
  if (!content) return { hasToolOutput: false, outputContent: '', textContent: '' };
  
  // Check for tool output tags - handle both complete and incomplete tags
  const outputPatterns = [
    /<tool_output>([\s\S]*?)<\/tool_output>/,   // Complete tag
    /<tool_output>([\s\S]*?)<\/tool_output/,    // Incomplete closing tag
    /<tool_output>([\s\S]*)/                    // Only opening tag
  ];
  
  // Try each pattern in order
  let match = null;
  for (const pattern of outputPatterns) {
    match = content.match(pattern);
    if (match) break;
  }
  
  if (!match) return { hasToolOutput: false, outputContent: '', textContent: content };
  
  // Extract output content and remaining text
  const outputContent = match[1].trim();
  
  // Remove the entire matched section for textContent
  let textContent = content.replace(match[0], '').trim();
  
  // Also clean any stray tags from the text content
  textContent = cleanTagsFromContent(textContent);
  
  return {
    hasToolOutput: true,
    outputContent,
    textContent
  };
}; 