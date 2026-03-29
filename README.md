# Normo - Austrian Architectural Legal Document Analysis System

An intelligent AI-powered system for analyzing Austrian building codes, regulations, and legal documents. Uses RAG (Retrieval Augmented Generation) with pre-embedded vector data so you can start querying immediately after setup.

## Features

- **Pre-embedded Document Database**: 77 Austrian legal PDFs already processed into 2550+ vector chunks -- no embedding step needed
- **Intelligent Query Routing**: LLM gate automatically determines whether to use simple responses or full document analysis
- **Advanced RAG System**: Vector-based document retrieval with precise citations and image/table references
- **Conversation Management**: MongoDB + JSON hybrid storage with conversation history
- **Modern UI**: React-based frontend with Material-UI components
- **Docker Support**: Complete containerization -- clone, build, run

## Quick Start (Docker)

### Prerequisites
- Docker Desktop installed (allocate at least 8GB RAM in Docker Desktop settings)
- OpenAI API key

### Setup & Run

```bash
# 1. Clone repository
git clone https://github.com/amernajdawi/normo_final.git
cd normo_final

# 2. Create your .env file with your OpenAI API key
cp normo_backend/.env.example normo_backend/.env
# Edit normo_backend/.env and add your real OPENAI_API_KEY

# 3. Build and start everything
docker-compose build
docker-compose up -d

# 4. Open http://localhost:3000
```

The system comes with pre-embedded vector data (2550+ chunks from 77 PDFs). No additional embedding is needed -- it works immediately after `docker-compose up`.

### Stop

```bash
docker-compose down
```

## Test the System

### Simple queries (fast LLM response)
- "Hello"
- "What can you help me with?"

### Architectural queries (full RAG analysis with citations)
- "What are the fire safety requirements for commercial buildings in Austria?"
- "What are the building height requirements in Vienna?"
- "What are the accessibility requirements according to OIB Richtlinie 4?"
- "What does ÖNORM B 1600 say about barrier-free design?"

### Verify via API

```bash
# Health check
curl http://localhost:8000/health

# Check vector store status
docker exec normo-backend uv run normo-cli vectorstore status
```

## Project Structure

```
normo_final/
├── normo_backend/
│   ├── src/normo_backend/
│   │   ├── agents/              # AI agents (planner, retriever, summarizer, gate)
│   │   ├── api/                 # FastAPI endpoints
│   │   ├── models/              # Pydantic data models
│   │   ├── services/            # Business logic (storage, vector store)
│   │   ├── utils/               # Utilities (PDF processing, LLM)
│   │   └── prompts/             # LLM prompts
│   ├── arch_pdfs/               # 77 Austrian legal document PDFs
│   ├── chroma_db_openai_v2/     # Pre-built ChromaDB vector embeddings
│   ├── rag_assets/              # Extracted images and tables from PDFs
│   ├── entrypoint.sh            # Docker entrypoint script
│   └── mongodb-init/            # MongoDB initialization scripts
├── normo_frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── contexts/            # React context providers
│   │   ├── services/            # API services
│   │   └── types/               # TypeScript type definitions
│   ├── nginx.conf               # Nginx config with API proxy
│   └── public/                  # Static assets
├── docker-compose.yml           # Docker orchestration
└── README.md
```

## System Architecture

### LLM Gate
- **Smart Routing**: Automatically determines query complexity
- **Simple Queries**: General greetings, help requests -> Fast LLM response
- **Complex Queries**: Architectural questions -> Full agent workflow with RAG

### Agent Workflow
1. **Planner**: Determines required actions
2. **PDF Selector**: Identifies relevant documents
3. **Retriever**: Extracts specific information from vector store
4. **Summarizer**: Generates comprehensive responses with citations

### Data Storage
- **ChromaDB**: 2550+ pre-embedded vector chunks for document search
- **MongoDB**: Primary database for conversations
- **JSON Files**: Backup storage for redundancy

## Document Database

77 Austrian legal documents are included and pre-embedded:

- **Federal Laws**: BauKG, GewO 1994, AStV, BauV
- **Vienna Laws**: Bauordnung, Wiener Garagengesetz, WBTV 2023
- **Upper Austria Laws**: Building codes, Planzeichenverordnung
- **OIB Guidelines (2019 + 2023)**:
  - Mechanical strength and stability
  - Fire protection (commercial, garages, high-rise)
  - Hygiene and environmental protection
  - Accessibility and safety
  - Sound protection
  - Energy efficiency
- **ÖNORM Standards**: B 1600, B 1800, B 5371

## Re-embedding (Optional)

The vector store comes pre-built. If you need to re-embed (e.g., after adding new PDFs):

```bash
# Reset and re-embed all PDFs
docker exec normo-backend uv run normo-cli vectorstore embed --all --force

# Embed only specific PDFs
docker exec normo-backend uv run normo-cli vectorstore embed "01_Data base documents/path/to/file.pdf"

# Check status
docker exec normo-backend uv run normo-cli vectorstore status
```

## Configuration

### Environment Variables

**Backend** (`normo_backend/.env`):
- `OPENAI_API_KEY`: Required -- your OpenAI API key
- `ENVIRONMENT`: `development` or `production`
- `LOG_LEVEL`: `INFO`, `DEBUG`, `WARNING`, `ERROR`

### Docker Resources

The backend container is configured with an 8GB memory limit. If you encounter OOM errors during re-embedding of large PDFs, increase Docker Desktop's memory allocation to 12-16GB.

## Services & Ports

| Service  | Port | URL                    |
|----------|------|------------------------|
| Frontend | 3000 | http://localhost:3000   |
| Backend  | 8000 | http://localhost:8000   |
| MongoDB  | 27017| mongodb://localhost:27017 |
