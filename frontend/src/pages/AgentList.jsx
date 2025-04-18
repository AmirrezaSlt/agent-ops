import { useState, useEffect } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Divider, 
  IconButton, 
  Tooltip, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  DialogActions,
  Button,
  Paper,
  CircularProgress
} from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import HistoryIcon from '@mui/icons-material/History';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import useAgentStore from '../store/agentStore';
import useConversationStore from '../store/conversationStore';
import { useNavigate } from 'react-router-dom';

function AgentList() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const { agents, loading, error, fetchAgents, setCurrentChatAgent } = useAgentStore();
  const { 
    conversations, 
    loading: conversationsLoading, 
    error: conversationsError, 
    fetchConversations,
    setCurrentConversation
  } = useConversationStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleShowDetails = (agent) => {
    setSelectedAgent(agent);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
  };

  const handleShowConversations = (agent) => {
    setSelectedAgent(agent);
    fetchConversations(agent.id); // Fetch conversations for the specific agent
    setShowConversations(true);
  };

  const handleCloseConversations = () => {
    setShowConversations(false);
  };

  const handleOpenConversation = (conversation) => {
    setCurrentConversation(conversation);
    navigate(`/chat/agent/${selectedAgent.id}/conversation/${conversation.id}`);
    setShowConversations(false);
  };

  const handleNewChat = (agent) => {
    setCurrentChatAgent(agent);
    navigate(`/chat/agent/${agent.id}`);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Agents</Typography>
      {loading && <Typography>Loading...</Typography>}
      {error && <Typography color="error">{error}</Typography>}
      <List>
        {agents.map(agent => (
          <div key={agent.id}>
            <ListItem
              secondaryAction={
                <>
                  <Tooltip title="Agent Info">
                    <IconButton onClick={() => handleShowDetails(agent)}>
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="New Chat">
                    <IconButton color="primary" onClick={() => handleNewChat(agent)}>
                      <CreateIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Previous Conversations">
                    <IconButton 
                      color="secondary" 
                      onClick={() => handleShowConversations(agent)} 
                      sx={{ ml: 1 }}
                    >
                      <HistoryIcon />
                    </IconButton>
                  </Tooltip>
                </>
              }
            >
              <ListItemText
                primary={agent.name}
                secondary={agent.role}
              />
            </ListItem>
            <Divider />
          </div>
        ))}
      </List>

      {/* Agent Details Dialog */}
      <Dialog open={showDetails} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedAgent?.name}
          <IconButton
            aria-label="close"
            onClick={handleCloseDetails}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedAgent && (
            <>
              <Typography variant="subtitle1" fontWeight="bold">Role</Typography>
              <Typography paragraph>{selectedAgent.role || 'No role specified'}</Typography>
              
              <Typography variant="subtitle1" fontWeight="bold">Description</Typography>
              <Typography paragraph>{selectedAgent.description || 'No description available'}</Typography>
              
              <Typography variant="subtitle1" fontWeight="bold">Created</Typography>
              <Typography paragraph>{formatDate(selectedAgent.created_at)}</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Previous Conversations Dialog */}
      <Dialog open={showConversations} onClose={handleCloseConversations} maxWidth="md" fullWidth>
        <DialogTitle>
          Previous Conversations with {selectedAgent?.name}
          <IconButton
            aria-label="close"
            onClick={handleCloseConversations}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {conversationsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : conversationsError ? (
            <Typography color="error">{conversationsError}</Typography>
          ) : conversations.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography variant="body1">No previous conversations with this agent.</Typography>
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 2 }}
                onClick={() => handleNewChat(selectedAgent)}
              >
                Start a new conversation
              </Button>
            </Box>
          ) : (
            <List>
              {conversations.map(conversation => (
                <Paper key={conversation.id} elevation={1} sx={{ mb: 2, cursor: 'pointer' }}>
                  <ListItem 
                    button 
                    onClick={() => handleOpenConversation(conversation)}
                  >
                    <ListItemText
                      primary={conversation.title || 'Untitled Conversation'}
                      secondary={
                        <>
                          <Typography component="span" variant="body2">
                            {formatDate(conversation.created_at)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConversations}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AgentList;