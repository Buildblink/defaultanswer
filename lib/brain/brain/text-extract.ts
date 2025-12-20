import { MarkItDown, convertToMarkdown } from 'markitdown-node'

type ExtractResult = {
  text: string
  metadata: {
    filename: string
    format?: string
    length: number
  }
}

const converter = new MarkItDown({
  defaultOptions: {
    extractImages: false,
    extractTables: false,
  },
})

/**
 * Extract plaintext/markdown from a file buffer.
 * Falls back to simple buffer -> string if conversion fails.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<ExtractResult> {
  try {
    // MarkItDown handles most common document formats (pdf, docx, txt, md)
    const result = await converter.convert(buffer, filename)

    if (result.status === 'success') {
      const markdown =
        result.markdown_content ||
        (result.document && (await convertToMarkdown(buffer, filename))) ||
        ''

      if (markdown.trim().length > 0) {
        return {
          text: markdown.trim(),
          metadata: {
            filename,
            format: result.document?.metadata?.format,
            length: markdown.length,
          },
        }
      }
    }

    // Fallback: direct buffer-to-string
    const fallback = buffer.toString('utf-8')
    return {
      text: fallback.trim(),
      metadata: {
        filename,
        length: fallback.length,
      },
    }
  } catch (error) {
    console.error('[brain/text-extract] Extraction failed, falling back', error)
    const fallback = buffer.toString('utf-8')
    return {
      text: fallback.trim(),
      metadata: {
        filename,
        length: fallback.length,
      },
    }
  }
}
