"use client";

import { useState } from "react";
import { DEFAULTANSWER_VERSION } from "@/lib/defaultanswer/version";
import { PROMPT_PACK_VERSION } from "@/lib/defaultanswer/prompt-pack";

export function CopyDebugJsonButton(props: {
  reportId: string;
  url: string;
  analysis: unknown;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const payload = {
      defaultanswer_version: DEFAULTANSWER_VERSION,
      prompt_pack_version: PROMPT_PACK_VERSION,
      scoring_engine_version: (props.analysis as any)?.metadata?.version,
      reportId: props.reportId,
      url: props.url,
      analysis: props.analysis,
    };

    const json = JSON.stringify(payload, null, 2);

    try {
      await navigator.clipboard.writeText(json);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
    >
      {copied ? "Copied debug JSON" : "Copy Debug JSON"}
    </button>
  );
}


