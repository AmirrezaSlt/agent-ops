import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Collapse,
  Divider,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CodeIcon from '@mui/icons-material/Code';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BuildIcon from '@mui/icons-material/Build';
import { parseToolError } from '../../utils/toolUtils';

/**
 * Component for displaying tool calls
 */
const ToolMessage = ({ message, toolOutputMessage }) => {
  // UI state - all sections collapsed by default
  const [expanded, setExpanded] = useState(false);
  const [inputsExpanded, setInputsExpanded] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(false);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [parsedToolArgs, setParsedToolArgs] = useState({});

  // UI toggle handlers
  const toggleExpanded = () => setExpanded(!expanded);
  const toggleInputs = (e) => {
    e.stopPropagation();
    setInputsExpanded(!inputsExpanded);
  };
  const toggleOutput = (e) => {
    e.stopPropagation();
    setOutputExpanded(!outputExpanded);
  };
  const toggleError = (e) => {
    e.stopPropagation();
    setErrorExpanded(!errorExpanded);
  };

  // Extract data from message
  const toolName = message.toolName || message.jsonContent?.name || 'Tool Call';
  const toolArgs = message.args || message.jsonContent?.args || message.toolArgs || {};
  
  // Extract tool output from either the provided toolOutputMessage or from the message itself
  let toolOutput = message.toolOutput || message.toolResponse || '';
  if (toolOutputMessage) {
    // Handle both direct content and nested content
    if (toolOutputMessage.content) {
      if (typeof toolOutputMessage.content === 'string') {
        // If it's a string, check if it has a tool_output tag
        if (toolOutputMessage.content.includes('<tool_output>')) {
          // Extract content between tool_output tags
          const match = toolOutputMessage.content.match(/<tool_output>(.*?)<\/tool_output>/s);
          if (match && match[1]) {
            toolOutput = match[1].trim();
          } else {
            toolOutput = toolOutputMessage.content.replace(/<\/?tool_output>/g, '').trim();
          }
        } else {
          // Use the content directly
          toolOutput = toolOutputMessage.content;
        }
      } else if (typeof toolOutputMessage.content === 'object') {
        // If it's an object, stringify it
        toolOutput = JSON.stringify(toolOutputMessage.content, null, 2);
      }
    } else if (toolOutputMessage.isVirtualToolOutput) {
      // Handle virtual tool outputs created by the MessageItem component
      toolOutput = toolOutputMessage.content;
    }
  }
  
  // If we have output, ensure the output section is highlighted even when collapsed
  const hasOutput = toolOutput && toolOutput.trim().length > 0;
  
  // Timestamp if available
  const timestamp = message.timestamp || message.created_at || 
                    (toolOutputMessage && (toolOutputMessage.timestamp || toolOutputMessage.created_at));
                    
  // Indicate whether this tool and its output are properly linked
  const isProperlyLinked = toolOutputMessage && (
    toolOutputMessage.parentToolId === message.messageId || 
    toolOutputMessage.sequence && message.sequence && 
    (toolOutputMessage.sequence > message.sequence && toolOutputMessage.sequence < message.sequence + 1)
  );
  
  // Parse tool args on mount or when message changes
  useEffect(() => {
    // Try to extract tool arguments from content if not directly available
    if (message.content && (typeof toolArgs !== 'object' || Object.keys(toolArgs).length === 0)) {
      try {
        // Check if content includes JSON
        if (message.content.includes('{') && message.content.includes('}')) {
          // Look for JSON within <tool> tags or directly
          const jsonMatch = message.content.match(/<tool>(.*?)<\/tool>/s) || 
                           message.content.match(/{.*}/s);
          
          if (jsonMatch && jsonMatch[1]) {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.args) {
              setParsedToolArgs(parsed.args);
            } else if (typeof parsed === 'object') {
              setParsedToolArgs(parsed);
            }
          }
        }
      } catch (e) {
        console.error('Error parsing tool args from content:', e);
      }
    } else {
      setParsedToolArgs(toolArgs);
    }
  }, [message, toolArgs]);
  
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
  
  // Check for errors in tool output
  if (!hasError && toolOutput) {
    if (typeof toolOutput === 'string' && toolOutput.toLowerCase().includes('error')) {
      hasError = true;
      toolError = toolOutput;
    }
  }
  
  // Format tool inputs for display
  const renderToolInputs = () => {
    const argsToRender = Object.keys(parsedToolArgs).length > 0 ? parsedToolArgs : toolArgs;
    
    if (!argsToRender || Object.keys(argsToRender).length === 0) {
      return <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>No inputs</Typography>;
    }
    
    return Object.entries(argsToRender).map(([key, value]) => (
      <Box key={key} sx={{ mb: 1 }}>
        <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold' }}>
          {key}:
        </Typography>{' '}
        <Typography
          component="span"
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            bgcolor: 'background.paper',
            p: 0.5,
            borderRadius: 1
          }}
        >
          {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
        </Typography>
      </Box>
    ));
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2, mb: 1.5 }}>
      <Avatar 
        sx={{ 
          width: 32, 
          height: 32, 
          bgcolor: 'primary.main', 
          mr: 2, 
          fontSize: '0.875rem'
        }}
      >
        AI
      </Avatar>
      <Box sx={{ flexGrow: 1 }}>
        <Paper
          elevation={1}
          sx={{
            bgcolor: 'grey.100',
            borderRadius: 2,
            borderLeft: '4px solid',
            borderColor: 'info.main'
          }}
        >
          {/* Tool Header */}
          <Box
            onClick={toggleExpanded}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 1.5,
              cursor: 'pointer',
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
              bgcolor: 'grey.200'
            }}
          >
            <IconButton
              size="small"
              onClick={toggleExpanded}
              aria-expanded={expanded}
              aria-label={expanded ? 'collapse tool' : 'expand tool'}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <BuildIcon sx={{ color: 'info.main', mr: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'info.main' }}>
              {toolName}
            </Typography>
            {hasOutput && !expanded && (
              <Chip 
                size="small" 
                label="Output Available" 
                color="success" 
                variant="outlined" 
                sx={{ ml: 1, height: 20 }} 
              />
            )}
            <Box sx={{ flexGrow: 1 }} />
          </Box>

          <Collapse in={expanded}>
            <Divider />
            
            {/* Inputs Section */}
            <Box sx={{ p: 1.5 }}>
              <Box
                onClick={toggleInputs}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1,
                  cursor: 'pointer',
                  bgcolor: 'grey.200',
                  borderRadius: 1,
                  mb: inputsExpanded ? 1 : 0
                }}
              >
                <IconButton size="small" onClick={toggleInputs}>
                  {inputsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                <Typography variant="subtitle2">Inputs</Typography>
              </Box>
              
              <Collapse in={inputsExpanded}>
                <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                  {renderToolInputs()}
                </Box>
              </Collapse>
            </Box>
            
            {/* Output Section */}
            <Box sx={{ p: 1.5, pt: 0 }}>
              <Box
                onClick={toggleOutput}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1,
                  cursor: 'pointer',
                  bgcolor: hasOutput ? 'success.light' : 'grey.200',
                  borderRadius: 1,
                  mb: outputExpanded ? 1 : 0
                }}
              >
                <IconButton size="small" onClick={toggleOutput}>
                  {outputExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                <Typography variant="subtitle2" color={hasOutput ? 'success.dark' : 'inherit'}>
                  Output
                </Typography>
                {hasOutput && (
                  <Chip 
                    size="small" 
                    label={isProperlyLinked ? "Linked" : "Available"} 
                    color={isProperlyLinked ? "success" : "primary"} 
                    variant="outlined" 
                    sx={{ ml: 1, height: 20 }} 
                  />
                )}
              </Box>
              
              <Collapse in={outputExpanded}>
                <Box 
                  sx={{ 
                    p: 1, 
                    bgcolor: 'background.paper', 
                    borderRadius: 1,
                    maxHeight: 300,
                    overflow: 'auto',
                    border: hasOutput ? '1px solid' : 'none',
                    borderColor: 'success.light'
                  }}
                >
                  {toolOutput ? (
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {toolOutput}
                    </Typography>
                  ) : (
                    <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No output available
                    </Typography>
                  )}
                </Box>
              </Collapse>
            </Box>
            
            {/* Error Section */}
            {hasError && toolError && (
              <Box sx={{ p: 1.5, pt: 0 }}>
                <Box
                  onClick={toggleError}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1,
                    cursor: 'pointer',
                    bgcolor: 'error.light',
                    borderRadius: 1,
                    mb: errorExpanded ? 1 : 0
                  }}
                >
                  <IconButton size="small" onClick={toggleError}>
                    {errorExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                  <ErrorOutlineIcon sx={{ mr: 1, color: 'error.main' }} />
                  <Typography variant="subtitle2" color="error.main">Error</Typography>
                </Box>
                
                <Collapse in={errorExpanded}>
                  <Box 
                    sx={{ 
                      p: 1, 
                      bgcolor: 'error.lighter', 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'error.light'
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="error.main"
                      sx={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {toolError}
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            )}
          </Collapse>
        </Paper>
        
        {/* Message Timestamp */}
        {timestamp && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              color: 'text.secondary', 
              mt: 0.5, 
              textAlign: 'right',
              pr: 1
            }}
          >
            {new Date(timestamp).toLocaleTimeString()}
          </Typography>
        )}
        
        {/* Text after tool call */}
        {message.textContent && (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mt: 1,
              bgcolor: 'primary.50',
              borderRadius: 2
            }}
          >
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.textContent}</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ToolMessage; 