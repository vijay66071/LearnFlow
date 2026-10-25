import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import AppShell from './components/AppShell'
import { demoDocuments } from './data/demoDocuments'
import {
  createChatMessages,
  deleteDocument,
  fetchDocuments,
  queryDocument,
  renameDocument,
  uploadDocument,
} from './lib/api'
import { findPassage } from './lib/retrieval'
import ConversationsPage from './pages/ConversationsPage'
import DashboardPage from './pages/DashboardPage'
import DocumentsPage from './pages/DocumentsPage'
import SettingsPage from './pages/SettingsPage'
import WorkspacePage from './pages/WorkspacePage'
import type { Conversation, DocumentRecord, SourceReference } from './types'
import './App.css'

function AppContent() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState(demoDocuments)
  const [conversations, setConversations] = useState<Record<string, Conversation>>({})
  const [uploadError, setUploadError] = useState('')
  const [serviceError, setServiceError] = useState('')
  const [backendConnected, setBackendConnected] = useState(false)

  useEffect(() => {
    let isMounted = true
    fetchDocuments()
      .then((backendDocuments) => {
        if (!isMounted) return
        setDocuments((currentDocuments) => [
          ...backendDocuments,
          ...currentDocuments.filter((document) => !document.backendManaged),
        ])
        setBackendConnected(true)
        setServiceError('')
      })
      .catch((error: unknown) => {
        if (!isMounted) return
        setBackendConnected(false)
        setServiceError(
          error instanceof Error
            ? `Could not connect to the backend: ${error.message}`
            : 'Could not connect to the backend.',
        )
      })
    return () => {
      isMounted = false
    }
  }, [])

  async function handleFileSelected(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    const supportedTypes: Record<string, DocumentRecord['type']> = {
      pdf: 'PDF',
      txt: 'TXT',
      md: 'MD',
      markdown: 'MD',
    }
    const fileType = extension ? supportedTypes[extension] : undefined

    if (!fileType) {
      setUploadError('Choose a PDF, TXT, or Markdown file.')
      return
    }

    setUploadError('')
    setServiceError('')
    try {
      const document = await uploadDocument(file)
      setDocuments((currentDocuments) => [
        document,
        ...currentDocuments.filter((item) => item.id !== document.id),
      ])
      setBackendConnected(true)
      navigate('/documents')
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'The document could not be uploaded.',
      )
    }
  }

  async function handleRename(id: string, name: string) {
    const trimmedName = name.trim()
    if (!trimmedName) {
      window.alert('A document name cannot be empty.')
      return
    }
    const document = documents.find((item) => item.id === id)
    if (!document) return
    if (document.backendManaged) {
      try {
        await renameDocument(id, trimmedName)
      } catch (error) {
        setServiceError(
          error instanceof Error ? error.message : 'The document could not be renamed.',
        )
        return
      }
    }
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === id ? { ...document, name: trimmedName } : document,
      ),
    )
    setServiceError('')
  }

  async function handleDelete(id: string) {
    const document = documents.find((item) => item.id === id)
    if (!document) return
    if (!window.confirm(`Delete "${document.name}" from LearnFlow?`)) return

    if (document.backendManaged) {
      try {
        await deleteDocument(id)
      } catch (error) {
        setServiceError(
          error instanceof Error ? error.message : 'The document could not be deleted.',
        )
        return
      }
    }

    setDocuments((currentDocuments) =>
      currentDocuments.filter((item) => item.id !== id),
    )
    setConversations((currentConversations) => {
      const nextConversations = { ...currentConversations }
      delete nextConversations[id]
      return nextConversations
    })
    setServiceError('')
  }

  function handleRetry(id: string) {
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === id
          ? { ...document, status: 'processing', errorMessage: undefined }
          : document,
      ),
    )

    window.setTimeout(() => {
      setDocuments((currentDocuments) =>
        currentDocuments.map((document) =>
          document.id === id
            ? {
                ...document,
                status: 'failed',
                errorMessage:
                  'Demo retry finished. Real file processing will be added with the backend.',
              }
            : document,
        ),
      )
    }, 900)
  }

  async function handleAsk(documentId: string, question: string) {
    const document = documents.find((item) => item.id === documentId)
    if (!document || document.status !== 'ready') return

    let answer: string
    let sources: SourceReference[]
    try {
      if (document.backendManaged) {
        const result = await queryDocument(documentId, question)
        answer = result.answer
        sources = result.sources
      } else {
        const source = findPassage(document, question)
        sources = source ? [source] : []
        answer = source
          ? 'A passage contains words related to your question. Review the source below; this prototype does not generate an AI answer.'
          : 'I could not find matching text in this document. This prototype uses simple keyword matching, not AI.'
      }
    } catch (error) {
      setServiceError(
        error instanceof Error ? error.message : 'The question could not be sent.',
      )
      return
    }

    const now = new Date().toISOString()
    const messages = createChatMessages(question, answer, sources)
    setConversations((currentConversations) => ({
      ...currentConversations,
      [documentId]: {
        documentId,
        messages: [
          ...(currentConversations[documentId]?.messages ?? []),
          ...messages,
        ],
        updatedAt: now,
      },
    }))
    setServiceError('')
  }

  return (
    <Routes>
      <Route
        element={
          <AppShell
            backendConnected={backendConnected}
            serviceError={serviceError}
            onDismissServiceError={() => setServiceError('')}
          />
        }
      >
        <Route
          index
          element={
            <DashboardPage
              documents={documents}
              conversations={Object.values(conversations)}
              uploadError={uploadError}
              onFileSelected={handleFileSelected}
            />
          }
        />
        <Route
          path="documents"
          element={
            <DocumentsPage
              documents={documents}
              onRename={handleRename}
              onDelete={handleDelete}
              onRetry={handleRetry}
            />
          }
        />
        <Route
          path="documents/:documentId"
          element={
            <WorkspaceRoute
              documents={documents}
              conversations={conversations}
              onAsk={handleAsk}
            />
          }
        />
        <Route
          path="conversations"
          element={
            <ConversationsPage
              conversations={Object.values(conversations)}
              documents={documents}
            />
          }
        />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

type WorkspaceRouteProps = {
  documents: DocumentRecord[]
  conversations: Record<string, Conversation>
  onAsk: (documentId: string, question: string) => Promise<void>
}

function WorkspaceRoute({
  documents,
  conversations,
  onAsk,
}: WorkspaceRouteProps) {
  const { documentId = '' } = useParams()
  const document = documents.find((item) => item.id === documentId)

  return (
    <WorkspacePage
      document={document}
      messages={conversations[documentId]?.messages ?? []}
      onAsk={(question) => onAsk(documentId, question)}
    />
  )
}

function NotFoundPage() {
  return (
    <main className="page-content">
      <div className="empty-state page-empty">
        <strong>Page not found</strong>
        <p>The page may have moved or the link may be incorrect.</p>
        <a className="text-link" href="/">Return to dashboard</a>
      </div>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
