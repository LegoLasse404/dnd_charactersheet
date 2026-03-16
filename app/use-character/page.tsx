import React, { Suspense } from "react";
import ClientPage from "./ClientPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-600">Loading...</div>}>
      <ClientPage />
    </Suspense>
  );
}
