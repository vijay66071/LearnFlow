from pathlib import Path

import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection

COLLECTION_NAME = "learnflow_passages"
RESULT_LIMIT = 4
MAX_COSINE_DISTANCE = 0.65


def _collection(client: ClientAPI) -> Collection:
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def _client(persist_directory: Path) -> ClientAPI:
    persist_directory.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(persist_directory))


def upsert_passages(
    persist_directory: Path,
    document_id: str,
    passages: list[str],
    embeddings: list[list[float]],
) -> None:
    if len(passages) != len(embeddings):
        raise ValueError("Each passage must have exactly one embedding.")
    if not passages:
        return

    with _client(persist_directory) as client:
        _collection(client).upsert(
            ids=[f"{document_id}:{number}" for number in range(1, len(passages) + 1)],
            documents=passages,
            embeddings=embeddings,
            metadatas=[
                {"document_id": document_id, "passage_number": number}
                for number in range(1, len(passages) + 1)
            ],
        )


def indexed_passage_count(persist_directory: Path, document_id: str) -> int:
    with _client(persist_directory) as client:
        collection = _collection(client)
        return len(collection.get(where={"document_id": document_id}, include=[])["ids"])


def remove_document_vectors(persist_directory: Path, document_id: str) -> None:
    with _client(persist_directory) as client:
        _collection(client).delete(where={"document_id": document_id})


def search_passages(
    persist_directory: Path,
    document_id: str,
    question_embedding: list[float],
) -> list[dict[str, str | int]]:
    with _client(persist_directory) as client:
        collection = _collection(client)
        count = len(collection.get(where={"document_id": document_id}, include=[])["ids"])
        if count == 0:
            return []
        results = collection.query(
            query_embeddings=[question_embedding],
            n_results=min(RESULT_LIMIT, count),
            where={"document_id": document_id},
            include=["documents", "metadatas", "distances"],
        )
    documents = results["documents"][0] if results["documents"] else []
    metadatas = results["metadatas"][0] if results["metadatas"] else []
    distances = results["distances"][0] if results["distances"] else []
    matches: list[dict[str, str | int]] = []
    for content, metadata, distance in zip(documents, metadatas, distances):
        if content is None or metadata is None or distance is None:
            continue
        if distance > MAX_COSINE_DISTANCE:
            continue
        matches.append(
            {
                "passage_number": int(metadata["passage_number"]),
                "text": content,
            }
        )
    return matches
