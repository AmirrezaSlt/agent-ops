import React from 'react';

const SystemMessage = ({ message }) => {
  // For separators, show a simple line
  if (message.isSeparator) {
    return (
      <div className="flex justify-center my-2">
        <div className="w-3/4 border-t border-gray-300"></div>
      </div>
    );
  }
  
  // For error messages, show with red styling
  if (message.hasError) {
    return (
      <div className="flex justify-center my-2">
        <div className="px-3 py-2 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700 max-w-3/4">
          {message.content}
        </div>
      </div>
    );
  }
  
  // For regular system messages
  return (
    <div className="flex justify-center my-2">
      <div className="px-3 py-1 bg-gray-200 rounded-full text-sm text-gray-600">
        {message.content}
      </div>
    </div>
  );
};

export default SystemMessage; 