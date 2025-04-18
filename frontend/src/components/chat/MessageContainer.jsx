import React from 'react';
import ThinkComponent from './ThinkComponent';
import ToolComponent from './ToolComponent';
import AnswerComponent from './AnswerComponent';
import { Box, Typography, Paper } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

/**
 * A container component that renders the appropriate component based on message type
 */
const MessageContainer = ({ message }) => {
  if (!message) return null;

  // Render user messages on the right
  if (message.type === 'user') {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: 'rgba(225, 235, 245, 0.5)',
          borderRight: '4px solid #42a5f5',
          borderLeft: 'none',
          borderRadius: '4px',
          maxWidth: '95%',
          ml: 'auto', // Right align for user messages
          mr: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" color="#42a5f5">
            You
          </Typography>
          <PersonIcon sx={{ ml: 1, color: '#42a5f5' }} />
        </Box>
        <Typography
          component="div"
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6
          }}
        >
          {message.content}
        </Typography>
      </Paper>
    );
  }

  // Render all assistant messages on the left
  // Each component (ThinkComponent, ToolComponent, AnswerComponent) 
  // already has mr: 'auto', ml: 0 to position on the left
  switch (message.type) {
    case 'think':
      return <ThinkComponent content={message.content} isFinished={message.isFinished} />;
    case 'tool':
      return <ToolComponent content={message.content} isFinished={message.isFinished} />;
    case 'answer':
      return <AnswerComponent content={message.content} isFinished={message.isFinished} />;
    default:
      return null;
  }
};

export default MessageContainer; 