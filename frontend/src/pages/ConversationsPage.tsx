import { Link } from 'react-router-dom'
import type { Conversation, DocumentRecord } from '../types'

type ConversationsPageProps = {
  conversations: Conversation[]
  documents: DocumentRecord[]
}

function ConversationsPage({ conversations, documents }: ConversationsPageProps) {
  const orderedConversations = [...conversations].sort(
    (left, right) => right.updatedAt.localeCompare(left.updatedAt),
  )

  return (
    <main className="page-content">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">YOUR RESEARCH</p>
          <h1>Conversation history</h1>
          <p className="welcome-copy">
            Reopen a document conversation and continue exploring its source text.
          </p>
        </div>
        <span className="count-pill">{conversations.length} conversations</span>
      </div>

      {orderedConversations.length ? (
        <section className="conversation-history-list" aria-label="Saved conversations">
          {orderedConversations.map((conversation) => {
            const document = documents.find((item) => item.id === conversation.documentId)
            if (!document) return null
            const latestUserMessage = [...conversation.messages]
              .reverse()
              .find((message) => message.role === 'user')
            const messageCount = conversation.messages.filter(
              (message) => message.role === 'user',
            ).length

            return (
              <Link
                className="history-card"
                key={conversation.documentId}
                to={`/documents/${document.id}`}
              >
                <span className="conversation-icon" aria-hidden="true">◷</span>
                <span className="history-card-content">
                  <strong>{latestUserMessage?.content ?? document.name}</strong>
                  <small>{document.name} · {messageCount} question{messageCount === 1 ? '' : 's'}</small>
                </span>
                <span className="history-date">
                  {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
                    .format(new Date(conversation.updatedAt))}
                </span>
                <span className="row-arrow" aria-hidden="true">›</span>
              </Link>
            )
          })}
        </section>
      ) : (
        <div className="empty-state page-empty">
          <span className="empty-icon" aria-hidden="true">◷</span>
          <strong>No conversations yet</strong>
          <p>Open a ready document and ask a question to start a conversation.</p>
          <Link className="text-link" to="/documents">Browse documents</Link>
        </div>
      )}
      <p className="prototype-note">
        Conversation history is held in memory and is cleared when you refresh the page.
      </p>
    </main>
  )
}

export default ConversationsPage
