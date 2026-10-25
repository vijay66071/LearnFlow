import type { DocumentRecord, SourceReference } from '../types'

const ignoredWords = new Set([
  'about',
  'after',
  'also',
  'and',
  'are',
  'can',
  'does',
  'for',
  'from',
  'have',
  'how',
  'into',
  'that',
  'the',
  'this',
  'was',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
  'your',
])

export function findPassage(
  document: DocumentRecord,
  question: string,
): SourceReference | undefined {
  const terms = question
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((term) => term.length > 2 && !ignoredWords.has(term))

  if (!terms?.length) {
    return undefined
  }

  let bestMatch: SourceReference | undefined
  let bestScore = 0

  document.passages.forEach((passage, index) => {
    const searchablePassage = passage.toLowerCase()
    const score = terms.reduce(
      (total, term) => total + (searchablePassage.includes(term) ? 1 : 0),
      0,
    )

    if (score > bestScore) {
      bestScore = score
      bestMatch = {
        documentId: document.id,
        documentName: document.name,
        passageNumber: index + 1,
        text: passage,
      }
    }
  })

  return bestMatch
}
