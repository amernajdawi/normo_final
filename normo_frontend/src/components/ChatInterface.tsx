import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Container,
  Select,
  MenuItem,
  FormControl,
  Button,
  Chip,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useConversation } from '../contexts/ConversationContext';
import MessageList from './MessageList';
import MetadataSidebar from './MetadataSidebar';

export interface ChatInterfaceRef {
  handleNewChat: () => void;
}

const ChatInterface = forwardRef<ChatInterfaceRef>((props, ref) => {
  const [input, setInput] = useState('');
  const [userState, setUserState] = useState<string>('');
  const [stateSelected, setStateSelected] = useState(false);
  const [currentMetadata, setCurrentMetadata] = useState<Record<string, string> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { state, sendMessage, createNewConversation } = useConversation();
  const { messages, isLoading, error, currentConversationId } = state;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    if (!stateSelected) {
      return;
    }

    const messageText = input.trim();
    setInput('');

    try {
      await sendMessage(messageText, userState);
      
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.metadata && Object.keys(lastMessage.metadata).length > 0) {
        setCurrentMetadata(lastMessage.metadata);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = async () => {
    await createNewConversation();
    setCurrentMetadata(null);
    setStateSelected(false);
    setUserState('');
  };

  useImperativeHandle(ref, () => ({
    handleNewChat,
  }));

  return (
    <Box sx={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'row',
      bgcolor: '#343541',
      position: 'relative',
    }}>
      {/* Main Chat Area */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
      }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #4d4d4f',
        bgcolor: '#343541',
        zIndex: 1,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <img 
            src="/logo.jpg" 
            alt="Normo Logo" 
            style={{ height: '32px', width: 'auto' }}
          />
          <Typography variant="h6" sx={{ color: '#ffffff' }}>
            Normo Legal Assistant
          </Typography>
        </Box>
        {stateSelected && userState && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip
              label={userState}
              size="small"
              sx={{
                bgcolor: '#10a37f',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
          </Box>
        )}
        <Typography variant="body2" sx={{ color: '#b4b4b4', textAlign: 'center', mt: 0.5 }}>
          {currentConversationId 
            ? 'Continuing conversation - ask follow-up questions' 
            : 'Ask about building codes, regulations, and architectural requirements'
          }
        </Typography>
        {currentConversationId && (
          <Typography variant="caption" sx={{ color: '#10a37f', textAlign: 'center', display: 'block', mt: 0.5 }}>
            Conversation ID: {currentConversationId.substring(0, 8)}...
          </Typography>
        )}
      </Box>

      {/* Messages Area */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {messages.length === 0 ? (
          <Container maxWidth="sm" sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 6 }}>
              <img 
                src="/logo.jpg" 
                alt="Normo Logo" 
                style={{ height: '80px', width: 'auto', marginBottom: '24px' }}
              />
              <Typography variant="h3" sx={{ color: '#ffffff', textAlign: 'center', fontWeight: 700, letterSpacing: '-0.5px' }}>
                Normo Legal Assistant
              </Typography>
            </Box>

            {!stateSelected && (
              <Paper 
                elevation={3}
                sx={{ 
                  p: 5, 
                  mb: 4, 
                  bgcolor: '#2d2d30', 
                  border: '2px solid #10a37f',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(16, 163, 127, 0.15)'
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Typography variant="h5" sx={{ color: '#ffffff', mb: 2, fontWeight: 600 }}>
                    Select Your State
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b4b4b4', lineHeight: 1.6 }}>
                    Austrian building regulations vary by state
                  </Typography>
                </Box>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <Select
                    value={userState}
                    onChange={(e) => setUserState(e.target.value)}
                    displayEmpty
                    sx={{ 
                      bgcolor: '#1e1e1e',
                      color: '#ffffff',
                      borderRadius: 2,
                      height: 56,
                      '.MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d3d' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#10a37f' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#10a37f', borderWidth: 2 },
                      '.MuiSelect-select': { 
                        py: 2,
                        display: 'flex',
                        alignItems: 'center'
                      }
                    }}
                  >
                    <MenuItem value="" disabled sx={{ display: 'none' }}>
                      Choose your state...
                    </MenuItem>
                    <MenuItem value="Vienna">
                      Vienna (Wien)
                    </MenuItem>
                    <MenuItem value="Upper Austria">
                      Upper Austria (Oberösterreich)
                    </MenuItem>
                  </Select>
                </FormControl>

                <Button
                  fullWidth
                  variant="contained"
                  disabled={!userState}
                  onClick={() => setStateSelected(true)}
                  sx={{
                    bgcolor: '#10a37f',
                    color: '#ffffff',
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0 4px 14px rgba(16, 163, 127, 0.4)',
                    '&:hover': { 
                      bgcolor: '#0d8f6f',
                      boxShadow: '0 6px 20px rgba(16, 163, 127, 0.6)',
                      transform: 'translateY(-1px)'
                    },
                    '&:disabled': { 
                      bgcolor: '#2d2d30', 
                      color: '#666',
                      boxShadow: 'none'
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  Continue →
                </Button>
              </Paper>
            )}
          </Container>
        ) : (
          <MessageList messages={messages} />
        )}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={20} sx={{ color: '#10a37f' }} />
            <Typography variant="body2" sx={{ color: '#b4b4b4', ml: 1 }}>
              Analyzing Austrian legal documents...
            </Typography>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Error Display */}
      {error && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" sx={{ bgcolor: '#4d1f1f', color: '#ffffff' }}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Input Area */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid #4d4d4f',
        bgcolor: '#343541',
      }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about Austrian building regulations, playground requirements, building codes..."
              disabled={isLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#40414f',
                  color: '#ffffff',
                  '& fieldset': {
                    borderColor: '#565869',
                  },
                  '&:hover fieldset': {
                    borderColor: '#10a37f',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#10a37f',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#8e8ea0',
                  opacity: 1,
                },
              }}
            />
            <IconButton
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              sx={{
                bgcolor: input.trim() ? '#10a37f' : '#565869',
                color: '#ffffff',
                '&:hover': {
                  bgcolor: input.trim() ? '#0d8c6c' : '#565869',
                },
                '&.Mui-disabled': {
                  bgcolor: '#565869',
                  color: '#8e8ea0',
                },
                mb: 0.5,
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ color: '#8e8ea0', display: 'block', textAlign: 'center', mt: 1 }}>
            Press Enter to send, Shift + Enter for new line
          </Typography>
        </Container>
      </Box>
      </Box>

      {/* Metadata Sidebar */}
      <MetadataSidebar 
        metadata={currentMetadata} 
        isVisible={!!currentMetadata && Object.keys(currentMetadata).length > 0} 
      />
    </Box>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;
