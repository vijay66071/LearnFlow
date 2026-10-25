function SettingsPage() {
  return (
    <main className="page-content">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">PREFERENCES</p>
          <h1>Settings</h1>
          <p className="welcome-copy">Prototype information and privacy notes.</p>
        </div>
      </div>

      <div className="settings-layout">
        <section className="panel settings-card">
          <p className="eyebrow">WORKSPACE</p>
          <h2>Local learning prototype</h2>
          <p>
            The frontend connects to a local Python API with SQLite storage,
            Chroma semantic search, and OpenAI answers. This prototype does not
            have accounts.
          </p>
          <div className="settings-detail">
            <span>Workspace name</span>
            <strong>LearnFlow</strong>
          </div>
          <div className="settings-detail">
            <span>Data lifetime</span>
            <strong>Documents persist in local SQLite</strong>
          </div>
        </section>

        <section className="panel settings-card privacy-settings">
          <p className="eyebrow">DOCUMENT PRIVACY</p>
          <h2>Documents are stored on this computer</h2>
          <p>
            The local API stores extracted passages in SQLite and Chroma. Passage
            text is sent to OpenAI to create embeddings, and relevant passages
            plus your question are sent to generate an answer. Conversations are
            still held in browser memory and clear when you refresh. OpenAI API
            usage may incur charges.
          </p>
          <div className="privacy-callout">
            <strong>Before using real personal documents</strong>
            <p>
              This is a learning prototype without authentication. Keep the API
              on your computer, do not expose it to a network, and do not upload
              sensitive documents.
            </p>
          </div>
        </section>

        <section className="panel settings-card">
          <p className="eyebrow">AI PROVIDER</p>
          <h2>OpenAI + local Chroma</h2>
          <p>
            OpenAI creates semantic embeddings and source-grounded answers.
            Chroma stores the vectors locally on this computer.
          </p>
          <span className="status-badge status-processing">Configure backend/.env</span>
        </section>
      </div>
    </main>
  )
}

export default SettingsPage
