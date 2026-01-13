import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as BotIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Description as DocumentIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { ChatMessage, ImageInfo } from '../types/api';
import CitationsList from './CitationsList';
import ImageGallery from './ImageGallery';
import EnhancedAssistantMessage from './EnhancedAssistantMessage';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [showCitations, setShowCitations] = useState(false);
  const isUser = message.role === 'user';
  const hasCitations = message.citations && message.citations.length > 0;
  
  // Extract images from metadata and citations
  const images: ImageInfo[] = [];
  
  // Get images from metadata
  if (message.metadata?.images) {
    images.push(...message.metadata.images);
  }
  
  // Get images from citations
  if (message.citations) {
    message.citations.forEach(citation => {
      if (citation.images) {
        citation.images.forEach(img => {
          // Add citation context to image
          images.push({
            ...img,
            pdf_name: img.pdf_name || citation.pdf_name,
            page: img.page || citation.page
          });
        });
      }
    });
  }
  
  // Remove duplicates based on filename
  const uniqueImages = images.filter((img, index, self) => 
    index === self.findIndex(i => i.filename === img.filename)
  );
  
  const hasImages = uniqueImages.length > 0;

  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Message Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 1,
          gap: 1,
          flexDirection: isUser ? 'row-reverse' : 'row',
        }}
      >
        <Avatar
          sx={{
            bgcolor: isUser ? '#10a37f' : '#444654',
            width: 32,
            height: 32,
          }}
        >
          {isUser ? <PersonIcon /> : <BotIcon />}
        </Avatar>
        <Typography
          variant="caption"
          sx={{
            color: '#b4b4b4',
            fontWeight: 500,
          }}
        >
          {isUser ? 'You' : 'Normo Assistant'}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: '#8e8ea0',
            ml: 1,
          }}
        >
          {message.timestamp.toLocaleTimeString()}
        </Typography>
      </Box>

      {/* Images Section - Always visible */}
      {hasImages && !isUser && (
        <Box sx={{ mt: 2, mb: 2, width: '100%', maxWidth: '85%' }}>
          <ImageGallery images={uniqueImages} />
        </Box>
      )}

      {/* Enhanced Message Content */}
      <Paper
        sx={{
          p: 0,
          maxWidth: '85%',
          bgcolor: isUser ? '#10a37f' : '#1e1e1e',
          color: '#ffffff',
          borderRadius: 2,
          border: isUser ? 'none' : '1px solid #3d3d3d',
          overflow: 'hidden',
        }}
      >
        {isUser ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1">{message.content}</Typography>
          </Box>
        ) : (
          <EnhancedAssistantMessage content={message.content} />
        )}
      </Paper>

      {/* Citations Section */}
      {hasCitations && (
        <Box sx={{ mt: 2, width: '100%', maxWidth: '80%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Chip
              icon={<DocumentIcon />}
              label={`${message.citations!.length} Source${message.citations!.length > 1 ? 's' : ''}`}
              size="small"
              sx={{
                bgcolor: '#2d2d30',
                color: '#10a37f',
                '& .MuiChip-icon': { color: '#10a37f' },
              }}
            />
            {message.citations!.some(c => c.calculations || c.area_measurements) && (
              <Chip
                icon={<CalculateIcon />}
                label="Contains Calculations"
                size="small"
                sx={{
                  ml: 1,
                  bgcolor: '#2d2d30',
                  color: '#ff9800',
                  '& .MuiChip-icon': { color: '#ff9800' },
                }}
              />
            )}
            <IconButton
              size="small"
              onClick={() => setShowCitations(!showCitations)}
              sx={{ ml: 'auto', color: '#10a37f' }}
            >
              {showCitations ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={showCitations}>
            <Paper
              sx={{
                bgcolor: '#2d2d30',
                border: '1px solid #4d4d4f',
              }}
            >
              <CitationsList citations={message.citations!} />
            </Paper>
          </Collapse>
        </Box>
      )}
    </Box>
  );
};

export default MessageBubble;
