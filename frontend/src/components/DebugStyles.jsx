import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';

/**
 * Debug component to display styling information
 */
const DebugStyles = () => {
  const [cssFiles, setCssFiles] = useState([]);
  const [tailwindLoaded, setTailwindLoaded] = useState(false);
  
  useEffect(() => {
    // Check if Tailwind is loaded by looking for a known Tailwind class
    const allStylesheets = document.styleSheets;
    const tailwindRules = [];
    
    for (let i = 0; i < allStylesheets.length; i++) {
      try {
        const sheet = allStylesheets[i];
        const fileName = sheet.href || 'inline';
        
        for (let j = 0; j < sheet.cssRules.length; j++) {
          const rule = sheet.cssRules[j];
          if (rule.selectorText && (
            rule.selectorText.includes('.flex') || 
            rule.selectorText.includes('.bg-') ||
            rule.selectorText.includes('.text-')
          )) {
            tailwindRules.push(rule.selectorText);
          }
        }
        
        setCssFiles(prev => [...prev, fileName]);
      } catch (e) {
        // Security error - can't read cross-origin stylesheets
        setCssFiles(prev => [...prev, `${allStylesheets[i].href || 'inline'} (blocked)`]);
      }
    }
    
    setTailwindLoaded(tailwindRules.length > 0);
  }, []);
  
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
        top: 100,
        right: 0,
        zIndex: 9999,
        maxWidth: 350,
        maxHeight: '80vh',
        overflow: 'auto'
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>Style Debug</Typography>
      
      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
        Tailwind Classes: {tailwindLoaded ? 'FOUND' : 'NOT FOUND'}
      </Typography>
      
      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
        CSS Files ({cssFiles.length}):
      </Typography>
      <Box component="ul" sx={{ pl: 2, mt: 1, fontSize: '0.75rem' }}>
        {cssFiles.map((file, index) => (
          <Box component="li" key={index} sx={{ mb: 0.5, wordBreak: 'break-all' }}>
            {file}
          </Box>
        ))}
      </Box>
      
      <Button 
        variant="contained" 
        color="error" 
        size="small" 
        onClick={() => document.getElementById('debug-style-info').remove()}
        sx={{ mt: 2 }}
      >
        Close
      </Button>
    </Paper>
  );
};

export default DebugStyles; 