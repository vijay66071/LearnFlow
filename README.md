# LearnFlow

LearnFlow is a local document assistant. Upload text, Markdown, or text-based
PDF documents, then ask questions and get answers grounded in semantically
retrieved passages.

## Features

- React, TypeScript, and Vite frontend.
- FastAPI backend for document upload, listing, renaming, deletion, and queries.
- SQLite for document metadata and extracted passages.
- Local Chroma vector storage for semantic search.
- OpenAI embeddings and source-grounded answers.
- A short sample PDF for trying the document workflow.

## Requirements

- Git
- Node.js 22 or newer and npm
- Python 3.10 or newer
- An OpenAI API key for document uploads and AI questions

OpenAI receives document passages to create embeddings and receives the
question and retrieved passages to generate an answer. API usage may incur
charges. The local prototype has no authentication; do not expose it to a
network or upload sensitive documents.

## Clone the project

Replace the URL with the URL of this repository:

```powershell
git clone https://github.com/vijay66071/LearnFlow.git
Set-Location LearnFlow
```

## Configure and run the backend

From the project root, create a Python environment and install the backend
dependencies:

```powershell
Set-Location .\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and replace the placeholder value for `OPENAI_API_KEY`
with your own key. Never commit or share the real key.

Start the API:

```powershell
python -m uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive API
documentation is at `http://127.0.0.1:8000/docs`.

## Run the frontend

Open a second terminal at the project root:

```powershell
Set-Location .\frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).
The frontend uses `http://127.0.0.1:8000/api` by default. Set
`VITE_API_BASE_URL` in a local frontend environment file if your API uses a
different URL.

## Try the sample PDF

Upload [`backend/test-data/learnflow-biology-rag-sample.pdf`](backend/test-data/learnflow-biology-rag-sample.pdf)
from the dashboard, then ask questions such as:

- Why are there fewer hawks than grasshoppers in an energy pyramid?
- How does nitrogen become available to plants?
- How could a flower strip help pollinators, and what would a good test measure?

The fictional biology guide is three pages long to keep test usage low. Each
document is embedded when uploaded; questions embed only the question and send
a few retrieved passages to the answer model.

## Run checks

Run frontend checks from `frontend/`:

```powershell
npm run lint
npm run build
```

Run backend tests from `backend/`:

```powershell
python -m pytest
```

Backend tests mock OpenAI and do not require an API key or consume API tokens.

## Data and current limitations

- TXT, Markdown, and text-based PDF files up to 10 MB are accepted.
- Document metadata and passages are stored in `backend/data/learnflow.sqlite3`.
- Embeddings are stored locally under `backend/data/chroma/`.
- Original uploaded files are not retained.
- Conversation history and built-in sample documents are frontend-only and
  clear on refresh.
- The backend has no authentication or access controls. This is a local
  learning prototype, not a production service.
