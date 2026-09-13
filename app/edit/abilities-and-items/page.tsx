"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  getCharacter, getCharacterStats, getCharacterActions, getCharacterSpells, getCharacterCantrips,
  getCharacterInventory, upsertCharacterStats, upsertCharacterInventory,
  deleteCharacterAction, deleteCharacterSpell, deleteCharacterCantrip,
} from "@/lib/actions";

export const dynamic = 'force-dynamic';

type CharacterHeader = { id: number; user_id: string; name: string; class: string; lv: number };
type CharacterAction = { id: number; name: string; description: string; damage: string | null; scaling: string | null; usage_timing: string; charges: number | null; curr_charges: number | null; restore_on: string | null };
type CharacterSpell = { id: number; name: string; description: string; damage: string | null; scaling: string | null; usage_timing: string; spell_level: number };
type CharacterCantrip = { id: number; name: string; description: string; damage: string | null; scaling: string | null; usage_timing: string };
type AnyAbility = CharacterAction | CharacterSpell | CharacterCantrip;
type AbilityType = "action" | "spell" | "cantrip";

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
function formatAbilityMeta(item: AnyAbility, type: AbilityType): string {
  const parts: string[] = [];
  parts.push(`Use: ${formatUsageTiming(item.usage_timing)}`);
  if (type === "spell") parts.push(`Level ${(item as CharacterSpell).spell_level}`);
  if (item.damage) parts.push(`Dmg: ${item.damage}`);
  if (item.scaling) parts.push(item.scaling);
  if (type === "action") {
    const action = item as CharacterAction;
    if (action.charges != null) parts.push(`Charges: ${action.curr_charges ?? action.charges}/${action.charges}`);
    if (action.restore_on) parts.push(`Restore: ${formatRestoreOn(action.restore_on)}`);
  }
  return parts.join(" | ");
}

const spellSlotLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
function createDefaultSpellSlotsState() {
  return spellSlotLevels.reduce<Record<number, string>>((acc, level) => { acc[level] = "0"; return acc; }, {} as Record<number, string>);
}

function AbilitiesAndItemsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");
  const { data: session } = authClient.useSession();

  const [character, setCharacter] = useState<CharacterHeader | null>(null);
  const [actions, setActions] = useState<CharacterAction[]>([]);
  const [spells, setSpells] = useState<CharacterSpell[]>([]);
  const [cantrips, setCantrips] = useState<CharacterCantrip[]>([]);
  const [abilitiesLoading, setAbilitiesLoading] = useState(true);
  const [abilitiesError, setAbilitiesError] = useState("");
  const [deletingAbility, setDeletingAbility] = useState<{ table: string; id: number } | null>(null);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerError, setHeaderError] = useState("");
  const [spellSlots, setSpellSlots] = useState<Record<number, string>>(createDefaultSpellSlotsState);
  const [currSpellSlots, setCurrSpellSlots] = useState<Record<number, string>>(createDefaultSpellSlotsState);
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
  const [isSavingSheet, setIsSavingSheet] = useState(false);
  const [saveSheetError, setSaveSheetError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!characterId || !session?.user) {
        setHeaderError("No character id or not signed in.");
        setHeaderLoading(false);
        return;
      }
      setHeaderLoading(true);
      setHeaderError("");
      const parsedId = Number.parseInt(characterId, 10);
      if (Number.isNaN(parsedId)) { setHeaderError("Invalid character id."); setHeaderLoading(false); return; }

      try {
        const data = await getCharacter(parsedId);
        if (!data) { setHeaderError("Character not found."); setHeaderLoading(false); return; }
        setCharacter(data);

        setAbilitiesLoading(true);
        setAbilitiesError("");
        const [actionsData, spellsData, cantripsData] = await Promise.all([
          getCharacterActions(parsedId),
          getCharacterSpells(parsedId),
          getCharacterCantrips(parsedId),
        ]);
        setActions(actionsData as CharacterAction[]);
        setSpells(spellsData as CharacterSpell[]);
        setCantrips(cantripsData as CharacterCantrip[]);
        setAbilitiesLoading(false);

        const statsData = await getCharacterStats(parsedId) as Record<string, unknown> | null;
        if (statsData) {
          setSpellSlots({ 1: String(statsData.spell_slots_1 ?? 0), 2: String(statsData.spell_slots_2 ?? 0), 3: String(statsData.spell_slots_3 ?? 0), 4: String(statsData.spell_slots_4 ?? 0), 5: String(statsData.spell_slots_5 ?? 0), 6: String(statsData.spell_slots_6 ?? 0), 7: String(statsData.spell_slots_7 ?? 0), 8: String(statsData.spell_slots_8 ?? 0), 9: String(statsData.spell_slots_9 ?? 0) });
          setCurrSpellSlots({ 1: String(statsData.current_spell_slots_1 ?? 0), 2: String(statsData.current_spell_slots_2 ?? 0), 3: String(statsData.current_spell_slots_3 ?? 0), 4: String(statsData.current_spell_slots_4 ?? 0), 5: String(statsData.current_spell_slots_5 ?? 0), 6: String(statsData.current_spell_slots_6 ?? 0), 7: String(statsData.current_spell_slots_7 ?? 0), 8: String(statsData.current_spell_slots_8 ?? 0), 9: String(statsData.current_spell_slots_9 ?? 0) });
        }

        const invData = await getCharacterInventory(parsedId) as Record<string, unknown> | null;
        if (invData) {
          setInventoryText(String(invData.inventory_text ?? ""));
          setRace(String(invData.race ?? ""));
          setAge(String(invData.age ?? ""));
          setHeight(String(invData.height ?? ""));
          setWeight(String(invData.weight ?? ""));
          setEyes(String(invData.eyes ?? ""));
          setSkin(String(invData.skin ?? ""));
          setHair(String(invData.hair ?? ""));
          setOtherTraits(String(invData.other_traits ?? ""));
          setLanguages(String(invData.languages ?? ""));
          setFeats(String(invData.feats ?? ""));
        }
      } catch (err: any) {
        setHeaderError(err.message ?? "Failed to load.");
      }
      setHeaderLoading(false);
    };
    void load();
  }, [characterId, session]);

  const handleDeleteAbility = async (table: string, abilityId: number) => {
    setDeletingAbility({ table, id: abilityId });
    setAbilitiesError("");
    try {
      if (table === "character_actions") await deleteCharacterAction(abilityId);
      else if (table === "character_spells") await deleteCharacterSpell(abilityId);
      else await deleteCharacterCantrip(abilityId);

      if (table === "character_actions") setActions((prev) => prev.filter((a) => a.id !== abilityId));
      else if (table === "character_spells") setSpells((prev) => prev.filter((s) => s.id !== abilityId));
      else setCantrips((prev) => prev.filter((c) => c.id !== abilityId));
    } catch (err: any) {
      setAbilitiesError(err.message ?? "Failed to delete.");
    }
    setDeletingAbility(null);
  };

  const handleMaxSpellSlotChange = (level: number, newValue: string) => {
    const oldMax = Number.parseInt(spellSlots[level], 10) || 0;
    const newMax = Number.parseInt(newValue, 10) || 0;
    const delta = newMax - oldMax;
    setSpellSlots((current) => ({ ...current, [level]: newValue }));
    setCurrSpellSlots((current) => {
      const curr = Number.parseInt(current[level], 10) || 0;
      return { ...current, [level]: String(Math.max(0, curr + delta)) };
    });
  };

  const handleSaveAndExit = async () => {
    if (!characterId) { setSaveSheetError("Missing character id."); return; }
    const parsedId = Number.parseInt(characterId, 10);
    if (Number.isNaN(parsedId)) { setSaveSheetError("Invalid character id."); return; }

    setIsSavingSheet(true);
    setSaveSheetError("");

    try {
      await upsertCharacterStats(parsedId, {
        spell_slots_1: Number.parseInt(spellSlots[1], 10) || 0,
        spell_slots_2: Number.parseInt(spellSlots[2], 10) || 0,
        spell_slots_3: Number.parseInt(spellSlots[3], 10) || 0,
        spell_slots_4: Number.parseInt(spellSlots[4], 10) || 0,
        spell_slots_5: Number.parseInt(spellSlots[5], 10) || 0,
        spell_slots_6: Number.parseInt(spellSlots[6], 10) || 0,
        spell_slots_7: Number.parseInt(spellSlots[7], 10) || 0,
        spell_slots_8: Number.parseInt(spellSlots[8], 10) || 0,
        spell_slots_9: Number.parseInt(spellSlots[9], 10) || 0,
        current_spell_slots_1: Number.parseInt(currSpellSlots[1], 10) || 0,
        current_spell_slots_2: Number.parseInt(currSpellSlots[2], 10) || 0,
        current_spell_slots_3: Number.parseInt(currSpellSlots[3], 10) || 0,
        current_spell_slots_4: Number.parseInt(currSpellSlots[4], 10) || 0,
        current_spell_slots_5: Number.parseInt(currSpellSlots[5], 10) || 0,
        current_spell_slots_6: Number.parseInt(currSpellSlots[6], 10) || 0,
        current_spell_slots_7: Number.parseInt(currSpellSlots[7], 10) || 0,
        current_spell_slots_8: Number.parseInt(currSpellSlots[8], 10) || 0,
        current_spell_slots_9: Number.parseInt(currSpellSlots[9], 10) || 0,
      });

      await upsertCharacterInventory(parsedId, { inventory_text: inventoryText, race, age, height, weight, eyes, skin, hair, other_traits: otherTraits, languages, feats });

      router.push("/");
    } catch (err: any) {
      setSaveSheetError(err.message ?? "Failed to save.");
      setIsSavingSheet(false);
    }
  };

  const totalAbilities = actions.length + spells.length + cantrips.length;
  const spellsByLevel = spells.reduce<Record<number, CharacterSpell[]>>((acc, s) => {
    if (!acc[s.spell_level]) acc[s.spell_level] = [];
    acc[s.spell_level].push(s);
    return acc;
  }, {});
  const spellLevelsPresent = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b);
  const groups: { title: string; type: AbilityType; table: string; items: AnyAbility[] }[] = [
    { title: "Actions", type: "action", table: "character_actions", items: actions },
    { title: "Cantrips", type: "cantrip", table: "character_cantrips", items: cantrips },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col">
        <header>
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
            <div className="grid grid-cols-[1fr_90px] bg-zinc-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              <span>Spell Level</span><span>Slots</span>
            </div>
            {spellSlotLevels.map((level) => (
              <div key={level} className="grid grid-cols-[1fr_90px] items-center gap-2 border-t border-zinc-200 bg-white px-3 py-2">
                <p className="text-sm font-medium text-zinc-800">Level {level}</p>
                <input type="number" min="0" value={spellSlots[level] ?? "0"}
                  onChange={(e) => handleMaxSpellSlotChange(level, e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-sm font-semibold text-zinc-900 outline-none ring-zinc-900 focus:ring-2" />
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Abilities</h2>
            {abilitiesLoading ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-6 text-sm text-zinc-500">Loading abilities...</div>
            ) : abilitiesError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-6 text-sm text-red-700">{abilitiesError}</div>
            ) : totalAbilities === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-6 text-sm text-zinc-500">Add abilities to build your list.</div>
            ) : (
              <div className="mt-3 space-y-4">
                {groups.map((group) => (
                  <section key={group.title}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{group.title}</h3>
                    {group.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">No {group.title.toLowerCase()} yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <article key={item.id} className="grid grid-cols-[minmax(0,1fr)_72px] gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-semibold text-zinc-900">{item.name}</h4>
                              <p className="mt-1 text-xs text-zinc-600">{formatAbilityMeta(item, group.type)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <button type="button" onClick={() => router.push(`/edit/add-ability?characterId=${characterId ?? ""}&type=${group.type}&abilityId=${item.id}`)}
                                className="w-16 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-center text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100">Edit</button>
                              <button type="button" onClick={() => handleDeleteAbility(group.table, item.id)}
                                disabled={deletingAbility?.table === group.table && deletingAbility?.id === item.id}
                                className="w-16 rounded-md border border-red-300 bg-white px-2.5 py-1 text-center text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                                {deletingAbility?.table === group.table && deletingAbility?.id === item.id ? "..." : "Delete"}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                ))}

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Spells</h3>
                  {spells.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">No spells yet.</div>
                  ) : (
                    <div className="space-y-4">
                      {spellLevelsPresent.map((level) => (
                        <div key={level}>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Level {level}</p>
                          <div className="space-y-2">
                            {spellsByLevel[level].map((item) => (
                              <article key={item.id} className="grid grid-cols-[minmax(0,1fr)_72px] gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                                <div className="min-w-0">
                                  <h4 className="truncate text-sm font-semibold text-zinc-900">{item.name}</h4>
                                  <p className="mt-1 text-xs text-zinc-600">{formatAbilityMeta(item, "spell")}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <button type="button" onClick={() => router.push(`/edit/add-ability?characterId=${characterId ?? ""}&type=spell&abilityId=${item.id}`)}
                                    className="w-16 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-center text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100">Edit</button>
                                  <button type="button" onClick={() => handleDeleteAbility("character_spells", item.id)}
                                    disabled={deletingAbility?.table === "character_spells" && deletingAbility?.id === item.id}
                                    className="w-16 rounded-md border border-red-300 bg-white px-2.5 py-1 text-center text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                                    {deletingAbility?.table === "character_spells" && deletingAbility?.id === item.id ? "..." : "Delete"}
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => router.push(`/edit/add-ability?characterId=${characterId ?? ""}&type=action`)}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700">+ Action</button>
              <button type="button" onClick={() => router.push(`/edit/add-ability?characterId=${characterId ?? ""}&type=cantrip`)}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700">+ Cantrip</button>
              <button type="button" onClick={() => router.push(`/edit/add-ability?characterId=${characterId ?? ""}&type=spell`)}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700">+ Spell</button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Inventory</h2>
            <textarea rows={14} value={inventoryText} onChange={(e) => setInventoryText(e.target.value)}
              placeholder="List your inventory here..."
              className="mt-4 w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2" />

            <div className="mt-4 grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="race">Race</label>
                <input id="race" type="text" value={race} onChange={(e) => setRace(e.target.value)} placeholder="Race"
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="age">Age</label>
                  <input id="age" type="text" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age"
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="height">Height</label>
                  <input id="height" type="text" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Height"
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="weight">Weight</label>
                  <input id="weight" type="text" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight"
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="eyes">Eyes</label>
                  <input id="eyes" type="text" value={eyes} onChange={(e) => setEyes(e.target.value)} placeholder="Eyes"
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="skin">Skin</label>
                  <input id="skin" type="text" value={skin} onChange={(e) => setSkin(e.target.value)} placeholder="Skin"
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="hair">Hair</label>
                  <input id="hair" type="text" value={hair} onChange={(e) => setHair(e.target.value)} placeholder="Hair"
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2" />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="otherTraits">Other Traits</label>
              <textarea id="otherTraits" rows={6} value={otherTraits} onChange={(e) => setOtherTraits(e.target.value)} placeholder="Other Traits"
                className="w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2" />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="languages">Languages</label>
              <textarea id="languages" rows={4} value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Languages known..."
                className="w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2" />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-700" htmlFor="feats">Feats</label>
              <textarea id="feats" rows={4} value={feats} onChange={(e) => setFeats(e.target.value)} placeholder="Feats and special abilities..."
                className="w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2" />
            </div>
          </section>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={() => router.push(`/edit/stat-sheet?characterId=${characterId ?? ""}`)}
            className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100">Back</button>
          <div>
            {saveSheetError ? <p className="mb-2 text-sm text-red-700">{saveSheetError}</p> : null}
            <button type="button" onClick={handleSaveAndExit} disabled={isSavingSheet || headerLoading || !character}
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60">
              {isSavingSheet ? "Saving..." : "Save & Exit"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AbilitiesAndItemsPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <AbilitiesAndItemsContent />
    </Suspense>
  );
}
