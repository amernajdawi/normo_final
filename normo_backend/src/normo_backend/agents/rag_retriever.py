from __future__ import annotations

import json
import os
from typing import Any, Dict, List

from langchain_core.documents import Document
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from normo_backend.config import get_settings
from normo_backend.models import AgentState
from normo_backend.prompts import RAG_RETRIEVER_SYSTEM_PROMPT
from normo_backend.services.vector_store import get_vector_store
from normo_backend.utils import get_default_chat_model
from normo_backend.utils.pdf_processor import create_fallback_documents


def build_chroma_filter(state: AgentState) -> dict:
    """Build ChromaDB where filter from state folder and PDF selection."""
    conditions = []
    
    if state.folder_1:
        conditions.append({"folder_1": {"$eq": state.folder_1}})
    
    if state.folder_2:
        conditions.append({"folder_2": {"$eq": state.folder_2}})
    
    if state.pdf_names:
        if len(state.pdf_names) == 1:
            conditions.append({"source": {"$eq": state.pdf_names[0]}})
        else:
            conditions.append({"source": {"$in": state.pdf_names}})
    
    if not conditions:
        return None
    
    if len(conditions) == 1:
        return conditions[0]
    
    if state.filter_logic == "or":
        return {"$or": conditions}
    else:
        return {"$and": conditions}


def create_retrieve_tool(retriever):
    """Create an enhanced retrieval tool optimized for architectural calculations."""
    
    @tool
    def retrieve_documents(query: str) -> str:
        """Retrieve relevant documents with focus on architectural requirements and calculations."""
        all_docs = retriever.invoke(query)
        
        result = "Retrieved architectural requirements:\n\n"
        source_citations = []
        
        for i, doc in enumerate(all_docs, 1):
            content = doc.page_content
            metadata = doc.metadata
            
            source = metadata.get('source', 'unknown')
            page = metadata.get('page', 'N/A')
            paragraph = metadata.get('paragraph', 'N/A')
            chunk_id = metadata.get('chunk_id', f'chunk_{i}')
            
            result += f"{i}. Source: {source} (Page {page}, Section {paragraph})\n"
            result += f"   Content: {content}\n\n"
            
            citation_info = {
                "pdf_name": source,
                "page": page,
                "paragraph": paragraph,
                "chunk_id": chunk_id,
                "relevant_content": content[:200] + "..." if len(content) > 200 else content
            }
            source_citations.append(citation_info)
        
        result += "\n📚 SOURCE CITATIONS:\n"
        for i, citation in enumerate(source_citations, 1):
            result += f"{i}. {citation['pdf_name']} - Page {citation['page']}, Section {citation['paragraph']}\n"
        
        return result
    
    return retrieve_documents


def rag_retriever_agent(state: AgentState) -> AgentState:
    """RAG retriever agent that finds relevant information from PDFs using persistent vector store."""
    
    try:
        vector_store = get_vector_store()
        
        stats = vector_store.get_collection_stats()
        print(f"📊 Using pre-existing database: {stats['total_chunks']} chunks from {stats['embedded_pdfs']} PDFs")
        
        if state.pdf_names:
            print(f"🔍 Filtering to {len(state.pdf_names)} specific PDFs")
        elif state.folder_1 or state.folder_2:
            print(f"🔍 Filtering by folder: {state.folder_1}/{state.folder_2}")
        else:
            print("🔍 Searching entire database")
        
        retriever = vector_store.get_retriever()
        
        retrieve_tool = create_retrieve_tool(retriever)
        
        llm = get_default_chat_model(model="gpt-4.1-2025-04-14", temperature=0.1)
        agent = create_react_agent(llm, tools=[retrieve_tool])
        
        retrieval_query = RAG_RETRIEVER_SYSTEM_PROMPT.format(user_query=state.user_query)
        
        result = agent.invoke({"messages": [("user", retrieval_query)]})
        
        if result and "messages" in result and result["messages"]:
            final_answer = result["messages"][-1].content
        else:
            final_answer = "Unable to retrieve relevant information from the documents."
        
        where_filter = build_chroma_filter(state)
        
        if where_filter:
            print(f"🔍 Applying filters: {where_filter}")
            search_docs = vector_store.vectorstore.similarity_search(
                state.user_query,
                k=1,
                filter=where_filter
            )
        else:
            search_docs = retriever.invoke(state.user_query)
        
        source_citations = []
        unique_sources = {}
        all_images = []  # Collect all images from retrieved chunks
        
        for doc in search_docs:
            metadata = doc.metadata
            source_key = f"{metadata.get('source', 'unknown')}_p{metadata.get('page', 'N/A')}_s{metadata.get('paragraph', 'N/A')}"
            
            if source_key not in unique_sources:
                citation = {
                    "pdf_name": metadata.get('source', 'unknown'),
                    "page": metadata.get('page', 'N/A'),
                    "paragraph": metadata.get('paragraph', 'N/A'),
                    "chunk_id": metadata.get('chunk_id', ''),
                    "file_path": metadata.get('file_path', ''),
                    "relevant_content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
                }
                
                if metadata.get('image_data'):
                    try:
                        image_data_str = metadata.get('image_data', '')
                        if image_data_str and isinstance(image_data_str, str):
                            image_data = json.loads(image_data_str)
                        else:
                            image_data = []
                        
                        if image_data:
                            citation["images"] = image_data
                            all_images.extend(image_data)
                    except (json.JSONDecodeError, TypeError) as e:
                        print(f"Warning: Could not parse image_data: {e}")
                        image_data = []
                
                if not metadata.get('image_data') and metadata.get('images'):
                    image_filenames = metadata.get('images', '').split(';')
                    image_filenames = [img for img in image_filenames if img.strip()]
                    if image_filenames:
                        citation["images"] = [{"filename": img} for img in image_filenames]
                        all_images.extend(citation["images"])
                
                unique_sources[source_key] = citation
                source_citations.append(citation)
        
        state.summary = final_answer
        state.source_citations = source_citations
        
        if all_images:
            print(f"🖼️  Found {len(all_images)} images in retrieved chunks")
            if not hasattr(state, 'meta_data') or state.meta_data is None:
                state.meta_data = {}
            state.meta_data['retrieved_images'] = json.dumps(all_images)
        
        state.memory.append({
            "role": "rag_retriever_agent",
            "content": {
                "retrieved_info": final_answer,
                "documents_searched": len(search_docs),
                "pdfs_processed": state.pdf_names,
                "source_citations": source_citations,
                "images_found": len(all_images),
                "vector_store_stats": stats
            }
        })
        
    except Exception as e:
        error_msg = f"Error during RAG retrieval: {str(e)}"
        print(f"❌ {error_msg}")
        
        fallback_docs = create_fallback_documents(state.pdf_names, state.user_query)
        
        state.summary = f"Error accessing legal documents: {error_msg}. Please ensure PDFs are available and the system is properly configured."
        state.source_citations = []
        state.memory.append({
            "role": "rag_retriever_agent",
            "content": {"error": error_msg, "fallback_used": True}
        })
    
    return state
