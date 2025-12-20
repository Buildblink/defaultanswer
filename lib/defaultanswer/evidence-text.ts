export function cleanEvidenceText(input: string): string {
  const text = (input || "").replace(/\r/g, "");

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => {
      // Drop arrow/glyph heavy lines (UI nav icons etc.)
      const glyphs = (l.match(/[↗↘↙↖►◄↑↓←→]/g) ?? []).length;
      if (glyphs >= 2) return false;

      // Drop common UI mode toggles / settings chrome
      const uiJunk = /light mode|dark mode|auto\s*\(os\)|appearance|site settings/i.test(l);
      if (uiJunk) return false;

      // Drop extremely menu-like lines: many short tokens, low info density
      const tokens = l.split(/\s+/);
      const shortTokens = tokens.filter((t) => t.length <= 3).length;
      if (tokens.length >= 10 && shortTokens >= 5) return false;

      return true;
    });

  return lines.join("\n");
}
