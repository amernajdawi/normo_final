# State-Based Document Filtering Implementation

## Overview
Implemented intelligent document filtering based on user's state (Vienna vs Upper Austria) and folder hierarchy, ensuring queries only search relevant legal documents.

## Backend Changes

### 1. AgentState Model (`models/memory_state.py`)
Added new fields for filtering:
```python
user_state: Optional[str] = None        # "Vienna" or "Upper Austria"
folder_1: Optional[str] = None          # Top-level folder (e.g., "03_OIB Richtlinien")
folder_2: Optional[str] = None          # Subfolder (e.g., "2023", "01.Wien")
filter_logic: str = "and"               # "and" or "or" for combining filters
```

### 2. PDF Selector Agent (`agents/pdf_selector.py`)
**Complete rewrite** to handle hierarchical folder filtering:
- Takes `user_state` from request
- Returns structured filters instead of specific PDF list
- Supports `folder_1`, `folder_2`, `pdf_names`, `filter_logic`
- Intelligent fallback if LLM extraction fails

**Key Logic:**
- State-specific: Vienna → `01.Wien`, Upper Austria → `04. OBERÖSTERREICH`
- Always prefer 2023 OIB guidelines over 2019
- Federal laws and ÖNORM apply to all states

### 3. PDF Selector Prompt (`prompts/pdf_selector.py`)
**Complete rewrite** with clear filtering rules:

**Critical Rules:**
1. **State-Specific Documents**: Never mix Vienna and Upper Austria
2. **OIB Guidelines**: Always prefer 2023 edition
3. **Federal Laws**: Apply to all Austria
4. **ÖNORM Standards**: Apply to all Austria

**Example Output:**
```json
{
  "folder_1": "01-02_Bundesländer- Gesetze und Verordnungen",
  "folder_2": "04. OBERÖSTERREICH",
  "pdf_names": [],
  "filter_logic": "and"
}
```

### 4. RAG Retriever (`agents/rag_retriever.py`)
Added `build_chroma_filter()` function that converts AgentState filters into ChromaDB where clauses:

```python
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
    
    if state.filter_logic == "or":
        return {"$or": conditions}
    else:
        return {"$and": conditions}
```

**Applied during retrieval:**
```python
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
```

### 5. API Models (`models/schemas.py`)
Added `user_state` field to `ChatRequest`:
```python
class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None
    stream: bool = False
    user_state: Optional[str] = None  # NEW
```

### 6. API Endpoint (`api/app.py`)
Pass `user_state` from request to AgentState:
```python
user_state = request.user_state

agent_state = AgentState(
    user_query=user_query,
    conversation_id=conversation_id,
    conversation_history=conversation_history,
    is_follow_up=is_follow_up,
    user_state=user_state  # NEW
)
```

## Frontend Changes

### 1. TypeScript Types (`types/api.ts`)
Added `user_state` to `ChatRequest`:
```typescript
export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
  user_id?: string;
  conversation_id?: string;
  stream?: boolean;
  user_state?: string;  // NEW
}
```

### 2. ChatInterface Component (`components/ChatInterface.tsx`)
Added state selection UI that appears **before** the user can ask questions:

**New State:**
```typescript
const [userState, setUserState] = useState<string>('');
const [stateSelected, setStateSelected] = useState(false);
```

**State Selection UI:**
- Shows a prominent selection dialog on first load
- User MUST select Vienna or Upper Austria before proceeding
- Beautiful Material-UI design matching app theme
- Resets when starting a new chat

**Updated Send Logic:**
```typescript
const handleSendMessage = async () => {
  if (!input.trim() || isLoading) return;
  
  if (!stateSelected) {
    return;  // Block sending if no state selected
  }

  await sendMessage(messageText, userState);  // Pass userState
};
```

### 3. ConversationContext (`contexts/ConversationContext.tsx`)
Updated `sendMessage` signature:
```typescript
sendMessage: (message: string, userState?: string) => Promise<void>;
```

Pass to API:
```typescript
const response = await chatApi.sendMessage(
  message.trim(),
  state.currentConversationId || undefined,
  userState  // NEW
);
```

### 4. API Service (`services/api.ts`)
Updated API call to include `user_state`:
```typescript
sendMessage: async (
  message: string, 
  conversationId?: string, 
  userState?: string,  // NEW
  userId?: string
): Promise<ChatResponse> => {
  const request: ChatRequest = {
    messages: [{ ... }],
    conversation_id: conversationId,
    user_id: userId,
    stream: false,
    user_state: userState  // NEW
  };
}
```

## How It Works

### User Flow:
1. User opens app
2. **MUST select state** (Vienna or Upper Austria)
3. Clicks "Continue"
4. Can now ask questions
5. Each query includes the selected state

### Backend Processing:
1. API receives query + `user_state`
2. PDF Selector analyzes query + state
3. Returns structured filters: `folder_1`, `folder_2`, `pdf_names`
4. RAG Retriever builds ChromaDB where clause
5. Only retrieves chunks from relevant documents

### Example Scenarios:

**Scenario 1: Vienna Building Code**
- User: Vienna
- Query: "What are building height requirements?"
- Filter: 
  ```json
  {
    "folder_1": "01-02_Bundesländer- Gesetze und Verordnungen",
    "folder_2": "01.Wien"
  }
  ```
- Result: Only Vienna documents searched

**Scenario 2: Upper Austria + OIB**
- User: Upper Austria
- Query: "Fire protection requirements for residential buildings"
- Filter: 
  ```json
  {
    "folder_1": "03_OIB Richtlinien",
    "folder_2": "2023"
  }
  ```
- Result: Latest OIB guidelines (apply to all Austria)

**Scenario 3: Toilet Calculations**
- User: Upper Austria
- Query: "How many toilets for 120 people?"
- Filter:
  ```json
  {
    "folder_1": "03_OIB Richtlinien",
    "folder_2": "2023",
    "pdf_names": ["3_AT_0_0_OIB_Erläuternde Bemerkungen zu OIB-Richtlinie 3...pdf"]
  }
  ```
- Result: Specific OIB 3 Explanatory Notes document

## Key Features

✅ **Mandatory State Selection**: User must choose before asking questions
✅ **Smart Filtering**: Never mixes Vienna and Upper Austria documents
✅ **Version Preference**: Always prefers 2023 over 2019 OIB guidelines
✅ **Hierarchical Filtering**: Uses folder_1, folder_2, and pdf_names
✅ **Flexible Logic**: Supports "and" / "or" filter combinations
✅ **Clean UI**: Beautiful state selection interface
✅ **Persistent Selection**: State persists until new chat

## Testing

### Test Cases:

1. **Test State Selection UI**
   ```
   - Open app
   - Should see state selection dialog
   - Try clicking example questions → blocked
   - Select Vienna → Continue → Can now chat
   ```

2. **Test Vienna Query**
   ```
   - Select Vienna
   - Ask: "Building height requirements"
   - Check backend logs for filter: folder_2: "01.Wien"
   - Response should cite Vienna-specific laws
   ```

3. **Test Upper Austria Query**
   ```
   - New chat → Select Upper Austria
   - Ask: "Playground area requirements"
   - Check backend logs for filter: folder_2: "04. OBERÖSTERREICH"
   - Response should cite Upper Austria laws
   ```

4. **Test OIB Guidelines (All Austria)**
   ```
   - Select either state
   - Ask: "OIB fire protection requirements"
   - Check backend logs for filter: folder_2: "2023"
   - Should use latest OIB guidelines
   ```

5. **Test New Chat Reset**
   ```
   - Select Vienna, ask question
   - Click "New Chat"
   - Should show state selection again
   - Select Upper Austria, ask question
   - Should now search Upper Austria docs
   ```

## ChromaDB Metadata Requirements

For this to work, PDF chunks MUST have these metadata fields:
- `folder_1`: Top-level folder (e.g., "03_OIB Richtlinien")
- `folder_2`: Subfolder (e.g., "2023", "01.Wien", "04. OBERÖSTERREICH")
- `source`: PDF filename or path

These are already set by the Docling processor in `utils/docling_processor.py`.

## Benefits

1. **Accuracy**: Users only see laws relevant to their state
2. **Performance**: Smaller search space = faster retrieval
3. **Compliance**: Ensures correct legal jurisdiction
4. **User Experience**: Clear, mandatory state selection
5. **Maintainability**: Structured filters > hardcoded PDF lists
6. **Flexibility**: Easy to add new states or document types

