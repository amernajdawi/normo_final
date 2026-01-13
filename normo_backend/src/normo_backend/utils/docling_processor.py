"""
Docling-based PDF processing with advanced chunking and image extraction.
Uses Docling's HybridChunker with spatial image matching.
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from docling.chunking import HybridChunker
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import (
    AcceleratorDevice,
    AcceleratorOptions,
    PdfPipelineOptions,
    PictureDescriptionApiOptions,
)
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling_core.types.doc import PictureItem
from langchain_core.documents import Document
from transformers import AutoTokenizer

# Configuration
TOKENIZER_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
TARGET_TOKENS = 900  # High context window for Technical/German documents
OVERLAP_TOKENS = 100  # Sliding window size for continuity
VERTICAL_BUFFER = 50.0  # Pixels: How far up/down to look for images

# Setup Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# OpenAI Vision API disabled - we just extract and show images without descriptions
# This saves cost and processing time


def setup_docling_converter(output_dir: str) -> DocumentConverter:
    """
    Initialize Docling converter for image extraction (without AI descriptions)
    
    Args:
        output_dir: Directory where images will be saved
        
    Returns:
        Configured DocumentConverter instance
    """
    pipeline_options = PdfPipelineOptions()
    
    # MINIMAL CONFIGURATION: Only extract images, no processing!
    pipeline_options.generate_picture_images = True  # Extract images
    pipeline_options.generate_table_images = True    # Extract table images
    pipeline_options.images_scale = 2.0             # Image quality
    
    # DISABLE ALL PROCESSING (we just want raw images!)
    pipeline_options.do_picture_description = False  # No AI descriptions
    pipeline_options.do_ocr = False                 # No OCR
    pipeline_options.do_table_structure = False     # No table structure analysis
    
    # Simple CPU processing (no GPU needed for image extraction)
    pipeline_options.accelerator_options = AcceleratorOptions(
        num_threads=4,  # Reduced threads
        device=AcceleratorDevice.CPU  # CPU only
    )
    
    doc_converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )
    
    return doc_converter


def extract_images_with_descriptions(doc, filename: str, output_dir: str) -> Dict[int, List[Dict[str, Any]]]:
    """
    Extract images and tables from converted document (no AI descriptions)
    
    Args:
        doc: Docling document object
        filename: Source PDF filename (can include subdirectories)
        output_dir: Directory to save extracted images
        
    Returns:
        Dictionary mapping page_num -> list of image metadata dicts
    """
    page_images = {}
    
    # Replace slashes and spaces, keep only the filename part for images
    # This avoids nested directory issues
    safe_name = os.path.basename(filename).replace(" ", "_").replace(".pdf", "")
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    logger.info(f"📸 Extracting images and tables for: {filename}")
    
    # Extract Pictures
    for i, picture in enumerate(doc.pictures):
        page_no = picture.prov[0].page_no if picture.prov else 1
        
        # No AI descriptions - just basic caption if available
        description = ""
        if hasattr(picture, 'caption_text'):
            description = picture.caption_text(doc=doc) or ""
        
        # Get bounding box
        bbox = None
        if picture.prov:
            prov = picture.prov[0]
            if hasattr(prov, 'bbox') and prov.bbox:
                bbox = {
                    "bottom": prov.bbox.b,
                    "top": prov.bbox.t,
                    "left": prov.bbox.l,
                    "right": prov.bbox.r
                }
        
        # Save image
        img_filename = f"{safe_name}_p{page_no}_img{i}.png"
        img_path = os.path.join(output_dir, img_filename)
        try:
            picture.get_image(doc).save(img_path)
            
            image_entry = {
                "path": img_path,
                "filename": img_filename,
                "description": description,
                "bbox": bbox,
                "type": "image"
            }
            
            page_images.setdefault(page_no, [])
            page_images[page_no].append(image_entry)
            
            logger.info(f"  ✓ Saved image: {img_filename} (Page {page_no})")
            if description:
                logger.info(f"    Description: {description[:100]}...")
                
        except Exception as e:
            logger.warning(f"  ✗ Failed to save image {img_filename}: {e}")
    
    # Extract Tables as Images
    for i, table in enumerate(doc.tables):
        page_no = 1
        try:
            if table.prov:
                page_no = table.prov[0].page_no
        except Exception:
            pass
        
        # Get bounding box
        bbox = None
        if table.prov:
            prov = table.prov[0]
            if hasattr(prov, 'bbox') and prov.bbox:
                bbox = {
                    "bottom": prov.bbox.b,
                    "top": prov.bbox.t,
                    "left": prov.bbox.l,
                    "right": prov.bbox.r
                }
        
        # Get table text for description
        description = ""
        if hasattr(table, 'text'):
            description = f"Table content: {table.text[:200]}"
        
        # Save table image
        table_img = table.get_image(doc)
        if table_img:
            img_filename = f"{safe_name}_p{page_no}_table{i}.png"
            img_path = os.path.join(output_dir, img_filename)
            try:
                table_img.save(img_path)
                
                image_entry = {
                    "path": img_path,
                    "filename": img_filename,
                    "description": description,
                    "bbox": bbox,
                    "type": "table"
                }
                
                page_images.setdefault(page_no, [])
                page_images[page_no].append(image_entry)
                
                logger.info(f"  ✓ Saved table: {img_filename} (Page {page_no})")
                
            except Exception as e:
                logger.warning(f"  ✗ Failed to save table {img_filename}: {e}")
    
    total_images = sum(len(imgs) for imgs in page_images.values())
    logger.info(f"✅ Extracted {total_images} images/tables from {filename}")
    
    return page_images


def count_tokens(text: str, tokenizer) -> int:
    """Accurate token counting ignoring special CLS/SEP tokens."""
    return len(tokenizer.encode(text, add_special_tokens=False))


def get_chunk_bbox_range(docling_chunk) -> Optional[Dict[str, float]]:
    """
    Extracts the vertical span (top and bottom) of a text chunk from Docling metadata.
    """
    if not hasattr(docling_chunk, 'meta') or not docling_chunk.meta:
        return None
    if not hasattr(docling_chunk.meta, 'doc_items') or not docling_chunk.meta.doc_items:
        return None
    
    min_bottom = float('inf')
    max_top = float('-inf')
    found = False

    for item in docling_chunk.meta.doc_items:
        if hasattr(item, 'prov') and item.prov:
            for p in item.prov:
                if hasattr(p, 'bbox') and p.bbox:
                    b = p.bbox.b 
                    t = p.bbox.t
                    if b < min_bottom: min_bottom = b
                    if t > max_top: max_top = t
                    found = True

    if not found:
        return None

    return {"bottom": min_bottom, "top": max_top}


def is_image_spatially_near(text_y_range: Dict, img_bbox: Dict) -> bool:
    """
    Checks if an image overlaps vertically with the text range.
    """
    if not text_y_range or not img_bbox:
        return False

    # Expand text range by buffer
    t_bot = text_y_range["bottom"] - VERTICAL_BUFFER
    t_top = text_y_range["top"] + VERTICAL_BUFFER

    # Get Image bounds
    i_bot = img_bbox.get("bottom", 0)
    i_top = img_bbox.get("top", 0)

    # Intersection Logic
    return (t_bot <= i_top) and (t_top >= i_bot)


def parse_document_metadata(pdf_name: str, pdf_path: Path) -> dict:
    """Parse document metadata from filename and folder structure.
    
    Reuses the same logic from the original pdf_processor.py
    """
    import re
    
    metadata = {
        "source": pdf_name,
        "file_path": str(pdf_path),
        "document_type": "unknown",
        "jurisdiction": "unknown",
        "category": "unknown",
        "year": "unknown",
        "title": "unknown"
    }
    
    filename = Path(pdf_name).name
    
    # Try different patterns
    patterns = [
        r'(\d+)_AT_([^_]+)_(\d+)_([^_]+)_(.+?)_(\d{4})\.pdf',
        r'(\d+)_AT_([^_]+)_(\d+)_([^_]+)_(.+?)\.pdf',
        r'(\d+)_AT_([^_]+)_([^_]+)_(.+?)_(\d{4})\.pdf',
        r'(\d+)_AT_([^_]+)_([^_]+)_(.+?)\.pdf',
    ]
    
    match = None
    for pattern in patterns:
        match = re.match(pattern, filename)
        if match:
            break
    
    if match:
        groups = match.groups()
        level_map = {"1": "law", "2": "regulation", "3": "guideline", "4": "standard"}
        state_map = {"0": "federal", "W": "vienna", "OOE": "upper_austria"}
        category_map = {"GE": "law", "VE": "regulation", "OIB": "guideline", "OEN": "standard"}
        
        if len(groups) >= 4:
            level = groups[0]
            state = groups[1]
            metadata.update({
                "document_type": level_map.get(level, "unknown"),
                "jurisdiction": state_map.get(state, "unknown"),
                "level": level,
                "state_code": state
            })
    
    # Parse folder structure
    path_parts = Path(pdf_name).parts
    if len(path_parts) >= 2:
        main_folder = path_parts[0]
        folder_map = {
            "00_Bundesgesetze": "federal_laws",
            "01-02_Bundesländer- Gesetze und Verordnungen": "state_laws",
            "03_OIB Richtlinien": "oib_guidelines",
            "04_ÖNORM": "austrian_standards"
        }
        metadata["folder_category"] = folder_map.get(main_folder, "unknown")
    
    return metadata


def process_pdf_with_docling(
    pdf_path: Path,
    pdf_name: str,
    output_dir: str,
    doc_converter: DocumentConverter,
    tokenizer
) -> List[Document]:
    """
    Process a single PDF file with Docling and create smart chunks with image references.
    
    Args:
        pdf_path: Full path to PDF file
        pdf_name: Relative PDF name for metadata
        output_dir: Directory to save extracted images
        doc_converter: Configured Docling converter
        tokenizer: Tokenizer for token counting
        
    Returns:
        List of LangChain Documents with enhanced metadata including images
    """
    logger.info(f"🚀 Processing: {pdf_name}")
    
    # Convert PDF with Docling
    try:
        result = doc_converter.convert(str(pdf_path))
        doc = result.document
    except Exception as e:
        logger.error(f"Failed to convert {pdf_name}: {e}")
        return []
    
    # Extract images with descriptions
    page_images = extract_images_with_descriptions(doc, pdf_name, output_dir)
    
    # Parse metadata
    base_metadata = parse_document_metadata(pdf_name, pdf_path)
    
    # Extract folder information from path (matching normo_docling notebooks)
    # Example path: "arch_pdfs/03_OIB Richtlinien/2023/document.pdf"
    pdf_path_str = str(pdf_path)
    rel_path = ""
    folder_1 = ""
    folder_2 = ""
    folder_parts = []
    
    # Try to extract relative path from arch_pdfs
    if "arch_pdfs" in pdf_path_str or "01_Data base documents" in pdf_path_str:
        # Split by known base folders
        for base in ["arch_pdfs", "01_Data base documents"]:
            if base in pdf_path_str:
                parts = pdf_path_str.split(base)
                if len(parts) > 1:
                    rel_path = parts[1].lstrip("/\\")
                    rel_dir = os.path.dirname(rel_path)
                    if rel_dir:
                        folder_parts = rel_dir.split(os.sep)
                        folder_1 = folder_parts[0] if folder_parts else ""
                        folder_2 = folder_parts[1] if len(folder_parts) > 1 else ""
                    break
    
    # Add folder metadata (matching test file structure)
    base_metadata.update({
        "rel_path": rel_path,
        "folder_1": folder_1,
        "folder_2": folder_2,
        "all_folders": "/".join(folder_parts) if folder_parts else "",
    })
    
    # Initialize chunker
    chunker = HybridChunker(tokenizer=TOKENIZER_MODEL, merge_peers=True)
    
    # Chunk the document
    try:
        raw_chunks = list(chunker.chunk(doc))
    except Exception as e:
        logger.warning(f"Chunking failed for {pdf_name}: {e}")
        return []
    
    langchain_docs = []
    buffer_segments = []
    current_token_count = 0
    
    for i, chunk in enumerate(raw_chunks):
        text = chunk.text
        if not text.strip():
            continue
        
        n_tokens = count_tokens(text, tokenizer)
        
        # Get page number
        page = 1
        if chunk.meta.doc_items and chunk.meta.doc_items[0].prov:
            page = chunk.meta.doc_items[0].prov[0].page_no
        
        # Get vertical position
        y_range = get_chunk_bbox_range(chunk)
        
        segment = {
            "text": text,
            "page": page,
            "tokens": n_tokens,
            "y_range": y_range
        }
        buffer_segments.append(segment)
        current_token_count += n_tokens
        
        # Check flush condition
        is_last_chunk = (i == len(raw_chunks) - 1)
        
        if current_token_count >= TARGET_TOKENS or is_last_chunk:
            # A. Construct text
            full_text = "\n\n".join([s["text"] for s in buffer_segments])
            
            # B. Determine primary page
            page_counts = {}
            for seg in buffer_segments:
                p = seg["page"]
                page_counts[p] = page_counts.get(p, 0) + seg["tokens"]
            
            primary_page = max(page_counts, key=page_counts.get) if page_counts else 1
            
            # C. Spatial image matching
            matched_images = []
            active_pages = list(page_counts.keys())
            
            for p in active_pages:
                if p not in page_images:
                    continue
                
                # Calculate text bounds for this page
                page_segments = [s for s in buffer_segments if s["page"] == p and s["y_range"]]
                combined_text_range = None
                
                if page_segments:
                    text_min_y = min(s["y_range"]["bottom"] for s in page_segments)
                    text_max_y = max(s["y_range"]["top"] for s in page_segments)
                    combined_text_range = {"bottom": text_min_y, "top": text_max_y}
                
                # Check images
                for img_entry in page_images[p]:
                    is_match = False
                    
                    if combined_text_range and img_entry.get("bbox"):
                        is_match = is_image_spatially_near(combined_text_range, img_entry["bbox"])
                    else:
                        # If no spatial data, include all images on active pages
                        is_match = True
                    
                    if is_match:
                        # Check if already added
                        already_added = any(
                            img.get("filename") == img_entry["filename"]
                            for img in matched_images
                        )
                        
                        if not already_added:
                            matched_images.append({
                                "filename": img_entry["filename"],
                                "description": img_entry.get("description", ""),
                                "type": img_entry.get("type", "image")
                            })
                            
                            # Append image description to chunk text for better retrieval
                            if img_entry.get("description"):
                                full_text += f"\n\n[{img_entry['type'].upper()} DESCRIPTION: {img_entry['description']}]"
            
            # D. Build document
            final_meta = base_metadata.copy()
            final_meta.update({
                "page": primary_page,
                "images": ";".join([img["filename"] for img in matched_images]),  # Semicolon-separated for ChromaDB
                "image_data": json.dumps(matched_images) if matched_images else "",  # JSON string for ChromaDB compatibility
                "token_count": current_token_count,
                "pages_spanned": str(active_pages),  # Convert list to string
                "image_count": len(matched_images),
                "chunk_id": f"{pdf_name}_p{primary_page}_c{len(langchain_docs) + 1}"
            })
            
            langchain_docs.append(Document(page_content=full_text, metadata=final_meta))
            
            # E. Handle overlap
            if not is_last_chunk:
                overlap_buffer = []
                overlap_count = 0
                
                for seg in reversed(buffer_segments):
                    overlap_buffer.insert(0, seg)
                    overlap_count += seg["tokens"]
                    if overlap_count >= OVERLAP_TOKENS:
                        break
                
                buffer_segments = overlap_buffer
                current_token_count = overlap_count
            else:
                buffer_segments = []
                current_token_count = 0
    
    logger.info(f"✅ Created {len(langchain_docs)} chunks from {pdf_name}")
    return langchain_docs


def load_pdfs_with_docling(pdf_folder: str, pdf_names: List[str], output_dir: str = "rag_assets") -> List[Document]:
    """
    Load and process PDF documents using Docling with image extraction.
    
    Args:
        pdf_folder: Path to the folder containing PDF files
        pdf_names: List of PDF filenames to load (can include relative paths)
        output_dir: Directory to save extracted images
        
    Returns:
        List of Document objects with text content, images, and metadata
    """
    pdf_folder_path = Path(pdf_folder)
    output_dir_path = Path(output_dir)
    output_dir_path.mkdir(exist_ok=True)
    
    # Initialize Docling converter
    doc_converter = setup_docling_converter(str(output_dir_path))
    
    # Initialize tokenizer
    tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_MODEL)
    
    all_documents = []
    
    for pdf_name in pdf_names:
        pdf_path = pdf_folder_path / pdf_name
        
        if not pdf_path.exists():
            logger.warning(f"PDF file {pdf_name} not found in {pdf_folder}")
            continue
        
        try:
            docs = process_pdf_with_docling(
                pdf_path=pdf_path,
                pdf_name=pdf_name,
                output_dir=str(output_dir_path),
                doc_converter=doc_converter,
                tokenizer=tokenizer
            )
            all_documents.extend(docs)
            
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_name}: {str(e)}")
            continue
    
    logger.info(f"🎉 Finished! Processed {len(pdf_names)} PDFs -> {len(all_documents)} chunks")
    return all_documents

