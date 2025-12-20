import * as cheerio from "cheerio";

export function extractVisibleTextFromHtml(html: string): string {
  if (!html) return "";

  const $ = cheerio.load(html);

  $("script, style, noscript, svg, canvas, iframe, template, head").remove();

  const root = $("body").length ? $("body") : $.root();
  let text = root.text();

  text = text
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => {
      const cssy = /[{}]/.test(l) || ((l.match(/[;:]/g)?.length ?? 0) >= 3);
      return !cssy;
    });

  return lines.join("\n");
}
