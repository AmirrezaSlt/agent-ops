import { generateMessageId } from './chatUtils';

/**
 * Handle assistant's thinking and regular response messages
 * @param {string} content - Message content
 * @param {boolean} isEnd - Whether this is the end of thinking
 * @param {object} messageIds - Collection of message IDs for the conversation
 * @param {function} addSequencedMessage - Function to add a sequenced message
 * @param {function} updateMessage - Function to update a message
 * @param {function} generateMessageId - Function to generate a message ID
 */
export const handleAssistantResponse = (
  content, 
  isEnd, 
  messageIds, 
  addSequencedMessage, 
  updateMessage,
  generateMessageId
) => {
  if (!content || !content.trim()) return;
  
  if (!messageIds.thinking) {
    // Create a new thinking message
    messageIds.thinking = generateMessageId();
    
    const thinkingMessage = {
      type: 'assistant',
      content: content,
      isThinking: true,
      timestamp: new Date().toISOString(),
      messageId: messageIds.thinking
    };
    
    addSequencedMessage(thinkingMessage);
  } else {
    // Update existing thinking message
    updateMessage(messageIds.thinking, { content });
  }
  
  // If thinking ended, add a separator and reset thinking ID
  if (isEnd) {
    addSequencedMessage({
      type: 'system',
      content: '---',
      isSeparator: true,
      timestamp: new Date().toISOString(),
      messageId: generateMessageId()
    });
    
    // Reset thinking ID to allow new thinking messages
    messageIds.thinking = null;
  }
};

/**
 * Handle tool message responses
 * @param {string} content - Message content
 * @param {boolean} isComplete - Whether this is a complete message
 * @param {object} messageIds - Collection of message IDs for the conversation
 * @param {function} addSequencedMessage - Function to add a sequenced message
 * @param {function} updateMessage - Function to update a message
 * @param {number} sequenceCounter - Current sequence counter
 * @param {function} addMessage - Function to add a message
 * @param {function} setSequenceCounter - Function to update sequence counter
 * @param {function} processMessage - Function to process a message
 */
export const handleToolMessages = (
  content, 
  isComplete, 
  messageIds, 
  addSequencedMessage, 
  updateMessage,
  sequenceCounter,
  addMessage,
  setSequenceCounter,
  processMessage
) => {
  if (!content || !content.trim()) return;
  
  // Check if this content contains a tool call
  if (content.includes('<tool>') || content.includes('<function_calls>')) {
    // Extract tool data
    try {
      // Handle case where entire message is a tool tag
      let toolName = 'unknown_tool';
      let toolArgs = {};
      
      // Try to extract the tool from the content
      const toolMatch = content.match(/<tool>(.*?)<\/tool>/s);
      if (toolMatch && toolMatch[1]) {
        try {
          const toolData = JSON.parse(toolMatch[1]);
          toolName = toolData.name || toolName;
          toolArgs = toolData.args || toolArgs;
        } catch (e) {
          console.error('Failed to parse tool JSON:', e);
        }
      }
      
      if (!messageIds.tool) {
        messageIds.tool = generateMessageId();
        
        const toolCallMessage = {
          type: 'function_call',
          content: content,
          timestamp: new Date().toISOString(),
          messageId: messageIds.tool,
          toolName,
          args: toolArgs,
          hasTool: true,
          // Set explicit sequence for ordering
          sequence: sequenceCounter
        };
        
        addSequencedMessage(toolCallMessage);
        setSequenceCounter(prevCounter => prevCounter + 1);
      } else {
        // Update existing tool message
        updateMessage(messageIds.tool, { 
          content, 
          toolName, 
          args: toolArgs 
        });
      }
      
      return;
    } catch (e) {
      console.error('Error handling tool call:', e);
    }
  }
  
  // Check if this content contains a tool output
  if (content.includes('<tool_output>') || content.includes('<function_output>')) {
    try {
      // Try to extract the output value
      let outputContent = content;
      
      const outputMatch = content.match(/<tool_output>(.*?)<\/tool_output>/s) ||
                         content.match(/<function_output>(.*?)<\/function_output>/s);
      
      if (outputMatch && outputMatch[1]) {
        try {
          // Handle raw JSON format or JSON within string format
          let output = outputMatch[1].trim();
          
          try {
            const parsed = JSON.parse(output);
            if (parsed.output) {
              output = parsed.output;
            } else if (parsed.error !== undefined) {
              // Handle error output
              outputContent = `Error: ${parsed.error}`;
            } else {
              // Use formatted JSON
              outputContent = JSON.stringify(parsed, null, 2);
            }
          } catch (e) {
            // Not valid JSON, use as is
            outputContent = output;
          }
        } catch (e) {
          // Use match directly if parsing fails
          outputContent = outputMatch[1];
        }
      }
      
      if (!messageIds.toolOutput) {
        const messageId = generateMessageId();
        messageIds.toolOutput = messageId;
        
        const toolOutputMessage = {
          type: 'function_result',
          content: outputContent,
          timestamp: new Date().toISOString(),
          messageId,
          isToolOutput: true,
          // Ensure tool output comes right after tool call
          sequence: messageIds.tool ? 
            (parseInt(messageIds.tool.split('-')[0]) + 0.5) : // Sequence between tool call and any following messages
            sequenceCounter + 0.5 // If no tool ID, just use current counter + 0.5
        };
        
        addSequencedMessage(toolOutputMessage);
      } else {
        // Update existing tool output message
        updateMessage(messageIds.toolOutput, { content: outputContent });
      }
      
      return;
    } catch (e) {
      console.error('Error handling tool output:', e);
    }
  }
  
  // For post-tool messages, we want to ALWAYS use the same message ID after a tool
  // to ensure all assistant content appears in a single message
  if (messageIds.tool || messageIds.toolOutput) {
    // If we already have a post-tool assistant message, update it
    if (messageIds.assistant) {
      // Update existing assistant message
      
      // Simply update with the full accumulated content that was passed in
      // No concatenation needed since the full accumulated content is in the 'content' parameter
      updateMessage(messageIds.assistant, { content });
    } else {
      // Create a new post-tool assistant message
      messageIds.assistant = generateMessageId();
      
      // Set sequence to ensure it appears after the tool response
      let sequence = sequenceCounter + 1;
      if (messageIds.toolOutput) {
        // Try to get sequence from tool output ID
        const toolOutputIdParts = messageIds.toolOutput.split('-');
        if (toolOutputIdParts[0] && !isNaN(parseInt(toolOutputIdParts[0]))) {
          sequence = parseInt(toolOutputIdParts[0]) + 1;
        }
      }
      
      const assistantMessage = {
        type: 'assistant',
        content: content,
        timestamp: new Date().toISOString(),
        messageId: messageIds.assistant,
        isPostTool: true,
        sequence: sequence
      };
      
      // Process the message to extract tool calls
      const processedMessage = processMessage(assistantMessage);
      addMessage(processedMessage);
      setSequenceCounter(sequence + 1);
    }
  } else {
    // Standard assistant message handling (not after a tool)
    if (!messageIds.assistant) {
      // Create a new assistant message
      messageIds.assistant = generateMessageId();
      
      const assistantMessage = {
        type: 'assistant',
        content: content,
        timestamp: new Date().toISOString(),
        messageId: messageIds.assistant,
        sequence: sequenceCounter
      };
      
      // Process the message to extract tool calls
      const processedMessage = processMessage(assistantMessage);
      addSequencedMessage(processedMessage);
      setSequenceCounter(prevCounter => prevCounter + 1);
    } else {
      // Update existing assistant message
      
      // Simply update with the full accumulated content
      updateMessage(messageIds.assistant, { content });
    }
  }
}; 