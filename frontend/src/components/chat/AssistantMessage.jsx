import React from 'react';

const AssistantMessage = ({ message }) => {
  // Check if this is a message that follows a tool
  const isPostTool = message.isPostTool || message.postToolContent;
  
  return (
    <div className="flex items-start p-4 bg-gray-100 rounded-lg mb-2">
      <div className="flex-shrink-0 mr-4">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
          AI
        </div>
      </div>
      <div className="flex-grow">
        <div className={`p-3 rounded-lg ${isPostTool ? 'bg-purple-100 border-l-4 border-purple-400' : 'bg-blue-100'}`}>
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    </div>
  );
};

export default AssistantMessage; 