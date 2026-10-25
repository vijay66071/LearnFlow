export type DocumentStatus = 'ready' | 'processing' | 'failed'

export type DocumentRecord = {
  id: string
  name: string
  type: 'PDF' | 'TXT' | 'MD'
  uploadedAt: string
  status: DocumentStatus
  passages: string[]
  errorMessage?: string
  isSample?: boolean
  backendManaged?: boolean
}

export type SourceReference = {
  documentId: string
  documentName: string
  passageNumber: number
  text: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceReference[]
  createdAt: string
}

export type Conversation = {
  documentId: string
  messages: ChatMessage[]
  updatedAt: string
}
