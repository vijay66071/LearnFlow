import re
from http import HTTPStatus
from io import BytesIO
from pathlib import PurePath

from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_UPLOAD_SIZE = 10 * 1024 * 1024
MAX_PASSAGE_LENGTH = 1000
SUPPORTED_TYPES = {
    ".pdf": "PDF",
    ".txt": "TXT",
    ".md": "MD",
    ".markdown": "MD",
}

IGNORED_QUERY_TERMS = {
    "about",
    "after",
    "also",
    "and",
    "are",
    "can",
    "does",
    "for",
    "from",
    "have",
    "how",
    "into",
    "that",
    "the",
    "this",
    "was",
    "what",
    "when",
    "where",
    "which",
    "with",
    "would",
    "your",
}


def safe_display_name(filename: str | None) -> str:
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file must have a name.",
        )
    name = re.split(r"[\\/]", filename)[-1].strip()
    if not name or name in {".", ".."}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file must have a valid name.",
        )
    return name


def split_into_passages(text: str) -> list[str]:
    passages: list[str] = []
    for paragraph in re.split(r"\n\s*\n", text):
        cleaned = re.sub(r"\s+", " ", paragraph).strip()
        if not cleaned:
            continue
        sentences = re.split(r"(?<=[.!?])\s+", cleaned)
        current = ""
        for sentence in sentences:
            while len(sentence) > MAX_PASSAGE_LENGTH:
                if current:
                    passages.append(current)
                    current = ""
                passages.append(sentence[:MAX_PASSAGE_LENGTH])
                sentence = sentence[MAX_PASSAGE_LENGTH:]
            candidate = f"{current} {sentence}".strip()
            if current and len(candidate) > MAX_PASSAGE_LENGTH:
                passages.append(current)
                current = sentence
            else:
                current = candidate
        if current:
            passages.append(current)
    return passages


def extract_text(file_type: str, content: bytes) -> str:
    if file_type == "PDF":
        try:
            reader = PdfReader(BytesIO(content))
            if reader.is_encrypted:
                raise HTTPException(
                    status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
                    detail="Password-protected PDFs are not supported.",
                )
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except (PdfReadError, ValueError, OSError) as error:
            raise HTTPException(
                status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
                detail="The PDF could not be read. Check that it is a valid text-based PDF.",
            ) from error

    try:
        return content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Text documents must use UTF-8 encoding.",
        ) from error


async def read_upload(upload: UploadFile) -> tuple[str, str, list[str]]:
    name = safe_display_name(upload.filename)
    extension = PurePath(name).suffix.lower()
    file_type = SUPPORTED_TYPES.get(extension)
    if file_type is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Choose a PDF, TXT, or Markdown file.",
        )

    content = await upload.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
            detail="Files must be 10 MB or smaller.",
        )
    if not content:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="The uploaded file is empty.",
        )

    text = extract_text(file_type, content)
    passages = split_into_passages(text)
    if not passages:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="This file contains no readable text.",
        )
    return name, file_type, passages


def find_matching_passages(
    question: str,
    passages: list[dict[str, str | int]],
) -> list[dict[str, str | int]]:
    terms = [
        term
        for term in re.findall(r"[a-z0-9]+", question.casefold())
        if len(term) > 2 and term not in IGNORED_QUERY_TERMS
    ]
    if not terms:
        return []

    ranked: list[tuple[int, dict[str, str | int]]] = []
    for passage in passages:
        content = str(passage["text"]).casefold()
        score = sum(content.count(term) for term in terms)
        if score:
            ranked.append((score, passage))
    ranked.sort(key=lambda result: result[0], reverse=True)
    return [passage for _, passage in ranked[:3]]
