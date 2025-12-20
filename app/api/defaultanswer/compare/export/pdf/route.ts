import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { compareToMarkdown } from "@/lib/defaultanswer/compare-to-markdown";
import type { CompareResponseSuccess } from "@/lib/defaultanswer/compare";
import { formatMarkdownForPdf, sanitizeForWinAnsi, wrapLines } from "@/lib/defaultanswer/pdf-text";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let payload: CompareResponseSuccess | undefined;
  try {
    const body = await req.json();
    payload = body?.payload ?? body?.comparePayload ?? body?.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload || payload.ok !== true) {
    return NextResponse.json({ ok: false, error: "Valid compare payload required" }, { status: 400 });
  }

  try {
    const md = compareToMarkdown(payload);
    const formatted = formatMarkdownForPdf(md);
    const text = sanitizeForWinAnsi(formatted);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const fontSize = 11;
    const lineHeight = Math.ceil(fontSize * 1.35);
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 48;
    const maxChars = 95;

    const lines = wrapLines(text, maxChars);

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    for (const l of lines) {
      if (y < margin + lineHeight) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(l, {
        x: margin,
        y: y - lineHeight,
        size: fontSize,
        font,
      });
      y -= lineHeight;
    }

    const bytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="defaultanswer-compare.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[compare/pdf] failed", e);
    const message = e?.stack || e?.message || String(e) || "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

