import React from 'react';
import { Box, Paper, Typography, Avatar } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

const AssistantMessage = ({ message }) => {
  // Check if this is a message that follows a tool
  const isPostTool = message.isPostTool || message.postToolContent;
  
  // Timestamp if available
  const timestamp = message.timestamp || message.created_at;
  
  // Ensure the content is a string and not undefined or null
  const safeContent = message.content || '';
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2, mb: 1.5 }}>
      <Avatar 
        sx={{ 
          width: 32, 
          height: 32, 
          bgcolor: 'primary.main', 
          mr: 2, 
          fontSize: '0.875rem'
        }}
      >
        AI
      </Avatar>
      <Box sx={{ flexGrow: 1 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 1.5, 
            bgcolor: isPostTool ? 'purple.50' : 'primary.50',
            borderLeft: isPostTool ? '4px solid' : 'none',
            borderColor: isPostTool ? 'purple.400' : 'transparent',
            borderRadius: 2,
            maxWidth: '100%'
          }}
        >
          <ReactMarkdown
            children={safeContent}
            remarkPlugins={[remarkGfm]}
            components={{
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    children={String(children).replace(/\n$/, '')}
                    style={materialLight}
                    language={match[1]}
                    PreTag="div"
                    wrapLongLines={true}
                    {...props}
                  />
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              // Ensure paragraphs have proper text wrapping
              p({node, children, ...props}) {
                return (
                  <Typography 
                    component="p" 
                    sx={{ 
                      my: 0.5, 
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word'
                    }} 
                    {...props}
                  >
                    {children}
                  </Typography>
                );
              },
              // Add proper handling for pre elements
              pre({node, children, ...props}) {
                return (
                  <Box 
                    component="pre" 
                    sx={{ 
                      maxWidth: '100%',
                      overflowX: 'auto',
                      my: 1,
                      '& code': {
                        wordBreak: 'break-word'
                      }
                    }} 
                    {...props}
                  >
                    {children}
                  </Box>
                );
              },
              // Better handling for headers
              h1: ({node, children, ...props}) => (
                <Typography variant="h5" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }} {...props}>
                  {children}
                </Typography>
              ),
              h2: ({node, children, ...props}) => (
                <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }} {...props}>
                  {children}
                </Typography>
              ),
              h3: ({node, children, ...props}) => (
                <Typography variant="subtitle1" sx={{ mt: 1.5, mb: 0.75, fontWeight: 'bold' }} {...props}>
                  {children}
                </Typography>
              )
            }}
          />
        </Paper>
        {timestamp && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              color: 'text.secondary', 
              mt: 0.5, 
              textAlign: 'right',
              pr: 1
            }}
          >
            {new Date(timestamp).toLocaleTimeString()}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AssistantMessage; 