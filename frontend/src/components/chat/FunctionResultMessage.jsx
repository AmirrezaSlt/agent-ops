import React, { useState, useEffect } from 'react';
import { parseToolOutput } from '../../utils/toolUtils';
import { CustomCollapse } from './MessageItem';

/**
 * Component for displaying tool/function results from the LLM
 */
const FunctionResultMessage = ({ message }) => {
  const [displayContent, setDisplayContent] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default
  
  useEffect(() => {
    // Use the utility function to parse the tool response
    const result = parseToolOutput(message.content);
    
    setDisplayContent(result.displayContent);
    setHasError(result.hasError);
  }, [message.content]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="flex items-start p-4 bg-gray-100 rounded-lg mb-2">
      <div className="flex-shrink-0 mr-4">
        <div className={`w-8 h-8 ${hasError ? 'bg-red-500' : 'bg-green-500'} rounded-full flex items-center justify-center text-white`}>
          {hasError ? '⚠️' : '🔧'}
        </div>
      </div>
      <div className="flex-grow">
        <div className={`p-3 rounded-lg ${hasError ? 'bg-red-100 border-l-4 border-red-400' : 'bg-green-100 border-l-4 border-green-400'}`}>
          <div className="flex items-center mb-2 p-2 rounded cursor-pointer bg-opacity-50 bg-white" onClick={toggleExpand}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
              className="text-gray-600 hover:text-gray-800 w-6 h-6 mr-2 flex items-center justify-center rounded hover:bg-gray-200"
            >
              {isExpanded ? '▼' : '►'}
            </button>
            <div className="text-sm font-medium text-gray-800 flex items-center">
              <span className="mr-2">{hasError ? '❌' : '✓'}</span>
              {hasError ? 'Tool Error' : 'Tool Output'}
            </div>
          </div>
          
          <CustomCollapse in={isExpanded}>
            <div className="whitespace-pre-wrap max-h-[500px] overflow-y-auto p-2 bg-white bg-opacity-70 rounded">
              {displayContent}
            </div>
          </CustomCollapse>
        </div>
      </div>
    </div>
  );
};

export default FunctionResultMessage; 