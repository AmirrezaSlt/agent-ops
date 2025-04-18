import React from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';

const SystemMessage = ({ message }) => {
  // For separators, show a simple line
  if (message.isSeparator) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <Divider sx={{ width: '75%' }} />
      </Box>
    );
  }
  
  // For error messages, show with red styling
  if (message.hasError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            px: 2, 
            py: 1, 
            bgcolor: 'error.light', 
            border: 1, 
            borderColor: 'error.main', 
            borderRadius: 2,
            maxWidth: '75%'
          }}
        >
          <Typography variant="body2" color="error.dark">
            {message.content}
          </Typography>
        </Paper>
      </Box>
    );
  }
  
  // For regular system messages
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
      <Paper 
        elevation={0} 
        sx={{ 
          px: 2, 
          py: 0.5, 
          bgcolor: 'grey.200', 
          borderRadius: 'full' 
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {message.content}
        </Typography>
      </Paper>
    </Box>
  );
};

export default SystemMessage; 