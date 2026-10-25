import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { DocumentRecord, DocumentStatus } from '../types'

type DocumentsPageProps = {
  documents: DocumentRecord[]
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onRetry: (id: string) => void
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function DocumentsPage({
  documents,
  onRename,
  onDelete,
  onRetry,
}: DocumentsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentStatus>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  const filteredDocuments = documents.filter((document) => {
    const matchesName = document.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || document.status === statusFilter
    return matchesName && matchesStatus
  })

  function submitRename(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault()
    onRename(id, draftName)
    setEditingId(null)
  }

  return (
    <main className="page-content">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">YOUR LIBRARY</p>
          <h1>Documents</h1>
          <p className="welcome-copy">Manage your documents and searchable passages.</p>
        </div>
        <span className="count-pill">{documents.length} documents</span>
      </div>

      <section className="panel library-panel" aria-label="Document library">
        <div className="library-toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                const value = event.target.value
                setSearchParams((currentParams) => {
                  const nextParams = new URLSearchParams(currentParams)
                  if (value) {
                    nextParams.set('search', value)
                  } else {
                    nextParams.delete('search')
                  }
                  return nextParams
                }, { replace: true })
              }}
              placeholder="Search documents"
              aria-label="Search documents"
            />
          </label>
          <label className="filter-field">
            <span className="visually-hidden">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | DocumentStatus)}
            >
              <option value="all">All statuses</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Needs attention</option>
            </select>
          </label>
        </div>

        {filteredDocuments.length ? (
          <div className="table-scroll">
            <table className="documents-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Added</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>
                      {editingId === document.id ? (
                        <form
                          className="rename-form"
                          onSubmit={(event) => submitRename(event, document.id)}
                        >
                          <input
                            autoFocus
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            aria-label="New document name"
                          />
                          <button className="small-button" type="submit">Save</button>
                          <button
                            className="small-button quiet-button"
                            type="button"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <Link className="table-document-link" to={`/documents/${document.id}`}>
                          <span className={`file-icon file-${document.type.toLowerCase()}`}>
                            {document.type}
                          </span>
                          <span>
                            <strong>{document.name}</strong>
                            {document.isSample && <small>Sample document</small>}
                          </span>
                        </Link>
                      )}
                    </td>
                    <td>{document.type}</td>
                    <td>{formatDate(document.uploadedAt)}</td>
                    <td>
                      <span className={`status-badge status-${document.status}`}>
                        {document.status === 'failed' ? 'Needs attention' : document.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {document.status === 'failed' && (
                          <button
                            className="icon-action retry-action"
                            type="button"
                            onClick={() => onRetry(document.id)}
                          >
                            Retry
                          </button>
                        )}
                        <button
                          className="icon-action"
                          type="button"
                          onClick={() => {
                            setEditingId(document.id)
                            setDraftName(document.name)
                          }}
                          aria-label={`Rename ${document.name}`}
                        >
                          Rename
                        </button>
                        <button
                          className="icon-action delete-action"
                          type="button"
                          onClick={() => onDelete(document.id)}
                          aria-label={`Delete ${document.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">▤</span>
            <strong>{documents.length ? 'No matching documents' : 'Your library is empty'}</strong>
            <p>
              {documents.length
                ? 'Try another search or change the status filter.'
                : 'Go to the dashboard to select a document.'}
            </p>
            {!documents.length && <Link className="text-link" to="/">Go to dashboard</Link>}
          </div>
        )}
      </section>
      <p className="prototype-note">
        Uploaded documents are stored in the local backend. Sample documents are built-in demos.
      </p>
    </main>
  )
}

export default DocumentsPage
