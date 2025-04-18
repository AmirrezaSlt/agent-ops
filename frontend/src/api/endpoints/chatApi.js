/**
 * Chat API endpoints
 */
import { API_BASE_URL, handleResponse, HTTP_METHODS, defaultOptions } from '../config/apiConfig';
import { 
  determineMessageType, 
  processThinkingContent, 
  processAssistantContent,
  processToolContent as importedProcessToolContent
} from '../../utils/streamProcessors';
import useAgentStore from '../../store/agentStore';

// Message type constants
export const MESSAGE_TYPES = {
  THINKING: 'thinking',
  TOOL_CALL: 'tool_call',
  TOOL_OUTPUT: 'tool_output',
  ASSISTANT: 'assistant'
};

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
  
  // Add conversation ID if provided and not null/undefined
  if (conversationId) {
    requestBody.conversation_id = conversationId;
  }
  
  // Get current agent if available
  const currentAgent = useAgentStore.getState().currentChatAgent;
  if (currentAgent && currentAgent.id) {
    requestBody.agent_id = currentAgent.id;
    console.log(`Using agent ${currentAgent.name} (ID: ${currentAgent.id})`);
  } else {
    console.log('No agent selected, using default agent');
  }
  
  try {
    console.log('Sending chat request with body:', JSON.stringify(requestBody).substring(0, 200) + '...');
    
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
 * Process streaming response from the chat API
 * @param {ReadableStreamDefaultReader} reader - Stream reader
 * @param {Function|Object} callbacks - Callbacks for handling different events
 * @param {Function} [callbacks.onThinking] - Callback for thinking content
 * @param {Function} [callbacks.onAssistantMessage] - Callback for assistant messages
 * @param {Function} [callbacks.onToolCall] - Callback for tool calls
 * @param {Function} [callbacks.onToolOutput] - Callback for tool outputs
 * @param {Function} [callbacks.onComplete] - Callback for completion
 * @param {Function} [callbacks.onError] - Callback for errors
 */
export const processStreamingResponse = async (
  response,
  callbacks = {}
) => {
  if (!response || !response.body) {
    if (typeof callbacks === 'object' && callbacks.onError) {
      callbacks.onError('No response body');
    }
    return;
  }

  // Support both object with callbacks and individual callbacks
  let onData, onToolStart, onToolEnd, onFunctionCall, onErrorCallback, onComplete;

  if (typeof callbacks === 'object') {
    // Extract callbacks from object
    onData = callbacks.onAssistantMessage || (() => {});
    onToolStart = callbacks.onToolCall || (() => {});
    onToolEnd = callbacks.onToolOutput || (() => {});
    onFunctionCall = callbacks.onFunctionCall || (() => {});
    onErrorCallback = callbacks.onError || (() => {});
    onComplete = callbacks.onComplete || (() => {});
  } else {
    // Assume individual callbacks (old API)
    onData = callbacks || (() => {});
    onToolStart = arguments[2] || (() => {});
    onToolEnd = arguments[3] || (() => {});
    onFunctionCall = arguments[4] || (() => {});
    onErrorCallback = arguments[5] || (() => {});
    onComplete = arguments[6] || (() => {});
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let regularContent = ''; // New accumulator for regular content
  let inTool = false;
  let toolContent = '';
  let inFunctionCall = false;
  let functionCallBuffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining buffer
        if (buffer.trim()) {
          processBuffer();
        }
        
        // Process any remaining regular content
        if (regularContent.trim() && typeof onData === 'function') {
          onData(regularContent.trim(), true); // True indicates complete
        }
        
        // Process any remaining tool content
        if (inTool && toolContent.trim()) {
          const toolInfo = extractToolInfo(toolContent.trim());
          onToolEnd(toolInfo);
        }
        
        // Process any remaining function call
        if (inFunctionCall && functionCallBuffer.trim()) {
          onFunctionCall(functionCallBuffer.trim());
        }
        
        // Call completion callback
        if (typeof onComplete === 'function') {
          onComplete();
        }
        
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process full lines from the buffer
      processBuffer();
    }
  } catch (error) {
    console.error('Error in stream processing:', error);
    onErrorCallback(error.message || 'Error processing stream');
    
    // Process any remaining buffer even in case of error
    if (buffer.trim()) {
      processBuffer();
    }
    
    // Process any remaining regular content even in case of error
    if (regularContent.trim() && typeof onData === 'function') {
      onData(regularContent.trim(), true); // True indicates complete
    }
    
    // Process any remaining tool content even in case of error
    if (inTool && toolContent.trim()) {
      const toolInfo = extractToolInfo(toolContent.trim());
      onToolEnd(toolInfo);
    }
    
    // Process any remaining function call even in case of error
    if (inFunctionCall && functionCallBuffer.trim()) {
      onFunctionCall(functionCallBuffer.trim());
    }
  }

  function processBuffer() {
    // Process line by line to handle tool and function call tags properly
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Last line might be incomplete, keep it in buffer
    
    for (const line of lines) {
      processLine(line);
    }
    
    // After processing all complete lines, check if we've accumulated regular content
    if (regularContent.trim() && typeof onData === 'function') {
      onData(regularContent.trim());
      regularContent = ''; // Clear after sending
    }
  }

  function processLine(line) {
    const trimmedLine = line.trim();
    
    // Check for function call patterns
    if (trimmedLine.includes('<function_calls>') || trimmedLine.includes('<function_calls>')) {
      inFunctionCall = true;
      functionCallBuffer = '';
      return;
    }
    
    if (inFunctionCall) {
      if (trimmedLine.includes('</function_calls>') || trimmedLine.includes('</function_calls>')) {
        inFunctionCall = false;
        const functionCalls = functionCallBuffer.trim();
        if (onFunctionCall) {
          onFunctionCall(functionCalls);
        }
        functionCallBuffer = '';
        return;
      }
      functionCallBuffer += line + '\n';
      return; // Skip further processing while in function call
    }

    // Handle tool lines
    if (trimmedLine.includes('<tool>')) {
      inTool = true;
      toolContent = line + '\n';
      return;
    }

    if (inTool) {
      toolContent += line + '\n';
      
      if (trimmedLine.includes('</tool>')) {
        inTool = false;
        try {
          const match = toolContent.match(/<tool>([\s\S]*)<\/tool>/);
          if (match && onToolEnd) {
            const extractedContent = match[1].trim();
            const toolInfo = extractToolInfo(extractedContent);
            if (toolInfo) {
              onToolEnd(toolInfo);
            }
          }
        } catch (error) {
          console.error('Error processing tool:', error);
        }
        toolContent = '';
      }
      return;
    }

    // If we're not in a special tag, add this line to the regularContent accumulator instead of buffer
    regularContent += line + '\n';
    // Do NOT call processBuffer() here - this was causing the infinite recursion
  }
};

/**
 * Process tool content to extract tool information
 * @param {string} content - Tool content to process
 * @returns {Object|null} - Extracted tool information or null
 */
const extractToolInfo = (content) => {
  try {
    // Try parsing as JSON
    try {
      // First attempt to parse the whole content as JSON
      const jsonData = JSON.parse(content);
      return {
        name: jsonData.name || 'unknown',
        content: jsonData,
        isError: !!jsonData.error,
        errorMessage: jsonData.error || null,
        raw: content
      };
    } catch (e) {
      // If direct parsing fails, try to find JSON in the content
      // Improved regex to be less greedy and more precise
      // Look for complete JSON objects with balanced braces
      let jsonMatch = null;
      
      // First, try to find content wrapped in specific tags
      const tagMatch = content.match(/<json>([\s\S]*?)<\/json>/);
      if (tagMatch && tagMatch[1]) {
        try {
          const jsonData = JSON.parse(tagMatch[1].trim());
          return {
            name: jsonData.name || 'unknown',
            content: jsonData,
            isError: !!jsonData.error,
            errorMessage: jsonData.error || null,
            raw: content
          };
        } catch (innerError) {
          console.log('Failed to parse tagged JSON:', innerError);
        }
      }
      
      // Look for a JSON object that starts at the beginning of a line
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
          try {
            const jsonData = JSON.parse(trimmedLine);
            return {
              name: jsonData.name || 'unknown',
              content: jsonData,
              isError: !!jsonData.error,
              errorMessage: jsonData.error || null,
              raw: content
            };
          } catch (lineError) {
            // Continue to next line if parsing fails
            console.log('Failed to parse line as JSON:', lineError);
          }
        }
      }
      
      // If still no match, try a more conservative approach
      // Look for content between the first { and a matching }
      const startIndex = content.indexOf('{');
      if (startIndex !== -1) {
        let openBraces = 0;
        let endIndex = -1;
        
        for (let i = startIndex; i < content.length; i++) {
          if (content[i] === '{') openBraces++;
          if (content[i] === '}') openBraces--;
          
          if (openBraces === 0) {
            endIndex = i + 1; // Include the closing brace
            break;
          }
        }
        
        if (endIndex !== -1) {
          const potentialJson = content.substring(startIndex, endIndex);
          try {
            const jsonData = JSON.parse(potentialJson);
            return {
              name: jsonData.name || 'unknown',
              content: jsonData,
              isError: !!jsonData.error,
              errorMessage: jsonData.error || null,
              raw: content
            };
          } catch (balancedError) {
            console.log('Failed to parse balanced JSON structure:', balancedError);
          }
        }
      }
    }

    // Handle as text
    // Extract tool name if available
    const nameMatch = content.match(/tool:\s*([^\n]+)/i) || content.match(/name:\s*([^\n]+)/i);
    const name = nameMatch ? nameMatch[1].trim() : 'unknown';
    
    // Check for error indicators
    const isError = content.toLowerCase().includes('error') || 
                   content.toLowerCase().includes('exception') || 
                   content.toLowerCase().includes('failed');
    
    // Extract error message if present
    let errorMessage = null;
    if (isError) {
      const errorMatch = content.match(/error:\s*([^\n]+)/i) || 
                        content.match(/exception:\s*([^\n]+)/i) || 
                        content.match(/failed:\s*([^\n]+)/i);
      errorMessage = errorMatch ? errorMatch[1].trim() : 'Unknown error';
    }
    
    return {
      name,
      content,
      isError,
      errorMessage,
      raw: content
    };
  } catch (e) {
    console.error('Error processing tool content:', e);
    return null;
  }
};

/**
 * Parse a streaming response and return an array that updates as new content arrives
 * @param {Response} response - The stream response from the API
 * @param {Function} onUpdate - Callback that receives the updated array on each change
 * @returns {Promise<Array>} The final array of parsed messages
 */
export const parseStream = async (response, onUpdate) => {
  if (!response || !response.body) {
    throw new Error('No response body');
  }

  // Array to collect parsed messages
  const messages = [];
  
  // Set up stream reading
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  
  // State variables for tracking content
  let buffer = '';
  let currentType = null;
  let currentContent = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      // Decode the chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep last incomplete line in buffer
      
      // Process each line
      for (const line of lines) {
        if (line.trim().startsWith('data:')) {
          processDataLine(line);
        }
      }
      
      // Call the update callback if provided
      if (typeof onUpdate === 'function') {
        onUpdate([...messages]);
      }
    }
    
    return messages;
  } catch (error) {
    console.error('Error parsing stream:', error);
    throw error;
  }
  
  function processDataLine(line) {
    // Extract JSON from the data line
    const dataContent = line.trim().substring(5).trim();
    if (!dataContent || dataContent === '[DONE]') return;
    
    try {
      const jsonData = JSON.parse(dataContent);
      
      // Extract content from choices
      if (jsonData.choices && jsonData.choices.length > 0 && 
          jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
        
        const content = jsonData.choices[0].delta.content;
        processContent(content);
      }
    } catch (e) {
      console.error('Error parsing JSON data:', e);
    }
  }
  
  function processContent(content) {
    // First check for opening tags with higher priority
    if (content.includes('<thinking>')) {
      closeCurrentTag(); // Close any previous tag
      handleOpenTag('think', content, '<thinking>');
    }
    else if (content.includes('<tool>')) {
      closeCurrentTag(); // Close any previous tag
      handleOpenTag('tool', content, '<tool>');
    }
    else if (content.includes('<answer>') || content.includes('<answer')) {
      closeCurrentTag(); // Close any previous tag
      handleOpenTag('answer', content, content.includes('<answer>') ? '<answer>' : '<answer');
    }
    // Then check for closing tags
    else if (currentType === 'think' && content.includes('</thinking')) {
      handleCloseTag('think', content, '</thinking');
    }
    else if (currentType === 'tool' && content.includes('</tool>')) {
      handleCloseTag('tool', content, '</tool>');
    }
    else if (currentType === 'answer' && content.includes('</answer')) {
      handleCloseTag('answer', content, '</answer');
    }
    // If no tags and we have a current type, add to current content
    else if (currentType) {
      // Check if there might be another tag somewhere in the content
      const tagStart = findTagStart(content);
      if (tagStart !== -1) {
        // There's a new tag in the content, handle the split
        const beforeTag = content.substring(0, tagStart);
        const afterTag = content.substring(tagStart);
        
        // Add content before the tag to current message
        if (beforeTag) {
          currentContent += beforeTag;
          updateMessage(false);
        }
        
        // Close current tag
        closeCurrentTag();
        
        // Process the part with the new tag
        processContent(afterTag);
      } else {
        // No new tag, just add to current content
        currentContent += content;
        updateMessage(false);
      }
    } else {
      // No active tag, check if we should start an answer
      handleOpenTag('answer', ' ' + content, ' '); // Use a space as separator
    }
  }
  
  function findTagStart(content) {
    const tags = ['<thinking>', '<tool>', '<answer>', '<answer'];
    let earliest = -1;
    
    for (const tag of tags) {
      const pos = content.indexOf(tag);
      if (pos !== -1 && (earliest === -1 || pos < earliest)) {
        earliest = pos;
      }
    }
    
    return earliest;
  }
  
  function closeCurrentTag() {
    if (currentType) {
      // Finalize the current message
      updateMessage(true);
      
      // Reset state
      currentType = null;
      currentContent = '';
    }
  }
  
  function handleOpenTag(type, content, tag) {
    // Start new message type
    currentType = type;
    
    // Extract content after tag
    const startIdx = content.indexOf(tag) + tag.length;
    currentContent = content.substring(startIdx);
    
    // Check if there's a closing tag in the same content
    const closingTagIdx = findClosingTagIndex(currentType, currentContent);
    if (closingTagIdx !== -1) {
      // Extract only the content before closing tag
      const extractedContent = currentContent.substring(0, closingTagIdx);
      currentContent = extractedContent;
      
      // Add to messages array as a completed message
      messages.push({ 
        type: currentType, 
        content: currentContent.trim(),
        isFinished: true
      });
      
      // Process remaining content after closing tag
      const remaining = content.substring(startIdx + closingTagIdx + getClosingTagLength(currentType));
      currentType = null;
      currentContent = '';
      
      if (remaining) {
        processContent(remaining);
      }
    } else {
      // Add to messages array as an ongoing message
      messages.push({ 
        type: currentType, 
        content: currentContent.trim(),
        isFinished: false
      });
    }
  }
  
  function findClosingTagIndex(type, content) {
    const closingTag = type === 'think' ? '</thinking' : 
                      type === 'tool' ? '</tool>' : 
                      '</answer';
    return content.indexOf(closingTag);
  }
  
  function getClosingTagLength(type) {
    return type === 'think' ? '</thinking>'.length : 
           type === 'tool' ? '</tool>'.length : 
           '</answer>'.length;
  }
  
  function handleCloseTag(type, content, tag) {
    if (currentType !== type) return;
    
    // Extract content before closing tag
    const endIdx = content.indexOf(tag);
    if (endIdx > 0) {
      currentContent += content.substring(0, endIdx);
    }
    
    // Finalize the message
    updateMessage(true);
    
    // Process any content after the closing tag
    const afterTag = content.substring(endIdx + tag.length);
    currentType = null;
    currentContent = '';
    
    if (afterTag && afterTag.trim()) {
      processContent(afterTag);
    }
  }
  
  function updateMessage(isFinished) {
    if (!currentType) return;
    
    // Find the message of the current type
    const index = messages.findIndex(m => m.type === currentType && !m.isFinished);
    
    if (index !== -1) {
      // Update existing message
      messages[index] = {
        type: currentType,
        content: currentContent.trim(),
        isFinished: isFinished
      };
    } else {
      // Add new message if not found
      messages.push({
        type: currentType,
        content: currentContent.trim(),
        isFinished: isFinished
      });
    }
  }
};

/**
 * Send a chat request and parse the response into a structured array
 * @param {string} message - The user message to send
 * @param {Array} messageHistory - The previous messages for context
 * @param {string} conversationId - Optional ID for continuing a conversation
 * @returns {Promise<Array>} - Array of structured message objects
 */
export const sendChatAndParse = async (message, messageHistory = [], conversationId = null) => {
  const abortController = new AbortController();
  
  try {
    // Send the chat request 
    const response = await sendChatRequest(
      message, 
      messageHistory, 
      abortController, 
      conversationId
    );
    
    // Parse the streaming response into a structured array
    return await parseStream(response, () => {});
  } catch (error) {
    console.error('Error in sendChatAndParse:', error);
    throw error;
  }
}; 