const siteUrl = process.env.SITE_URL || "http://localhost:3000";
const token = process.env.ADMIN_TOKEN;

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

const preset = getArg("--preset");
const domainArg = getArg("--domain");
const brandArg = getArg("--brand");
const providerArg = getArg("--provider");
const modelArg = getArg("--model");

if (!token) {
  console.error("ADMIN_TOKEN is required.");
  process.exit(1);
}

const providers = {
  openai: process.env.SWEEP_OPENAI !== "false",
  anthropic: process.env.SWEEP_ANTHROPIC !== "false",
};

if (providerArg) {
  const normalized = providerArg.toLowerCase();
  if (normalized === "openai") {
    providers.openai = true;
    providers.anthropic = false;
  } else if (normalized === "anthropic") {
    providers.openai = false;
    providers.anthropic = true;
  } else if (normalized === "both") {
    providers.openai = true;
    providers.anthropic = true;
  }
}

const payload = {
  label: process.env.SWEEP_LABEL || "manual",
  category: process.env.SWEEP_CATEGORY,
  brandName: brandArg || process.env.SWEEP_BRAND,
  domain: domainArg || process.env.SWEEP_DOMAIN,
  providers,
  limitPrompts: process.env.SWEEP_LIMIT ? Number(process.env.SWEEP_LIMIT) : undefined,
  preset: preset || undefined,
};

if (modelArg) {
  if (providers.openai && providers.anthropic) {
    payload.model = modelArg;
  } else if (providers.openai) {
    payload.openaiModel = modelArg;
  } else if (providers.anthropic) {
    payload.anthropicModel = modelArg;
  }
}

async function run() {
  const response = await fetch(`${siteUrl}/api/admin/sweep/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token,
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") || "";
  let json = null;
  if (contentType.includes("application/json")) {
    json = await response.json();
  } else {
    const text = await response.text();
    json = { ok: false, error: { message: text.slice(0, 400) } };
  }

  if (!response.ok || json?.ok === false) {
    console.error("Sweep failed:", json?.error?.message || `Request failed: ${response.status}`);
    process.exit(1);
  }

  console.log("Sweep started:", json);
}

run().catch((error) => {
  console.error("Sweep error:", error?.message || error);
  process.exit(1);
});
