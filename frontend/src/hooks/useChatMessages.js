import { useState, useCallback, useEffect } from 'react';
import useAgentStore from '../store/agentStore';
import useConversationStore from '../store/conversationStore';
import { processMessage, updateMessagesWithToolOutputs } from '../utils/messageUtils';
import { sendChatRequest, processStreamingResponse } from '../api/endpoints/chatApi';

/**
 * Generate a unique message ID
 * @returns {string} Unique ID
 */
const generateMessageId = () => {
  return Date.now() + '-' + Math.random().toString(36).substring(2, 9);
};

/**
 * Custom hook for managing chat messages and interactions
 * @param {string} conversationId - Optional conversation ID to load and continue
 * @returns {Object} Chat message state and functions
 */
const useChatMessages = (conversationId = null) => {
  // Local state
  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [sequenceCounter, setSequenceCounter] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  
  // Store access
  const storeMessages = useAgentStore(state => state.chatMessages);
  const addMessage = useAgentStore(state => state.addMessage);
  const updateMessage = useAgentStore(state => state.updateMessage);
  const clearMessages = useAgentStore(state => state.clearMessages);
  
  // Conversation store access
  const fetchConversation = useConversationStore(state => state.fetchConversation);
  const updateConversationsList = useConversationStore(state => state.updateConversationsList);
  
  // Load conversation if ID is provided
  useEffect(() => {
    const loadConversation = async () => {
      if (conversationId) {
        setCurrentConversationId(conversationId);
        clearMessages();
        
        try {
          const conversation = await fetchConversation(conversationId);
          if (conversation && conversation.messages) {
            // Convert messages to the format expected by the chat UI
            const formattedMessages = conversation.messages.map(msg => ({
              type: msg.role,
              content: msg.content,
              timestamp: msg.created_at,
              messageId: generateMessageId()
            }));
            
            // Add messages to store
            formattedMessages.forEach(msg => addMessage(msg));
          }
        } catch (error) {
          console.error("Error loading conversation:", error);
          // Add error message to the chat
          addMessage({
            type: 'system',
            content: `Error loading conversation: ${error.message}`,
            isError: true,
            timestamp: new Date().toISOString(),
            messageId: generateMessageId()
          });
        }
      } else {
        // For new conversations, just clear the messages
        clearMessages();
        setCurrentConversationId(null);
      }
    };
    
    loadConversation();
  }, [conversationId, fetchConversation, clearMessages, addMessage]);
  
  // Sync local message history with store
  useEffect(() => {
    const processedMessages = updateMessagesWithToolOutputs(storeMessages.map(msg => ({ ...msg })));
    setMessageHistory(processedMessages);
  }, [storeMessages]);
  
  /**
   * Adds a message with proper sequence number
   * @param {Object} message - Message to add
   */
  const addSequencedMessage = useCallback((message) => {
    const sequencedMessage = {
      ...message,
      sequence: sequenceCounter
    };
    addMessage(sequencedMessage);
    setSequenceCounter(prevCounter => prevCounter + 1);
  }, [addMessage, sequenceCounter]);
  
  /**
   * Handles sending a message to the chat API
   */
  const sendMessage = useCallback(async () => {
    if (!userInput.trim() || isSending) {
      return;
    }
    
    // Create and add the user message with unique ID
    const userMessage = {
      type: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
      messageId: generateMessageId()
    };
    
    // Add to store with sequence number
    addSequencedMessage(userMessage);
    
    // Clear input and set loading state
    setUserInput('');
    setIsSending(true);
    
    // Create new abort controller
    const controller = new AbortController();
    setAbortController(controller);
    
    // Message IDs for this conversation turn
    const messageIds = {
      thinking: null,
      assistant: null, 
      tool: null,
      toolOutput: null
    };
    
    try {
      // Send the request with conversation ID if we have one
      const response = await sendChatRequest(
        userInput, 
        messageHistory, 
        controller,
        currentConversationId
      );
      
      // Extract conversation ID from response if available
      // Don't try to parse JSON if the response is a stream
      if (response.headers.get('content-type').includes('application/json')) {
        try {
          const responseData = await response.clone().json();
          if (responseData.conversation_id && !currentConversationId) {
            setCurrentConversationId(responseData.conversation_id);
          }
        } catch (error) {
          console.error("Error parsing response JSON:", error);
        }
      }
      
      // Set thinking state at the start
      setIsTyping(true);
      
      // Process the streaming response
      await processStreamingResponse(response, {
        // Handle thinking content
        onThinking: (content, isEnd) => {
          if (!content.trim()) return;
          
          if (!messageIds.thinking) {
            // Create a new thinking message
            messageIds.thinking = generateMessageId();
            
            const thinkingMessage = {
              type: 'assistant',
              content: content,
              isThinking: true,
              timestamp: new Date().toISOString(),
              messageId: messageIds.thinking
            };
            
            addSequencedMessage(thinkingMessage);
          } else {
            // Update existing thinking message
            updateMessage(messageIds.thinking, { content });
          }
          
          // If thinking ended, add a separator and reset thinking ID
          if (isEnd) {
            addSequencedMessage({
              type: 'system',
              content: '---',
              isSeparator: true,
              timestamp: new Date().toISOString(),
              messageId: generateMessageId()
            });
            
            // Reset thinking ID to allow new thinking messages
            messageIds.thinking = null;
          }
        },
        
        // Handle assistant messages
        onAssistantMessage: (content, isComplete) => {
          if (!content.trim()) return;
          
          // Check if this content actually contains a tool response tag
          if (content.includes('<tool_output>')) {
            if (!messageIds.toolOutput) {
              const messageId = generateMessageId();
              messageIds.toolOutput = messageId;
              
              const toolOutputMessage = {
                type: 'function_result',
                content: content,
                timestamp: new Date().toISOString(),
                messageId
              };
              
              addSequencedMessage(toolOutputMessage);
            }
            return;
          }
          
          // For post-tool messages, we want to ALWAYS use the same message ID after a tool
          // to ensure all assistant content appears in a single message
          if (messageIds.tool || messageIds.toolOutput) {
            // If we already have a post-tool assistant message, update it
            if (messageIds.assistant) {
              // Update existing assistant message
              
              // Simply update with the full accumulated content that was passed in
              // No concatenation needed since the full accumulated content is in the 'content' parameter
              updateMessage(messageIds.assistant, { content });
            } else {
              // Create a new post-tool assistant message
              messageIds.assistant = generateMessageId();
              
              const assistantMessage = {
                type: 'assistant',
                content: content,
                timestamp: new Date().toISOString(),
                messageId: messageIds.assistant,
                isPostTool: true,
                // Set sequence to ensure it appears after the tool response
                // Add a small offset to ensure ordering is correct
                sequence: sequenceCounter + 1000
              };
              
              // Process the message to extract tool calls
              const processedMessage = processMessage(assistantMessage);
              addMessage(processedMessage);
              setSequenceCounter(prevCounter => prevCounter + 1001);
            }
          } else {
            // Standard assistant message handling (not after a tool)
            if (!messageIds.assistant) {
              // Create a new assistant message
              messageIds.assistant = generateMessageId();
              
              const assistantMessage = {
                type: 'assistant',
                content: content,
                timestamp: new Date().toISOString(),
                messageId: messageIds.assistant
              };
              
              // Process the message to extract tool calls
              const processedMessage = processMessage(assistantMessage);
              addSequencedMessage(processedMessage);
            } else {
              // Update existing assistant message
              
              // Simply update with the full accumulated content
              updateMessage(messageIds.assistant, { content });
            }
          }
        },
        
        // Handle tool calls
        onToolCall: (content) => {
          if (!content.trim()) return;
          
          if (!messageIds.tool) {
            // Create a new tool message
            messageIds.tool = generateMessageId();
            
            const toolMessage = {
              type: 'assistant',
              content: content,
              hasTool: true,
              timestamp: new Date().toISOString(),
              messageId: messageIds.tool
            };
            
            // Process the message to extract tool info
            const processedMessage = processMessage(toolMessage);
            addSequencedMessage(processedMessage);
          }
        },
        
        // Handle tool responses
        onToolOutput: (content) => {
          if (!content.trim()) return;
          
          if (!messageIds.toolOutput) {
            // Create a new tool response message
            messageIds.toolOutput = generateMessageId();
            
            const toolOutputMessage = {
              type: 'function_result',
              content: content,
              timestamp: new Date().toISOString(),
              messageId: messageIds.toolOutput
            };
            
            addSequencedMessage(toolOutputMessage);
          } else {
            // Update existing tool response if needed for very large responses
            const existingMessage = storeMessages.find(m => m.messageId === messageIds.toolOutput);
            
            if (existingMessage) {
              updateMessage(messageIds.toolOutput, { 
                content: existingMessage.content + content 
              });
            }
          }
        }
      });
      
      setIsTyping(false);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sending message:', error);
        
        // Add error message to the chat
        addSequencedMessage({
          type: 'system',
          content: `Error: ${error.message || 'Failed to send message. Please try again.'}`,
          isError: true,
          timestamp: new Date().toISOString(),
          messageId: generateMessageId()
        });
      }
    } finally {
      setIsSending(false);
      setIsTyping(false);
      setAbortController(null);
      
      // If we have a conversation ID, update the conversation store
      if (currentConversationId) {
        fetchConversation(currentConversationId).then(conversation => {
          if (conversation) {
            updateConversationsList(conversation);
          }
        });
      }
    }
  }, [userInput, isSending, messageHistory, currentConversationId, addSequencedMessage, updateMessage, fetchConversation, updateConversationsList]);
  
  /**
   * Cancels the current request
   */
  const cancelRequest = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setIsSending(false);
      setIsTyping(false);
      setAbortController(null);
    }
  }, [abortController]);
  
  /**
   * Clear all messages and reset sequence counter
   */
  const handleClearMessages = useCallback(() => {
    clearMessages();
    setSequenceCounter(0);
  }, [clearMessages]);
  
  return {
    userInput,
    setUserInput,
    isSending,
    isTyping,
    messageHistory,
    sendMessage,
    cancelRequest,
    clearMessages: handleClearMessages,
    conversationId: currentConversationId
  };
};

export default useChatMessages; 