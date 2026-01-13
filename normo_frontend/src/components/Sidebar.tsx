import React from 'react';
import {
  Box,
  Drawer,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { useConversation } from '../contexts/ConversationContext';
import { ConversationListItem } from '../types/api';

const SIDEBAR_WIDTH = 260;

interface SidebarProps {
  onNewChat?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNewChat }) => {
  const { state, switchToConversation } = useConversation();
  const { conversations, currentConversationId } = state;

  const formatConversationTitle = (conversation: ConversationListItem) => {
    if (!conversation) {
      return 'New Conversation';
    }
    
    // Use first_message from the list view
    const firstMessage = conversation.first_message;
    
    if (firstMessage) {
      return firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...'
        : firstMessage;
    }
    return 'New Conversation';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return 'Unknown';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffInHours < 168) { // 7 days
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          bgcolor: '#202123',
          borderRight: '1px solid #4d4d4f',
        },
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onNewChat}
          sx={{
            mb: 2,
            borderColor: '#4d4d4f',
            color: '#ffffff',
            textTransform: 'none',
            justifyContent: 'flex-start',
            '&:hover': {
              borderColor: '#10a37f',
              bgcolor: 'rgba(16, 163, 127, 0.1)',
            },
          }}
          fullWidth
        >
          New Chat
        </Button>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            color: '#ffffff',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Normo Legal Assistant
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mb: 3,
            color: '#b4b4b4',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          AI-powered assistant for Austrian building regulations and architectural requirements
        </Typography>

        <Divider sx={{ bgcolor: '#4d4d4f', mb: 2 }} />

        {/* Recent Conversations */}
        {conversations.length > 0 && (
          <>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 2,
                color: '#10a37f',
                fontWeight: 600,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
              }}
            >
              Recent Conversations
            </Typography>

            <List sx={{ p: 0, mb: 2 }}>
              {(conversations || []).slice(0, 5).map((conversation) => (
                <ListItem
                  key={conversation.conversation_id}
                  onClick={() => switchToConversation(conversation.conversation_id)}
                  sx={{
                    p: 1,
                    mb: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: conversation.conversation_id === currentConversationId 
                      ? 'rgba(16, 163, 127, 0.2)' 
                      : 'transparent',
                    border: conversation.conversation_id === currentConversationId 
                      ? '1px solid #10a37f' 
                      : '1px solid transparent',
                    '&:hover': {
                      bgcolor: conversation.conversation_id === currentConversationId 
                        ? 'rgba(16, 163, 127, 0.3)' 
                        : 'rgba(16, 163, 127, 0.1)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: '#10a37f', minWidth: 36 }}>
                    <ChatIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#ffffff', 
                          fontWeight: 500,
                          fontSize: '0.8rem',
                          lineHeight: 1.3,
                        }}
                      >
                        {formatConversationTitle(conversation)}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#b4b4b4' }}>
                          {formatDate(conversation.updated_at)}
                        </Typography>
                        <Chip
                          label={`${conversation.message_count || 0} msgs`}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.65rem',
                            bgcolor: '#4d4d4f',
                            color: '#b4b4b4',
                            '& .MuiChip-label': {
                              px: 0.5,
                            },
                          }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ bgcolor: '#4d4d4f', mb: 2 }} />
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;
