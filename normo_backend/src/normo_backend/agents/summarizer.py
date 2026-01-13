import json

from normo_backend.models import AgentState
from normo_backend.prompts import SUMMARIZER_SYSTEM_PROMPT
from normo_backend.utils import get_default_chat_model

llm = get_default_chat_model(model="gpt-4.1-2025-04-14", temperature=0)


def summarizer_agent(state: AgentState) -> AgentState:
    # Format conversation history for the prompt
    conversation_history_str = ""
    if state.conversation_history:
        for msg in state.conversation_history:
            conversation_history_str += f"Role: {msg['role']}, Content: {msg['content']}\n"
            if msg.get('pdf_names'):
                conversation_history_str += f"  PDFs: {', '.join(msg['pdf_names'])}\n"
    
    # Format memory with image information
    memory_with_images = state.memory.copy()
    
    # Add image information to the memory if available
    if hasattr(state, 'meta_data') and state.meta_data and state.meta_data.get('retrieved_images'):
        # Parse JSON string back to list
        try:
            images_str = state.meta_data.get('retrieved_images', '[]')
            images = json.loads(images_str) if isinstance(images_str, str) else []
        except (json.JSONDecodeError, TypeError):
            images = []
        
        if images:
            image_info = f"\n\n📷 IMAGES FOUND ({len(images)} images/diagrams):\n"
            for i, img in enumerate(images, 1):
                image_info += f"{i}. {img.get('filename', 'Unknown')}"
                if img.get('description'):
                    image_info += f" - {img.get('description')}"
            if img.get('type'):
                image_info += f" (Type: {img.get('type')})"
            image_info += "\n"
        
        # Add to memory
        memory_with_images.append({
            "role": "system",
            "content": image_info
        })
    
    prompt = SUMMARIZER_SYSTEM_PROMPT.format(
        user_query=state.user_query,
        conversation_history=conversation_history_str or "No previous conversation",
        is_follow_up=state.is_follow_up,
        memory=memory_with_images
    )
    response = llm.invoke(prompt)
    state.summary = response.content
    
    state.memory.append(
        {
            "role": "summarizer_agent",
            "content": state.summary,
        }
    )
    return state
