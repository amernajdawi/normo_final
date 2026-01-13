# Image and Advanced Chunking Integration Guide

## Overview

This guide documents the integration of advanced document chunking with Docling and image/table extraction capabilities into the Normo Legal Assistant application.

## What Was Integrated

### 1. **Advanced Document Processing with Docling**
   - **Location**: `normo_backend/src/normo_backend/utils/docling_processor.py`
   - **Features**:
     - Smart chunking using HybridChunker with ~900 tokens per chunk
     - 100-token overlap for context continuity
     - Spatial matching of images/tables to text chunks
     - OpenAI GPT-4 Vision (gpt-4o-mini) for automatic image descriptions
     - Table extraction as images
     - Bounding box-based image-to-text association

### 2. **Pre-processed Databases**
   - **ChromaDB Vector Store**: `normo_backend/chroma_db_openai_v2/`
     - Contains pre-embedded document chunks with image metadata
     - Uses OpenAI `text-embedding-3-small` model
     - ~160MB database with all Austrian legal documents
   
   - **RAG Assets**: `normo_backend/rag_assets/`
     - Extracted images and tables from all PDFs
     - PNG format, high resolution (2x scale)
     - Named with format: `{pdf_name}_p{page}_img{index}.png` or `_table{index}.png`

### 3. **Backend Enhancements**

#### Updated Files:
- `pyproject.toml`: Added dependencies (docling, transformers, pillow)
- `services/vector_store.py`: 
  - Added support for docling processing
  - Toggle between legacy PyPDF and new docling processor
  - Points to `chroma_db_openai_v2` by default
  
- `agents/rag_retriever.py`:
  - Extracts image metadata from retrieved chunks
  - Passes images to state metadata
  - Includes image information in citations

- `agents/summarizer.py`:
  - Updated to mention images/diagrams in responses
  - Includes image descriptions in context

- `api/app.py`:
  - Added `/images/{image_filename}` endpoint for serving images
  - Extracts and includes image data in API responses
  - Metadata includes image array with filenames and descriptions

### 4. **Frontend Enhancements**

#### New Components:
- `components/ImageGallery.tsx`: 
  - Grid layout for displaying images and tables
  - Modal viewer for full-size images
  - Shows image descriptions and source information
  - Type indicators (image vs. table)

#### Updated Files:
- `types/api.ts`:
  - Added `ImageInfo` interface
  - Updated `SourceCitation` to include images array
  - Updated `ChatMessage` to include metadata with images

- `components/MessageBubble.tsx`:
  - Integrated ImageGallery component
  - Extracts images from metadata and citations
  - Deduplicates images by filename

- `contexts/ConversationContext.tsx`:
  - Passes metadata from API responses to messages
  - Maintains image data through conversation history

## How It Works

### Document Processing Flow

```
PDF → Docling Converter
    ↓
    ├─→ Extract Images/Tables → Save to rag_assets/
    ├─→ OpenAI Vision API → Generate Descriptions
    └─→ HybridChunker
        ↓
        ├─→ Smart Chunking (~900 tokens)
        ├─→ Spatial Image Matching (bounding boxes)
        └─→ Chunk Metadata
            ↓
            └─→ ChromaDB with image references
```

### Retrieval Flow

```
User Query
    ↓
Vector Search → Retrieve Chunks with Images
    ↓
    ├─→ Extract Text Content
    ├─→ Extract Image Metadata (filenames, descriptions)
    └─→ Citations with Images
        ↓
        └─→ Summarizer (mentions images in response)
            ↓
            └─→ API Response
                ↓
                └─→ Frontend Display
                    ├─→ Text Response
                    └─→ Image Gallery
```

## Configuration

### Backend Configuration

1. **Use Pre-existing Database** (Default):
```python
# In vector_store.py
vector_store = get_vector_store(use_existing_db=True)
# Uses: chroma_db_openai_v2/ and rag_assets/
```

2. **Process New PDFs** (Optional):
```python
vector_store = PersistentVectorStore(
    persist_directory="vector_store",
    use_docling=True,  # Use new processing
    image_output_dir="rag_assets"
)
```

### Environment Variables

Required in `.env`:
```bash
OPENAI_API_KEY=your_api_key_here
```

### API Endpoints

- `GET /images/{image_filename}` - Serves images from rag_assets
- `POST /chat` - Chat endpoint (returns metadata with images)
- `GET /pdf/{pdf_path}` - Serves PDFs (existing)

## Image Metadata Structure

### In ChromaDB Chunks:
```python
{
  "images": "img1.png;img2.png",  # Semicolon-separated
  "image_data": [
    {
      "filename": "doc_p15_img0.png",
      "description": "Schematic showing exhaust outlet placement...",
      "type": "image"  # or "table"
    }
  ],
  "image_count": 2
}
```

### In API Response:
```json
{
  "message": {
    "content": "...",
    "meta_data": {
      "images": [
        {
          "filename": "doc_p15_img0.png",
          "description": "...",
          "type": "image",
          "pdf_name": "source.pdf",
          "page": 15
        }
      ]
    }
  },
  "source_citations": [...]
}
```

## Testing the Integration

### 1. Install Dependencies
```bash
cd normo_backend
uv sync
```

### 2. Start Backend
```bash
cd normo_backend
uv run python -m src.normo_backend.api.app
```

### 3. Start Frontend
```bash
cd normo_frontend
npm install
npm start
```

### 4. Test Queries
Try queries that should return images:
- "What are the exhaust outlet requirements?"
- "Show me parking garage layouts"
- "What are the building dimension standards?"

## Advantages of New System

1. **Better Chunking**:
   - Semantic chunking (900 tokens)
   - Context preservation with overlap
   - Respects document structure

2. **Image Intelligence**:
   - Automatic descriptions via GPT-4 Vision
   - Spatial matching to relevant text
   - Tables extracted as images

3. **Enhanced Retrieval**:
   - Images included in context
   - Descriptions improve search relevance
   - Visual information accessible to users

4. **User Experience**:
   - Interactive image gallery
   - Zoomable full-resolution images
   - Image descriptions and sources
   - Type indicators (image/table)

## Database Statistics

- **Total Chunks**: Varies by processing (see vector store stats)
- **Images Extracted**: ~1000+ images and tables
- **Database Size**: 
  - ChromaDB: ~160MB
  - RAG Assets: ~50-100MB
- **Embedding Model**: `text-embedding-3-small`
- **Processing Method**: Docling with OpenAI Vision

## Backwards Compatibility

The system maintains backwards compatibility:
- Old `vector_store/` directory still works
- Can toggle between PyPDF and Docling processing
- Existing conversations continue to work
- No breaking changes to API contracts

## Performance Notes

- **First Query**: May take 2-3 seconds (loading vector store)
- **Subsequent Queries**: 1-2 seconds
- **Image Loading**: Lazy-loaded, cached by browser
- **Memory Usage**: ~2GB (vector store + model)

## Future Enhancements

Potential improvements:
1. Image caching on frontend
2. Lazy loading for image gallery
3. Image compression for faster loading
4. Multi-modal retrieval (text + image embeddings)
5. Support for more image formats
6. Image highlighting/annotations

## Troubleshooting

### Images Not Showing
- Check `rag_assets/` folder exists
- Verify API endpoint: `http://localhost:8000/images/{filename}`
- Check browser console for CORS errors

### Vector Store Errors
- Ensure `chroma_db_openai_v2/` folder exists
- Check OpenAI API key is set
- Verify ChromaDB version compatibility

### Frontend Build Errors
- Run `npm install` to update dependencies
- Clear `.next` cache if using Next.js
- Check TypeScript errors with `npm run build`

## Files Modified

### Backend:
- `pyproject.toml`
- `src/normo_backend/utils/docling_processor.py` (new)
- `src/normo_backend/services/vector_store.py`
- `src/normo_backend/agents/rag_retriever.py`
- `src/normo_backend/agents/summarizer.py`
- `src/normo_backend/prompts/summarizer.py`
- `src/normo_backend/api/app.py`

### Frontend:
- `src/types/api.ts`
- `src/components/ImageGallery.tsx` (new)
- `src/components/MessageBubble.tsx`
- `src/contexts/ConversationContext.tsx`

### Data:
- `chroma_db_openai_v2/` (moved from normo_docling)
- `rag_assets/` (moved from normo_docling)

## Credits

Integration performed: January 2026
Based on: Docling library for document processing
Vision: OpenAI GPT-4o-mini for image descriptions
Embeddings: OpenAI text-embedding-3-small

