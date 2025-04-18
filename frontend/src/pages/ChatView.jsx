import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
  IconButton,
  Container,
  Paper
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MessageContainer from '../components/chat/MessageContainer';
import useChatMessages from '../hooks/useChatMessages';
import useAgentStore from '../store/agentStore';
import { sendChatRequest, parseStream } from '../api/endpoints/chatApi';

/**
 * Simplified chat view component using parsed message streams
 */
function ChatView() {
  const { conversationId, agentId } = useParams();
  const navigate = useNavigate();
  const chatContainerRef = useRef(null);
  
  // State for messages and input
  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);
  
  // Get agent info from store
  const { currentAgent, fetchAgents, agents, setCurrentChatAgent } = useAgentStore(state => ({
    currentAgent: state.currentChatAgent,
    fetchAgents: state.fetchAgents,
    agents: state.agents,
    setCurrentChatAgent: state.setCurrentChatAgent
  }));
  
  // Set current agent from URL parameter if available
  useEffect(() => {
    if (agentId && (!currentAgent || currentAgent.id.toString() !== agentId)) {
      // Fetch agents if they aren't already loaded
      if (agents.length === 0) {
        fetchAgents().then(() => {
          const agent = agents.find(a => a.id.toString() === agentId);
          if (agent) {
            setCurrentChatAgent(agent);
          }
        });
      } else {
        // If agents are already loaded, just set the current agent
        const agent = agents.find(a => a.id.toString() === agentId);
        if (agent) {
          setCurrentChatAgent(agent);
        }
      }
    }
  }, [agentId, agents, currentAgent, fetchAgents, setCurrentChatAgent]);
  
  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);
  
  // Send a message
  const sendMessage = useCallback(async () => {
    if (!userInput.trim() || isSending) {
      return;
    }
    
    try {
      // Set sending state
      setIsSending(true);
      
      // Add user message to the chat
      const userMessage = {
        type: 'user',
        content: userInput,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Clear input field
      setUserInput('');
      
      // Create abort controller
      const abortController = new AbortController();
      
      // Send request
      const response = await sendChatRequest(
        userInput, 
        [], // We're not using message history for simplicity 
        abortController, 
        conversationId
      );
      
      // Parse the stream response
      parseStream(response, (updatedMessages) => {
        // This callback will be called each time the stream updates
        setMessages(prev => {
          // Keep all user messages and add the updated parsed messages
          const userMessages = prev.filter(m => m.type === 'user');
          return [...userMessages, ...updatedMessages];
        });
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }, [userInput, isSending, conversationId]);
  
  // Handle key press for Enter
  const handleKeyDown = useCallback((e) => {
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
  
  // Handle clearing chat
  const handleClearChat = useCallback(() => {
    if (window.confirm('Are you sure you want to clear this chat?')) {
      clearMessages();
      setUserInput('');
    }
  }, [clearMessages]);
  
  // Handle going back
  const handleGoHome = () => {
    navigate('/');
  };
  
  return (
    <Container maxWidth="xl" sx={{ height: 'calc(100vh - 64px)', py: 2 }}>
      <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat Header */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          borderBottom: 1, 
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}>
          <IconButton
            edge="start"
            onClick={handleGoHome}
            aria-label="home"
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {currentAgent ? `Chat with ${currentAgent.name}` : 'Chat'}
          </Typography>
          <Button 
            variant="outlined"
            color="error" 
            size="small"
            startIcon={<DeleteIcon />}
            onClick={handleClearChat}
            disabled={messages.length === 0 || isSending}
            sx={{ ml: 1 }}
          >
            Clear
          </Button>
        </Box>
        
        {/* Messages Area */}
        <Box 
          ref={chatContainerRef} 
          sx={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column',
            p: 3,
            gap: 2,
            bgcolor: 'grey.50'
          }}
        >
          {messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
              <Typography>
                Start a new conversation.
              </Typography>
              {!currentAgent && (
                <Typography variant="body2" sx={{ mt: 2 }}>
                  No agent selected. Return to the agent list to select an agent.
                </Typography>
              )}
            </Box>
          ) : (
            messages.map((message, index) => (
              <MessageContainer 
                key={index} 
                message={message}
              />
            ))
          )}
        </Box>
        
        <Divider />
        
        {/* Input Area */}
        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
          <form onSubmit={handleFormSubmit} style={{ width: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <TextField
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              multiline
              maxRows={4}
              fullWidth
              placeholder="Type your message here..."
              variant="outlined"
              disabled={isSending || !currentAgent}
              sx={{ mr: 2 }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {isSending ? (
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {/* TODO: Cancel request */}}
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
                disabled={!userInput.trim() || isSending || !currentAgent}
              >
                Send
              </Button>
            )}
          </form>
        </Box>
      </Paper>
    </Container>
  );
}

export default ChatView; 