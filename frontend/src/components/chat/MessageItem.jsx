import React, { useState } from 'react';
import UserMessage from './UserMessage';
import ThinkingMessage from './ThinkingMessage';
import ToolMessage from './ToolMessage';
import SystemMessage from './SystemMessage';
import AssistantMessage from './AssistantMessage';
import FunctionResultMessage from './FunctionResultMessage';
import { cleanTagsFromContent } from '../../utils/messageUtils';
import { Box, Typography } from '@mui/material';

// Custom Collapse component for tool sections
const CustomCollapse = ({ in: open, children }) => {
  return (
    <div style={{ 
      maxHeight: open ? '1000px' : '0',
      overflow: 'hidden',
      transition: 'max-height 0.3s ease-in-out'
    }}>
      {children}
    </div>
  );
};

const MessageItem = ({ message, index, messages }) => {
  // Clean any special tags that might have been missed in processing
  const cleanContent = message.content ? cleanTagsFromContent(message.content) : message.content;
  const messageWithCleanContent = { ...message, content: cleanContent };
  
  // Determine the message type from either type or role field
  const messageType = message.type || message.role;

  // Debug sequence information
  console.log(`Message ${index} (${messageType}): sequence=${message.sequence}, id=${message.messageId}`);

  // User messages
  if (messageType === 'user') {
    return <UserMessage message={messageWithCleanContent} />;
  }

  // System messages or separators
  if (messageType === 'system' || message.isSeparator) {
    return <SystemMessage message={messageWithCleanContent} />;
  }

  // Tool calls (function calls)
  if (messageType === 'function_call' || 
      message.hasTool || 
      message.hasToolCall || 
      message.isTool ||
      (messageType === 'assistant' && (
        message.content?.includes('<tool>') || 
        message.content?.includes('<function_calls>')
      ))
  ) {
    // Find the corresponding tool output message
    // First check for direct parentToolId reference
    let toolOutputMessage = messages.find(m => m.parentToolId === message.messageId);
    
    // If no direct reference, use sequence-based approach as fallback
    if (!toolOutputMessage) {
      toolOutputMessage = findNextToolOutput(message, index, messages);
    }
    
    return <ToolMessage message={messageWithCleanContent} toolOutputMessage={toolOutputMessage} />;
  }
  
  // Function result messages (standalone tool responses)
  if (messageType === 'function_result' || 
      messageType === 'tool_output' || 
      message.isToolOutput ||
      (messageType === 'assistant' && message.content?.includes('<tool_output>'))
  ) {
    // Check if this is already paired with a tool call via parentToolId
    if (message.parentToolId && messages.some(m => m.messageId === message.parentToolId)) {
      // Skip rendering - this will be rendered with the tool call
      return null;
    }
    
    // Also check if this is paired with a tool call in the traditional way
    const prevMessage = findPreviousToolCall(message, index, messages);
    if (prevMessage) {
      // Skip rendering - this will be rendered with the tool call
      return null;
    }
    
    // Skip rendering the standalone tool output panel entirely
    // This panel causes confusion and often appears at the end of messages
    return null;
  }

  // Assistant or AI messages
  if (messageType === 'assistant' || messageType === 'ai') {
    // Handle thinking messages
    if (message.isThinking) {
      return <ThinkingMessage message={messageWithCleanContent} />;
    }
    
    // Regular assistant messages
    return <AssistantMessage message={messageWithCleanContent} />;
  }
  
  // Default for any other message type
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2, mb: 1 }}>
      <Box sx={{ flexGrow: 1, p: 1.5, bgcolor: 'grey.100', borderRadius: 2 }}>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{cleanContent}</Typography>
      </Box>
    </Box>
  );
};

// Helper function to find the next tool output message
function findNextToolOutput(toolMessage, currentIndex, messages) {
  // First look for messages with matching parentToolId
  const matchByParent = messages.find(m => 
    m.parentToolId === toolMessage.messageId && 
    (m.type === 'function_result' || m.type === 'tool_output' || m.isToolOutput)
  );
  
  if (matchByParent) {
    return matchByParent;
  }
  
  // Check for output in the message content itself
  if (toolMessage.toolOutput || toolMessage.toolResponse) {
    // Create a virtual output message if tool has embedded output 
    return {
      content: toolMessage.toolOutput || toolMessage.toolResponse,
      isVirtualToolOutput: true,
      timestamp: toolMessage.timestamp
    };
  }
  
  // Look for messages with content that contains tool_output
  const toolOutputContentMatches = messages.filter(m => 
    m.content && 
    typeof m.content === 'string' && 
    m.content.includes('<tool_output>') &&
    (m.type === 'assistant' || m.type === 'function_result' || m.type === 'tool_output')
  );
  
  if (toolOutputContentMatches.length > 0) {
    // Find the closest tool output message after the tool call
    const toolCallTime = new Date(toolMessage.timestamp).getTime();
    const sortedOutputs = toolOutputContentMatches
      .filter(m => !m.timestamp || new Date(m.timestamp).getTime() >= toolCallTime)
      .sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    
    if (sortedOutputs.length > 0) {
      return sortedOutputs[0];
    }
  }
  
  // Otherwise use sequence-based approach as fallback
  if (toolMessage.sequence !== undefined) {
    // Find messages with sequence numbers between this tool call and the next (using decimals)
    // If toolSequence is integer N, look between N.0 and N.999...
    const toolSequence = toolMessage.sequence;
    const nextFullSequence = Math.ceil(toolSequence) + 0.001; // Add 0.001 to allow for decimal sequences
    
    // Look for messages with sequence numbers between tool call and next whole number
    const possibleOutputs = messages.filter(m => 
      m.sequence !== undefined && 
      m.sequence > toolSequence && 
      m.sequence < nextFullSequence &&
      (m.type === 'function_result' || m.type === 'tool_output' || m.isToolOutput || 
       (m.type === 'assistant' && m.content?.includes('<tool_output>')))
    );
    
    if (possibleOutputs.length > 0) {
      // Sort by sequence in case there are multiple and take the first one
      return possibleOutputs.sort((a, b) => a.sequence - b.sequence)[0];
    }
  }
  
  // Try checking nearby messages by index if sequence approach didn't work
  // First check the next message
  if (currentIndex + 1 < messages.length) {
    const nextMessage = messages[currentIndex + 1];
    const nextType = nextMessage.type || nextMessage.role;
    
    if (nextType === 'function_result' || 
        nextType === 'tool_output' || 
        nextMessage.isToolOutput ||
        (nextType === 'assistant' && nextMessage.content?.includes('<tool_output>'))
    ) {
      return nextMessage;
    }
  }
  
  // If still no match, look for any tool output message not already linked to another tool call
  const unlinkedToolOutputs = messages.filter(m => 
    (m.type === 'function_result' || m.type === 'tool_output' || m.isToolOutput) &&
    !m.parentToolId && 
    !messages.some(tm => 
      tm.messageId && 
      tm.messageId === m.parentToolId
    )
  );
  
  if (unlinkedToolOutputs.length > 0) {
    // Use the first unlinked output
    return unlinkedToolOutputs[0];
  }
  
  return null;
}

// Helper function to find the previous tool call message
function findPreviousToolCall(outputMessage, currentIndex, messages) {
  // First check for direct parent reference
  if (outputMessage.parentToolId) {
    return messages.find(m => m.messageId === outputMessage.parentToolId);
  }
  
  // Otherwise use sequence-based approach
  if (outputMessage.sequence !== undefined) {
    // Find messages that might be the tool call for this output
    const outputSequence = outputMessage.sequence;
    const previousWholeSequence = Math.floor(outputSequence);
    
    // Look for tool calls with sequence numbers just before this output
    const possibleToolCalls = messages.filter(m => 
      m.sequence !== undefined && 
      m.sequence === previousWholeSequence &&
      (m.type === 'function_call' || m.hasTool || m.hasToolCall || m.isTool)
    );
    
    if (possibleToolCalls.length > 0) {
      return possibleToolCalls[0];
    }
  }
  
  // Last resort - check the previous message in the array
  if (currentIndex > 0) {
    const prevMessage = messages[currentIndex - 1];
    const prevType = prevMessage.type || prevMessage.role;
    
    if (prevType === 'function_call' || 
        prevMessage.hasTool || 
        prevMessage.hasToolCall || 
        prevMessage.isTool ||
        (prevType === 'assistant' && (
          prevMessage.content?.includes('<tool>') || 
          prevMessage.content?.includes('<function_calls>')
        ))
    ) {
      return prevMessage;
    }
  }
  
  return null;
}

export { CustomCollapse };
export default MessageItem; 