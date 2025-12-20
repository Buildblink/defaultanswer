import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { reportToMarkdown, type ReportData } from "@/lib/defaultanswer/report-to-markdown";
import { formatMarkdownForPdf, sanitizeForWinAnsi, wrapLines } from "@/lib/defaultanswer/pdf-text";

export const runtime = "nodejs";

type RequestBody = {
  report?: ReportData;
};

export async function POST(req: Request) {
  let report: ReportData | undefined;
  try {
    const body = await req.json();
    report = body?.report;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!report) {
    return NextResponse.json({ ok: false, error: "report is required" }, { status: 400 });
  }

  try {
    const md = reportToMarkdown(report);
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
        "Content-Disposition": `attachment; filename="defaultanswer-report.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
