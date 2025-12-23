import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;

  const expectedKey = process.env.INDEXNOW_KEY;

  if (!expectedKey) {
    return new NextResponse("INDEXNOW_KEY not set.", { status: 500 });
  }

  if (key !== expectedKey) {
    return new NextResponse("Not found.", { status: 404 });
  }

  return new NextResponse(expectedKey, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
