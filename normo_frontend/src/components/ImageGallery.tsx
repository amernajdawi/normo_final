import React, { useState } from 'react';
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Image as ImageIcon,
  TableChart as TableIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ZoomIn as ZoomInIcon,
} from '@mui/icons-material';
import { ImageInfo } from '../types/api';

interface ImageGalleryProps {
  images: ImageInfo[];
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullScreenImage, setFullScreenImage] = useState<ImageInfo | null>(null);
  const [imageError, setImageError] = useState<Set<string>>(new Set());

  const handleImageError = (filename: string) => {
    setImageError(prev => new Set(prev).add(filename));
  };

  const getImageUrl = (filename: string) => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    return `${apiUrl}/images/${filename}`;
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  if (!images || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];
  const hasError = imageError.has(currentImage.filename);

  return (
    <>
      <Box sx={{ mt: 2, width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Chip
            icon={<ImageIcon />}
            label={`${images.length} Image${images.length > 1 ? 's' : ''}/Table${images.length > 1 ? 's' : ''}`}
            size="small"
            sx={{
              bgcolor: '#2d2d30',
              color: '#4db8ff',
              '& .MuiChip-icon': { color: '#4db8ff' },
            }}
          />
          {images.length > 1 && (
            <Typography variant="caption" sx={{ color: '#8e8ea0' }}>
              {currentIndex + 1} / {images.length}
            </Typography>
          )}
        </Box>

        <Card
          sx={{
            bgcolor: '#2d2d30',
            border: '1px solid #4d4d4f',
            position: 'relative',
          }}
        >
          {!hasError ? (
            <Box sx={{ position: 'relative' }}>
              <CardMedia
                component="img"
                image={getImageUrl(currentImage.filename)}
                alt={currentImage.description || currentImage.filename}
                onError={() => handleImageError(currentImage.filename)}
                sx={{
                  width: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  bgcolor: '#1e1e1e',
                  p: 2,
                }}
              />
              <IconButton
                onClick={() => setFullScreenImage(currentImage)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  color: '#ffffff',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.8)',
                  },
                }}
                size="small"
              >
                <ZoomInIcon />
              </IconButton>
            </Box>
          ) : (
            <Box
              sx={{
                height: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#1e1e1e',
                color: '#666',
              }}
            >
              <Typography variant="body2">Image not available</Typography>
            </Box>
          )}

          {images.length > 1 && (
            <>
              <IconButton
                onClick={handlePrevious}
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: '#ffffff',
                  '&:hover': {
                    bgcolor: 'rgba(16, 163, 127, 0.9)',
                  },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: '#ffffff',
                  '&:hover': {
                    bgcolor: 'rgba(16, 163, 127, 0.9)',
                  },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </>
          )}

          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {currentImage.type === 'table' ? (
                <Chip
                  icon={<TableIcon />}
                  label="Table"
                  size="small"
                  sx={{
                    bgcolor: '#3d3d3f',
                    color: '#ff9800',
                    '& .MuiChip-icon': { color: '#ff9800' },
                  }}
                />
              ) : (
                <Chip
                  icon={<ImageIcon />}
                  label="Image"
                  size="small"
                  sx={{
                    bgcolor: '#3d3d3f',
                    color: '#4db8ff',
                    '& .MuiChip-icon': { color: '#4db8ff' },
                  }}
                />
              )}
              {currentImage.page && (
                <Chip
                  label={`Page ${currentImage.page}`}
                  size="small"
                  sx={{
                    bgcolor: '#3d3d3f',
                    color: '#10a37f',
                  }}
                />
              )}
            </Box>
            {currentImage.description && (
              <Typography
                variant="body2"
                sx={{
                  color: '#b4b4b4',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  mt: 1,
                }}
              >
                {currentImage.description}
              </Typography>
            )}
            {currentImage.pdf_name && (
              <Typography
                variant="caption"
                sx={{
                  color: '#8e8ea0',
                  display: 'block',
                  mt: 1,
                  fontStyle: 'italic',
                }}
              >
                Source: {currentImage.pdf_name}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Full Screen Dialog */}
      <Dialog
        open={fullScreenImage !== null}
        onClose={() => setFullScreenImage(null)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#2d2d30',
            color: '#ffffff',
          },
        }}
      >
        {fullScreenImage && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {fullScreenImage.type === 'table' ? (
                  <TableIcon sx={{ color: '#ff9800' }} />
                ) : (
                  <ImageIcon sx={{ color: '#4db8ff' }} />
                )}
                <Typography variant="h6">
                  {fullScreenImage.type === 'table' ? 'Table' : 'Image'} - Full Size
                </Typography>
                {fullScreenImage.page && (
                  <Chip
                    label={`Page ${fullScreenImage.page}`}
                    size="small"
                    sx={{
                      bgcolor: '#3d3d3f',
                      color: '#10a37f',
                    }}
                  />
                )}
              </Box>
              <IconButton
                onClick={() => setFullScreenImage(null)}
                sx={{ color: '#b4b4b4' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 2,
                  bgcolor: '#1e1e1e',
                  p: 2,
                  borderRadius: 1,
                }}
              >
                <img
                  src={getImageUrl(fullScreenImage.filename)}
                  alt={fullScreenImage.description || fullScreenImage.filename}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    objectFit: 'contain',
                  }}
                />
              </Box>
              {fullScreenImage.description && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#10a37f', mb: 1 }}>
                    Description:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b4b4b4' }}>
                    {fullScreenImage.description}
                  </Typography>
                </Box>
              )}
              {fullScreenImage.pdf_name && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#10a37f', mb: 1 }}>
                    Source:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b4b4b4' }}>
                    {fullScreenImage.pdf_name}
                  </Typography>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  );
};

export default ImageGallery;
