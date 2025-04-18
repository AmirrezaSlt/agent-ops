import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';

/**
 * Component for displaying answer content
 */
const AnswerComponent = ({ content, isFinished }) => {
  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 2,
        backgroundColor: 'rgba(240, 240, 240, 0.5)',
        borderLeft: '4px solid #1976d2',
        borderRadius: '4px',
        maxWidth: '85%',
        mr: 'auto',
        ml: 0,
        opacity: isFinished ? 1 : 0.8,
      }}
    >
      {!isFinished && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
            <ChatIcon sx={{ mr: 0.5, fontSize: '0.9rem', color: '#1976d2' }} />
            Typing...
          </Typography>
        </Box>
      )}
      <Typography 
        component="div" 
        variant="body2"
        sx={{ 
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6
        }}
      >
        {content}
      </Typography>
    </Paper>
  );
};

export default AnswerComponent; 