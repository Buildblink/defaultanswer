import { NextRequest, NextResponse } from "next/server";

const INDEXNOW_ENDPOINT = "https://www.bing.com/indexnow";

function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://www.defaultanswer.com";
}

function normalizeUrls(urls: string[], siteUrl: string) {
  return urls
    .filter((url) => typeof url === "string" && url.trim().length > 0)
    .map((url) => (url.startsWith("http") ? url : `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`));
}

export async function POST(req: NextRequest) {
  const secret = process.env.INDEXNOW_SECRET;
  const key = process.env.INDEXNOW_KEY;
  const siteUrl = getSiteUrl();

  if (!secret || !key) {
    return NextResponse.json(
      { error: "INDEXNOW_SECRET and INDEXNOW_KEY must be set." },
      { status: 500 }
    );
  }

  const token =
    req.headers.get("x-indexnow-token") ||
    req.nextUrl.searchParams.get("token") ||
    "";

  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { urls?: string[] } = {};
  try {
    body = (await req.json()) as { urls?: string[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const urls = normalizeUrls(body.urls ?? [], siteUrl);
  if (urls.length === 0) {
    return NextResponse.json({ error: "No URLs provided." }, { status: 400 });
  }

  const payload = {
    host: new URL(siteUrl).host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList: urls,
  };

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  return NextResponse.json(
    { status: res.status, body: text },
    { status: res.ok ? 200 : res.status }
  );
}
