# Gemini Expert Configuration for GestionnaireDeFinance

## My Role
I am an expert in web development and Docker infrastructure. My primary goal is to assist in testing, debugging, and further developing this personal finance web application.

## Core Instructions
1.  **Primary Goal:** Test the existing codebase, identify and fix bugs, and ensure the application runs correctly as per the documentation.
2.  **Information Sources:**
    *   `CLAUDE.md`: Contains the original project specifications and high-level context.
    *   `history.md`: Contains the log of development steps taken so far. I should consult this for historical context.
    *   `docs_src/`: Contains all detailed source documentation for the project's architecture, API, and features.
3.  **Change Logging:** After every modification (code change, file creation, etc.), I MUST append a summary of the change to `history.md` to maintain a complete project log.
4.  **Ask for Help:** If information is missing or instructions are unclear, I will ask for clarification.

## Project Architecture Overview

The application is a containerized, three-tier web application designed for personal finance management.

### 1. High-Level Stack
*   **Containerization:** Docker Compose (`docker-compose.yml`) orchestrates all services.
*   **Services:** `frontend`, `backend`, `db` (PostgreSQL), `ollama`.
*   **Configuration:** Managed via `.env` files.

### 2. Frontend (`/frontend`)
*   **Framework:** React 18 with Vite
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Routing:** React Router
*   **API Communication:** Axios client, which handles JWT authentication automatically.
*   **Key Libraries:** Recharts (for charts), Lucide React (icons).
*   **Structure:**
    *   `pages/`: Top-level page components.
    *   `components/`: Reusable UI components.
    *   `services/api.ts`: Centralized API call definitions.
    *   `hooks/useAuth.tsx`: Authentication context and logic.
    *   `types/`: TypeScript interfaces for data models.

### 3. Backend (`/backend`)
*   **Framework:** FastAPI
*   **Language:** Python
*   **Database ORM:** SQLAlchemy
*   **Database Migrations:** Alembic handles schema changes.
*   **Data Validation:** Pydantic schemas (`schemas/`) are used for API request/response validation.
*   **Authentication:** JWT tokens with password hashing via bcrypt.
*   **Structure:**
    *   `main.py`: Application entry point.
    *   `api/routes/`: API endpoint definitions (e.g., `/documents`, `/tags`).
    *   `models/`: SQLAlchemy database models.
    *   `services/`: Business logic (OCR, AI analysis, document processing).
    *   `core/`: Core configuration, database connection, and security settings.

### 4. Database
*   **System:** PostgreSQL
*   **Docker Service Name:** `db`
*   **Data Persistence:** All user data, documents, items, tags, and budgets are stored here.

### 5. Core Features & Services
*   **OCR:** `ocr_service.py` uses PaddleOCR to extract raw text from uploaded images and PDFs.
*   **AI Analysis:** `ai_service.py` uses a local Ollama instance with the Mistral model to parse raw text into structured data (merchant, date, items, etc.).
*   **Document Processing:** `document_processor.py` orchestrates the OCR -> AI -> Database update pipeline.
*   **NAS Sync:** `nas_sync_service.py` uses `rsync` to back up document files to a network-attached storage.

### 6. Key Commands
*   **Start Application:** `docker-compose up -d`
*   **Apply Migrations:** `docker-compose exec backend alembic upgrade head`
*   **Rebuild Services:** `docker-compose up -d --build`
*   **View Logs:** `docker-compose logs -f <service_name>`
