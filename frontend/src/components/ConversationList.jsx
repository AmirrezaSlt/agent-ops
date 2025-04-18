import React, { useEffect } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemButton,
  ListItemSecondaryAction,
  Typography, 
  Paper,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatIcon from '@mui/icons-material/Chat';
import AddIcon from '@mui/icons-material/Add';
import useConversationStore from '../store/conversationStore';

/**
 * Component for displaying a list of conversations
 */
function ConversationList({ onSelectConversation, onNewConversation }) {
  // Get state and actions from the conversation store
  const { 
    conversations, 
    loading, 
    error, 
    fetchConversations,
    currentConversation,
    setCurrentConversation,
    deleteConversation
  } = useConversationStore();

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle selecting a conversation
  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
    if (onSelectConversation) {
      onSelectConversation(conversation.id);
    }
  };

  // Handle starting a new conversation
  const handleNewConversation = () => {
    setCurrentConversation(null);
    if (onNewConversation) {
      onNewConversation();
    }
  };
  
  // Handle deleting a conversation
  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation(); // Prevent triggering the list item click
    
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(id);
    }
  };

  // Format the date for display
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
    <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="h6" component="h2">
          Conversations
        </Typography>
        <Tooltip title="New Conversation">
          <IconButton 
            color="primary" 
            onClick={handleNewConversation}
            aria-label="new conversation"
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 3, textAlign: 'center', flexGrow: 1 }}>
          <Typography color="error">{error}</Typography>
          <Button
            sx={{ mt: 2 }}
            variant="outlined"
            size="small"
            onClick={() => fetchConversations()}
          >
            Retry
          </Button>
        </Box>
      ) : conversations.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', flexGrow: 1 }}>
          <Typography>No conversations yet. Start chatting to create one!</Typography>
          <Button
            sx={{ mt: 2 }}
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleNewConversation}
          >
            New Conversation
          </Button>
        </Box>
      ) : (
        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
          {conversations.map((conversation) => (
            <React.Fragment key={conversation.id}>
              <ListItemButton 
                selected={currentConversation?.id === conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                sx={{ 
                  px: 2, 
                  py: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  }
                }}
              >
                <ListItemText 
                  primary={conversation.title || 'Untitled Conversation'} 
                  secondary={formatDate(conversation.created_at)}
                  primaryTypographyProps={{
                    noWrap: true,
                    fontWeight: currentConversation?.id === conversation.id ? 'bold' : 'normal'
                  }}
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Delete Conversation">
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={(e) => handleDeleteConversation(e, conversation.id)}
                      size="small"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItemButton>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
}

export default ConversationList; 