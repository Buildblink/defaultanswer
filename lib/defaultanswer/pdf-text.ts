export function sanitizeForWinAnsi(input: string): string {
  if (!input) return "";
  return input
    .replace(/\r/g, "")
    .replace(/[←]/g, "<-")
    .replace(/[→]/g, "->")
    .replace(/[↑]/g, "^")
    .replace(/[↓]/g, "v")
    .replace(/[↗]/g, "NE")
    .replace(/[↘]/g, "SE")
    .replace(/[↙]/g, "SW")
    .replace(/[↖]/g, "NW")
    .replace(/[►]/g, ">")
    .replace(/[◄]/g, "<")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[—]/g, "-")
    .replace(/[–]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

export function formatMarkdownForPdf(md: string): string {
  const lines = md.split("\n");
  const output: string[] = [];
  let inTable = false;
  let headers: string[] = [];

  const pushTableRow = (row: string) => {
    const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 3) return;
    if (!headers.length) {
      headers = cells;
      return;
    }
    const signalIdx = headers.findIndex((h) => /signal/i.test(h));
    const youIdx = headers.findIndex((h) => /you/i.test(h));
    const compIdx = headers.findIndex((h) => /competitor/i.test(h));
    const deltaIdx = headers.findIndex((h) => /delta/i.test(h));

    const signal = signalIdx >= 0 ? cells[signalIdx] : cells[0];
    const you = youIdx >= 0 ? cells[youIdx] : "";
    const comp = compIdx >= 0 ? cells[compIdx] : "";
    const delta = deltaIdx >= 0 ? cells[deltaIdx] : "";

    output.push(`Signal: ${signal} — You: ${you} — Competitor: ${comp} — Delta: ${delta}`);
  };

  for (const raw of lines) {
    let line = raw;
    if (/^\s*\|/.test(line)) {
      inTable = true;
      if (/^\s*\|\s*-/.test(line)) {
        continue; // skip separator row
      }
      pushTableRow(line);
      continue;
    } else if (inTable) {
      inTable = false;
      headers = [];
    }

    if (/^# /.test(line)) {
      output.push(`\n\n=== ${line.replace(/^#\s*/, "").toUpperCase()} ===\n`);
      continue;
    }
    if (/^## /.test(line)) {
      output.push(`\n\n== ${line.replace(/^##\s*/, "").toUpperCase()} ==\n`);
      continue;
    }
    if (/^\s*$/.test(line)) {
      output.push("");
      continue;
    }

    line = line.replace(/\*\*(.+?)\*\*/g, "$1");
    output.push(line);
  }

  return output.join("\n");
}

export function wrapLines(text: string, maxChars: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
