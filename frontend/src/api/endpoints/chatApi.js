/**
 * Chat API endpoints
 */
import { API_BASE_URL, handleResponse, HTTP_METHODS, defaultOptions } from '../config/apiConfig';

/**
 * Send a chat request to the API
 * @param {string} message - The user message to send
 * @param {Array} messageHistory - The previous messages for context
 * @param {AbortController} abortController - Controller for aborting the request
 * @param {string} conversationId - Optional ID for continuing a conversation
 * @returns {Promise<Response>} - The fetch response
 */
export const sendChatRequest = async (message, messageHistory = [], abortController = null, conversationId = null) => {
  // Use the chat completions endpoint
  const chatEndpoint = `${API_BASE_URL}/v1/chat/completions/`;
  
  // Prepare message history for the API call
  const formattedHistory = messageHistory.filter(m => m.type === 'user' || m.type === 'assistant')
    .map(m => ({
      role: m.type || m.role, 
      content: m.content
    }));
  
  // Add the new user message and format as OpenAI expects
  const requestBody = {
    messages: [...formattedHistory, { role: 'user', content: message }],
    stream: true
  };
  
  // Add conversation ID if provided
  if (conversationId) {
    requestBody.conversation_id = conversationId;
  }
  
  try {
    const response = await fetch(chatEndpoint, {
      method: HTTP_METHODS.POST,
      headers: defaultOptions.headers,
      body: JSON.stringify(requestBody),
      signal: abortController ? abortController.signal : null
    });
    
    await handleResponse(response);
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Chat request aborted');
      throw error;
    }
    console.error('Error in sendChatRequest:', error);
    throw error;
  }
};

/**
 * Process a streaming response from the chat API
 * @param {Response} response - The streaming response
 * @param {Object} callbacks - Callback functions
 * @returns {Promise<void>}
 */
export const processStreamingResponse = async (
  response, 
  { onThinking, onAssistantMessage, onToolCall, onToolOutput }
) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentContent = '';
  let currentMessageType = null; // Track the current message type
  
  // Message type constants
  const MESSAGE_TYPES = {
    THINKING: 'thinking',
    TOOL_CALL: 'tool_call',
    TOOL_OUTPUT: 'tool_output',
    ASSISTANT: 'assistant'
  };
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // If we have any remaining content, process it based on current type
        if (currentContent.trim() && currentMessageType) {
          // Always set isComplete to true when the stream is done
          processMessageContent(currentMessageType, currentContent, true);
        }
        break;
      }
      
      // Decode the chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // Process lines in the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
      
      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) continue;
        
        const rawContent = line.replace(/^data: /, '').trim();
        
        // Handle end of stream
        if (rawContent === '[DONE]') {
          break;
        }
        
        // Try to parse as JSON (OpenAI API format)
        let content = rawContent;
        try {
          if (rawContent.startsWith('{') && rawContent.endsWith('}')) {
            const parsed = JSON.parse(rawContent);
            
            // Check if this is an OpenAI format response with delta content
            if (parsed.choices && 
                parsed.choices[0] && 
                parsed.choices[0].delta) {
              
              const delta = parsed.choices[0].delta;
              
              // Skip role-only messages
              if (delta.role && Object.keys(delta).length === 1) {
                continue;
              }
              
              // Extract content from delta if available
              if (delta.content) {
                content = delta.content;
              } else {
                // Skip this chunk if no content
                continue;
              }
            }
          }
        } catch (e) {
          // If JSON parsing fails, use the raw content
        }
        
        // Determine message type and process content
        determineMessageTypeAndProcess(content);
      }
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error while processing stream:', error);
      throw error;
    }
  }
  
  /**
   * Determines the message type from content and processes it accordingly
   * @param {string} content - The content to process
   */
  function determineMessageTypeAndProcess(content) {
    // Check for complete and incomplete tags using more robust patterns
    const thinkingStartPattern = /<thinking>/;
    const thinkingEndPattern = /<\/thinking>|<\/thinking/;
    const answerEndPattern = /<\/answer>|<\/answer/;
    const toolCallPattern = /<function_calls>|<tool:|<tool>/;
    const toolOutputPattern = /<tool_output>|<fnr>/;
    
    // Handle thinking start
    if (thinkingStartPattern.test(content)) {
      // Transition to thinking state
      finishCurrentMessageIfNeeded();
      currentMessageType = MESSAGE_TYPES.THINKING;
      const thinkingText = content.replace(/<thinking>/, '').trim();
      currentContent = thinkingText;
      processMessageContent(currentMessageType, currentContent, false);
      return;
    }
    
    // Handle thinking end
    if (thinkingEndPattern.test(content) && currentMessageType === MESSAGE_TYPES.THINKING) {
      // Extract content before the end tag
      const cleanedContent = content
        .replace(/<\/thinking>.*/, '')
        .replace(/<\/thinking.*/, '')
        .trim();
        
      if (cleanedContent) {
        currentContent += '\n' + cleanedContent;
      }
      
      processMessageContent(currentMessageType, currentContent, true);
      currentMessageType = null;
      currentContent = '';
      
      // Check if there's additional content after the thinking tag
      const afterThinking = content.match(/<\/thinking>([^]*)|<\/thinking([^]*)/);
      if (afterThinking && (afterThinking[1] || afterThinking[2]) && (afterThinking[1]?.trim() || afterThinking[2]?.trim())) {
        const remainingContent = afterThinking[1] || afterThinking[2];
        if (remainingContent.trim()) {
          determineMessageTypeAndProcess(remainingContent.trim());
        }
      }
      return;
    }
    
    // Handle answer end tags - these should transition to regular assistant content
    if (answerEndPattern.test(content)) {
      // If we're already in ASSISTANT mode, just clean the content and continue
      if (currentMessageType === MESSAGE_TYPES.ASSISTANT) {
        const cleanedContent = content
          .replace(/<\/answer>.*/, '')
          .replace(/<\/answer.*/, '')
          .trim();
          
        if (cleanedContent) {
          currentContent += cleanedContent;
          processMessageContent(currentMessageType, currentContent, false);
        }
      } else {
        // Otherwise finish any current message and reset
        finishCurrentMessageIfNeeded();
        currentMessageType = MESSAGE_TYPES.ASSISTANT;
        currentContent = content
          .replace(/<\/answer>.*/, '')
          .replace(/<\/answer.*/, '')
          .trim();
          
        if (currentContent) {
          processMessageContent(currentMessageType, currentContent, false);
        }
      }
      return;
    }
    
    // Handle tool calls
    if (toolCallPattern.test(content)) {
      // Transition to tool call state
      finishCurrentMessageIfNeeded();
      currentMessageType = MESSAGE_TYPES.TOOL_CALL;
      currentContent = content;
      processMessageContent(currentMessageType, currentContent, true);
      currentMessageType = null;
      currentContent = '';
      return;
    }
    
    // Handle tool responses
    if (toolOutputPattern.test(content)) {
      // Transition to tool response state
      finishCurrentMessageIfNeeded();
      currentMessageType = MESSAGE_TYPES.TOOL_OUTPUT;
      currentContent = content;
      processMessageContent(currentMessageType, currentContent, true);
      currentMessageType = null;
      currentContent = '';
      
      // Reset to assistant type after tool response to prepare for post-tool content
      currentMessageType = MESSAGE_TYPES.ASSISTANT;
      currentContent = '';
      return;
    }
    
    // If no special tags and not in a special state, treat as assistant message
    if (!currentMessageType) {
      currentMessageType = MESSAGE_TYPES.ASSISTANT;
      currentContent = content;
    } else if (currentMessageType === MESSAGE_TYPES.THINKING) {
      // Continue thinking content
      currentContent += '\n' + content;
      processMessageContent(currentMessageType, currentContent, false);
    } else if (currentMessageType === MESSAGE_TYPES.ASSISTANT) {
      // Continue assistant content - accumulate
      currentContent += content;
      
      // Always send updated content for assistant messages to ensure UI stays in sync
      processMessageContent(currentMessageType, currentContent, false);
    }
  }
  
  /**
   * Processes message content based on its type
   * @param {string} type - The message type
   * @param {string} content - The content to process
   * @param {boolean} isComplete - Whether this is the complete message
   */
  function processMessageContent(type, content, isComplete) {
    if (!content.trim()) return;
    
    switch (type) {
      case MESSAGE_TYPES.THINKING:
        if (onThinking) {
          onThinking(content, isComplete);
        }
        break;
        
      case MESSAGE_TYPES.TOOL_CALL:
        if (onToolCall) {
          onToolCall(content);
        }
        break;
        
      case MESSAGE_TYPES.TOOL_OUTPUT:
        if (onToolOutput) {
          onToolOutput(content);
        }
        break;
        
      case MESSAGE_TYPES.ASSISTANT:
        if (onAssistantMessage) {
          // Pass the accumulated content and completion flag
          onAssistantMessage(content, isComplete);
        }
        break;
    }
  }
  
  /**
   * Finishes the current message if one is in progress
   */
  function finishCurrentMessageIfNeeded() {
    if (currentContent.trim() && currentMessageType) {
      processMessageContent(currentMessageType, currentContent, true);
      currentContent = '';
    }
  }
}; 