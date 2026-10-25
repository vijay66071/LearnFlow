import sqlite3
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path


def connect(database_path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def connection_to(database_path: Path) -> Iterator[sqlite3.Connection]:
    connection = connect(database_path)
    try:
        yield connection
    finally:
        connection.close()


def initialize_database(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with connection_to(database_path) as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                file_type TEXT NOT NULL CHECK (file_type IN ('PDF', 'TXT', 'MD')),
                uploaded_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS passages (
                document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                passage_number INTEGER NOT NULL CHECK (passage_number > 0),
                content TEXT NOT NULL,
                PRIMARY KEY (document_id, passage_number)
            );

            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )


def store_document(
    database_path: Path,
    document: dict[str, str],
    passages: list[str],
) -> None:
    with connection_to(database_path) as connection, connection:
        connection.execute(
            """
            INSERT INTO documents (id, name, file_type, uploaded_at)
            VALUES (:id, :name, :file_type, :uploaded_at)
            """,
            document,
        )
        connection.executemany(
            """
            INSERT INTO passages (document_id, passage_number, content)
            VALUES (?, ?, ?)
            """,
            [
                (document["id"], number, passage)
                for number, passage in enumerate(passages, start=1)
            ],
        )


def list_documents(database_path: Path) -> list[sqlite3.Row]:
    with connection_to(database_path) as connection:
        return list(
            connection.execute(
                """
                SELECT d.id, d.name, d.file_type, d.uploaded_at,
                       COUNT(p.passage_number) AS passage_count
                FROM documents d
                LEFT JOIN passages p ON p.document_id = d.id
                GROUP BY d.id
                ORDER BY d.uploaded_at DESC
                """
            )
        )


def get_document(database_path: Path, document_id: str) -> sqlite3.Row | None:
    with connection_to(database_path) as connection:
        return connection.execute(
            """
            SELECT id, name, file_type, uploaded_at
            FROM documents
            WHERE id = ?
            """,
            (document_id,),
        ).fetchone()


def get_passages(database_path: Path, document_id: str) -> list[sqlite3.Row]:
    with connection_to(database_path) as connection:
        return list(
            connection.execute(
                """
                SELECT passage_number, content
                FROM passages
                WHERE document_id = ?
                ORDER BY passage_number
                """,
                (document_id,),
            )
        )


def replace_passages(
    database_path: Path,
    document_id: str,
    passages: list[str],
) -> None:
    with connection_to(database_path) as connection, connection:
        connection.execute(
            "DELETE FROM passages WHERE document_id = ?",
            (document_id,),
        )
        connection.executemany(
            """
            INSERT INTO passages (document_id, passage_number, content)
            VALUES (?, ?, ?)
            """,
            [
                (document_id, number, passage)
                for number, passage in enumerate(passages, start=1)
            ],
        )


def migrate_passage_chunks(
    database_path: Path,
    splitter: Callable[[str], list[str]],
) -> None:
    migration_key = "sentence_aware_passage_chunks_v1"
    with connection_to(database_path) as connection, connection:
        completed = connection.execute(
            "SELECT 1 FROM app_metadata WHERE key = ?",
            (migration_key,),
        ).fetchone()
        if completed:
            return

        document_ids = [
            row["id"]
            for row in connection.execute("SELECT id FROM documents")
        ]
        for document_id in document_ids:
            old_passages = [
                row["content"]
                for row in connection.execute(
                    """
                    SELECT content FROM passages
                    WHERE document_id = ?
                    ORDER BY passage_number
                    """,
                    (document_id,),
                )
            ]
            new_passages = splitter("\n".join(old_passages))
            if new_passages != old_passages:
                connection.execute(
                    "DELETE FROM passages WHERE document_id = ?",
                    (document_id,),
                )
                connection.executemany(
                    """
                    INSERT INTO passages (document_id, passage_number, content)
                    VALUES (?, ?, ?)
                    """,
                    [
                        (document_id, number, passage)
                        for number, passage in enumerate(new_passages, start=1)
                    ],
                )

        connection.execute(
            "INSERT INTO app_metadata (key, value) VALUES (?, ?)",
            (migration_key, "complete"),
        )


def rename_document(database_path: Path, document_id: str, name: str) -> bool:
    with connection_to(database_path) as connection, connection:
        cursor = connection.execute(
            "UPDATE documents SET name = ? WHERE id = ?",
            (name, document_id),
        )
        return cursor.rowcount > 0


def delete_document(database_path: Path, document_id: str) -> bool:
    with connection_to(database_path) as connection, connection:
        cursor = connection.execute(
            "DELETE FROM documents WHERE id = ?",
            (document_id,),
        )
        return cursor.rowcount > 0
