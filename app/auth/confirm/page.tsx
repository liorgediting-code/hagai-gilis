import { Suspense } from "react";

import { ConfirmClient } from "./_components/confirm-client";

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmClient />
    </Suspense>
  );
}
