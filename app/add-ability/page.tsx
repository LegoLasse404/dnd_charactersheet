"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type CharacterHeader = {
  id: number;
  user_id: string;
  name: string;
  class: string;
  lv: number;
};

type AttackRow = {
  id: number;
  character_id: number;
  name: string;
  bonus_ability: string;
  usage_timing: string;
  restore_on: string | null;
  damage: string;
  type: string;
  charge_info: string | null;
  description: string;
};

export default function AddAbilityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");
  const abilityId = searchParams.get("abilityId");
  const [character, setCharacter] = useState<CharacterHeader | null>(null);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerError, setHeaderError] = useState("");
  const [name, setName] = useState("");
  const [bonusAbility, setBonusAbility] = useState("str");
  const [usageTiming, setUsageTiming] = useState("action");
  const [restoreOnMode, setRestoreOnMode] = useState<"short_rest" | "long_rest" | "another">(
    "short_rest"
  );
  const [restoreOnCustom, setRestoreOnCustom] = useState("");
  const [damage, setDamage] = useState("");
  const [type, setType] = useState("action");
  const [chargeMode, setChargeMode] = useState<"finite" | "infinite">("finite");
  const [chargeCount, setChargeCount] = useState("");
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

          const { data: attackData, error: attackError } = await supabase
            .from("character_attacks")
            .select(
              "id, character_id, name, bonus_ability, usage_timing, restore_on, damage, type, charge_info, description"
            )
            .eq("id", parsedAbilityId)
            .eq("character_id", parsedCharacterId)
            .single<AttackRow>();

          if (attackError) {
            setHeaderError(attackError.message);
          } else {
            setIsEditMode(true);
            setName(attackData.name);
            setBonusAbility(attackData.bonus_ability);
            setUsageTiming(attackData.usage_timing ?? "action");
            if (attackData.restore_on === "short_rest" || attackData.restore_on === "long_rest") {
              setRestoreOnMode(attackData.restore_on);
              setRestoreOnCustom("");
            } else {
              setRestoreOnMode("another");
              setRestoreOnCustom(attackData.restore_on ?? "");
            }
            setDamage(attackData.damage);
            setType(attackData.type);
            if ((attackData.charge_info ?? "").toLowerCase() === "infinite") {
              setChargeMode("infinite");
              setChargeCount("");
            } else {
              setChargeMode("finite");
              setChargeCount(attackData.charge_info ?? "");
            }
            setDescription(attackData.description ?? "");
          }
        }
      }

      setHeaderLoading(false);
    };

    void loadCharacter();
  }, [abilityId, characterId]);

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

    if (!damage.trim()) {
      setSaveError("Damage is required.");
      return;
    }

    let restoreOnToSave: string | null = null;

    if (type === "action") {
      restoreOnToSave = restoreOnMode === "another" ? restoreOnCustom.trim() : restoreOnMode;

      if (!restoreOnToSave) {
        setSaveError("Restore on is required for actions.");
        return;
      }
    }

    let chargeInfoToSave: string | null = null;

    if (type === "action") {
      if (chargeMode === "infinite") {
        chargeInfoToSave = "infinite";
      } else {
        const parsedChargeCount = Number.parseInt(chargeCount, 10);

        if (!Number.isInteger(parsedChargeCount) || parsedChargeCount < 1) {
          setSaveError("Charge information must be an integer or infinite for actions.");
          return;
        }

        chargeInfoToSave = String(parsedChargeCount);
      }
    }

    setIsSaving(true);
    setSaveError("");

    let error: { message: string } | null = null;

    if (abilityId) {
      const parsedAbilityId = Number.parseInt(abilityId, 10);

      if (Number.isNaN(parsedAbilityId)) {
        setSaveError("Invalid ability id.");
        setIsSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("character_attacks")
        .update({
          name: name.trim(),
          bonus_ability: bonusAbility,
          usage_timing: usageTiming,
          restore_on: restoreOnToSave,
          damage: damage.trim(),
          type,
          charge_info: chargeInfoToSave,
          description: description.trim(),
        })
        .eq("id", parsedAbilityId)
        .eq("character_id", parsedCharacterId);

      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("character_attacks").insert({
        character_id: parsedCharacterId,
        name: name.trim(),
        bonus_ability: bonusAbility,
        usage_timing: usageTiming,
        restore_on: restoreOnToSave,
        damage: damage.trim(),
        type,
        charge_info: chargeInfoToSave,
        description: description.trim(),
      });

      error = insertError;
    }

    if (error) {
      setSaveError(error.message);
      setIsSaving(false);
      return;
    }

    router.push(`/abilities-and-items?characterId=${parsedCharacterId}`);
  };

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
            {isEditMode ? "Edit Ability" : "New Ability"}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Type
              </span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
              >
                <option value="cantrip">Cantrip</option>
                <option value="spell">Spell</option>
                <option value="action">Action</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Fire Bolt"
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Bonus
              </span>
              <select
                value={bonusAbility}
                onChange={(event) => setBonusAbility(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
              >
                <option value="none">None</option>
                <option value="str">STR</option>
                <option value="dex">DEX</option>
                <option value="con">CON</option>
                <option value="int">INT</option>
                <option value="wis">WIS</option>
                <option value="cha">CHA</option>
              </select>
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
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            {type === "action" ? (
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

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Restore On (Custom)
                  </span>
                  <input
                    type="text"
                    value={restoreOnCustom}
                    onChange={(event) => setRestoreOnCustom(event.target.value)}
                    disabled={restoreOnMode !== "another"}
                    placeholder={restoreOnMode === "another" ? "e.g. Dawn" : "Not used"}
                    className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Charge Information
                  </span>
                  <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                    <select
                      value={chargeMode}
                      onChange={(event) =>
                        setChargeMode(event.target.value === "infinite" ? "infinite" : "finite")
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
                    >
                      <option value="finite">Integer</option>
                      <option value="infinite">Infinite</option>
                    </select>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={chargeCount}
                      onChange={(event) => setChargeCount(event.target.value)}
                      disabled={chargeMode === "infinite"}
                      placeholder={chargeMode === "infinite" ? "Not used" : "Charge count"}
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </label>
              </>
            ) : null}

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
            onClick={() => router.push(`/abilities-and-items?characterId=${characterId ?? ""}`)}
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
