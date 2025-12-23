import { NextRequest, NextResponse } from "next/server";

const INDEXNOW_ENDPOINT = "https://www.bing.com/indexnow";
const SITE_URL = "https://www.defaultanswer.com";

function isValidSiteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.origin === SITE_URL;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const key = process.env.INDEXNOW_KEY;
  const secret = process.env.INDEXNOW_SECRET;
  if (!key) {
    return NextResponse.json({ error: "INDEXNOW_KEY must be set." }, { status: 500 });
  }
  if (process.env.NODE_ENV === "production") {
    const token = req.headers.get("x-indexnow-token") || "";
    if (!secret || token !== secret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  let body: { urls?: string[] } = {};
  try {
    body = (await req.json()) as { urls?: string[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const urls = (body.urls ?? []).filter((url) => typeof url === "string" && url.trim().length > 0);
  if (urls.length === 0) {
    return NextResponse.json({ error: "No URLs provided." }, { status: 400 });
  }
  if (urls.length > 100) {
    return NextResponse.json({ error: "Too many URLs. Max 100 per request." }, { status: 400 });
  }

  const invalid = urls.filter((url) => !isValidSiteUrl(url));
  if (invalid.length > 0) {
    return NextResponse.json({ error: "All URLs must be on https://www.defaultanswer.com." }, { status: 400 });
  }

  const payload = {
    host: new URL(SITE_URL).host,
    key,
    keyLocation: `${SITE_URL}/.well-known/indexnow/${key}.txt`,
    urlList: urls,
  };

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const snippet = text.slice(0, 200);
  return NextResponse.json(
    {
      submittedCount: urls.length,
      invalidCount: invalid.length,
      bingStatus: res.status,
      bingResponseSnippet: snippet,
    },
    { status: res.ok ? 200 : res.status }
  );
}
