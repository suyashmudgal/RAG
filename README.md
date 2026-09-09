# DocChat AI — RAG Document Chatbot

An AI-powered document chatbot that lets you upload documents (PDF, DOCX, TXT),
ask questions about them, and get grounded answers with source citations.

Built with **LangChain**, **FastAPI**, **React**, **ChromaDB**, and **Groq**.

---

## Architecture

```
React Frontend (Vite)
       │
       ▼
FastAPI Backend
       │
       ├─ File Upload & Validation
       │        │
       │        ▼
       ├─ Text Extraction (LangChain Loaders)
       │        │
       │        ▼
       ├─ Text Chunking (LangChain RecursiveCharacterTextSplitter)
       │        │
       │        ▼
       ├─ Embeddings (HuggingFace all-MiniLM-L6-v2 — local, free)
       │        │
       │        ▼
       ├─ Vector Store (ChromaDB — persistent)
       │
       └─ RAG Chat
            ├─ Semantic Retrieval (ChromaDB)
            ├─ Context Building
            ├─ LLM (Groq — llama-3.3-70b-versatile)
            ├─ Streaming Response (SSE)
            ├─ Conversation Memory
            └─ Source Citations
```

## Tech Stack

| Layer              | Technology                                  |
|--------------------|---------------------------------------------|
| Frontend           | React 18, Vite, Vanilla CSS                 |
| Backend            | FastAPI, Uvicorn                             |
| LLM                | Groq API (llama-3.3-70b-versatile) — **free** |
| Embeddings         | sentence-transformers (all-MiniLM-L6-v2) — **local, free** |
| Vector Database    | ChromaDB (persistent, file-backed)          |
| Document Loaders   | LangChain (PyPDFLoader, Docx2txtLoader, TextLoader) |
| Text Splitting     | LangChain RecursiveCharacterTextSplitter    |
| Orchestration      | LangChain (embeddings, vector store, LLM)   |

## Folder Structure

```
RAG/
├── backend/
│   ├── main.py                        # FastAPI entry point
│   ├── config/
│   │   └── settings.py                # Pydantic Settings (.env)
│   ├── routes/
│   │   ├── upload.py                  # POST /upload
│   │   ├── documents.py              # GET /documents, DELETE /documents/{id}
│   │   └── chat.py                   # POST /chat, POST /chat/stream
│   ├── services/
│   │   ├── text_extractor.py          # LangChain document loaders
│   │   ├── text_chunker.py            # LangChain text splitter
│   │   ├── embedding_service.py       # HuggingFace embeddings (singleton)
│   │   ├── vector_store.py            # ChromaDB wrapper
│   │   ├── document_processor.py      # Extract → Chunk → Store pipeline
│   │   ├── chat_service.py            # RAG + Groq + Memory + Streaming
│   │   └── deps.py                    # Dependency injection
│   ├── models/
│   │   └── schemas.py                 # Pydantic request/response models
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx / App.css
│       ├── index.css                  # Design system
│       ├── api/
│       │   └── client.js              # API fetch wrappers
│       └── components/
│           ├── Sidebar.jsx / .css
│           ├── FileUpload.jsx / .css
│           ├── ChatPanel.jsx / .css
│           ├── MessageBubble.jsx / .css
│           └── SourceCitations.jsx / .css
└── README.md
```

## Installation

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and npm
- A free **Groq API key** → [https://console.groq.com/keys](https://console.groq.com/keys)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# Edit .env and add your Groq API key
```

> **Note:** On the first run, the embedding model (~90 MB) will be
> downloaded and cached automatically by sentence-transformers.

### 2. Frontend Setup

```bash
cd frontend
npm install
```

## Environment Variables

| Variable           | Required | Default                      | Description |
|--------------------|----------|------------------------------|-------------|
| `GROQ_API_KEY`     | **Yes**  | —                            | Groq API key for LLM |
| `GROQ_MODEL`       | No       | `llama-3.3-70b-versatile`    | Groq model name |
| `EMBEDDING_MODEL`  | No       | `all-MiniLM-L6-v2`           | HuggingFace embedding model |
| `CHROMA_PERSIST_DIR` | No     | `./chroma_db`                | ChromaDB storage path |
| `UPLOAD_DIR`       | No       | `./uploads`                  | Upload file storage |
| `MAX_FILE_SIZE_MB` | No       | `50`                         | Max upload size |
| `CHUNK_SIZE`       | No       | `800`                        | Chunk size in characters |
| `CHUNK_OVERLAP`    | No       | `200`                        | Overlap between chunks |
| `TOP_K_RESULTS`    | No       | `5`                          | Number of chunks to retrieve |
| `CORS_ORIGINS`     | No       | `http://localhost:5173,...`   | Allowed CORS origins |

## Running the Application

### Start Backend

```bash
cd backend
uvicorn main:app --reload
```

The API will be available at **http://localhost:8000**.
Interactive docs at **http://localhost:8000/docs**.

### Start Frontend

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

## How to Use

1. **Upload documents** — drag & drop or click the upload area in the sidebar
2. **Wait for processing** — the spinner indicates documents are being indexed
3. **Ask questions** — type your question in the chat input
4. **View answers** — AI responses stream in real-time with source citations
5. **Follow up** — ask follow-up questions; conversation memory is maintained
6. **Manage documents** — delete documents from the sidebar; they're removed from the index

## API Endpoints

| Method | Path                      | Description |
|--------|---------------------------|-------------|
| GET    | `/`                       | Health check |
| POST   | `/upload`                 | Upload & process documents |
| GET    | `/documents`              | List all indexed documents |
| DELETE | `/documents/{document_id}`| Delete a document |
| POST   | `/chat`                   | Non-streaming RAG chat |
| POST   | `/chat/stream`            | Streaming RAG chat (SSE) |

## RAG Pipeline

1. **Upload** → file is validated, saved to disk
2. **Extract** → LangChain loader extracts text (page-aware for PDFs)
3. **Chunk** → `RecursiveCharacterTextSplitter` creates ~800-char chunks with 200-char overlap
4. **Embed** → `all-MiniLM-L6-v2` generates 384-dim embeddings locally
5. **Store** → chunks + embeddings + metadata saved to ChromaDB
6. **Query** → user question is embedded → cosine similarity search → top-5 chunks retrieved
7. **Generate** → Groq LLM receives context + question + conversation history → streams answer
8. **Cite** → source documents and page numbers are attached to the response

## Known Limitations

- **Embedding model** runs on CPU — large documents may take a few seconds to process
- **Conversation memory** is in-memory only — restarting the backend clears chat history (but documents persist in ChromaDB)
- **Groq free tier** has rate limits — if you hit them, wait ~60 seconds
- **DOCX and TXT** files don't have page numbers — citations show filename only
- **No authentication** — this is a single-user local application
- **Images/tables in PDFs** are not extracted — only text content is indexed
