import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Divider, Collapse, IconButton } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

/**
 * Component for displaying tool usage and results (collapsed by default)
 */
const ToolComponent = ({ content, isFinished }) => {
  const [expanded, setExpanded] = useState(false);
  const [parsedInput, setParsedInput] = useState('');
  const [parsedOutput, setParsedOutput] = useState('');
  const [toolName, setToolName] = useState('');
  
  // Parse the tool content
  useEffect(() => {
    if (!content) return;
    
    try {
      // Try parsing the content as JSON
      const toolObj = JSON.parse(content);
      
      // Extract tool name, input, and output
      let name = toolObj.name || 'Unknown Tool';
      let input = '';
      let output = '';
      
      // Handle different tool content structures
      if (toolObj.input) {
        input = typeof toolObj.input === 'object' 
          ? JSON.stringify(toolObj.input, null, 2) 
          : toolObj.input.toString();
      }
      
      if (toolObj.output) {
        output = typeof toolObj.output === 'object' 
          ? JSON.stringify(toolObj.output, null, 2) 
          : toolObj.output.toString();
      }
      
      setToolName(name);
      setParsedInput(input);
      setParsedOutput(output);
    } catch (e) {
      // If parsing fails, try to extract information using regex
      console.error('Error parsing tool content:', e);
      
      // Basic regex parsing as fallback
      const nameMatch = content.match(/"name"\s*:\s*"([^"]+)"/);
      if (nameMatch) {
        setToolName(nameMatch[1]);
      }
      
      // Set the raw content as input/output for unparseable content
      setParsedInput(content);
      setParsedOutput('');
    }
  }, [content]);
  
  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 2,
        backgroundColor: 'rgba(230, 245, 230, 0.4)',
        borderLeft: '4px solid #2e7d32',
        borderRadius: '4px',
        maxWidth: '85%', // Standardized width
        mr: 'auto',
        ml: 0,
        opacity: isFinished ? 1 : 0.85,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 1 : 0 }}>
        <IconButton size="small" onClick={toggleExpanded} sx={{ p: 0, mr: 1 }}>
          {expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
        </IconButton>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
          <BuildIcon sx={{ mr: 0.5, fontSize: '0.9rem', color: '#2e7d32' }} />
          {toolName}{!isFinished && '...'}
        </Typography>
      </Box>
      
      <Collapse in={expanded}>
        {parsedInput && (
          <>
            <Typography variant="caption" color="text.secondary">Input:</Typography>
            <Typography 
              component="div" 
              variant="body2"
              sx={{ 
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                backgroundColor: 'rgba(0,0,0,0.03)',
                p: 1,
                borderRadius: 1,
                maxHeight: '200px',
                overflowY: 'auto',
                mb: 1
              }}
            >
              {parsedInput}
            </Typography>
          </>
        )}
        
        {parsedOutput && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary">Output:</Typography>
            <Typography 
              component="div" 
              variant="body2"
              sx={{ 
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                backgroundColor: 'rgba(0,0,0,0.03)',
                p: 1,
                borderRadius: 1,
                maxHeight: '300px',
                overflowY: 'auto'
              }}
            >
              {parsedOutput}
            </Typography>
          </>
        )}
      </Collapse>
    </Paper>
  );
};

export default ToolComponent; 