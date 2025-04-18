import React from 'react';
import { Box, Paper, Typography, Avatar } from '@mui/material';

const UserMessage = ({ message }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2, mb: 1, justifyContent: 'flex-end' }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 1.5, 
          maxWidth: '75%',
          bgcolor: 'success.light',
          borderRadius: 2
        }}
      >
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </Typography>
      </Paper>
      <Avatar 
        sx={{ 
          width: 32, 
          height: 32, 
          bgcolor: 'success.main', 
          ml: 2, 
          fontSize: '0.875rem'
        }}
      >
        U
      </Avatar>
    </Box>
  );
};

export default UserMessage; 