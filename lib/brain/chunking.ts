type Chunk = {
  content: string
  chunkIndex: number
  tokenCount: number
}

const DEFAULT_CHUNK_SIZE = 3500 // ~900 tokens (rough)
const DEFAULT_OVERLAP = 400

function estimateTokens(text: string): number {
  // Rough heuristic: 4 characters per token
  return Math.max(1, Math.ceil(text.length / 4))
}

function sliceWithOverlap(
  text: string,
  chunkSize: number,
  overlap: number
): Chunk[] {
  const chunks: Chunk[] = []
  let start = 0
  let chunkIndex = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    const rawSlice = text.slice(start, end)
    const content = rawSlice.trim()

    if (content) {
      chunks.push({
        content,
        chunkIndex,
        tokenCount: estimateTokens(content),
      })
      chunkIndex += 1
    }

    if (end === text.length) break
    start = end - overlap
    if (start < 0) {
      start = 0
    }
  }

  return chunks
}

/**
 * Split large text into overlapping chunks for embedding.
 */
export function chunkText(
  text: string,
  options?: { chunkSize?: number; overlap?: number }
): Chunk[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []

  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE
  const overlap = options?.overlap ?? DEFAULT_OVERLAP

  // Try to break on sentence boundaries when possible
  if (clean.length <= chunkSize * 1.2) {
    return [
      {
        content: clean,
        chunkIndex: 0,
        tokenCount: estimateTokens(clean),
      },
    ]
  }

  const sentences = clean.split(/(?<=[.!?])\s+/)

  // If sentence splitting yields too many tiny fragments, fall back to raw slicing
  if (sentences.length < 4) {
    return sliceWithOverlap(clean, chunkSize, overlap)
  }

  const chunks: Chunk[] = []
  let buffer = ''
  let chunkIndex = 0

  for (const sentence of sentences) {
    // Start new chunk if adding the sentence would exceed the chunk size
    if ((buffer + ' ' + sentence).length > chunkSize && buffer.length > 0) {
      chunks.push({
        content: buffer.trim(),
        chunkIndex,
        tokenCount: estimateTokens(buffer),
      })
      chunkIndex += 1
      buffer = sentence
      continue
    }

    buffer = buffer ? `${buffer} ${sentence}` : sentence
  }

  if (buffer.trim()) {
    chunks.push({
      content: buffer.trim(),
      chunkIndex,
      tokenCount: estimateTokens(buffer),
    })
  }

  // Add overlaps
  if (overlap > 0 && chunks.length > 1) {
    const overlapped: Chunk[] = []
    for (let i = 0; i < chunks.length; i++) {
      const current = chunks[i]
      const prev = chunks[i - 1]
      const prefix =
        prev && prev.content.length > overlap
          ? prev.content.slice(-overlap)
          : prev?.content ?? ''
      const content = prefix ? `${prefix} ${current.content}` : current.content
      overlapped.push({
        content: content.trim(),
        chunkIndex: i,
        tokenCount: estimateTokens(content),
      })
    }
    return overlapped
  }

  return chunks
}

export type { Chunk }

