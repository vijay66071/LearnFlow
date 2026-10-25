from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


DocumentType = Literal["PDF", "TXT", "MD"]


class PassageResponse(BaseModel):
    passage_number: int
    content: str


class DocumentSummary(BaseModel):
    id: str
    name: str
    file_type: DocumentType
    uploaded_at: datetime
    passage_count: int


class DocumentResponse(BaseModel):
    id: str
    name: str
    file_type: DocumentType
    uploaded_at: datetime
    passages: list[PassageResponse]


class RenameDocumentRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class SourceResponse(BaseModel):
    document_id: str
    document_name: str
    passage_number: int
    text: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceResponse]
