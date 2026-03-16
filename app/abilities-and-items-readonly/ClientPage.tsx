"use client";

import { useSearchParams } from "next/navigation";

export default function ClientPage() {
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold">Abilities & Items (client)</h2>
      <p className="mt-2 text-sm text-zinc-600">characterId: {characterId ?? "(none)"}</p>
      <p className="mt-4 text-sm text-zinc-500">Client UI placeholder — full UI moved to client component.</p>
    </div>
  );
}