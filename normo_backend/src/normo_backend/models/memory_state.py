from typing import Any, Dict, List, Optional
from datetime import datetime

from pydantic import BaseModel


class AgentState(BaseModel):
    user_query: str
    next_action: str = "planner"
    steps: List[str] = []
    meta_data: Dict[str, str] = {}
    pdf_names: List[str] = []
    summary: str = ""
    memory: List[Dict[str, Any]] = []
    source_citations: List[Dict[str, Any]] = []
    
    conversation_id: Optional[str] = None
    conversation_history: List[Dict[str, Any]] = []
    is_follow_up: bool = False
    
    user_state: Optional[str] = None
    folder_1: Optional[str] = None
    folder_2: Optional[str] = None
    filter_logic: str = "and"
