import { Link } from 'react-router-dom'
import UploadDropzone from '../components/UploadDropzone'
import type { Conversation, DocumentRecord } from '../types'

type DashboardPageProps = {
  documents: DocumentRecord[]
  conversations: Conversation[]
  uploadError: string
  onFileSelected: (file: File) => void
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function DashboardPage({
  documents,
  conversations,
  uploadError,
  onFileSelected,
}: DashboardPageProps) {
  const recentDocuments = [...documents]
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .slice(0, 3)
  const recentConversations = [...conversations]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 2)

  return (
    <main className="page-content">
      <section className="welcome-section">
        <div>
          <p className="eyebrow">YOUR DOCUMENT SPACE</p>
          <h1>Make every page part of your bigger picture.</h1>
          <p className="welcome-copy">
            Your personal knowledge space for thoughtful, source-backed
            discovery.
          </p>
          <div className="hero-trust-badge">
            <span aria-hidden="true">✦</span>
            Built around your documents
          </div>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-note note-back">
            <span />
            <span />
            <span />
          </div>
          <div className="art-note note-front">
            <span className="art-note-icon">✦</span>
            <span className="art-line wide" />
            <span className="art-line" />
            <span className="art-highlight" />
          </div>
          <span className="art-sparkle sparkle-one">✦</span>
          <span className="art-sparkle sparkle-two">✧</span>
        </div>
      </section>

      <UploadDropzone
        errorMessage={uploadError}
        onFileSelected={onFileSelected}
      />

      <section className="overview-section" aria-labelledby="overview-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR LIBRARY</p>
            <h2 id="overview-heading">Workspace overview</h2>
          </div>
        </div>
        <div className="overview-grid">
          <article className="overview-card">
            <span className="overview-icon documents-icon" aria-hidden="true">▤</span>
            <p>Documents</p>
            <strong>{documents.length}</strong>
            <small>{documents.filter((doc) => doc.status === 'ready').length} ready to explore</small>
          </article>
          <article className="overview-card">
            <span className="overview-icon conversations-icon" aria-hidden="true">◷</span>
            <p>Conversations</p>
            <strong>{conversations.length}</strong>
            <small>Questions stay connected to their document.</small>
          </article>
          <article className="overview-card privacy-card">
            <span className="overview-icon privacy-icon" aria-hidden="true">◇</span>
            <p>Prototype mode</p>
            <strong>Local</strong>
            <small>Uploaded documents are stored in the local SQLite backend.</small>
          </article>
        </div>
      </section>

      <section className="content-section" aria-labelledby="recent-documents-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p>
            <h2 id="recent-documents-heading">Recent documents</h2>
          </div>
          <Link className="text-link" to="/documents">View all documents</Link>
        </div>
        {recentDocuments.length ? (
          <div className="document-list compact-list">
            {recentDocuments.map((document) => (
              <Link
                className="document-row"
                key={document.id}
                to={`/documents/${document.id}`}
              >
                <span className={`file-icon file-${document.type.toLowerCase()}`}>
                  {document.type}
                </span>
                <span className="document-name">
                  <strong>{document.name}</strong>
                  <small>{document.isSample ? 'Demo sample' : 'Added locally'}</small>
                </span>
                <span className={`status-badge status-${document.status}`}>
                  {document.status}
                </span>
                <span className="document-date">{formatDate(document.uploadedAt)}</span>
                <span className="row-arrow" aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <strong>No documents yet</strong>
            <p>Choose a file above to add the first item to this prototype.</p>
          </div>
        )}
      </section>

      <section className="content-section" aria-labelledby="recent-conversations-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR RESEARCH</p>
            <h2 id="recent-conversations-heading">Recent conversations</h2>
          </div>
          <Link className="text-link" to="/conversations">Conversation history</Link>
        </div>
        {recentConversations.length ? (
          <div className="conversation-list">
            {recentConversations.map((conversation) => {
              const document = documents.find((item) => item.id === conversation.documentId)
              const lastMessage = conversation.messages.at(-1)
              if (!document || !lastMessage) return null
              return (
                <Link
                  className="conversation-row"
                  key={conversation.documentId}
                  to={`/documents/${document.id}`}
                >
                  <span className="conversation-icon" aria-hidden="true">◷</span>
                  <span>
                    <strong>{lastMessage.role === 'user' ? lastMessage.content : document.name}</strong>
                    <small>About {document.name}</small>
                  </span>
                  <span className="row-arrow" aria-hidden="true">›</span>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <strong>Your conversations will appear here</strong>
            <p>Open a ready document and ask a question to start one.</p>
          </div>
        )}
      </section>
    </main>
  )
}

export default DashboardPage
