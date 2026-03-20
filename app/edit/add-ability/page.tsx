"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export const dynamic = 'force-dynamic';

type CharacterHeader = {
  id: number;
  user_id: string;
  name: string;
  class: string;
  lv: number;
};

type AbilityType = "action" | "spell" | "cantrip";

function tableForType(type: AbilityType): string {
  if (type === "action") return "character_actions";
  if (type === "spell") return "character_spells";
  return "character_cantrips";
}

function AddAbilityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");
  const abilityId = searchParams.get("abilityId");
  const rawType = searchParams.get("type");
  const abilityType: AbilityType =
    rawType === "spell" ? "spell" : rawType === "cantrip" ? "cantrip" : "action";

  const [character, setCharacter] = useState<CharacterHeader | null>(null);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerError, setHeaderError] = useState("");
  const [name, setName] = useState("");
  const [scaling, setScaling] = useState("");
  const [usageTiming, setUsageTiming] = useState("action");
  const [restoreOnMode, setRestoreOnMode] = useState<"short_rest" | "long_rest" | "another">("short_rest");
  const [restoreOnCustom, setRestoreOnCustom] = useState("");
  const [damage, setDamage] = useState("");
  const [spellLevel, setSpellLevel] = useState("1");
  const [charges, setCharges] = useState("");
  const [description, setDescription] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const loadCharacter = async () => {
      if (!characterId) {
        setHeaderError("No character id was provided.");
        setHeaderLoading(false);
        return;
      }

      setHeaderLoading(true);
      setHeaderError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setHeaderError(userError?.message ?? "You must be signed in to view this character.");
        setHeaderLoading(false);
        return;
      }

      const parsedCharacterId = Number.parseInt(characterId, 10);

      if (Number.isNaN(parsedCharacterId)) {
        setHeaderError("Invalid character id.");
        setHeaderLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("characters")
        .select("id, user_id, name, class, lv")
        .eq("id", parsedCharacterId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        setHeaderError(error.message);
        setCharacter(null);
      } else {
        setCharacter(data);

        if (abilityId) {
          const parsedAbilityId = Number.parseInt(abilityId, 10);

          if (Number.isNaN(parsedAbilityId)) {
            setHeaderError("Invalid ability id.");
            setHeaderLoading(false);
            return;
          }

          const { data: abilityData, error: abilityError } = await supabase
            .from(tableForType(abilityType))
            .select("*")
            .eq("id", parsedAbilityId)
            .eq("character_id", parsedCharacterId)
            .single();

          if (abilityError) {
            setHeaderError(abilityError.message);
          } else {
            setIsEditMode(true);
            setName(abilityData.name ?? "");
            setScaling(abilityData.scaling ?? "");
            setUsageTiming(abilityData.usage_timing ?? "action");
            setDamage(abilityData.damage ?? "");
            setDescription(abilityData.description ?? "");

            if (abilityType === "spell") {
              setSpellLevel(String(abilityData.spell_level ?? 1));
            }

            if (abilityType === "action") {
              const restoreOn = abilityData.restore_on as string | null;
              if (restoreOn === "short_rest" || restoreOn === "long_rest") {
                setRestoreOnMode(restoreOn);
                setRestoreOnCustom("");
              } else {
                setRestoreOnMode("another");
                setRestoreOnCustom(restoreOn ?? "");
              }
              setCharges(abilityData.charges != null ? String(abilityData.charges) : "");
            }
          }
        }
      }

      setHeaderLoading(false);
    };

    void loadCharacter();
  }, [abilityId, characterId, abilityType]);

  const handleSave = async () => {
    if (!characterId) {
      setSaveError("Missing character id.");
      return;
    }

    const parsedCharacterId = Number.parseInt(characterId, 10);

    if (Number.isNaN(parsedCharacterId)) {
      setSaveError("Invalid character id.");
      return;
    }

    if (!name.trim()) {
      setSaveError("Name is required.");
      return;
    }

    let restoreOnToSave: string | null = null;
    let chargesToSave: number | null = null;

    if (abilityType === "action") {
      restoreOnToSave =
        restoreOnMode === "another" ? (restoreOnCustom.trim() || null) : restoreOnMode;

      if (charges.trim()) {
        const parsed = Number.parseInt(charges, 10);
        if (!Number.isInteger(parsed) || parsed < 1) {
          setSaveError("Charges must be a positive integer.");
          return;
        }
        chargesToSave = parsed;
      }
    }

    let spellLevelToSave: number | null = null;

    if (abilityType === "spell") {
      const parsed = Number.parseInt(spellLevel, 10);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 9) {
        setSaveError("Spell level must be between 1 and 9.");
        return;
      }
      spellLevelToSave = parsed;
    }

    setIsSaving(true);
    setSaveError("");

    const basePayload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim(),
      damage: damage.trim() || null,
      scaling: scaling.trim() || null,
      usage_timing: usageTiming,
    };

    if (abilityType === "action") {
      basePayload.restore_on = restoreOnToSave;
      basePayload.charges = chargesToSave;
      basePayload.curr_charges = chargesToSave;
    }

    if (abilityType === "spell") {
      basePayload.spell_level = spellLevelToSave;
    }

    const table = tableForType(abilityType);
    let error: { message: string } | null = null;

    if (abilityId) {
      const parsedAbilityId = Number.parseInt(abilityId, 10);

      if (Number.isNaN(parsedAbilityId)) {
        setSaveError("Invalid ability id.");
        setIsSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(basePayload)
        .eq("id", parsedAbilityId)
        .eq("character_id", parsedCharacterId);

      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from(table)
        .insert({ ...basePayload, character_id: parsedCharacterId });

      error = insertError;
    }

    if (error) {
      setSaveError(error.message);
      setIsSaving(false);
      return;
    }

    router.push(`/edit/abilities-and-items?characterId=${parsedCharacterId}`);
  };

  const typeLabel = abilityType === "action" ? "Action" : abilityType === "spell" ? "Spell" : "Cantrip";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Character Sheet
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {headerLoading ? "Loading character..." : character?.name ?? "Add Ability"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {headerLoading
              ? "Fetching character details."
              : character
                ? `${character.class} • Level ${character.lv}`
                : headerError}
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            {isEditMode ? `Edit ${typeLabel}` : `New ${typeLabel}`}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={
                  abilityType === "spell"
                    ? "Fireball"
                    : abilityType === "cantrip"
                      ? "Fire Bolt"
                      : "Second Wind"
                }
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Usage Timing
              </span>
              <select
                value={usageTiming}
                onChange={(event) => setUsageTiming(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
              >
                <option value="action">Action</option>
                <option value="bonus_action">Bonus Action</option>
                <option value="reaction">Reaction</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Damage
              </span>
              <input
                type="text"
                value={damage}
                onChange={(event) => setDamage(event.target.value)}
                placeholder="1d10 fire"
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Scaling / DC
              </span>
              <input
                type="text"
                value={scaling}
                onChange={(event) => setScaling(event.target.value)}
                placeholder="DC 15 CON save"
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
              />
            </label>

            {abilityType === "spell" && (
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Spell Level
                </span>
                <select
                  value={spellLevel}
                  onChange={(event) => setSpellLevel(event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {abilityType === "action" && (
              <>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Restore On
                  </span>
                  <select
                    value={restoreOnMode}
                    onChange={(event) =>
                      setRestoreOnMode(
                        event.target.value === "long_rest"
                          ? "long_rest"
                          : event.target.value === "another"
                            ? "another"
                            : "short_rest"
                      )
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
                  >
                    <option value="short_rest">Short Rest</option>
                    <option value="long_rest">Long Rest</option>
                    <option value="another">Another</option>
                  </select>
                </label>

                {restoreOnMode === "another" && (
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Restore On (Custom)
                    </span>
                    <input
                      type="text"
                      value={restoreOnCustom}
                      onChange={(event) => setRestoreOnCustom(event.target.value)}
                      placeholder="e.g. Dawn"
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
                    />
                  </label>
                )}

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Charges (optional)
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={charges}
                    onChange={(event) => setCharges(event.target.value)}
                    placeholder="Leave empty if unlimited"
                    className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
                  />
                </label>
              </>
            )}

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Description
              </span>
              <textarea
                rows={8}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe how this ability works..."
                className="w-full resize-y rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
              />
            </label>
          </div>

          {saveError ? <p className="mt-4 text-sm text-red-700">{saveError}</p> : null}
        </section>

        <div className="mt-auto flex items-center justify-between gap-3 pt-6">
          <button
            type="button"
            onClick={() => router.push(`/edit/abilities-and-items?characterId=${characterId ?? ""}`)}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || headerLoading || !character}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : isEditMode ? "Save Changes" : "Save"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function AddAbilityPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <AddAbilityPageContent />
    </Suspense>
  );
}
