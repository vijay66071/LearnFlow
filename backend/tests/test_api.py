from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.ai import AIConfigurationError
from app.main import create_app


def fake_embeddings(passages: list[str]) -> list[list[float]]:
    return [
        [1.0, 0.0, 0.0] if "root system" in passage.casefold() else [0.0, 1.0, 0.0]
        for passage in passages
    ]


class DocumentApiTests(TestCase):
    def setUp(self) -> None:
        self.temporary_directory = TemporaryDirectory()
        data_directory = Path(self.temporary_directory.name)
        self.client_context = TestClient(create_app(data_directory))
        self.client = self.client_context.__enter__()
        self.embed_passages_patch = patch(
            "app.main.embed_passages",
            side_effect=fake_embeddings,
        )
        self.embed_question_patch = patch(
            "app.main.embed_question",
            return_value=[1.0, 0.0, 0.0],
        )
        self.answer_patch = patch(
            "app.main.answer_from_sources",
            return_value="Roots support the plant's growth. [Source 1]",
        )
        self.embed_passages_patch.start()
        self.embed_question_patch.start()
        self.answer_patch.start()

    def tearDown(self) -> None:
        self.answer_patch.stop()
        self.embed_question_patch.stop()
        self.embed_passages_patch.stop()
        self.client_context.__exit__(None, None, None)
        self.temporary_directory.cleanup()

    def test_upload_list_query_rename_and_delete_document(self) -> None:
        upload = self.client.post(
            "/api/documents",
            files={
                "file": (
                    "notes.txt",
                    b"Orange trees need sunlight and water.\nA strong root system supports growth.",
                    "text/plain",
                )
            },
        )
        self.assertEqual(upload.status_code, 201)
        document = upload.json()
        document_id = document["id"]
        self.assertEqual(document["name"], "notes.txt")
        self.assertEqual(len(document["passages"]), 1)

        listed = self.client.get("/api/documents")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()[0]["passage_count"], 1)

        query = self.client.post(
            f"/api/documents/{document_id}/query",
            json={"question": "What supports the root system?"},
        )
        self.assertEqual(query.status_code, 200)
        self.assertIn("[Source 1]", query.json()["answer"])
        self.assertEqual(query.json()["sources"][0]["passage_number"], 1)

        renamed = self.client.patch(
            f"/api/documents/{document_id}",
            json={"name": "garden-notes.txt"},
        )
        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(renamed.json()["name"], "garden-notes.txt")

        deleted = self.client.delete(f"/api/documents/{document_id}")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get(f"/api/documents/{document_id}").status_code, 404)

    def test_rejects_unsupported_file_type(self) -> None:
        response = self.client.post(
            "/api/documents",
            files={"file": ("notes.exe", b"not a document", "application/octet-stream")},
        )
        self.assertEqual(response.status_code, 415)

    def test_rejects_empty_text_document(self) -> None:
        response = self.client.post(
            "/api/documents",
            files={"file": ("empty.txt", b" \n\t", "text/plain")},
        )
        self.assertEqual(response.status_code, 422)

    def test_rejects_invalid_pdf(self) -> None:
        response = self.client.post(
            "/api/documents",
            files={"file": ("broken.pdf", b"not a PDF", "application/pdf")},
        )
        self.assertEqual(response.status_code, 422)

    def test_uploads_text_based_pdf_and_extracts_its_pages(self) -> None:
        sample_pdf = (
            Path(__file__).resolve().parents[1]
            / "test-data"
            / "learnflow-biology-rag-sample.pdf"
        )
        with sample_pdf.open("rb") as pdf_file:
            response = self.client.post(
                "/api/documents",
                files={
                    "file": (
                        sample_pdf.name,
                        pdf_file,
                        "application/pdf",
                    )
                },
            )
        self.assertEqual(response.status_code, 201)
        document = response.json()
        self.assertEqual(document["file_type"], "PDF")
        extracted_text = "\n".join(
            passage["content"] for passage in document["passages"]
        )
        self.assertIn("ecosystem", extracted_text.casefold())
        self.assertIn("biodiversity", extracted_text.casefold())

    def test_rejects_upload_larger_than_ten_megabytes(self) -> None:
        response = self.client.post(
            "/api/documents",
            files={"file": ("large.txt", b"x" * (10 * 1024 * 1024 + 1), "text/plain")},
        )
        self.assertEqual(response.status_code, 413)

    def test_upload_explains_when_openai_key_is_not_configured(self) -> None:
        with patch(
            "app.main.embed_passages",
            side_effect=AIConfigurationError("Set OPENAI_API_KEY in backend/.env."),
        ):
            response = self.client.post(
                "/api/documents",
                files={"file": ("notes.txt", b"Some useful notes.", "text/plain")},
            )
        self.assertEqual(response.status_code, 503)
        self.assertIn("OPENAI_API_KEY", response.json()["detail"])

    def test_health_endpoint(self) -> None:
        self.assertEqual(self.client.get("/api/health").json(), {"status": "ok"})
