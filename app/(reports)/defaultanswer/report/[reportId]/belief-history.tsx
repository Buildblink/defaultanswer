"use client";

import { useEffect, useMemo, useState } from "react";
import type { BeliefState, ReadinessState } from "@/lib/defaultanswer/belief-state";
import { upsertBeliefState } from "@/lib/defaultanswer/belief-state";

export function BeliefHistory(props: {
  domain: string;
  reportId: string;
  timestamp: string;
  readiness_state: ReadinessState;
  confidence_score: number;
  blocking_factors: string[];
  supporting_signals: string[];
  primary_uncertainty: string;
}) {
  const [previous, setPrevious] = useState<BeliefState | null>(null);
  const [current, setCurrent] = useState<BeliefState | null>(null);

  const inputsKey = useMemo(
    () =>
      [
        props.domain,
        props.reportId,
        props.timestamp,
        props.readiness_state,
        props.confidence_score,
        props.primary_uncertainty,
        props.blocking_factors.join("|"),
        props.supporting_signals.join("|"),
      ].join("::"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.domain, props.reportId]
  );

  useEffect(() => {
    if (!props.domain) return;
    try {
      const { current, previous } = upsertBeliefState({
        domain: props.domain,
        reportId: props.reportId,
        timestamp: props.timestamp,
        readiness_state: props.readiness_state,
        confidence_score: props.confidence_score,
        blocking_factors: props.blocking_factors,
        supporting_signals: props.supporting_signals,
        primary_uncertainty: props.primary_uncertainty,
      });
      setPrevious(previous);
      setCurrent(current);
    } catch {
      // graceful: no storage available
      setPrevious(null);
      setCurrent(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsKey]);

  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4">What changed since your last scan</h2>
      {!previous ? (
        <p className="text-stone-700 dark:text-stone-300">
          This is your first scan.
        </p>
      ) : (
        <div className="space-y-2 text-stone-700 dark:text-stone-300">
          <p>
            Since your last scan, my confidence{" "}
            <span className="font-semibold">
              {current && previous && current.confidence_score >= 0 && previous.confidence_score >= 0
                ? current.confidence_score > previous.confidence_score
                  ? `increased by +${current.confidence_score - previous.confidence_score}`
                  : current.confidence_score < previous.confidence_score
                    ? `decreased by ${current.confidence_score - previous.confidence_score}`
                    : "did not change"
                : "changed"}
            </span>
            {previous.last_updated ? ` (last scan: ${new Date(previous.last_updated).toLocaleDateString()})` : ""}.
          </p>
          {current?.history?.length ? (
            <p className="text-stone-600 dark:text-stone-400">
              {current.history[current.history.length - 1]?.delta_explanation}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}


