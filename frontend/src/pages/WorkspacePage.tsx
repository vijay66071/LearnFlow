import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { ChatMessage, DocumentRecord } from '../types'

type WorkspacePageProps = {
  document: DocumentRecord | undefined
  messages: ChatMessage[]
  onAsk: (question: string) => Promise<void>
}

const suggestedQuestions = [
  'What are the main points?',
  'What should I remember?',
]

function WorkspacePage({ document, messages, onAsk }: WorkspacePageProps) {
  const [question, setQuestion] = useState('')
  const [activeMobilePanel, setActiveMobilePanel] = useState<'document' | 'chat'>('chat')

  if (!document) {
    return (
      <main className="page-content">
        <div className="empty-state page-empty">
          <strong>Document not found</strong>
          <p>It may have been removed from this prototype.</p>
          <Link className="text-link" to="/documents">Back to documents</Link>
        </div>
      </main>
    )
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) return
    await onAsk(trimmedQuestion)
    setQuestion('')
  }

  return (
    <main className="workspace-page">
      <div className="workspace-heading">
        <div>
          <Link className="back-link" to="/documents">‹ Documents</Link>
          <h1>{document.name}</h1>
          <p>
            {document.type} · {document.backendManaged
              ? 'Stored in local backend'
              : document.isSample ? 'Demo sample' : 'Browser session file'}
          </p>
        </div>
        <span className={`status-badge status-${document.status}`}>{document.status}</span>
      </div>

      {document.status !== 'ready' ? (
        <section className="processing-state">
          <span className="empty-icon" aria-hidden="true">◷</span>
          <h2>{document.status === 'failed' ? 'Document needs processing' : 'Processing document'}</h2>
          <p>{document.errorMessage ?? 'This document is not ready to open yet.'}</p>
          <Link className="text-link" to="/documents">Return to library</Link>
        </section>
      ) : (
        <>
          <div className="mobile-panel-switch" aria-label="Workspace panel">
            <button
              className={activeMobilePanel === 'document' ? 'selected' : ''}
              type="button"
              aria-pressed={activeMobilePanel === 'document'}
              onClick={() => setActiveMobilePanel('document')}
            >
              Document
            </button>
            <button
              className={activeMobilePanel === 'chat' ? 'selected' : ''}
              type="button"
              aria-pressed={activeMobilePanel === 'chat'}
              onClick={() => setActiveMobilePanel('chat')}
            >
              Chat
            </button>
          </div>
          <div className="workspace-grid">
          <section
            className={`document-viewer panel${activeMobilePanel === 'chat' ? ' mobile-panel-hidden' : ''}`}
            aria-labelledby="document-preview-heading"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">DOCUMENT</p>
                <h2 id="document-preview-heading">Extracted text preview</h2>
              </div>
              <span className="passage-count">{document.passages.length} passages</span>
            </div>
            <div className="passage-list">
              {document.passages.map((passage, index) => (
                <article className="passage-card" key={`${document.id}-${index}`}>
                  <span>Passage {index + 1}</span>
                  <p>{passage}</p>
                </article>
              ))}
            </div>
            {!document.isSample && !document.backendManaged && (
              <p className="prototype-note">
                Text is temporarily held in memory in this browser tab; it is not uploaded.
              </p>
            )}
          </section>

          <section
            className={`chat-panel panel${activeMobilePanel === 'document' ? ' mobile-panel-hidden' : ''}`}
            aria-label="Ask questions about this document"
          >
            <div className="chat-header">
              <span className="chat-avatar" aria-hidden="true">✦</span>
              <span>
                <strong>Ask this document</strong>
                <small>
                  {document.backendManaged
                    ? 'Backend keyword search · not AI'
                    : 'Local keyword-search demo · not AI'}
                </small>
              </span>
            </div>
            <div className="chat-messages" aria-live="polite">
              {!messages.length && (
                <div className="chat-welcome">
                  <span aria-hidden="true">✦</span>
                  <h2>What would you like to find?</h2>
                  <p>Answers in this prototype quote matching text from this document.</p>
                  <div className="suggested-questions">
                    {suggestedQuestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setQuestion(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message) => (
                <article className={`message message-${message.role}`} key={message.id}>
                  <span className="message-label">
                    {message.role === 'user' ? 'You' : 'LearnFlow'}
                  </span>
                  <p>{message.content}</p>
                  {message.sources?.map((source) => (
                    <blockquote className="source-card" key={`${source.documentId}-${source.passageNumber}`}>
                      <span>Source · {source.documentName} · Passage {source.passageNumber}</span>
                      <p>{source.text}</p>
                    </blockquote>
                  ))}
                </article>
              ))}
            </div>
            <form className="question-form" onSubmit={submitQuestion}>
              <label className="visually-hidden" htmlFor="document-question">
                Ask a question about this document
              </label>
              <textarea
                id="document-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask a question about this document..."
                rows={2}
              />
              <div className="question-form-footer">
                <span>
                  {document.backendManaged
                    ? 'Keyword search only · no AI request is made'
                    : 'Demo search only · no AI request is made'}
                </span>
                <button className="primary-button" type="submit" disabled={!question.trim()}>
                  Ask <span aria-hidden="true">↑</span>
                </button>
              </div>
            </form>
          </section>
          </div>
        </>
      )}
    </main>
  )
}

export default WorkspacePage
