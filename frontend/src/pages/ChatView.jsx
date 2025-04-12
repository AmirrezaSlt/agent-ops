import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Paper,
  Divider,
  IconButton,
  AppBar,
  Toolbar
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MessageItem from '../components/chat/MessageItem';
import ConversationList from '../components/ConversationList';
import useChatMessages from '../hooks/useChatMessages';
import useAgentStore from '../store/agentStore';

/**
 * Page component for the chat view with conversation history
 */
function ChatView() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const chatContainerRef = useRef(null);
  
  // Get agent info from store
  const { currentAgent } = useAgentStore();
  
  // Use our custom hook for chat state management, passing the conversation ID if available
  const {
    userInput,
    setUserInput,
    isSending,
    isTyping,
    messageHistory,
    sendMessage,
    cancelRequest,
    clearMessages,
    conversationId: activeConversationId,
    loading
  } = useChatMessages(conversationId);

  // Update URL when conversation ID changes
  useEffect(() => {
    if (activeConversationId && activeConversationId !== conversationId) {
      navigate(`/chat/${activeConversationId}`, { replace: true });
    }
  }, [activeConversationId, conversationId, navigate]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messageHistory]);
  
  // Key down handler for Enter key
  const handleKeyDown = useCallback((e) => {
    // Send message on Enter without Shift key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default to avoid newline
      sendMessage();
    }
  }, [sendMessage]);
  
  // Form submission handler
  const handleFormSubmit = useCallback((e) => {
    e.preventDefault();
    sendMessage();
  }, [sendMessage]);
  
  // Clear chat history
  const handleClearChat = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  // Handle selecting a conversation from the list
  const handleSelectConversation = (selectedConversationId) => {
    navigate(`/chat/${selectedConversationId}`);
  };

  // Handle starting a new conversation
  const handleNewConversation = () => {
    clearMessages();
    navigate('/chat');
  };
  
  // Handle going back to the home page
  const handleGoHome = () => {
    navigate('/');
  };
  
  // Sort messages by sequence number if available, or by index as fallback
  const sortedMessages = React.useMemo(() => {
    return [...messageHistory].sort((a, b) => {
      // If both have sequence numbers, sort by them
      if (a.sequence !== undefined && b.sequence !== undefined) {
        return a.sequence - b.sequence;
      }
      // If only one has a sequence number, prioritize it
      if (a.sequence !== undefined) return -1;
      if (b.sequence !== undefined) return 1;
      
      // Otherwise, maintain original order
      return 0;
    });
  }, [messageHistory]);
  
  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleGoHome}
            aria-label="home"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
            {currentAgent ? `Chat with ${currentAgent.name}` : 'Chat'}
          </Typography>
          
          <Button 
            color="inherit" 
            startIcon={<DeleteIcon />}
            onClick={handleClearChat}
            disabled={messageHistory.length === 0 || isSending}
          >
            Clear Chat
          </Button>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Conversation List - Left Sidebar */}
          <Grid item xs={12} md={3} sx={{ height: '100%', borderRight: 1, borderColor: 'divider' }}>
            <ConversationList 
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
            />
          </Grid>
          
          {/* Chat Area - Right Side */}
          <Grid item xs={12} md={9} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Messages Area */}
            <Box 
              ref={chatContainerRef} 
              sx={{ 
                flexGrow: 1, 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column',
                p: 2,
                gap: 2
              }}
            >
              {sortedMessages.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
                  <Typography>
                    {conversationId && loading ? 'Loading conversation...' : 'Start a new conversation.'}
                  </Typography>
                </Box>
              ) : (
                sortedMessages.map((message, index) => (
                  <MessageItem 
                    key={message.messageId || index} 
                    message={message} 
                    index={index} 
                    messages={sortedMessages} 
                  />
                ))
              )}
            </Box>
            
            <Divider />
            
            {/* Input Area */}
            <Box sx={{ p: 2 }}>
              <form onSubmit={handleFormSubmit} style={{ width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <TextField
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  multiline
                  maxRows={4}
                  fullWidth
                  placeholder="Type your message here..."
                  variant="outlined"
                  disabled={isSending}
                  sx={{ mr: 2 }}
                  onKeyDown={handleKeyDown}
                />
                
                {isSending ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={cancelRequest}
                    startIcon={<StopIcon />}
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    endIcon={<SendIcon />}
                    disabled={!userInput.trim() || isSending}
                  >
                    Send
                  </Button>
                )}
              </form>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default ChatView; 