import * as pdfParse from "pdf-parse";

type ExtractResult = {
  text: string;
  contentType?: string;
  error?: string;
};

export async function extractTextFromBuffer(
  buffer: Buffer,
  opts?: { filename?: string; contentType?: string }
): Promise<ExtractResult> {
  const filename = (opts?.filename ?? "").toLowerCase();
  const contentType = (opts?.contentType ?? "").toLowerCase();

  const isPdf = contentType.includes("pdf") || filename.endsWith(".pdf");

  const isTextLike =
    contentType.startsWith("text/") ||
    filename.endsWith(".txt") ||
    filename.endsWith(".md") ||
    filename.endsWith(".csv") ||
    filename.endsWith(".json");

  try {
    if (isPdf) {
      const parsed = await (pdfParse as any)(buffer);
      const text = (parsed.text ?? "").replace(/\s+/g, " ").trim();
      return { text, contentType: opts?.contentType };
    }

    if (isTextLike) {
      const text = buffer.toString("utf-8").replace(/\s+/g, " ").trim();
      return { text, contentType: opts?.contentType };
    }

    return {
      text: "",
      contentType: opts?.contentType,
      error: "Unsupported file type for MVP text extraction (PDF/text only).",
    };
  } catch (err: any) {
    return {
      text: "",
      contentType: opts?.contentType,
      error: err?.message || "Failed to extract text",
    };
  }
}
