import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

function Header() {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ fontWeight: 'bold', color: 'white', textDecoration: 'none' }}>
            AgentOps
          </Typography>
          <Typography variant="caption" component="div">
            AI Agent Management Platform
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            component={RouterLink} 
            to="/" 
            color="inherit"
          >
            Agents
          </Button>
          <Button 
            component={RouterLink} 
            to="/chat" 
            color="inherit"
          >
            Chat
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header; 