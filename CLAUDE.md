# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Retrieval-Augmented Generation (RAG) system for querying course materials. The system uses ChromaDB for vector storage, Anthropic's Claude API with tool calling for intelligent responses, and FastAPI for the web backend.

## Development Commands

### Running the Application

```bash
# Quick start (recommended)
chmod +x run.sh
./run.sh

# Manual start
cd backend
uv run uvicorn app:app --reload --port 8000
```

The application runs on:
- Web Interface: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Package Management

```bash
# Install/sync dependencies
uv sync

# Add a new dependency
uv add <package-name>
```

### Environment Setup

Required: Create `.env` file in root with:
```
ANTHROPIC_API_KEY=your_key_here
```

## Architecture Overview

### RAG System Flow

The system follows a tool-based RAG architecture where Claude decides when to search course content:

1. **User Query** → FastAPI endpoint (`/api/query`)
2. **RAGSystem** orchestrates all components
3. **AIGenerator** uses Claude API with tool calling capability
4. **CourseSearchTool** executes searches when Claude requests them
5. **VectorStore** performs semantic search across two ChromaDB collections:
   - `course_catalog`: Course metadata (titles, instructors, links)
   - `course_content`: Chunked lesson content with metadata
6. **Response** combines Claude's generation with retrieved context

### Key Components

**RAGSystem** (`backend/rag_system.py`): Main orchestrator
- Coordinates document processing, vector storage, AI generation, and sessions
- Handles course document ingestion and query processing
- Manages tool registration and execution

**VectorStore** (`backend/vector_store.py`): Two-collection architecture
- Course name resolution via semantic search (fuzzy matching)
- Content search with optional course/lesson filters
- Uses `sentence-transformers` for embeddings (all-MiniLM-L6-v2)

**AIGenerator** (`backend/ai_generator.py`): Claude API integration
- Implements tool calling workflow (request → tool execution → final response)
- System prompt optimized for brief, educational responses
- Single search per query constraint to reduce latency

**DocumentProcessor** (`backend/document_processor.py`): Document parsing
- Parses structured course documents with specific format (see below)
- Sentence-based chunking with configurable overlap
- Extracts course metadata and lesson structure

**SearchTool** (`backend/search_tools.py`): Tool interface
- Implements Anthropic tool calling specification
- Formats search results with course/lesson context
- Tracks sources for frontend display

**SessionManager** (`backend/session_manager.py`): Conversation state
- Maintains per-session conversation history
- Limits history to configurable message count (default: 2 exchanges)

### Course Document Format

Documents in `docs/` must follow this structure:

```
Course Title: <title>
Course Link: <url>
Course Instructor: <name>

Lesson 0: <lesson_title>
Lesson Link: <lesson_url>
<lesson content...>

Lesson 1: <lesson_title>
Lesson Link: <lesson_url>
<lesson content...>
```

- First 3 lines are course metadata
- Lessons marked with "Lesson N: Title" pattern
- Optional "Lesson Link:" on line after lesson header
- Content chunked at ~800 chars with 100 char overlap

### Configuration

All settings in `backend/config.py`:

- `ANTHROPIC_MODEL`: claude-sonnet-4-20250514
- `EMBEDDING_MODEL`: all-MiniLM-L6-v2
- `CHUNK_SIZE`: 800 characters
- `CHUNK_OVERLAP`: 100 characters
- `MAX_RESULTS`: 5 search results
- `MAX_HISTORY`: 2 conversation exchanges
- `CHROMA_PATH`: ./chroma_db

### Data Models

Pydantic models in `backend/models.py`:

- **Course**: title, course_link, instructor, lessons[]
- **Lesson**: lesson_number, title, lesson_link
- **CourseChunk**: content, course_title, lesson_number, chunk_index

### Frontend

Static HTML/CSS/JS served from `frontend/`:
- Single-page application with chat interface
- Calls `/api/query` and `/api/courses` endpoints
- Displays sources with course/lesson context

## Important Implementation Notes

### Document Loading
- On startup, `app.py` automatically loads all documents from `../docs`
- Existing courses are skipped to avoid duplicates (checked by title)
- Use `clear_existing=True` in `add_course_folder()` for fresh rebuild

### Two-Collection Pattern
- Course metadata stored separately from content for efficient fuzzy name matching
- Search flow: resolve course name → filter content → return results
- Course title serves as unique ID in both collections

### Tool Calling Architecture
- AIGenerator handles the tool calling loop internally
- CourseSearchTool tracks sources from last search for frontend display
- ToolManager resets sources after each query to avoid stale data

### Chunking Strategy
- Sentence-based chunking preserves semantic boundaries
- First chunk of each lesson gets "Lesson N content:" prefix for context
- Last lesson chunks get full "Course {title} Lesson N content:" prefix

### ChromaDB Persistence
- Data persists in `./chroma_db` directory
- Collections created with `get_or_create_collection`
- Use `clear_all_data()` to rebuild from scratch
- always use uv to run the server do not use pip directly
- make sure to use uv to manage all depenedencies
- use uv to run Python files