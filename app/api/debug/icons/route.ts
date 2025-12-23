import { NextResponse } from "next/server";

const metadataIcons = {
  icon: [
    { url: "/favicon.ico", type: "image/x-icon" },
    { url: "/icon.png", type: "image/png" },
  ],
  apple: [{ url: "/apple-touch-icon.png" }],
};

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  const resolvedUrls = {
    favicon: new URL("/favicon.ico", origin).toString(),
    iconPng: new URL("/icon.png", origin).toString(),
    appleTouch: new URL("/apple-touch-icon.png", origin).toString(),
  };

  return NextResponse.json({
    metadataIcons,
    resolvedUrls,
    note:
      "Runtime HTML head resolution is not available in a route handler; this reflects layout metadata and absolute URL derivations.",
  });
}
