import React, { useState } from 'react';
import { CustomCollapse } from './MessageItem';
import { parseToolError } from '../../utils/toolUtils';

/**
 * Component for displaying tool calls
 */
const ToolMessage = ({ message }) => {
  // UI state - set to false for collapsed by default
  const [inputsExpanded, setInputsExpanded] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(false);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // UI toggle handlers
  const toggleExpanded = () => setExpanded(!expanded);
  const toggleInputs = () => setInputsExpanded(!inputsExpanded);
  const toggleOutput = () => setOutputExpanded(!outputExpanded);
  const toggleError = () => setErrorExpanded(!errorExpanded);

  // Extract data from message
  const toolName = message.toolName || message.jsonContent?.name || 'Tool Call';
  const toolArgs = message.args || message.jsonContent?.args || message.toolArgs || {};
  const toolOutput = message.toolOutput || message.toolResponse || '';
  
  // Check for errors
  let toolError = message.toolError || '';
  let hasError = !!toolError || !!message.hasToolError;
  
  // Parse error from content if not already processed
  if (!hasError && message.content && message.content.includes('<tool_error>')) {
    const errorResult = parseToolError(message.content);
    if (errorResult.hasError) {
      toolError = errorResult.error;
      hasError = true;
    }
  }
  
  // Format tool inputs for display
  const renderToolInputs = () => {
    if (!toolArgs || Object.keys(toolArgs).length === 0) {
      return <div className="text-gray-400 italic">No inputs</div>;
    }
    
    return Object.entries(toolArgs).map(([key, value]) => (
      <div key={key} className="mb-1">
        <span className="font-semibold">{key}:</span>{' '}
        <span className="whitespace-pre-wrap">{typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</span>
      </div>
    ));
  };

  return (
    <div className="flex items-start p-4 bg-gray-100 rounded-lg mb-2">
      <div className="flex-shrink-0 mr-4">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
          AI
        </div>
      </div>
      <div className="flex-grow">
        {/* Tool Call Box */}
        <div className="p-3 mb-2 bg-gray-200 rounded-lg border-l-4 border-blue-500">
          {/* Tool Header showing tool name prominently */}
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-300">
            <div className="font-bold text-blue-700 flex items-center">
              <button 
                onClick={toggleExpanded}
                className="text-gray-600 hover:text-gray-800 w-6 h-6 mr-2 flex items-center justify-center rounded hover:bg-gray-300"
              >
                {expanded ? '▼' : '►'}
              </button>
              <span className="mr-2">🔧</span>
              {toolName}
            </div>
          </div>
          
          {expanded && (
            <>
              {/* Tool Inputs Section */}
              <div className="mb-3">
                <div className="flex items-center mb-2 p-2 bg-gray-300 rounded cursor-pointer" onClick={toggleInputs}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleInputs();
                    }}
                    className="text-gray-600 hover:text-gray-800 w-6 h-6 mr-2 flex items-center justify-center rounded hover:bg-gray-200"
                  >
                    {inputsExpanded ? '▼' : '►'}
                  </button>
                  <div className="font-semibold text-gray-700">Inputs</div>
                </div>
                
                <CustomCollapse in={inputsExpanded}>
                  <div className="p-2 bg-gray-100 rounded border border-gray-300 text-sm">
                    {renderToolInputs()}
                  </div>
                </CustomCollapse>
              </div>
              
              {/* Tool Output Section */}
              {toolOutput && (
                <div className="mb-3">
                  <div className="flex items-center mb-2 p-2 bg-gray-300 rounded cursor-pointer" onClick={toggleOutput}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOutput();
                      }}
                      className="text-gray-600 hover:text-gray-800 w-6 h-6 mr-2 flex items-center justify-center rounded hover:bg-gray-200"
                    >
                      {outputExpanded ? '▼' : '►'}
                    </button>
                    <div className="font-semibold text-gray-700">Output</div>
                  </div>
                  
                  <CustomCollapse in={outputExpanded}>
                    <div className="p-2 bg-gray-100 rounded border border-gray-300 text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                      {toolOutput}
                    </div>
                  </CustomCollapse>
                </div>
              )}
              
              {/* Tool Error Section */}
              {hasError && toolError && (
                <div>
                  <div className="flex items-center mb-2 p-2 bg-red-200 rounded cursor-pointer" onClick={toggleError}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleError();
                      }}
                      className="text-gray-600 hover:text-gray-800 w-6 h-6 mr-2 flex items-center justify-center rounded hover:bg-red-100"
                    >
                      {errorExpanded ? '▼' : '►'}
                    </button>
                    <div className="font-semibold text-red-700">Error</div>
                  </div>
                  
                  <CustomCollapse in={errorExpanded}>
                    <div className="p-2 bg-red-50 rounded border border-red-300 text-sm whitespace-pre-wrap text-red-800 max-h-[400px] overflow-y-auto">
                      {toolError}
                    </div>
                  </CustomCollapse>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Text after tool call */}
        {message.textContent && (
          <div className="p-3 bg-blue-100 rounded-lg mt-2">
            <div className="whitespace-pre-wrap">{message.textContent}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolMessage; 