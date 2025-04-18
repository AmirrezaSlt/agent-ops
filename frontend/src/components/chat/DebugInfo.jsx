import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

/**
 * Debug component to display styling information
 */
const DebugInfo = () => {
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        m: 2, 
        backgroundColor: 'warning.light',
        border: '2px solid',
        borderColor: 'warning.main',
        position: 'fixed',
        bottom: 0,
        right: 0,
        zIndex: 9999,
        maxWidth: 300
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>Debug Information</Typography>
      <Typography variant="body2">
        Window Width: {window.innerWidth}px
      </Typography>
      <Typography variant="body2">
        Window Height: {window.innerHeight}px
      </Typography>
      <Typography variant="body2">
        User Agent: {navigator.userAgent}
      </Typography>
    </Paper>
  );
};

export default DebugInfo; 