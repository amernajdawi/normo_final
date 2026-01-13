from normo_backend.models import AgentState
from normo_backend.prompts import META_DATA_EXTRACTOR_SYSTEM_PROMPT
from normo_backend.utils import get_default_chat_model
from normo_backend.utils.trimer import extract_json


def meta_data_agent(state: AgentState) -> AgentState:
    prompt = META_DATA_EXTRACTOR_SYSTEM_PROMPT.format(user_query=state.user_query)
    response = get_default_chat_model(model="gpt-4.1-2025-04-14", temperature=0.2).invoke(
        prompt
    )
    try:
        state.meta_data = extract_json(response.content)["meta_data"]
    except (KeyError, TypeError):
        # Fallback metadata if JSON extraction fails
        state.meta_data = {
            "country": "Austria",
            "county": "",
            "city": "",
            "Building_type": ""
        }
    
    state.memory.append(
        {
            "role": "meta_data_agent",
            "content": state.meta_data,
        }
    )
    return state
