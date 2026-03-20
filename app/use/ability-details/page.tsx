"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export const dynamic = 'force-dynamic';

type AbilityType = "action" | "spell" | "cantrip";

function tableForType(type: AbilityType): string {
  if (type === "action") return "character_actions";
  if (type === "spell") return "character_spells";
  return "character_cantrips";
}

function formatUsageTiming(value: string | null) {
  if (!value) return "Action";
  if (value === "bonus_action") return "Bonus Action";
  if (value === "reaction") return "Reaction";
  return "Action";
}

function formatRestoreOn(value: string | null) {
  if (!value) return "-";
  if (value === "short_rest") return "Short Rest";
  if (value === "long_rest") return "Long Rest";
  return value;
}

function AbilityDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const abilityId = searchParams.get("abilityId");
  const rawType = searchParams.get("type");
  const abilityType: AbilityType =
    rawType === "spell" ? "spell" : rawType === "cantrip" ? "cantrip" : "action";

  const [ability, setAbility] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAbility = async () => {
      if (!abilityId) return;
      setLoading(true);
      setError("");
      const { data, error: fetchError } = await supabase
        .from(tableForType(abilityType))
        .select("*")
        .eq("id", abilityId)
        .maybeSingle();
      if (fetchError) setError(fetchError.message);
      setAbility(data);
      setLoading(false);
    };
    void fetchAbility();
  }, [abilityId, abilityType]);

  if (loading) return <main className="p-8">Loading...</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!ability) return <main className="p-8">Ability not found.</main>;

  const typeLabel = abilityType === "action" ? "Action" : abilityType === "spell" ? "Spell" : "Cantrip";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto w-full max-w-2xl">
        <button
          className="mb-4 rounded border border-zinc-300 bg-white px-3 py-1 text-sm hover:bg-zinc-100"
          onClick={() => router.back()}
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold mb-2">{String(ability.name ?? "")}</h1>
        <div className="mb-2 text-zinc-700">Type: {typeLabel}</div>
        <div className="mb-2 text-zinc-700">Usage: {formatUsageTiming(ability.usage_timing as string | null)}</div>
        {ability.damage ? (
          <div className="mb-2 text-zinc-700">Damage: {String(ability.damage)}</div>
        ) : null}
        {ability.scaling ? (
          <div className="mb-2 text-zinc-700">Scaling / DC: {String(ability.scaling)}</div>
        ) : null}
        {abilityType === "spell" && ability.spell_level != null ? (
          <div className="mb-2 text-zinc-700">Spell Level: {String(ability.spell_level)}</div>
        ) : null}
        {abilityType === "action" && (
          <>
            {ability.charges != null ? (
              <div className="mb-2 text-zinc-700">
                Charges: {String(ability.curr_charges ?? ability.charges)}/{String(ability.charges)}
              </div>
            ) : null}
            {ability.restore_on ? (
              <div className="mb-2 text-zinc-700">Restore On: {formatRestoreOn(ability.restore_on as string | null)}</div>
            ) : null}
          </>
        )}
        <div className="mb-2 text-zinc-700">Description:</div>
        <div className="whitespace-pre-line border rounded bg-white p-3 text-zinc-900">
          {String(ability.description ?? "")}
        </div>
      </div>
    </main>
  );
}

export default function AbilityDetailsPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <AbilityDetailsContent />
    </Suspense>
  );
}
