import React, { useState } from 'react';
import UserMessage from './UserMessage';
import ThinkingMessage from './ThinkingMessage';
import ToolMessage from './ToolMessage';
import SystemMessage from './SystemMessage';
import AssistantMessage from './AssistantMessage';
import FunctionResultMessage from './FunctionResultMessage';
import { cleanTagsFromContent } from '../../utils/messageUtils';

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

  // User messages
  if (messageType === 'user') {
    return <UserMessage message={messageWithCleanContent} />;
  }

  // System messages or separators
  if (messageType === 'system' || message.isSeparator) {
    return <SystemMessage message={messageWithCleanContent} />;
  }

  // Assistant or AI messages
  if (messageType === 'assistant' || messageType === 'ai') {
    // Handle thinking messages
    if (message.isThinking) {
      return <ThinkingMessage message={messageWithCleanContent} />;
    }
    
    // Handle tool messages
    if (message.hasTool || message.hasToolCall || message.isTool) {
      return <ToolMessage message={messageWithCleanContent} />;
    }
    
    // Regular assistant messages
    return <AssistantMessage message={messageWithCleanContent} />;
  }
  
  // Function result messages (standalone tool responses)
  if (messageType === 'function_result' || messageType === 'tool_output') {
    return <FunctionResultMessage message={messageWithCleanContent} />;
  }
  
  // Default for any other message type
  return (
    <div className="flex items-start p-4 bg-gray-100 rounded-lg mb-2">
      <div className="flex-grow p-3 bg-gray-100 rounded-lg">
        <div className="whitespace-pre-wrap">{cleanContent}</div>
      </div>
    </div>
  );
};

export { CustomCollapse };
export default MessageItem; 