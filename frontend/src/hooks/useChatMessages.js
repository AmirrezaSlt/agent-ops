import { useState, useCallback, useEffect } from 'react';
import useAgentStore from '../store/agentStore';
import useConversationStore from '../store/conversationStore';
import { processMessage, updateMessagesWithToolOutputs } from '../utils/messageUtils';
import { sendChatRequest, processStreamingResponse } from '../api/endpoints/chatApi';
import { generateMessageId, formatConversationMessages } from '../utils/chatUtils';
import { handleAssistantResponse, handleToolMessages } from '../utils/responseHandlers';

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
  const [loading, setLoading] = useState(conversationId ? true : false);
  
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
        setLoading(true);
        
        try {
          const conversation = await fetchConversation(conversationId);
          if (conversation && conversation.messages) {
            // Convert messages to the format expected by the chat UI
            const formattedMessages = formatConversationMessages(conversation.messages);
            
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
        } finally {
          setLoading(false);
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
      messageId: generateMessageId(),
      sequence: sequenceCounter  // Add sequence number
    };
    
    // Add to store with sequence number
    addMessage(userMessage);
    setSequenceCounter(prevCounter => prevCounter + 1);
    
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
        onThinking: (content, isEnd) => {
          if (!messageIds.thinking) {
            // Create a new thinking message
            messageIds.thinking = generateMessageId();
            const thinkingMessage = {
              type: 'assistant',
              content: content,
              isThinking: true,
              timestamp: new Date().toISOString(),
              messageId: messageIds.thinking,
              sequence: sequenceCounter
            };
            addMessage(thinkingMessage);
            setSequenceCounter(prevCounter => prevCounter + 1);
          } else {
            // Update existing thinking message
            const existingMessage = messageHistory.find(m => m.messageId === messageIds.thinking);
            if (existingMessage) {
              updateMessage({
                ...existingMessage,
                content: content,
                isComplete: isEnd
              });
            }
          }
          
          // If thinking is complete, prepare for the next message
          if (isEnd) {
            // No need to advance the sequence here since the thinking message
            // has already been given a sequence number
          }
        },
        
        onAssistantMessage: (content, isComplete) => {
          // If there's no assistant message yet, create one
          if (!messageIds.assistant) {
            messageIds.assistant = generateMessageId();
            const assistantMessage = {
              type: 'assistant',
              content: content,
              timestamp: new Date().toISOString(),
              messageId: messageIds.assistant,
              sequence: sequenceCounter
            };
            
            // Add the message
            addMessage(assistantMessage);
            setSequenceCounter(prevCounter => prevCounter + 1);
          } else {
            // Update existing assistant message
            const existingMessage = messageHistory.find(m => m.messageId === messageIds.assistant);
            if (existingMessage) {
              updateMessage({
                ...existingMessage,
                content: content,
                isComplete: isComplete
              });
            }
          }
        },
        
        onToolCall: (toolName, args) => {
          if (!messageIds.tool) {
            messageIds.tool = generateMessageId();
            
            const toolCallMessage = {
              type: 'function_call',
              content: JSON.stringify({ tool: toolName, args }),
              timestamp: new Date().toISOString(),
              messageId: messageIds.tool,
              toolName,
              args,
              hasTool: true,
              // Ensure tool call appears after assistant message if there is one
              sequence: messageIds.assistant 
                ? sequenceCounter 
                : sequenceCounter
            };
            
            addMessage(toolCallMessage);
            setSequenceCounter(prevCounter => prevCounter + 1);
          }
        },
        
        onToolOutput: (output) => {
          // Only create a new output message if we haven't seen one yet
          if (!messageIds.toolOutput && messageIds.tool) {
            messageIds.toolOutput = generateMessageId();
            
            // Calculate sequence to ensure it appears right after the tool call
            const toolSequence = messageHistory.find(m => m.messageId === messageIds.tool)?.sequence || 0;
            const toolOutputSequence = toolSequence + 0.5; // Place between tool call and next message
            
            const toolOutputMessage = {
              type: 'function_result',
              content: output,
              timestamp: new Date().toISOString(),
              messageId: messageIds.toolOutput,
              isToolOutput: true,
              sequence: toolOutputSequence,
              // Link to parent tool call
              parentToolId: messageIds.tool
            };
            
            addMessage(toolOutputMessage);
          } else if (messageIds.toolOutput) {
            // Update existing tool output if we have one
            const existingMessage = messageHistory.find(m => m.messageId === messageIds.toolOutput);
            if (existingMessage) {
              updateMessage({
                ...existingMessage,
                content: output
              });
            }
          }
        },
        
        onComplete: () => {
          // Update conversations list when the chat is complete
          updateConversationsList();
          setIsTyping(false);
          setIsSending(false);
          setAbortController(null);
        },
        
        onError: (error) => {
          console.error("Error processing response:", error);
          
          // Add error message to chat
          addMessage({
            type: 'system',
            content: `Error: ${error.message}`,
            isError: true,
            timestamp: new Date().toISOString(),
            messageId: generateMessageId(),
            sequence: sequenceCounter
          });
          setSequenceCounter(prevCounter => prevCounter + 1);
          
          setIsTyping(false);
          setIsSending(false);
          setAbortController(null);
        }
      });
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Add error message to chat
      addMessage({
        type: 'system',
        content: `Error: ${error.message}`,
        isError: true,
        timestamp: new Date().toISOString(),
        messageId: generateMessageId(),
        sequence: sequenceCounter
      });
      setSequenceCounter(prevCounter => prevCounter + 1);
      
      setIsTyping(false);
      setIsSending(false);
      setAbortController(null);
    }
  }, [userInput, isSending, messageHistory, addMessage, updateMessage, currentConversationId, sequenceCounter, setSequenceCounter, updateConversationsList]);
  
  /**
   * Cancels the ongoing request
   */
  const cancelRequest = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsSending(false);
      setIsTyping(false);
      
      // Add cancellation message
      addSequencedMessage({
        type: 'system',
        content: 'Request cancelled',
        timestamp: new Date().toISOString(),
        messageId: generateMessageId()
      });
    }
  }, [abortController, addSequencedMessage]);
  
  /**
   * Clear all messages and reset sequence counter
   */
  const handleClearMessages = useCallback(() => {
    clearMessages();
    setSequenceCounter(0);
    setCurrentConversationId(null);
    setMessageHistory([]);
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
    conversationId: currentConversationId,
    loading
  };
};

export default useChatMessages; 