"use client";

import { useSearchParams } from "next/navigation";

import { PracticeClient } from "@/components/PracticeClient";
import type { PracticeScope } from "@/data/questions";

const scopes: PracticeScope[] = ["mixed", "judge", "single", "multiple"];

export function PracticeRouteClient() {
  const searchParams = useSearchParams();
  const rawScope = searchParams.get("type");
  const scope = scopes.includes(rawScope as PracticeScope) ? (rawScope as PracticeScope) : "mixed";
  const mode = searchParams.get("mode") === "random" ? "random" : "ordered";

  return <PracticeClient mode={mode} scope={scope} />;
}
