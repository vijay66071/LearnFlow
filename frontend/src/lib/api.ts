import type { ChatMessage, DocumentRecord, SourceReference } from '../types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

type ApiPassage = {
  passage_number: number
  content: string
}

type ApiDocument = {
  id: string
  name: string
  file_type: DocumentRecord['type']
  uploaded_at: string
  passages: ApiPassage[]
}

type ApiDocumentSummary = {
  id: string
}

type ApiQueryResponse = {
  answer: string
  sources: Array<{
    document_id: string
    document_name: string
    passage_number: number
    text: string
  }>
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init)
  if (!response.ok) {
    let message = `The API returned ${response.status}.`
    try {
      const body = (await response.json()) as { detail?: string }
      if (body.detail) message = body.detail
    } catch {
      // Keep the HTTP status message when an error response is not JSON.
    }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function toDocumentRecord(document: ApiDocument): DocumentRecord {
  return {
    id: document.id,
    name: document.name,
    type: document.file_type,
    uploadedAt: document.uploaded_at,
    status: 'ready',
    passages: document.passages.map((passage) => passage.content),
    backendManaged: true,
  }
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const summaries = await request<ApiDocumentSummary[]>('/documents')
  return Promise.all(
    summaries.map(async ({ id }) =>
      toDocumentRecord(await request<ApiDocument>(`/documents/${id}`)),
    ),
  )
}

export async function uploadDocument(file: File): Promise<DocumentRecord> {
  const form = new FormData()
  form.append('file', file)
  const document = await request<ApiDocument>('/documents', {
    method: 'POST',
    body: form,
  })
  return toDocumentRecord(document)
}

export async function renameDocument(id: string, name: string): Promise<void> {
  await request<ApiDocument>(`/documents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function deleteDocument(id: string): Promise<void> {
  await request<void>(`/documents/${id}`, { method: 'DELETE' })
}

export async function queryDocument(
  id: string,
  question: string,
): Promise<{ answer: string; sources: SourceReference[] }> {
  const result = await request<ApiQueryResponse>(`/documents/${id}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  return {
    answer: result.answer,
    sources: result.sources.map((source) => ({
      documentId: source.document_id,
      documentName: source.document_name,
      passageNumber: source.passage_number,
      text: source.text,
    })),
  }
}

export function createChatMessages(
  question: string,
  answer: string,
  sources: SourceReference[],
): ChatMessage[] {
  const now = new Date().toISOString()
  return [
    {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: answer,
      sources,
      createdAt: now,
    },
  ]
}
