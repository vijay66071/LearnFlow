import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from http import HTTPStatus
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from . import database
from .ai import (
    AIConfigurationError,
    AIServiceError,
    answer_from_sources,
    embed_passages,
    embed_question,
)
from .documents import read_upload, split_into_passages
from .schemas import (
    DocumentResponse,
    DocumentSummary,
    PassageResponse,
    QueryRequest,
    QueryResponse,
    RenameDocumentRequest,
    SourceResponse,
)
from .vector_store import (
    indexed_passage_count,
    remove_document_vectors,
    search_passages,
    upsert_passages,
)


def create_app(data_directory: Path | None = None) -> FastAPI:
    app_data_directory = data_directory or Path(
        os.environ.get("LEARNFLOW_DATA_DIR", Path(__file__).resolve().parents[1] / "data")
    )
    database_path = app_data_directory / "learnflow.sqlite3"
    vector_directory = app_data_directory / "chroma"

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        database.initialize_database(database_path)
        database.migrate_passage_chunks(database_path, split_into_passages)
        yield

    app = FastAPI(
        title="LearnFlow API",
        description="Local document storage with semantic retrieval and AI answers.",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        ],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
    )

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post(
        "/api/documents",
        response_model=DocumentResponse,
        status_code=status.HTTP_201_CREATED,
    )
    async def upload_document(file: UploadFile = File(...)) -> DocumentResponse:
        try:
            name, file_type, passages = await read_upload(file)
        finally:
            await file.close()

        document_id = str(uuid4())
        uploaded_at = datetime.now(timezone.utc)
        try:
            embeddings = await run_in_threadpool(embed_passages, passages)
            await run_in_threadpool(
                upsert_passages,
                vector_directory,
                document_id,
                passages,
                embeddings,
            )
        except AIConfigurationError as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(error),
            ) from error
        except AIServiceError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(error),
            ) from error

        try:
            database.store_document(
                database_path,
                {
                    "id": document_id,
                    "name": name,
                    "file_type": file_type,
                    "uploaded_at": uploaded_at.isoformat(),
                },
                passages,
            )
        except sqlite3.Error:
            await run_in_threadpool(
                remove_document_vectors,
                vector_directory,
                document_id,
            )
            raise
        return DocumentResponse(
            id=document_id,
            name=name,
            file_type=file_type,
            uploaded_at=uploaded_at,
            passages=[
                PassageResponse(passage_number=index, content=passage)
                for index, passage in enumerate(passages, start=1)
            ],
        )

    @app.get("/api/documents", response_model=list[DocumentSummary])
    def list_uploaded_documents() -> list[DocumentSummary]:
        return [
            DocumentSummary(
                id=row["id"],
                name=row["name"],
                file_type=row["file_type"],
                uploaded_at=row["uploaded_at"],
                passage_count=row["passage_count"],
            )
            for row in database.list_documents(database_path)
        ]

    @app.get("/api/documents/{document_id}", response_model=DocumentResponse)
    def get_uploaded_document(document_id: str) -> DocumentResponse:
        document = database.get_document(database_path, document_id)
        if document is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )
        return DocumentResponse(
            id=document["id"],
            name=document["name"],
            file_type=document["file_type"],
            uploaded_at=document["uploaded_at"],
            passages=[
                PassageResponse(
                    passage_number=row["passage_number"],
                    content=row["content"],
                )
                for row in database.get_passages(database_path, document_id)
            ],
        )

    @app.patch("/api/documents/{document_id}", response_model=DocumentResponse)
    def rename_uploaded_document(
        document_id: str,
        request: RenameDocumentRequest,
    ) -> DocumentResponse:
        name = request.name.strip()
        if not name:
            raise HTTPException(
                status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
                detail="Document name cannot be blank.",
            )
        if not database.rename_document(database_path, document_id, name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )
        return get_uploaded_document(document_id)

    @app.delete("/api/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_uploaded_document(document_id: str) -> None:
        if database.get_document(database_path, document_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )
        remove_document_vectors(vector_directory, document_id)
        if not database.delete_document(database_path, document_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )

    @app.post(
        "/api/documents/{document_id}/query",
        response_model=QueryResponse,
    )
    def query_document(document_id: str, request: QueryRequest) -> QueryResponse:
        document = database.get_document(database_path, document_id)
        if document is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )

        passages = database.get_passages(database_path, document_id)
        if not passages:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="This document has no searchable passages.",
            )
        try:
            passage_texts = [row["content"] for row in passages]
            if indexed_passage_count(vector_directory, document_id) != len(passages):
                passage_texts = split_into_passages("\n".join(passage_texts))
                embeddings = embed_passages(passage_texts)
                upsert_passages(
                    vector_directory,
                    document_id,
                    passage_texts,
                    embeddings,
                )
                database.replace_passages(database_path, document_id, passage_texts)
            question_embedding = embed_question(request.question)
            matches = search_passages(
                vector_directory,
                document_id,
                question_embedding,
            )
            if not matches:
                return QueryResponse(
                    answer="I couldn't find relevant information in this document to answer that question.",
                    sources=[],
                )
            answer = answer_from_sources(
                request.question,
                [str(passage["text"]) for passage in matches],
            )
        except AIConfigurationError as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(error),
            ) from error
        except AIServiceError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(error),
            ) from error

        sources = [
            SourceResponse(
                document_id=document_id,
                document_name=document["name"],
                passage_number=int(passage["passage_number"]),
                text=str(passage["text"]),
            )
            for passage in matches
        ]
        return QueryResponse(answer=answer, sources=sources)

    return app


app = create_app()
