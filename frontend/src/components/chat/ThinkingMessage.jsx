import React, { useState } from 'react';
import { Box, Avatar, Paper, Typography, IconButton, Collapse } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const ThinkingMessage = ({ message }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded(prev => !prev);
  };

  // Ensure content is a string and not undefined
  const safeContent = message.content || '';
  
  return (
    <Box sx={{ 
      display: 'flex', 
      p: 2, 
      bgcolor: 'grey.100', 
      borderRadius: 2, 
      mb: 1, 
      width: '100%' 
    }}>
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
      <Paper 
        elevation={0} 
        sx={{ 
          width: '100%', 
          bgcolor: 'warning.light', 
          borderRadius: 2, 
          borderLeft: '4px solid', 
          borderColor: 'warning.main', 
          p: 1.5 
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 1 : 0, color: 'warning.dark' }}>
          <IconButton 
            size="small" 
            onClick={toggleExpanded} 
            aria-expanded={expanded}
            aria-label={expanded ? "collapse thinking process" : "expand thinking process"}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <LightbulbIcon sx={{ mr: 1, fontSize: '1.25rem' }} />
          <Typography variant="subtitle2">Thinking Process</Typography>
          <Box sx={{ flexGrow: 1 }} />
        </Box>
        
        <Collapse in={expanded}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace', 
              whiteSpace: 'pre-wrap', 
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              pt: 1,
              maxHeight: '60vh',
              overflow: 'auto',
              borderTop: '1px dashed',
              borderColor: 'warning.main'
            }}
          >
            {safeContent}
          </Typography>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default ThinkingMessage; 