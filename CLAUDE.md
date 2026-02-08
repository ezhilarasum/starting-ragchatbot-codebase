# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A RAG (Retrieval-Augmented Generation) system for querying course materials. Uses ChromaDB for vector storage, Anthropic's Claude API with tool calling for responses, and FastAPI for the backend. Frontend is vanilla HTML/CSS/JS.

## Development Commands

```bash
# Quick start
./run.sh

# Manual start (must run from backend/)
cd backend
uv run uvicorn app:app --reload --port 8000

# Package management — always use uv, never pip or python directly
uv sync                    # Install/sync dependencies
uv add <package-name>      # Add a dependency
uv run python <file.py>    # Run a Python file
```

- Web interface: http://localhost:8000
- API docs: http://localhost:8000/docs
- Requires `.env` in project root with `ANTHROPIC_API_KEY=...`

## Architecture

### Query Flow (Two-Phase Tool Calling)

```
Frontend POST /api/query
  → app.py: creates session if needed
  → RAGSystem.query(): wraps query, gets conversation history
  → AIGenerator.generate_response(): 1st Claude API call with tool definitions
      ├─ stop_reason="end_turn" → direct answer (general knowledge)
      └─ stop_reason="tool_use" → triggers search:
          → ToolManager.execute_tool("search_course_content")
          → CourseSearchTool.execute()
          → VectorStore.search():
              1. _resolve_course_name() — semantic search on course_catalog
              2. _build_filter() — ChromaDB where clause
              3. course_content.query() — semantic search on chunks
          → AIGenerator: 2nd Claude call (no tools) with search results
  → Sources collected from CourseSearchTool.last_sources, then reset
  → Exchange saved to SessionManager
  → Response: {answer, sources[], session_id}
```

### Two-Collection Pattern (ChromaDB)

The VectorStore uses two separate ChromaDB collections:
- **`course_catalog`**: Course metadata (title as ID). Used for fuzzy course name resolution via semantic search before content is queried.
- **`course_content`**: Chunked lesson text with metadata (`course_title`, `lesson_number`, `chunk_index`). IDs: `{title_with_underscores}_{chunk_index}`.

Search always resolves the course name first (if provided), then filters content. This two-step approach enables partial/fuzzy course name matching (e.g., "MCP" matches "Model Context Protocol").

### Document Ingestion

On startup, `app.py` loads all `.txt`/`.pdf`/`.docx` files from `../docs`. Existing courses are skipped (matched by title). Use `clear_existing=True` in `add_course_folder()` for a fresh rebuild.

Course documents must follow this format:
```
Course Title: <title>
Course Link: <url>
Course Instructor: <name>

Lesson 0: <lesson_title>
Lesson Link: <lesson_url>
<content...>
```

### Chunking Strategy

Sentence-based chunking in `document_processor.py` (~800 chars, 100 char overlap). Splits on sentence boundaries using regex that avoids abbreviations. First chunk of each lesson is prefixed with `"Lesson N content: "`. Last chunk of each lesson is prefixed with `"Course {title} Lesson N content: "`.

### Session Management

In-memory only (lost on restart). Each browser tab gets a unique session ID (`session_1`, `session_2`, ...). History is capped at 2 exchanges (4 messages) and passed to Claude as formatted text in the system prompt.

### Frontend-Backend Contract

- `POST /api/query` — Request: `{query, session_id?}` → Response: `{answer, sources[], session_id}`
- `GET /api/courses` — Response: `{total_courses, course_titles[]}`
- Frontend served as static files from `../frontend` via `DevStaticFiles` (no-cache headers for development)

### Configuration

All settings in `backend/config.py` (dataclass with env var loading). Key values: model `claude-sonnet-4-20250514`, embeddings `all-MiniLM-L6-v2`, chunk size 800, overlap 100, max results 5, max history 2.

### Key Constraint

The system prompt enforces **one search per query maximum** to reduce latency. The second Claude API call is made **without tools** so Claude cannot request additional searches.
