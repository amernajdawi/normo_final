from normo_backend.models import AgentState
from normo_backend.prompts import APPENDIX_A, PDF_SELECTOR_SYSTEM_PROMPT
from normo_backend.utils import get_default_chat_model
from normo_backend.utils.pdf_processor import get_available_pdfs
from normo_backend.utils.trimer import extract_json

llm = get_default_chat_model(model="gpt-4.1-2025-04-14", temperature=0.2)


def pdf_selector_agent(state: AgentState) -> AgentState:
    available_pdfs = get_available_pdfs("arch_pdfs")
    
    if available_pdfs:
        available_pdfs_text = "\n".join([f"- {pdf}" for pdf in available_pdfs])
    else:
        available_pdfs_text = "No PDFs found in arch_pdfs folder"
    
    formatted_appendix = APPENDIX_A.format(available_pdfs=available_pdfs_text)
    
    user_state = state.user_state or "Not specified"
    
    prompt = PDF_SELECTOR_SYSTEM_PROMPT.format(
        user_query=state.user_query,
        user_state=user_state,
        appendex_a=formatted_appendix
    )
    
    response = llm.invoke(prompt)
    print("PDF SELECTOR AGENT RESPONSE:", response.content)
    try:
        result = extract_json(response.content)
        
        state.folder_1 = result.get("folder_1", "")
        state.folder_2 = result.get("folder_2", "")
        state.pdf_names = result.get("pdf_names", [])
        state.filter_logic = result.get("filter_logic", "and")
        
        if not state.folder_1 and not state.pdf_names:
            if available_pdfs:
                state.pdf_names = available_pdfs[:3]
            else:
                state.pdf_names = []
                
    except (KeyError, TypeError, ValueError):
        if available_pdfs:
            state.pdf_names = available_pdfs[:3]
        else:
            state.pdf_names = []
        state.folder_1 = ""
        state.folder_2 = ""
        state.filter_logic = "and"
    
    state.memory.append(
        {
            "role": "pdf_selector_agent",
            "content": {
                "folder_1": state.folder_1,
                "folder_2": state.folder_2,
                "pdf_names": state.pdf_names,
                "filter_logic": state.filter_logic,
                "user_state": state.user_state
            },
        }
    )
    return state
