import React, { useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  TextField,
  Box,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import useChatMessages from '../hooks/useChatMessages';
import MessageItem from './chat/MessageItem';

/**
 * Chat dialog component for interacting with agents
 */
function ChatDialogRefactored({ open, onClose, agent }) {
  // Use our custom hook for chat state management
  const {
    userInput,
    setUserInput,
    isSending,
    isTyping,
    messageHistory,
    sendMessage,
    cancelRequest
  } = useChatMessages();
  
  // Ref for scrolling
  const chatContainerRef = useRef(null);
  
  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messageHistory]);
  
  // Close dialog handler
  const handleCloseDialog = () => {
    if (isSending) {
      cancelRequest();
    }
    onClose();
  };
  
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
  
  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleCloseDialog}
    >
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleCloseDialog}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
            Chat with {agent?.name}
          </Typography>
        </Toolbar>
      </AppBar>

      <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box 
          ref={chatContainerRef} 
          className="chat-container" 
          sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column',
            p: 2,
            gap: 2
          }}
        >
          {messageHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
              <Typography>Start a conversation with {agent?.name}.</Typography>
            </Box>
          ) : (
            messageHistory.map((message, index) => (
              <MessageItem 
                key={index} 
                message={message} 
                index={index} 
                messages={messageHistory} 
              />
            ))
          )}
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
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
      </DialogActions>
    </Dialog>
  );
}

export default ChatDialogRefactored; 