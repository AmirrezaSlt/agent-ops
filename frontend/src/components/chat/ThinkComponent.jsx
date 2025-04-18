import React, { useState } from 'react';
import { Box, Typography, Paper, Collapse, IconButton } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

/**
 * Component for displaying thinking content (collapsed by default)
 */
const ThinkComponent = ({ content, isFinished }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 2,
        backgroundColor: 'rgba(230, 230, 255, 0.4)',
        borderLeft: '4px solid #9c27b0',
        borderRadius: '4px',
        maxWidth: '85%', // Standardized width
        mr: 'auto',
        ml: 0,
        opacity: isFinished ? 1 : 0.7,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 1 : 0 }}>
        <IconButton size="small" onClick={toggleExpanded} sx={{ p: 0, mr: 1 }}>
          {expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
        </IconButton>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
          <PsychologyIcon sx={{ mr: 0.5, fontSize: '0.9rem', color: '#9c27b0' }} />
          Thinking{!isFinished && '...'}
        </Typography>
      </Box>
      
      <Collapse in={expanded}>
        <Typography 
          component="div" 
          variant="body2"
          sx={{ 
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            mt: 1
          }}
        >
          {content}
        </Typography>
      </Collapse>
    </Paper>
  );
};

export default ThinkComponent; 