from __future__ import annotations

from langchain_openai import ChatOpenAI

from normo_backend.config import get_settings


def get_default_chat_model(
    model: str = "gpt-4.1-2025-04-14", temperature: float = 0.2
) -> ChatOpenAI:
    """
    Get configured ChatOpenAI model.
    
    Default: gpt-4.1-2025-04-14 (matching normo_docling test notebook)
    Alternative: gpt-5.1 (if available)
    """
    settings = get_settings()
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        api_key=settings.openai_api_key,
    )
