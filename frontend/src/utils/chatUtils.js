/**
 * Generate a unique message ID
 * @returns {string} Unique ID
 */
export const generateMessageId = () => {
  return Date.now() + '-' + Math.random().toString(36).substring(2, 9);
};

/**
 * Format conversation messages from API format to the local app format
 * @param {Array} messages - Messages from the API
 * @returns {Array} Formatted messages
 */
export const formatConversationMessages = (messages) => {
  return messages.map(msg => ({
    type: msg.role,
    content: msg.content,
    timestamp: msg.created_at,
    messageId: generateMessageId()
  }));
};

/**
 * Helper to determine if a message contains a special tag
 * @param {string} content - Message content
 * @param {string} tag - Tag to search for
 * @returns {boolean} True if tag is present
 */
export const containsTag = (content, tag) => {
  if (!content || typeof content !== 'string') return false;
  return content.includes(tag);
};

/**
 * Extract content between tags
 * @param {string} content - The content string
 * @param {string} startTag - Starting tag
 * @param {string} endTag - Ending tag
 * @returns {string|null} Extracted content or null if not found
 */
export const extractBetweenTags = (content, startTag, endTag) => {
  if (!content || typeof content !== 'string') return null;
  
  const startIndex = content.indexOf(startTag);
  if (startIndex === -1) return null;
  
  const endIndex = content.indexOf(endTag, startIndex + startTag.length);
  if (endIndex === -1) return null;
  
  return content.substring(startIndex + startTag.length, endIndex);
}; 