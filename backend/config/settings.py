"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from .env file."""

    # --- Groq API ---
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    # --- Embedding (local, free) ---
    embedding_model: str = "all-MiniLM-L6-v2"

    # --- ChromaDB ---
    chroma_persist_dir: str = "./chroma_db"

    # --- File uploads ---
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 50

    # --- Chunking ---
    chunk_size: int = 800
    chunk_overlap: int = 200

    # --- RAG & Retrieval ---
    top_k_results: int = 6
    retrieval_top_k: int = 6
    similarity_threshold: float = 0.20
    citation_margin: float = 0.25
    max_citations: int = 4

    # --- Server ---
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
