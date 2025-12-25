const BASE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

const INDEXNOW_SECRET = process.env.INDEXNOW_SECRET;

/**
 * Notify IndexNow via the local API endpoint.
 * @param {string[]} urls
 */
async function notifyIndexNow(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error("notifyIndexNow requires a non-empty urls array.");
  }
  if (!INDEXNOW_SECRET) {
    throw new Error("INDEXNOW_SECRET is required.");
  }

  const absoluteUrls = urls.map((url) =>
    url.startsWith("http") ? url : `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`
  );

  try {
    const res = await fetch(`${BASE_URL}/api/indexnow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-indexnow-token": INDEXNOW_SECRET,
      },
      body: JSON.stringify({ urls: absoluteUrls }),
    });

    const data = await res.json().catch(() => ({}));
    const submittedCount = data.submittedCount ?? 0;
    const bingStatus = data.bingStatus ?? res.status;
    console.log(`[indexnow] submittedCount=${submittedCount} bingStatus=${bingStatus}`);
    return data;
  } catch (error) {
    console.error("[indexnow] notify failed:", error);
    if (process.env.NODE_ENV === "production") {
      return { error: "IndexNow notify failed (swallowed in production)." };
    }
    throw error;
  }
}

async function run() {
  const args = process.argv.slice(2);
  const postUrl = args.find((arg) => arg.startsWith("--post="));
  const postPath = postUrl ? postUrl.split("=")[1] : null;

  const urls = [
    "/",
    "/methodology",
    "/defaultanswer",
    "/blog",
    "/feed.xml",
    "/sitemap.xml",
  ];

  if (postPath) {
    urls.push(postPath);
  }

  await notifyIndexNow(urls);
}

if (require.main === module) {
  run();
}

module.exports = { notifyIndexNow };
