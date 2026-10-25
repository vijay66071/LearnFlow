import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import './UploadDropzone.css'

type UploadDropzoneProps = {
  errorMessage: string
  onFileSelected: (file: File) => void
}

function UploadDropzone({ errorMessage, onFileSelected }: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (file) onFileSelected(file)
    event.currentTarget.value = ''
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) onFileSelected(file)
  }

  return (
    <section
      className={`upload-card${isDragging ? ' dragging' : ''}`}
      aria-labelledby="upload-heading"
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="upload-copy">
        <span className="upload-kicker">
          <span aria-hidden="true" />
          YOUR PRIVATE KNOWLEDGE SPACE
        </span>
        <h2 id="upload-heading">Bring your ideas into focus.</h2>
        <p>Drop in a document and start exploring what you already know.</p>
        <div className="upload-actions">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".pdf,.txt,.md,.markdown"
            onChange={handleFileChange}
            aria-label="Choose a PDF, TXT, or Markdown file"
          />
          <button
            className="primary-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose a file
            <span aria-hidden="true">↗</span>
          </button>
          <p className="file-types">PDF, TXT, or MD <span>·</span> Max 10 MB</p>
        </div>
        {errorMessage && <p className="file-error" role="alert">{errorMessage}</p>}
      </div>

      <div className="upload-visual" aria-hidden="true">
        <div className="visual-aura" />
        <div className="visual-orbit orbit-a" />
        <div className="visual-orbit orbit-b" />
        <div className="document-stack">
          <div className="document-sheet sheet-back">
            <span className="sheet-mark" />
            <span className="sheet-line line-long" />
            <span className="sheet-line" />
            <span className="sheet-line line-short" />
            <span className="sheet-block" />
          </div>
          <div className="document-sheet sheet-middle">
            <span className="sheet-mark" />
            <span className="sheet-line line-long" />
            <span className="sheet-line" />
            <span className="sheet-line line-short" />
            <span className="sheet-block" />
          </div>
          <div className="document-sheet sheet-front">
            <span className="sheet-topline">
              <span className="sheet-mark" />
              <span className="sheet-label">YOUR NOTES</span>
            </span>
            <span className="sheet-line line-long" />
            <span className="sheet-line" />
            <span className="sheet-highlight" />
            <span className="sheet-line line-short" />
            <span className="sheet-line line-long" />
          </div>
        </div>
        <div className="floating-chip chip-search">
          <span aria-hidden="true">⌕</span>
          Find the signal
        </div>
        <div className="floating-chip chip-source">
          <span aria-hidden="true">✦</span>
          Your source
        </div>
        <span className="visual-sparkle sparkle-a">✦</span>
        <span className="visual-sparkle sparkle-b">✧</span>
      </div>
    </section>
  )
}

export default UploadDropzone
