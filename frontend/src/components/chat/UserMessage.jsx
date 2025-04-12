import React from 'react';

const UserMessage = ({ message }) => {
  return (
    <div className="flex items-start p-4 justify-end mb-2">
      <div className="flex-grow-0 max-w-3/4 p-3 bg-green-100 rounded-lg">
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
      <div className="flex-shrink-0 ml-4">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
          U
        </div>
      </div>
    </div>
  );
};

export default UserMessage; 