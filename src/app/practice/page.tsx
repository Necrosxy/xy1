import { Suspense } from "react";

import { PracticeRouteClient } from "@/components/PracticeRouteClient";

export default function PracticePage() {
  return (
    <Suspense>
      <PracticeRouteClient />
    </Suspense>
  );
}
