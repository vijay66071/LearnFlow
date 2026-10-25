import type { DocumentRecord } from '../types'

export const demoDocuments: DocumentRecord[] = [
  {
    id: 'sample-learning-plan',
    name: 'Learning plan.md',
    type: 'MD',
    uploadedAt: '2026-10-20T09:00:00.000Z',
    status: 'ready',
    isSample: true,
    passages: [
      'My goal is to build a small document assistant while learning full-stack development.',
      'I will practice React and TypeScript first, then connect the interface to a Python API.',
      'A good study session is 45 minutes of focused work followed by a short break.',
      'I learn best by building one small feature, testing it, and writing down what I learned.',
    ],
  },
  {
    id: 'sample-trip-notes',
    name: 'Weekend trip notes.txt',
    type: 'TXT',
    uploadedAt: '2026-10-18T13:30:00.000Z',
    status: 'ready',
    isSample: true,
    passages: [
      'The train to Mysuru leaves at 7:15 AM on Saturday.',
      'The guesthouse check-in time is 2:00 PM, and the booking includes breakfast.',
      'Pack a light jacket, a water bottle, and the printed reservation.',
    ],
  },
]
