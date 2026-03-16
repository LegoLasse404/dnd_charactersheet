"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export const dynamic = 'force-dynamic';

function formatUsageTiming(value: string | null) {
  if (!value) return "Action";
  if (value === "bonus_action") return "Bonus Action";
  if (value === "reaction") return "Reaction";
  return "Action";
}
function formatBonusAbility(value: string) {
  return value === "none" ? "None" : value.toUpperCase();
}
function formatRestoreOn(value: string | null) {
  if (!value) return "-";
  if (value === "short_rest") return "Short Rest";
  if (value === "long_rest") return "Long Rest";
  return value;
}
const spellSlotLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function AbilitiesAndItemsReadonlyContent() {
      const [abilityCharges, setAbilityCharges] = useState<Record<number, number>>({});

      // Handler for editing ability charges
      const handleAbilityChargeChange = async (attackId: number, value: string) => {
        const curr = Number(value) || 0;
        setAbilityCharges((prev) => ({ ...prev, [attackId]: curr }));
        if (!characterId) return;
        setSaving(true);
        setSaveError("");
        const { error } = await supabase
          .from("character_attacks")
          .update({ curr_charges: curr })
          .eq("id", attackId);
        if (error) setSaveError(error.message);
        setSaving(false);
      };
    const searchParams = useSearchParams();
    const characterId = searchParams.get("characterId");
  const inventoryTextRef = useRef<HTMLTextAreaElement | null>(null);
  // ...existing code...
  // ...existing code...
  // All state declarations...
  const [character, setCharacter] = useState<any>(null);
  const [attacks, setAttacks] = useState<any[]>([]);
  const [attacksLoading, setAttacksLoading] = useState(true);
  const [attacksError, setAttacksError] = useState("");
  const [spellSlots, setSpellSlots] = useState<Record<string, string>>({"1":"0","2":"0","3":"0","4":"0","5":"0","6":"0","7":"0","8":"0","9":"0"});
  const [currentSpellSlots, setCurrentSpellSlots] = useState<Record<string, string>>({"1":"0","2":"0","3":"0","4":"0","5":"0","6":"0","7":"0","8":"0","9":"0"});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [inventoryText, setInventoryText] = useState("");
  const [race, setRace] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [eyes, setEyes] = useState("");
  const [skin, setSkin] = useState("");
  const [hair, setHair] = useState("");
  const [otherTraits, setOtherTraits] = useState("");
  const [languages, setLanguages] = useState("");
  const [feats, setFeats] = useState("");
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerError, setHeaderError] = useState("");

  useEffect(() => {
        // Load ability charges
        const loadAbilityCharges = async () => {
          if (!characterId) return;
          const { data } = await supabase
            .from("character_attacks")
            .select("id, curr_charges")
            .eq("character_id", characterId);
          if (data) {
            const chargesMap: Record<number, number> = {};
            for (const ab of data) {
              chargesMap[ab.id] = ab.curr_charges ?? 0;
            }
            setAbilityCharges(chargesMap);
          }
        };
        loadAbilityCharges();
    if (inventoryTextRef.current) {
      inventoryTextRef.current.style.height = "auto";
      inventoryTextRef.current.style.height = inventoryTextRef.current.scrollHeight + "px";
    }
  }, [inventoryText]);
    // Handler for editing inventory fields
    const handleInventoryFieldChange = async (field: string, value: string) => {
      switch (field) {
        case "inventory_text": setInventoryText(value); break;
        case "race": setRace(value); break;
        case "age": setAge(value); break;
        case "height": setHeight(value); break;
        case "weight": setWeight(value); break;
        case "eyes": setEyes(value); break;
        case "skin": setSkin(value); break;
        case "hair": setHair(value); break;
        case "other_traits": setOtherTraits(value); break;
        case "languages": setLanguages(value); break;
        case "feats": setFeats(value); break;
        default: return;
      }
      if (!characterId) return;
      setSaving(true);
      setSaveError("");
      const payload: any = {};
      payload[field] = value;
      const { error } = await supabase
        .from("character_inventory")
        .update(payload)
        .eq("character_id", characterId);
      if (error) {
        setSaveError(error.message);
      }
      setSaving(false);
    };

  // Handler for editing current spell slots
  const handleCurrentSpellSlotChange = async (level: number, value: string) => {
    setCurrentSpellSlots((prev) => ({ ...prev, [String(level)]: value }));
    if (!characterId) return;
    setSaving(true);
    setSaveError("");
    const payload: any = {};
    payload[`current_spell_slots_${level}`] = Number(value) || 0;
    const { error } = await supabase
      .from("character_stats")
      .update(payload)
      .eq("character_id", characterId);
    if (error) {
      setSaveError(error.message);
    }
    setSaving(false);
  };
  useEffect(() => {
    const loadCharacter = async () => {
      if (!characterId) {
        setHeaderError("No character id was provided.");
        setHeaderLoading(false);
        return;
      }
      setHeaderLoading(true);
      setHeaderError("");
      const { data, error } = await supabase
        .from("characters")
        .select("id, user_id, name, class, lv")
        .eq("id", characterId)
        .single();
      if (error) {
        setHeaderError(error.message);
        setCharacter(null);
      } else {
        setCharacter(data);
        setHeaderError("");
      }
      // Attacks
      setAttacksLoading(true);
      setAttacksError("");
      const { data: attacksData, error: attacksQueryError } = await supabase
        .from("character_attacks")
        .select("id, name, bonus_ability, usage_timing, restore_on, damage, type, description, charge_info")
        .eq("character_id", characterId)
        .order("id", { ascending: false });
      if (attacksQueryError) {
        setAttacksError(attacksQueryError.message);
        setAttacks([]);
      } else {
        setAttacks(attacksData ?? []);
      }
      setAttacksLoading(false);
      // Spell slots
      const { data: slotsData } = await supabase
        .from("character_stats")
        .select("spell_slots_1, spell_slots_2, spell_slots_3, spell_slots_4, spell_slots_5, spell_slots_6, spell_slots_7, spell_slots_8, spell_slots_9, current_spell_slots_1, current_spell_slots_2, current_spell_slots_3, current_spell_slots_4, current_spell_slots_5, current_spell_slots_6, current_spell_slots_7, current_spell_slots_8, current_spell_slots_9")
        .eq("character_id", characterId)
        .maybeSingle<any>();
      if (slotsData) {
        setSpellSlots({
          1: String(slotsData.spell_slots_1),
          2: String(slotsData.spell_slots_2),
          3: String(slotsData.spell_slots_3),
          4: String(slotsData.spell_slots_4),
          5: String(slotsData.spell_slots_5),
          6: String(slotsData.spell_slots_6),
          7: String(slotsData.spell_slots_7),
          8: String(slotsData.spell_slots_8),
          9: String(slotsData.spell_slots_9),
        });
        setCurrentSpellSlots({
          1: String(slotsData.current_spell_slots_1),
          2: String(slotsData.current_spell_slots_2),
          3: String(slotsData.current_spell_slots_3),
          4: String(slotsData.current_spell_slots_4),
          5: String(slotsData.current_spell_slots_5),
          6: String(slotsData.current_spell_slots_6),
          7: String(slotsData.current_spell_slots_7),
          8: String(slotsData.current_spell_slots_8),
          9: String(slotsData.current_spell_slots_9),
        });
      }
        const handleCurrentSpellSlotChange = (level: number, value: string) => {
          setCurrentSpellSlots((prev) => ({ ...prev, [String(level)]: value }));
        };

        const handleSaveCurrentSpellSlots = async () => {
          if (!characterId) return;
          setSaving(true);
          setSaveError("");
          const payload: any = {};
          for (let level = 1; level <= 9; level++) {
            payload[`current_spell_slots_${level}`] = Number(currentSpellSlots[String(level)]) || 0;
          }
          const { error } = await supabase
            .from("character_stats")
            .update(payload)
            .eq("character_id", characterId);
          if (error) {
            setSaveError(error.message);
          }
          setSaving(false);
        };
      // Inventory
      const { data: inventoryDataWithDetails } = await supabase
        .from("character_inventory")
        .select("inventory_text, race, age, height, weight, eyes, skin, hair, other_traits, languages, feats")
        .eq("character_id", characterId)
        .maybeSingle<any>();
      setInventoryText(inventoryDataWithDetails?.inventory_text ?? "");
      setRace(inventoryDataWithDetails?.race ?? "");
      setAge(inventoryDataWithDetails?.age ?? "");
      setHeight(inventoryDataWithDetails?.height ?? "");
      setWeight(inventoryDataWithDetails?.weight ?? "");
      setEyes(inventoryDataWithDetails?.eyes ?? "");
      setSkin(inventoryDataWithDetails?.skin ?? "");
      setHair(inventoryDataWithDetails?.hair ?? "");
      setOtherTraits(inventoryDataWithDetails?.other_traits ?? "");
      setLanguages(inventoryDataWithDetails?.languages ?? "");
      setFeats(inventoryDataWithDetails?.feats ?? "");
      setHeaderLoading(false);
    };
    void loadCharacter();
  }, [characterId]);

  const actions = attacks.filter((attack) => (attack.type ?? "action").toLowerCase() === "action").sort((a, b) => a.name.localeCompare(b.name));
  const cantrips = attacks.filter((attack) => (attack.type ?? "action").toLowerCase() === "cantrip").sort((a, b) => a.name.localeCompare(b.name));
  const spells = attacks.filter((attack) => (attack.type ?? "action").toLowerCase() === "spell").sort((a, b) => a.name.localeCompare(b.name));

  // State for selected spell slot per spell id
  const [selectedSpellSlots, setSelectedSpellSlots] = useState<Record<number, string>>({});

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col">
        <header className="relative flex flex-col items-center">
          <div className="w-full flex justify-start mb-2">
            <button
              type="button"
              onClick={() => window.location.href = "/"}
              className="flex items-center justify-center h-8 w-8 rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              aria-label="Back to main page"
            >
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-900">
                <path d="M12 16l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Character Sheet</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{headerLoading ? "Loading character..." : character?.name ?? "Abilities and Items"}</h1>
          <p className="mt-2 text-sm text-zinc-600">{headerLoading ? "Fetching character details." : character ? `${character.class} • Level ${character.lv}` : headerError}</p>
        </header>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Spell Slots</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200">
            <div className="grid grid-cols-[1fr_90px_90px] bg-zinc-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              <span>Spell Level</span>
              <span>Max Slots</span>
              <span>Current</span>
            </div>
            {spellSlotLevels.filter(level => {
              const value = spellSlots[String(level)];
              return value && Number(value) > 0;
            }).length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-500">No spell slots available.</div>
            ) : (
              spellSlotLevels.filter(level => {
                const value = spellSlots[String(level)];
                return value && Number(value) > 0;
              }).map((level) => (
                  <div
                  key={level}
                  className="grid grid-cols-[1fr_90px_90px] items-center gap-2 border-t border-zinc-200 bg-white px-3 py-2"
                >
                  <p className="text-sm font-medium text-zinc-800">Level {level}</p>
                  <div className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-sm font-semibold text-zinc-900">
                    {spellSlots[String(level)]}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={spellSlots[String(level)]}
                    value={currentSpellSlots[String(level)]}
                    onChange={e => handleCurrentSpellSlotChange(level, e.target.value)}
                    className="w-full rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={saving}
                  />
                </div>
              ))
            )}
            {saveError && <div className="mt-3 text-sm text-red-600">{saveError}</div>}
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Abilities</h2>

            {attacksLoading ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-6 text-sm text-zinc-500">
                Loading abilities...
              </div>
            ) : attacksError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-6 text-sm text-red-700">
                {attacksError}
              </div>
            ) : attacks.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-6 text-sm text-zinc-500">
                Add abilities to build your list.
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {[
                  { title: "Actions", data: actions },
                  { title: "Cantrips", data: cantrips },
                  { title: "Spells", data: spells },
                ].map((group) => (
                  <section key={group.title}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {group.title}
                    </h3>

                    {group.data.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
                        No {group.title.toLowerCase()} yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {group.data.map((attack) => {
                          // Only show counter if charge_info is a finite integer
                          // For spells, add dropdown and cast button
                          const availableSlots = Object.entries(currentSpellSlots)
                            .filter(([level, value]) => Number(value) > 0)
                            .map(([level, value]) => ({ level, value }));

                          const handleCastSpell = async (attackId: number, level: string) => {
                            if (!level || Number(currentSpellSlots[level]) <= 0) return;
                            const newValue = String(Number(currentSpellSlots[level]) - 1);
                            setCurrentSpellSlots((prev) => ({ ...prev, [level]: newValue }));
                            if (!characterId) return;
                            setSaving(true);
                            setSaveError("");
                            const payload: any = {};
                            payload[`current_spell_slots_${level}`] = Number(newValue);
                            const { error } = await supabase
                              .from("character_stats")
                              .update(payload)
                              .eq("character_id", characterId);
                            if (error) setSaveError(error.message);
                            setSaving(false);
                            // Optionally reset the dropdown after casting
                            setSelectedSpellSlots((prev) => ({ ...prev, [attackId]: "" }));
                          };

                          // Make the whole article clickable
                          const handleAbilityClick = () => {
                            window.location.href = `/ability-details?abilityId=${attack.id}`;
                          };

                          return (
                            <article
                              key={attack.id}
                              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-base cursor-pointer hover:bg-blue-50 transition"
                              onClick={handleAbilityClick}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="truncate font-semibold text-zinc-900 text-lg">
                                    {attack.name}
                                  </h4>
                                  <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                    {(attack.type ?? "action").toUpperCase()}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-zinc-600">
                                  Bonus: {formatBonusAbility(attack.bonus_ability)} | Damage: {attack.damage} |
                                  Use: {formatUsageTiming(attack.usage_timing)} | Restore: {formatRestoreOn(attack.restore_on)}
                                </p>
                              </div>
                              {group.title === "Actions" && attack.charge_info && attack.charge_info !== "infinite" && (
                                <div className="flex items-center gap-1 ml-4" onClick={e => e.stopPropagation()}>
                                  <span className="text-sm text-zinc-700">Charges:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={abilityCharges[attack.id] ?? ""}
                                    onChange={e => handleAbilityChargeChange(attack.id, e.target.value)}
                                    className="w-10 rounded border border-blue-300 bg-blue-50 px-1 py-1 text-base font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    disabled={saving}
                                  />
                                  <span className="text-sm text-zinc-700">/ {attack.charge_info}</span>
                                </div>
                              )}
                              {group.title === "Spells" && availableSlots.length > 0 && (
                                <div className="flex items-center gap-2 ml-4" onClick={e => e.stopPropagation()}>
                                  <label className="text-sm text-zinc-700 mr-1">Use:</label>
                                  <select
                                    className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-base font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={selectedSpellSlots[attack.id] ?? ""}
                                    onChange={e => setSelectedSpellSlots(prev => ({ ...prev, [attack.id]: e.target.value }))}
                                    disabled={saving}
                                  >
                                    <option value="">Select</option>
                                    {availableSlots.map(({ level, value }) => (
                                      <option key={level} value={level}>
                                        Level {level} ({value})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="rounded bg-blue-600 px-3 py-1 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                                    disabled={
                                      !selectedSpellSlots[attack.id] ||
                                      Number(currentSpellSlots[selectedSpellSlots[attack.id]]) <= 0 ||
                                      saving
                                    }
                                    onClick={() => handleCastSpell(attack.id, selectedSpellSlots[attack.id])}
                                  >
                                    Cast
                                  </button>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </section>

          <section className="relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Inventory</h2>
            <div className="mt-4 w-full min-h-[120px] rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 whitespace-pre-line">
              <textarea
                ref={inventoryTextRef}
                className="w-full min-h-[120px] rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={inventoryText}
                onChange={e => handleInventoryFieldChange("inventory_text", e.target.value)}
                placeholder="List your inventory here..."
                disabled={saving}
                style={{overflow: 'hidden'}}
              />
            </div>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">Race</label>
                <input
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={race}
                  onChange={e => handleInventoryFieldChange("race", e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Age</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={age}
                    onChange={e => handleInventoryFieldChange("age", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Height</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={height}
                    onChange={e => handleInventoryFieldChange("height", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Weight</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={weight}
                    onChange={e => handleInventoryFieldChange("weight", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Eyes</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={eyes}
                    onChange={e => handleInventoryFieldChange("eyes", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Skin</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={skin}
                    onChange={e => handleInventoryFieldChange("skin", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Hair</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={hair}
                    onChange={e => handleInventoryFieldChange("hair", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
            {/* Navigation Button - bottom left of screen */}
            <button
              type="button"
              className="fixed bottom-6 left-6 z-50 flex items-center justify-center h-12 w-12 rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow"
              aria-label="Go to use character page"
              onClick={() => {
                if (characterId) {
                  window.location.href = `/use-character?characterId=${characterId}`;
                }
              }}
            >
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-zinc-900">
                <path d="M12 16l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="absolute bottom-4 right-4 flex gap-3">
              <button
                type="button"
                className="rounded bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                disabled={saving}
                onClick={async () => {
                  // Long Rest: restore spell slots, current hitpoints, and ability charges with restore_on 'long_rest' or 'short_rest'
                  if (!characterId) return;
                  setSaving(true);
                  setSaveError("");
                  // Restore spell slots
                  const spellPayload: any = {};
                  for (let level = 1; level <= 9; level++) {
                    spellPayload[`current_spell_slots_${level}`] = Number(spellSlots[level]) || 0;
                  }
                  // Restore current hitpoints to max_hp
                  const { data: statsData, error: statsError } = await supabase
                    .from("character_stats")
                    .select("hp_max")
                    .eq("character_id", characterId)
                    .maybeSingle();
                  if (statsError) {
                    setSaveError(statsError.message);
                  }
                  if (statsData && typeof statsData.hp_max !== "undefined") {
                    spellPayload["curr_hp"] = statsData.hp_max;
                  }
                  await supabase
                    .from("character_stats")
                    .update(spellPayload)
                    .eq("character_id", characterId);
                  setCurrentSpellSlots({ ...spellSlots });
                  // Restore ability charges for long/short rest only
                  const { data: attacksData } = await supabase
                    .from("character_attacks")
                    .select("id, charge_info, restore_on")
                    .eq("character_id", characterId);
                  if (attacksData) {
                    for (const attack of attacksData) {
                      if (
                        attack.charge_info &&
                        attack.charge_info !== "infinite" &&
                        !isNaN(Number(attack.charge_info)) &&
                        (attack.restore_on === "long_rest" || attack.restore_on === "short_rest")
                      ) {
                        await supabase
                          .from("character_attacks")
                          .update({ curr_charges: Number(attack.charge_info) })
                          .eq("id", attack.id);
                        setAbilityCharges((prev) => ({ ...prev, [attack.id]: Number(attack.charge_info) }));
                      }
                    }
                  }
                  setSaving(false);
                }}
              >
                Long Rest
              </button>
              <button
                type="button"
                className="rounded bg-yellow-500 px-4 py-2 text-white font-semibold hover:bg-yellow-600 disabled:opacity-60"
                disabled={saving}
                onClick={async () => {
                  // Short Rest: restore only abilities that restore on short rest
                  if (!characterId) return;
                  setSaving(true);
                  setSaveError("");
                  const { data: attacksData } = await supabase
                    .from("character_attacks")
                    .select("id, charge_info, restore_on")
                    .eq("character_id", characterId);
                  if (attacksData) {
                    for (const attack of attacksData) {
                      if (
                        attack.charge_info &&
                        attack.charge_info !== "infinite" &&
                        !isNaN(Number(attack.charge_info)) &&
                        attack.restore_on === "short_rest"
                      ) {
                        await supabase
                          .from("character_attacks")
                          .update({ curr_charges: Number(attack.charge_info) })
                          .eq("id", attack.id);
                        setAbilityCharges((prev) => ({ ...prev, [attack.id]: Number(attack.charge_info) }));
                      }
                    }
                  }
                  setSaving(false);
                }}
              >
                Short Rest
              </button>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-700">Other Traits</label>
              <textarea
                className="w-full min-h-[48px] rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 whitespace-pre-line focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={otherTraits}
                onChange={e => handleInventoryFieldChange("other_traits", e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-700">Languages</label>
              <textarea
                className="w-full min-h-[48px] rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 whitespace-pre-line focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={languages}
                onChange={e => handleInventoryFieldChange("languages", e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-700">Feats</label>
              <textarea
                className="w-full min-h-[48px] rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 whitespace-pre-line focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={feats}
                onChange={e => handleInventoryFieldChange("feats", e.target.value)}
                disabled={saving}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function AbilitiesAndItemsReadonlyPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <AbilitiesAndItemsReadonlyContent />
    </Suspense>
  );
}
