from __future__ import annotations

from typing import Literal, Optional
from datetime import datetime

from pydantic import BaseModel, Field

Role = Literal["system", "user", "assistant", "tool"]


class ChatMessage(BaseModel):
    role: Role
    content: str
    tool_name: Optional[str] = None
    tool_args: Optional[dict] = None
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)


class ConversationMessage(BaseModel):
    """Message in a conversation with additional context"""
    role: Role
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    agent_steps: Optional[list[str]] = None
    pdf_names: Optional[list[str]] = None
    source_citations: Optional[list[dict]] = None
    meta_data: Optional[dict] = None


class Conversation(BaseModel):
    """Complete conversation with context"""
    conversation_id: str
    user_id: Optional[str] = None
    messages: list[ConversationMessage] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    context: dict = Field(default_factory=dict)  # Store any additional context


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None
    stream: bool = False
    user_state: Optional[str] = None


class ChatResponse(BaseModel):
    message: ChatMessage
    conversation_id: Optional[str] = None
    source_citations: Optional[list[dict]] = None
