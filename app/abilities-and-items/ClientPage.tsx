"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerError, setHeaderError] = useState("");

  useEffect(() => {
    // Minimal client behavior: ensure search params access happens inside a client component
    setHeaderLoading(false);
  }, [characterId]);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Character Sheet</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {headerLoading ? "Loading character..." : "Abilities and Items"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">{headerError || "Client UI"}</p>
        </header>

        <div className="mt-4">Client UI loaded.</div>
      </div>
    </main>
  );
}
