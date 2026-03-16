"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AbilityDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const abilityId = searchParams.get("abilityId");
  const [ability, setAbility] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAbility = async () => {
      if (!abilityId) return;
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("character_attacks")
        .select("*")
        .eq("id", abilityId)
        .maybeSingle();
      if (error) setError(error.message);
      setAbility(data);
      setLoading(false);
    };
    fetchAbility();
  }, [abilityId]);

  if (loading) return <main className="p-8">Loading...</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!ability) return <main className="p-8">Ability not found.</main>;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto w-full max-w-2xl">
        <button
          className="mb-4 rounded border border-zinc-300 bg-white px-3 py-1 text-sm hover:bg-zinc-100"
          onClick={() => router.back()}
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold mb-2">{ability.name}</h1>
        <div className="mb-2 text-zinc-700">Type: {ability.type}</div>
        <div className="mb-2 text-zinc-700">Bonus Ability: {ability.bonus_ability}</div>
        <div className="mb-2 text-zinc-700">Usage Timing: {ability.usage_timing}</div>
        <div className="mb-2 text-zinc-700">Restore On: {ability.restore_on}</div>
        <div className="mb-2 text-zinc-700">Damage: {ability.damage}</div>
        <div className="mb-2 text-zinc-700">Charges: {ability.charge_info}</div>
        <div className="mb-2 text-zinc-700">Description:</div>
        <div className="whitespace-pre-line border rounded bg-white p-3 text-zinc-900">{ability.description}</div>
      </div>
    </main>
  );
}
