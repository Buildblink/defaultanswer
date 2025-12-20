export type ReadinessState =
  | "Not a Default Candidate"
  | "Emerging Option"
  | "Strong Default Candidate";

export type BeliefState = {
  domain: string;
  readiness_state: ReadinessState;
  confidence_score: number; // reuse Default Answer Score™
  blocking_factors: string[];
  supporting_signals: string[];
  primary_uncertainty: string;
  last_updated: string;
  previous_state?: {
    readiness_state: BeliefState["readiness_state"];
    confidence_score: number;
    last_updated: string;
  };
  history: Array<{
    reportId: string;
    timestamp: string;
    score: number;
    readiness_state: BeliefState["readiness_state"];
    delta_score?: number;
    delta_explanation: string;
  }>;
};

const KEY_PREFIX = "defaultanswer:belief:";

export function beliefKey(domain: string): string {
  return `${KEY_PREFIX}${(domain || "").toLowerCase()}`;
}

export function loadBeliefState(domain: string): BeliefState | null {
  if (typeof window === "undefined") return null;
  if (!domain) return null;
  try {
    const raw = window.localStorage.getItem(beliefKey(domain));
    if (!raw) return null;
    return JSON.parse(raw) as BeliefState;
  } catch {
    return null;
  }
}

export function saveBeliefState(state: BeliefState): void {
  if (typeof window === "undefined") return;
  if (!state?.domain) return;
  try {
    window.localStorage.setItem(beliefKey(state.domain), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function upsertBeliefState(params: {
  domain: string;
  reportId: string;
  timestamp: string; // ISO
  readiness_state: ReadinessState;
  confidence_score: number;
  blocking_factors: string[];
  supporting_signals: string[];
  primary_uncertainty: string;
}): { current: BeliefState; previous: BeliefState | null } {
  const previous = loadBeliefState(params.domain);

  // Idempotency: if this report already recorded, don't append history again
  const alreadyRecorded =
    previous?.history?.some((h) => h.reportId === params.reportId) ?? false;

  const deltaScore =
    previous && previous.confidence_score >= 0 && params.confidence_score >= 0
      ? params.confidence_score - previous.confidence_score
      : undefined;

  const deltaExplanation = explainDelta({
    previous,
    next: params,
    deltaScore,
  });

  const nextState: BeliefState = {
    domain: params.domain,
    readiness_state: params.readiness_state,
    confidence_score: params.confidence_score,
    blocking_factors: params.blocking_factors,
    supporting_signals: params.supporting_signals,
    primary_uncertainty: params.primary_uncertainty,
    last_updated: params.timestamp,
    previous_state: previous
      ? {
          readiness_state: previous.readiness_state,
          confidence_score: previous.confidence_score,
          last_updated: previous.last_updated,
        }
      : undefined,
    history: alreadyRecorded
      ? previous!.history
      : [
          ...(previous?.history || []),
          {
            reportId: params.reportId,
            timestamp: params.timestamp,
            score: params.confidence_score,
            readiness_state: params.readiness_state,
            delta_score: deltaScore,
            delta_explanation: deltaExplanation,
          },
        ],
  };

  saveBeliefState(nextState);
  return { current: nextState, previous };
}

function explainDelta(args: {
  previous: BeliefState | null;
  next: {
    readiness_state: ReadinessState;
    confidence_score: number;
    blocking_factors: string[];
    supporting_signals: string[];
    primary_uncertainty: string;
  };
  deltaScore?: number;
}): string {
  const { previous, next, deltaScore } = args;

  if (!previous) {
    return "First scan — establishing baseline belief.";
  }

  // If we cannot compute numeric delta, still explain using factor diffs
  const prevBlocking = new Set(previous.blocking_factors || []);
  const prevSupport = new Set(previous.supporting_signals || []);

  const addedSupport = (next.supporting_signals || []).find((s) => !prevSupport.has(s));
  const removedBlock = (previous.blocking_factors || []).find((b) => !(next.blocking_factors || []).includes(b));
  const addedBlock = (next.blocking_factors || []).find((b) => !prevBlocking.has(b));

  if (typeof deltaScore === "number") {
    if (deltaScore > 0) {
      if (addedSupport) return `Confidence increased because ${addedSupport.toLowerCase()}.`;
      if (removedBlock) return `Confidence increased because a prior blocker was reduced: ${removedBlock.toLowerCase()}.`;
      return "Confidence increased due to stronger supporting signals.";
    }
    if (deltaScore < 0) {
      if (addedBlock) return `Confidence decreased because ${addedBlock.toLowerCase()}.`;
      return "Confidence decreased due to weaker retrievable signals.";
    }
    // deltaScore === 0
    return `Confidence did not change because the primary uncertainty remains: ${next.primary_uncertainty}`;
  }

  // Fallback explanation without numeric delta
  if (addedSupport) return `Changed because ${addedSupport.toLowerCase()}.`;
  if (removedBlock) return `Changed because a prior blocker was reduced: ${removedBlock.toLowerCase()}.`;
  if (addedBlock) return `Changed because ${addedBlock.toLowerCase()}.`;
  return `No meaningful change detected; primary uncertainty remains: ${next.primary_uncertainty}`;
}



