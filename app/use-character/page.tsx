"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export const dynamic = 'force-dynamic';

// Types reused from stat sheet

type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";
type AbilityScores = Record<AbilityKey, number>;
type SkillProficiencies = Record<string, boolean>;
type DerivedEntry = { name: string; ability: AbilityKey };
type CharacterHeader = { id: number; user_id: string; name: string; class: string; lv: number };
type CharacterStatsRow = {
  str: number; dex: number; con: number; int: number; wis: number; cha: number;
  ac: number; speed: number; hp_max: number; hit_dice: string;
  curr_hp?: number;
  curr_hit_die?: string;
  death_save_successes?: number;
  death_save_failures?: number;
} & Record<string, unknown>;
// Helper for clamping values
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

const abilityLabels: Array<{ key: AbilityKey; label: string; name: string }> = [
  { key: "str", label: "STR", name: "Strength" },
  { key: "dex", label: "DEX", name: "Dexterity" },
  { key: "con", label: "CON", name: "Constitution" },
  { key: "int", label: "INT", name: "Intelligence" },
  { key: "wis", label: "WIS", name: "Wisdom" },
  { key: "cha", label: "CHA", name: "Charisma" },
];

const savingThrowEntries: DerivedEntry[] = [
  { name: "Strength", ability: "str" },
  { name: "Dexterity", ability: "dex" },
  { name: "Constitution", ability: "con" },
  { name: "Intelligence", ability: "int" },
  { name: "Wisdom", ability: "wis" },
  { name: "Charisma", ability: "cha" },
];

const skillEntries: DerivedEntry[] = [
  { name: "Acrobatics", ability: "dex" },
  { name: "Animal Handling", ability: "wis" },
  { name: "Arcana", ability: "int" },
  { name: "Athletics", ability: "str" },
  { name: "Deception", ability: "cha" },
  { name: "History", ability: "int" },
  { name: "Insight", ability: "wis" },
  { name: "Intimidation", ability: "cha" },
  { name: "Investigation", ability: "int" },
  { name: "Medicine", ability: "wis" },
  { name: "Nature", ability: "int" },
  { name: "Perception", ability: "wis" },
  { name: "Performance", ability: "cha" },
  { name: "Persuasion", ability: "cha" },
  { name: "Religion", ability: "int" },
  { name: "Sleight of Hand", ability: "dex" },
  { name: "Stealth", ability: "dex" },
  { name: "Survival", ability: "wis" },
];

function calculateModifier(score: number) {
  return Math.floor((score - 10) / 2);
}
function formatModifier(mod: number) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
function calculateProficiencyBonus(level: number) {
  const safeLevel = Math.max(1, level);
  return 2 + Math.floor((safeLevel - 1) / 4);
}

function UseCharacterContent() {
    // Helper for clamping values
    function clamp(val: number, min: number, max: number) {
      return Math.max(min, Math.min(max, val));
    }
    // Auto-save death saves
    const saveDeathSaves = async (successes: number, failures: number) => {
      if (!characterId) return;
      setIsSaving(true);
      setSaveError("");
      const { error } = await supabase.from("character_stats").update({
        death_save_successes: clamp(successes, 0, 3),
        death_save_failures: clamp(failures, 0, 3),
      }).eq("character_id", characterId);
      if (error) setSaveError(error.message);
      setIsSaving(false);
    };

    // Handler for toggling death saves
    const handleToggleDeathSave = (type: "success" | "failure", idx: number) => {
      if (type === "success") {
        let newVal = idx + 1;
        if (deathSaveSuccesses === newVal) newVal = idx; // toggle off
        setDeathSaveSuccesses(newVal);
        saveDeathSaves(newVal, deathSaveFailures);
      } else {
        let newVal = idx + 1;
        if (deathSaveFailures === newVal) newVal = idx; // toggle off
        setDeathSaveFailures(newVal);
        saveDeathSaves(deathSaveSuccesses, newVal);
      }
    };
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");
  const router = useRouter();
  const [levelInput, setLevelInput] = useState<string>("");
  const [character, setCharacter] = useState<CharacterHeader | null>(null);
  const [stats, setStats] = useState<CharacterStatsRow | null>(null);
  const [currHp, setCurrHp] = useState("");
  const [currHitDie, setCurrHitDie] = useState("");
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerError, setHeaderError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deathSaveSuccesses, setDeathSaveSuccesses] = useState(0);
  const [deathSaveFailures, setDeathSaveFailures] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!characterId) {
        setHeaderError("No character id was provided.");
        setHeaderLoading(false);
        return;
      }
      setHeaderLoading(true);
      setHeaderError("");
      const { data: charData, error: charError } = await supabase
        .from("characters")
        .select("id, user_id, name, class, lv")
        .eq("id", characterId)
        .single();
      if (charError || !charData) {
        setHeaderError(charError?.message ?? "Character not found.");
        setHeaderLoading(false);
        return;
      }
      setCharacter(charData);
      const { data: statData, error: statError } = await supabase
        .from("character_stats")
        .select("str, dex, con, int, wis, cha, ac, speed, hp_max, hit_dice, curr_hp, curr_hit_die, death_save_successes, death_save_failures, prof_save_str, prof_save_dex, prof_save_con, prof_save_int, prof_save_wis, prof_save_cha, prof_skill_acrobatics, prof_skill_animal_handling, prof_skill_arcana, prof_skill_athletics, prof_skill_deception, prof_skill_history, prof_skill_insight, prof_skill_intimidation, prof_skill_investigation, prof_skill_medicine, prof_skill_nature, prof_skill_perception, prof_skill_performance, prof_skill_persuasion, prof_skill_religion, prof_skill_sleight_of_hand, prof_skill_stealth, prof_skill_survival")
        .eq("character_id", characterId)
        .maybeSingle<CharacterStatsRow>();
      if (statError) {
        setHeaderError(statError.message);
      } else {
        setStats(statData ?? null);
        setCurrHp(statData?.curr_hp !== undefined && statData?.curr_hp !== null ? String(statData.curr_hp) : "");
        setCurrHitDie(statData?.curr_hit_die !== undefined && statData?.curr_hit_die !== null ? String(statData.curr_hit_die) : "");
        // Load death saves from DB
        setDeathSaveSuccesses(clamp(Number(statData?.death_save_successes) ?? 0, 0, 3));
        setDeathSaveFailures(clamp(Number(statData?.death_save_failures) ?? 0, 0, 3));
      }
      setHeaderLoading(false);
    };
    void load();
  }, [characterId]);

  const handleChangeCurrHp = async (value: string) => {
    setCurrHp(value);
    if (!characterId) return;
    setIsSaving(true);
    setSaveError("");
    const { error } = await supabase.from("character_stats").update({ curr_hp: Number.parseInt(value, 10) || 0 }).eq("character_id", characterId);
    if (error) setSaveError(error.message);
    setIsSaving(false);
  };

  const handleChangeCurrHitDie = async (value: string) => {
    setCurrHitDie(value);
    if (!characterId) return;
    setSaveError("");
    await supabase.from("character_stats").update({ curr_hit_die: value }).eq("character_id", characterId);
  };

  const handleLevelUp = async () => {
    if (!characterId) return;
    const parsed = Number.parseInt(levelInput, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setSaveError("Please enter a valid level.");
      return;
    }
    setIsSaving(true);
    setSaveError("");
    const { error } = await supabase.from("characters").update({ lv: parsed }).eq("id", characterId);
    setIsSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    router.push(`/stat-sheet?characterId=${characterId}`);
  };

  if (headerLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-10"><p className="text-sm text-zinc-600">Loading character...</p></main>;
  }
  if (headerError) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-10"><p className="text-sm text-red-700">{headerError}</p></main>;
  }
  if (!character || !stats) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-10"><p className="text-sm text-zinc-600">No data found.</p></main>;
  }
  const modifiers = abilityLabels.reduce<Record<AbilityKey, number>>((acc, ability) => {
    acc[ability.key] = calculateModifier(stats[ability.key]);
    return acc;
  }, {} as Record<AbilityKey, number>);
  const proficiencyBonus = calculateProficiencyBonus(character.lv);
  const initiativeModifier = modifiers.dex;
  const halfSkillsIndex = Math.ceil(skillEntries.length / 2);
  const firstSkillColumn = skillEntries.slice(0, halfSkillsIndex);
  const secondSkillColumn = skillEntries.slice(halfSkillsIndex);
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto w-full max-w-5xl">
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{character.name}</h1>
          <p className="mt-2 text-sm text-zinc-600">{character.class} • Level {character.lv}</p>
        </header>
        <section className="mt-6 grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)] xl:items-start">
          <div className="rounded-[1.6rem] bg-zinc-100 p-2.5">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {abilityLabels.map((ability) => (
                <article
                  key={ability.key}
                  className="relative min-h-[92px] rounded-[1.2rem] border-2 border-zinc-900 bg-white px-2.5 pb-7 pt-2.5 shadow-sm"
                >
                  <span className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 rounded-tl-[0.6rem] border-l-2 border-t-2 border-zinc-900" />
                  <span className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 rounded-tr-[0.6rem] border-r-2 border-t-2 border-zinc-900" />
                  <span className="pointer-events-none absolute bottom-5 left-1.5 h-3 w-3 rounded-bl-[0.6rem] border-b-2 border-l-2 border-zinc-900" />
                  <span className="pointer-events-none absolute bottom-5 right-1.5 h-3 w-3 rounded-br-[0.6rem] border-b-2 border-r-2 border-zinc-900" />
                  <div className="relative text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-800">{ability.name}</p>
                  </div>
                  <div className="mt-2 grid gap-1">
                    <div className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-center text-base font-semibold">{stats[ability.key]}</div>
                  </div>
                  <div className="absolute bottom-[-8px] left-1/2 flex h-9 w-16 -translate-x-1/2 items-center justify-center rounded-full border-2 border-zinc-900 bg-white shadow-sm">
                    <p className="text-lg font-semibold text-zinc-900">{formatModifier(modifiers[ability.key])}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Armor Class</span>
                    <div className="mt-1 w-full bg-transparent text-base font-semibold text-zinc-900">{stats.ac}</div>
                  </label>
                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Initiative</span>
                    <p className="mt-1 text-base font-semibold text-zinc-900">{formatModifier(initiativeModifier)}</p>
                  </label>
                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Speed</span>
                    <div className="mt-1 flex items-center gap-1">
                      <div className="w-full bg-transparent text-base font-semibold text-zinc-900">{stats.speed}</div>
                      <span className="text-xs font-semibold text-zinc-500">ft</span>
                    </div>
                  </label>
                </div>
                <div className="mt-3 grid gap-2">
                  {/* Hit Points & Hit Dice side by side */}
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <label className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Hit Points</span>
                      <div className="mt-1 flex gap-2 items-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={currHp}
                          onChange={e => handleChangeCurrHp(e.target.value)}
                          className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-base font-semibold text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
                          style={{ minWidth: 0 }}
                        />
                      </div>
                      {saveError && <p className="mt-1 text-xs text-red-700">{saveError}</p>}
                    </label>
                    <label className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Hit Dice</span>
                      <input
                        type="text"
                        value={currHitDie}
                        onChange={e => handleChangeCurrHitDie(e.target.value)}
                        placeholder={typeof stats.hit_dice === "string" ? stats.hit_dice : ""}
                        className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-base font-semibold text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
                        style={{ minWidth: 0 }}
                      />
                    </label>
                  </div>

                  {/* Proficiency Bonus & Death Saves side by side, below */}
                  <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
                    <div className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Proficiency Bonus</span>
                      <p className="mt-1 text-base font-semibold text-zinc-900">{formatModifier(proficiencyBonus)}</p>
                    </div>
                    {/* Death Saves UI, right-aligned */}
                    <div className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 flex flex-col items-end">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">Death Saves</span>
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-700 mr-1">Successes</span>
                          {[0,1,2].map(idx => (
                            <button
                              key={"success-"+idx}
                              type="button"
                              aria-label={`Death Save Success ${idx+1}`}
                              className={`h-5 w-5 rounded-full border-2 ${idx < deathSaveSuccesses ? 'bg-green-500 border-green-700' : 'bg-white border-zinc-400'} transition-colors`}
                              onClick={() => handleToggleDeathSave("success", idx)}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-700 mr-1">Failures</span>
                          {[0,1,2].map(idx => (
                            <button
                              key={"failure-"+idx}
                              type="button"
                              aria-label={`Death Save Failure ${idx+1}`}
                              className={`h-5 w-5 rounded-full border-2 ${idx < deathSaveFailures ? 'bg-red-500 border-red-700' : 'bg-white border-zinc-400'} transition-colors`}
                              onClick={() => handleToggleDeathSave("failure", idx)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Saving Throws</h2>
                <div className="mt-3 space-y-2">
                  {savingThrowEntries.map((entry) => {
                    const isProficient = Boolean(stats[`prof_save_${entry.ability}`]);
                    const savingThrowTotal = modifiers[entry.ability] + (isProficient ? proficiencyBonus : 0);
                    return (
                      <div key={entry.ability} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-4 w-4 items-center justify-center rounded-sm border border-zinc-400 bg-white text-[10px] font-bold leading-none text-zinc-900 ${isProficient ? 'border-zinc-900 bg-zinc-900 text-white' : ''}`}>{isProficient ? "✓" : ""}</span>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{entry.name}</p>
                            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{entry.ability}</p>
                          </div>
                        </div>
                        <span className="text-base font-semibold text-zinc-900">{formatModifier(savingThrowTotal)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Skills</h2>
              <div className="mt-3 grid gap-3 xl:grid-cols-2">
                {[firstSkillColumn, secondSkillColumn].map((skillColumn, columnIndex) => (
                  <div key={columnIndex} className="space-y-2">
                    {skillColumn.map((entry) => {
                      const isProficient = Boolean(stats[`prof_skill_${entry.name.toLowerCase().replace(/ /g, "_")}`]);
                      const skillTotal = modifiers[entry.ability] + (isProficient ? proficiencyBonus : 0);
                      return (
                        <div key={entry.name} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`flex h-4 w-4 items-center justify-center rounded-sm border border-zinc-400 bg-white text-[10px] font-bold leading-none text-zinc-900 ${isProficient ? 'border-zinc-900 bg-zinc-900 text-white' : ''}`}>{isProficient ? "✓" : ""}</span>
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{entry.name}</p>
                              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{entry.ability}</p>
                            </div>
                          </div>
                          <span className="text-base font-semibold text-zinc-900">{formatModifier(skillTotal)}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {/* Level Up Section */}
              <div className="mt-6 flex flex-col items-start gap-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Level Up (enter new level)</label>
                <input
                  type="number"
                  min={1}
                  className="w-32 rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter level"
                  value={levelInput}
                  onChange={e => setLevelInput(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 mt-1"
                  onClick={handleLevelUp}
                  disabled={isSaving}
                >
                  Level Up
                </button>
                {saveError && <p className="mt-1 text-xs text-red-700">{saveError}</p>}
              </div>
            </section>
          </div>
        </section>
      </div>
      {/* Bottom right arrow button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => window.location.href = `/abilities-and-items-readonly?characterId=${characterId}`}
          className="flex items-center justify-center h-10 w-10 rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-md"
          aria-label="View abilities and items (read-only)"
        >
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-zinc-900">
            <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </main>
  );
}

export default function UseCharacterPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading character...</main>}>
      <UseCharacterContent />
    </Suspense>
  );
}
