from normo_backend.models import AgentState
from normo_backend.prompts import PLANNER_SYSTEM_PROMPT
from normo_backend.utils import get_default_chat_model
from normo_backend.utils.trimer import extract_json

llm = get_default_chat_model(model="gpt-4.1-2025-04-14", temperature=0.2)


def planner_agent(state: AgentState) -> AgentState:
    # Format conversation history for the prompt
    conversation_history_str = ""
    if state.conversation_history:
        for msg in state.conversation_history:
            conversation_history_str += f"Role: {msg['role']}, Content: {msg['content']}\n"
            if msg.get('pdf_names'):
                conversation_history_str += f"  PDFs: {', '.join(msg['pdf_names'])}\n"
    
    prompt = PLANNER_SYSTEM_PROMPT.format(
        user_query=state.user_query,
        conversation_history=conversation_history_str or "No previous conversation",
        is_follow_up=state.is_follow_up
    )
    response = llm.invoke(prompt)
    try:
        state.steps = extract_json(response.content)["steps"]
    except (KeyError, TypeError):
        # Fallback to default action if JSON extraction fails
        state.steps = ["retrieve_pdfs"]
    
    state.memory.append(
        {
            "role": "planner_agent",
            "content": state.steps,
        }
    )
    return state
