"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  getCharacter,
  getCharacterActions,
  getCharacterSpells,
  getCharacterCantrips,
  getCharacterStats,
  getCharacterInventory,
  updateCharacterCurrentStats,
  updateAbilityCharges,
  patchCharacterInventory,
} from "@/lib/actions";

export const dynamic = 'force-dynamic';

type AbilityType = "action" | "spell" | "cantrip";

type CharacterAction = {
  id: number;
  name: string;
  description: string;
  damage: string | null;
  scaling: string | null;
  usage_timing: string;
  charges: number | null;
  curr_charges: number | null;
  restore_on: string | null;
};

type CharacterSpell = {
  id: number;
  name: string;
  description: string;
  damage: string | null;
  scaling: string | null;
  usage_timing: string;
  spell_level: number;
};

type CharacterCantrip = {
  id: number;
  name: string;
  description: string;
  damage: string | null;
  scaling: string | null;
  usage_timing: string;
};

function formatUsageTiming(value: string | null) {
  if (!value) return "Action";
  if (value === "bonus_action") return "Bonus Action";
  if (value === "reaction") return "Reaction";
  return "Action";
}

function formatRestoreOn(value: string | null) {
  if (!value) return null;
  if (value === "short_rest") return "Short Rest";
  if (value === "long_rest") return "Long Rest";
  return value;
}

function formatAbilityMeta(item: CharacterAction | CharacterSpell | CharacterCantrip, type: AbilityType): string {
  const parts: string[] = [];
  parts.push(`Use: ${formatUsageTiming(item.usage_timing)}`);
  if (type === "spell") parts.push(`Level ${(item as CharacterSpell).spell_level}`);
  if (item.damage) parts.push(`Dmg: ${item.damage}`);
  if (item.scaling) parts.push(item.scaling);
  if (type === "action") {
    const action = item as CharacterAction;
    const restore = formatRestoreOn(action.restore_on);
    if (restore) parts.push(`Restore: ${restore}`);
  }
  return parts.join(" | ");
}

const spellSlotLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function AbilitiesAndItemsReadonlyContent() {
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");
  const inventoryTextRef = useRef<HTMLTextAreaElement | null>(null);

  const [character, setCharacter] = useState<any>(null);
  const [actions, setActions] = useState<CharacterAction[]>([]);
  const [spells, setSpells] = useState<CharacterSpell[]>([]);
  const [cantrips, setCantrips] = useState<CharacterCantrip[]>([]);
  const [abilitiesLoading, setAbilitiesLoading] = useState(true);
  const [abilitiesError, setAbilitiesError] = useState("");
  const [actionCharges, setActionCharges] = useState<Record<number, number>>({});
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
  const [selectedSpellSlots, setSelectedSpellSlots] = useState<Record<number, string>>({});
  const [statsData, setStatsData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (inventoryTextRef.current) {
      inventoryTextRef.current.style.height = "auto";
      inventoryTextRef.current.style.height = inventoryTextRef.current.scrollHeight + "px";
    }
  }, [inventoryText]);

  useEffect(() => {
    const loadCharacter = async () => {
      if (!characterId) {
        setHeaderError("No character id was provided.");
        setHeaderLoading(false);
        return;
      }
      setHeaderLoading(true);
      setHeaderError("");

      const parsedId = Number.parseInt(characterId, 10);

      try {
        const charData = await getCharacter(parsedId);
        if (!charData) {
          setHeaderError("Character not found.");
          setHeaderLoading(false);
          return;
        }
        setCharacter(charData);
      } catch (err: any) {
        setHeaderError(err.message ?? "Failed to load character.");
        setHeaderLoading(false);
        return;
      }

      // Load abilities in parallel
      setAbilitiesLoading(true);
      setAbilitiesError("");

      try {
        const [loadedActions, loadedSpells, loadedCantrips] = await Promise.all([
          getCharacterActions(parsedId),
          getCharacterSpells(parsedId),
          getCharacterCantrips(parsedId),
        ]);

        const typedActions = loadedActions as CharacterAction[];
        setActions(typedActions);
        setSpells(loadedSpells as CharacterSpell[]);
        setCantrips(loadedCantrips as CharacterCantrip[]);

        const chargesMap: Record<number, number> = {};
        for (const action of typedActions) {
          if (action.charges != null) {
            chargesMap[action.id] = action.curr_charges ?? action.charges;
          }
        }
        setActionCharges(chargesMap);
      } catch (err: any) {
        setAbilitiesError(err.message ?? "Failed to load abilities.");
      }
      setAbilitiesLoading(false);

      // Spell slots
      try {
        const slotsData = await getCharacterStats(parsedId) as Record<string, unknown> | null;
        setStatsData(slotsData);
        if (slotsData) {
          setSpellSlots({
            1: String(slotsData.spell_slots_1 ?? 0),
            2: String(slotsData.spell_slots_2 ?? 0),
            3: String(slotsData.spell_slots_3 ?? 0),
            4: String(slotsData.spell_slots_4 ?? 0),
            5: String(slotsData.spell_slots_5 ?? 0),
            6: String(slotsData.spell_slots_6 ?? 0),
            7: String(slotsData.spell_slots_7 ?? 0),
            8: String(slotsData.spell_slots_8 ?? 0),
            9: String(slotsData.spell_slots_9 ?? 0),
          });
          setCurrentSpellSlots({
            1: String(slotsData.current_spell_slots_1 ?? 0),
            2: String(slotsData.current_spell_slots_2 ?? 0),
            3: String(slotsData.current_spell_slots_3 ?? 0),
            4: String(slotsData.current_spell_slots_4 ?? 0),
            5: String(slotsData.current_spell_slots_5 ?? 0),
            6: String(slotsData.current_spell_slots_6 ?? 0),
            7: String(slotsData.current_spell_slots_7 ?? 0),
            8: String(slotsData.current_spell_slots_8 ?? 0),
            9: String(slotsData.current_spell_slots_9 ?? 0),
          });
        }
      } catch {
        // spell slots are optional, ignore errors
      }

      // Inventory
      try {
        const inventoryData = await getCharacterInventory(parsedId) as Record<string, unknown> | null;
        if (inventoryData) {
          setInventoryText(String(inventoryData.inventory_text ?? ""));
          setRace(String(inventoryData.race ?? ""));
          setAge(String(inventoryData.age ?? ""));
          setHeight(String(inventoryData.height ?? ""));
          setWeight(String(inventoryData.weight ?? ""));
          setEyes(String(inventoryData.eyes ?? ""));
          setSkin(String(inventoryData.skin ?? ""));
          setHair(String(inventoryData.hair ?? ""));
          setOtherTraits(String(inventoryData.other_traits ?? ""));
          setLanguages(String(inventoryData.languages ?? ""));
          setFeats(String(inventoryData.feats ?? ""));
        }
      } catch {
        // inventory is optional, ignore errors
      }

      setHeaderLoading(false);
    };

    void loadCharacter();
  }, [characterId]);

  const handleActionChargeChange = async (actionId: number, value: string) => {
    const curr = Number(value) || 0;
    setActionCharges((prev) => ({ ...prev, [actionId]: curr }));
    if (!characterId) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateAbilityCharges("character_actions", actionId, curr);
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save.");
    }
    setSaving(false);
  };

  const handleCurrentSpellSlotChange = async (level: number, value: string) => {
    setCurrentSpellSlots((prev) => ({ ...prev, [String(level)]: value }));
    if (!characterId) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateCharacterCurrentStats(Number.parseInt(characterId, 10), {
        [`current_spell_slots_${level}`]: Number(value) || 0,
      });
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save.");
    }
    setSaving(false);
  };

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
    try {
      await patchCharacterInventory(Number.parseInt(characterId, 10), field, value);
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save.");
    }
    setSaving(false);
  };

  const handleCastSpell = async (spellId: number, level: string) => {
    if (!level || Number(currentSpellSlots[level]) <= 0) return;
    const newValue = String(Number(currentSpellSlots[level]) - 1);
    setCurrentSpellSlots((prev) => ({ ...prev, [level]: newValue }));
    if (!characterId) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateCharacterCurrentStats(Number.parseInt(characterId, 10), {
        [`current_spell_slots_${level}`]: Number(newValue),
      });
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save.");
    }
    setSaving(false);
    setSelectedSpellSlots((prev) => ({ ...prev, [spellId]: "" }));
  };

  const handleLongRest = async () => {
    if (!characterId) return;
    setSaving(true);
    setSaveError("");
    const parsedId = Number.parseInt(characterId, 10);

    try {
      const spellPayload: Record<string, number> = {};
      for (let level = 1; level <= 9; level++) {
        spellPayload[`current_spell_slots_${level}`] = Number(spellSlots[level]) || 0;
      }

      // Restore HP to max if we have stats data
      const currentStats = statsData as Record<string, unknown> | null;
      if (currentStats?.hp_max != null) {
        spellPayload["curr_hp"] = Number(currentStats.hp_max);
      }

      await updateCharacterCurrentStats(parsedId, spellPayload);
      setCurrentSpellSlots({ ...spellSlots });

      // Restore charges for actions that restore on long or short rest
      for (const action of actions) {
        if (
          action.charges != null &&
          (action.restore_on === "long_rest" || action.restore_on === "short_rest")
        ) {
          await updateAbilityCharges("character_actions", action.id, action.charges);
          setActionCharges((prev) => ({ ...prev, [action.id]: action.charges! }));
        }
      }
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save.");
    }
    setSaving(false);
  };

  const handleShortRest = async () => {
    if (!characterId) return;
    setSaving(true);
    setSaveError("");

    try {
      for (const action of actions) {
        if (action.charges != null && action.restore_on === "short_rest") {
          await updateAbilityCharges("character_actions", action.id, action.charges);
          setActionCharges((prev) => ({ ...prev, [action.id]: action.charges! }));
        }
      }
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save.");
    }
    setSaving(false);
  };

  const totalAbilities = actions.length + spells.length + cantrips.length;

  const spellsByLevel = spells.reduce<Record<number, CharacterSpell[]>>((acc, s) => {
    if (!acc[s.spell_level]) acc[s.spell_level] = [];
    acc[s.spell_level].push(s);
    return acc;
  }, {});
  const spellLevelsPresent = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b);

  const groups: { title: string; type: AbilityType; items: (CharacterAction | CharacterSpell | CharacterCantrip)[] }[] = [
    { title: "Actions", type: "action", items: actions },
    { title: "Cantrips", type: "cantrip", items: cantrips },
  ];

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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {headerLoading ? "Loading character..." : character?.name ?? "Abilities and Items"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {headerLoading ? "Fetching character details." : character ? `${character.class} • Level ${character.lv}` : headerError}
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Spell Slots</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200">
            <div className="grid grid-cols-[1fr_90px_90px] bg-zinc-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              <span>Spell Level</span>
              <span>Max Slots</span>
              <span>Current</span>
            </div>
            {spellSlotLevels.filter((level) => Number(spellSlots[String(level)]) > 0).length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-500">No spell slots available.</div>
            ) : (
              spellSlotLevels
                .filter((level) => Number(spellSlots[String(level)]) > 0)
                .map((level) => (
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
                      onChange={(e) => handleCurrentSpellSlotChange(level, e.target.value)}
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

            {abilitiesLoading ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-6 text-sm text-zinc-500">
                Loading abilities...
              </div>
            ) : abilitiesError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-6 text-sm text-red-700">
                {abilitiesError}
              </div>
            ) : totalAbilities === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-6 text-sm text-zinc-500">
                No abilities added yet.
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {groups.map((group) => (
                  <section key={group.title}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {group.title}
                    </h3>
                    {group.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
                        No {group.title.toLowerCase()} yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <article
                            key={item.id}
                            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-base cursor-pointer hover:bg-blue-50 transition"
                            onClick={() => {
                              window.location.href = `/use/ability-details?abilityId=${item.id}&type=${group.type}`;
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate font-semibold text-zinc-900 text-lg">{item.name}</h4>
                              <p className="mt-1 text-sm text-zinc-600">
                                {formatAbilityMeta(item, group.type)}
                              </p>
                            </div>

                            {group.type === "action" && (item as CharacterAction).charges != null && (
                              <div
                                className="flex items-center gap-1 ml-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-sm text-zinc-700">Charges:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={(item as CharacterAction).charges!}
                                  value={actionCharges[item.id] ?? ""}
                                  onChange={(e) => handleActionChargeChange(item.id, e.target.value)}
                                  className="w-10 rounded border border-blue-300 bg-blue-50 px-1 py-1 text-base font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  disabled={saving}
                                />
                                <span className="text-sm text-zinc-700">/ {(item as CharacterAction).charges}</span>
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                ))}

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Spells</h3>
                  {spells.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
                      No spells yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {spellLevelsPresent.map((level) => {
                        const slotsForLevel = Object.entries(currentSpellSlots)
                          .filter(([slotLevel, value]) => Number(slotLevel) >= level && Number(value) > 0)
                          .map(([slotLevel, value]) => ({ level: slotLevel, value }));
                        return (
                          <div key={level}>
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Level {level}</p>
                            <div className="space-y-2">
                              {spellsByLevel[level].map((item) => (
                                <article
                                  key={item.id}
                                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-base cursor-pointer hover:bg-blue-50 transition"
                                  onClick={() => {
                                    window.location.href = `/use/ability-details?abilityId=${item.id}&type=spell`;
                                  }}
                                >
                                  <div className="min-w-0 flex-1">
                                    <h4 className="truncate font-semibold text-zinc-900 text-lg">{item.name}</h4>
                                    <p className="mt-1 text-sm text-zinc-600">{formatAbilityMeta(item, "spell")}</p>
                                  </div>

                                  {slotsForLevel.length > 0 && (
                                    <div
                                      className="flex items-center gap-2 ml-4"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <label className="text-sm text-zinc-700 mr-1">Use:</label>
                                      <select
                                        className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-base font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        value={selectedSpellSlots[item.id] ?? ""}
                                        onChange={(e) =>
                                          setSelectedSpellSlots((prev) => ({ ...prev, [item.id]: e.target.value }))
                                        }
                                        disabled={saving}
                                      >
                                        <option value="">Select</option>
                                        {slotsForLevel.map(({ level: slotLevel, value }) => (
                                          <option key={slotLevel} value={slotLevel}>
                                            Level {slotLevel} ({value})
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        className="rounded bg-blue-600 px-3 py-1 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                                        disabled={
                                          !selectedSpellSlots[item.id] ||
                                          Number(currentSpellSlots[selectedSpellSlots[item.id]]) <= 0 ||
                                          saving
                                        }
                                        onClick={() => handleCastSpell(item.id, selectedSpellSlots[item.id])}
                                      >
                                        Cast
                                      </button>
                                    </div>
                                  )}
                                </article>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}
          </section>

          <section className="relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Inventory</h2>
            <textarea
              ref={inventoryTextRef}
              className="mt-4 w-full min-h-[120px] rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={inventoryText}
              onChange={(e) => handleInventoryFieldChange("inventory_text", e.target.value)}
              placeholder="List your inventory here..."
              disabled={saving}
              style={{ overflow: "hidden" }}
            />

            <h2 className="mt-6 text-lg font-semibold tracking-tight text-zinc-900">Character Details</h2>

            <div className="mt-3 grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">Race</label>
                <input
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={race}
                  onChange={(e) => handleInventoryFieldChange("race", e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Age</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={age}
                    onChange={(e) => handleInventoryFieldChange("age", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Height</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={height}
                    onChange={(e) => handleInventoryFieldChange("height", e.target.value)}
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
                    onChange={(e) => handleInventoryFieldChange("weight", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Eyes</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={eyes}
                    onChange={(e) => handleInventoryFieldChange("eyes", e.target.value)}
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
                    onChange={(e) => handleInventoryFieldChange("skin", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Hair</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={hair}
                    onChange={(e) => handleInventoryFieldChange("hair", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-700">Other Traits</label>
              <textarea
                className="w-full min-h-[48px] rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 whitespace-pre-line focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={otherTraits}
                onChange={(e) => handleInventoryFieldChange("other_traits", e.target.value)}
                disabled={saving}
                style={{ overflow: "hidden" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = t.scrollHeight + "px";
                }}
              />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-700">Languages</label>
              <textarea
                className="w-full min-h-[48px] rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 whitespace-pre-line focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={languages}
                onChange={(e) => handleInventoryFieldChange("languages", e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-700">Feats</label>
              <textarea
                className="w-full min-h-[48px] rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 whitespace-pre-line focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={feats}
                onChange={(e) => handleInventoryFieldChange("feats", e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="absolute bottom-4 right-4 flex gap-3">
              <button
                type="button"
                className="rounded bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                disabled={saving}
                onClick={handleLongRest}
              >
                Long Rest
              </button>
              <button
                type="button"
                className="rounded bg-yellow-500 px-4 py-2 text-white font-semibold hover:bg-yellow-600 disabled:opacity-60"
                disabled={saving}
                onClick={handleShortRest}
              >
                Short Rest
              </button>
            </div>
          </section>
        </div>

        {/* Navigation button */}
        <button
          type="button"
          className="fixed bottom-6 left-6 z-50 flex items-center justify-center h-12 w-12 rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow"
          aria-label="Go to use character page"
          onClick={() => {
            if (characterId) {
              window.location.href = `/use/stat-sheet?characterId=${characterId}`;
            }
          }}
        >
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-zinc-900">
            <path d="M12 16l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
