"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getCharacter, getCharacterStats, updateCharacterCurrentStats, updateCharacterLevel } from "@/lib/actions";

export const dynamic = 'force-dynamic';

type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";
type AbilityScores = Record<AbilityKey, number>;
type DerivedEntry = { name: string; ability: AbilityKey };
type CharacterHeader = { id: number; user_id: string; name: string; class: string; lv: number };

const abilityLabels: Array<{ key: AbilityKey; label: string; name: string }> = [
  { key: "str", label: "STR", name: "Strength" },
  { key: "dex", label: "DEX", name: "Dexterity" },
  { key: "con", label: "CON", name: "Constitution" },
  { key: "int", label: "INT", name: "Intelligence" },
  { key: "wis", label: "WIS", name: "Wisdom" },
  { key: "cha", label: "CHA", name: "Charisma" },
];

const savingThrowEntries: DerivedEntry[] = [
  { name: "Strength", ability: "str" }, { name: "Dexterity", ability: "dex" },
  { name: "Constitution", ability: "con" }, { name: "Intelligence", ability: "int" },
  { name: "Wisdom", ability: "wis" }, { name: "Charisma", ability: "cha" },
];

const skillEntries: DerivedEntry[] = [
  { name: "Acrobatics", ability: "dex" }, { name: "Animal Handling", ability: "wis" },
  { name: "Arcana", ability: "int" }, { name: "Athletics", ability: "str" },
  { name: "Deception", ability: "cha" }, { name: "History", ability: "int" },
  { name: "Insight", ability: "wis" }, { name: "Intimidation", ability: "cha" },
  { name: "Investigation", ability: "int" }, { name: "Medicine", ability: "wis" },
  { name: "Nature", ability: "int" }, { name: "Perception", ability: "wis" },
  { name: "Performance", ability: "cha" }, { name: "Persuasion", ability: "cha" },
  { name: "Religion", ability: "int" }, { name: "Sleight of Hand", ability: "dex" },
  { name: "Stealth", ability: "dex" }, { name: "Survival", ability: "wis" },
];

function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }
function calculateModifier(score: number) { return Math.floor((score - 10) / 2); }
function formatModifier(mod: number) { return mod >= 0 ? `+${mod}` : `${mod}`; }
function calculateProficiencyBonus(level: number) { return 2 + Math.floor((Math.max(1, level) - 1) / 4); }

function UseCharacterContent() {
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");
  const router = useRouter();

  const [character, setCharacter] = useState<CharacterHeader | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [currHp, setCurrHp] = useState("");
  const [currHitDie, setCurrHitDie] = useState("");
  const [levelInput, setLevelInput] = useState("");
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerError, setHeaderError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deathSaveSuccesses, setDeathSaveSuccesses] = useState(0);
  const [deathSaveFailures, setDeathSaveFailures] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!characterId) { setHeaderError("No character id was provided."); setHeaderLoading(false); return; }
      setHeaderLoading(true);
      setHeaderError("");
      try {
        const parsedId = Number.parseInt(characterId, 10);
        const charData = await getCharacter(parsedId);
        if (!charData) { setHeaderError("Character not found."); setHeaderLoading(false); return; }
        setCharacter(charData);
        const statData = await getCharacterStats(parsedId) as Record<string, unknown> | null;
        if (statData) {
          setStats(statData);
          setCurrHp(statData.curr_hp !== undefined && statData.curr_hp !== null ? String(statData.curr_hp) : "");
          setCurrHitDie(statData.curr_hit_die !== undefined && statData.curr_hit_die !== null ? String(statData.curr_hit_die) : "");
          setDeathSaveSuccesses(clamp(Number(statData.death_save_successes) || 0, 0, 3));
          setDeathSaveFailures(clamp(Number(statData.death_save_failures) || 0, 0, 3));
        }
      } catch (err: any) {
        setHeaderError(err.message ?? "Failed to load.");
      }
      setHeaderLoading(false);
    };
    void load();
  }, [characterId]);

  const saveStats = async (updates: Record<string, unknown>) => {
    if (!characterId) return;
    setIsSaving(true);
    setSaveError("");
    try { await updateCharacterCurrentStats(Number.parseInt(characterId, 10), updates); }
    catch (err: any) { setSaveError(err.message ?? "Save failed."); }
    setIsSaving(false);
  };

  const handleChangeCurrHp = async (value: string) => {
    setCurrHp(value);
    await saveStats({ curr_hp: Number.parseInt(value, 10) || 0 });
  };

  const handleChangeCurrHitDie = async (value: string) => {
    setCurrHitDie(value);
    await saveStats({ curr_hit_die: value });
  };

  const handleToggleDeathSave = (type: "success" | "failure", idx: number) => {
    if (type === "success") {
      let newVal = idx + 1;
      if (deathSaveSuccesses === newVal) newVal = idx;
      setDeathSaveSuccesses(newVal);
      void saveStats({ death_save_successes: clamp(newVal, 0, 3), death_save_failures: clamp(deathSaveFailures, 0, 3) });
    } else {
      let newVal = idx + 1;
      if (deathSaveFailures === newVal) newVal = idx;
      setDeathSaveFailures(newVal);
      void saveStats({ death_save_successes: clamp(deathSaveSuccesses, 0, 3), death_save_failures: clamp(newVal, 0, 3) });
    }
  };

  const handleLevelUp = async () => {
    if (!characterId) return;
    const parsed = Number.parseInt(levelInput, 10);
    if (Number.isNaN(parsed) || parsed < 1) { setSaveError("Please enter a valid level."); return; }
    setIsSaving(true);
    setSaveError("");
    try {
      await updateCharacterLevel(Number.parseInt(characterId, 10), parsed);
      router.push(`/edit/stat-sheet?characterId=${characterId}`);
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to update level.");
      setIsSaving(false);
    }
  };

  if (headerLoading) return <main className="flex min-h-screen items-center justify-center bg-zinc-50"><p className="text-sm text-zinc-600">Loading character...</p></main>;
  if (headerError) return <main className="flex min-h-screen items-center justify-center bg-zinc-50"><p className="text-sm text-red-700">{headerError}</p></main>;
  if (!character || !stats) return <main className="flex min-h-screen items-center justify-center bg-zinc-50"><p className="text-sm text-zinc-600">No data found.</p></main>;

  const modifiers = abilityLabels.reduce<Record<AbilityKey, number>>((acc, a) => {
    acc[a.key] = calculateModifier(stats[a.key] as number);
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
            <button type="button" onClick={() => window.location.href = "/"}
              className="flex items-center justify-center h-8 w-8 rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              aria-label="Back to main page">
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
                <article key={ability.key} className="relative min-h-[92px] rounded-[1.2rem] border-2 border-zinc-900 bg-white px-2.5 pb-7 pt-2.5 shadow-sm">
                  <span className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 rounded-tl-[0.6rem] border-l-2 border-t-2 border-zinc-900" />
                  <span className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 rounded-tr-[0.6rem] border-r-2 border-t-2 border-zinc-900" />
                  <span className="pointer-events-none absolute bottom-5 left-1.5 h-3 w-3 rounded-bl-[0.6rem] border-b-2 border-l-2 border-zinc-900" />
                  <span className="pointer-events-none absolute bottom-5 right-1.5 h-3 w-3 rounded-br-[0.6rem] border-b-2 border-r-2 border-zinc-900" />
                  <div className="relative text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-800">{ability.name}</p>
                  </div>
                  <div className="mt-2 grid gap-1">
                    <div className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-center text-base font-semibold">{String(stats[ability.key])}</div>
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
                    <div className="mt-1 text-base font-semibold text-zinc-900">{String(stats.ac)}</div>
                  </label>
                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Initiative</span>
                    <p className="mt-1 text-base font-semibold text-zinc-900">{formatModifier(initiativeModifier)}</p>
                  </label>
                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Speed</span>
                    <div className="mt-1 flex items-center gap-1">
                      <div className="text-base font-semibold text-zinc-900">{String(stats.speed)}</div>
                      <span className="text-xs font-semibold text-zinc-500">ft</span>
                    </div>
                  </label>
                </div>
                <div className="mt-3 grid gap-2">
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <label className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Hit Points</span>
                      <div className="mt-1 flex gap-2 items-center">
                        <input type="number" inputMode="numeric" value={currHp} onChange={(e) => handleChangeCurrHp(e.target.value)}
                          className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-base font-semibold text-zinc-900 outline-none ring-zinc-900 focus:ring-2" style={{ minWidth: 0 }} />
                        <span className="text-sm text-zinc-500 font-medium">/ {String(stats.hp_max)}</span>
                      </div>
                      {saveError && <p className="mt-1 text-xs text-red-700">{saveError}</p>}
                    </label>
                    <label className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Hit Dice</span>
                      <input type="text" value={currHitDie} onChange={(e) => handleChangeCurrHitDie(e.target.value)}
                        placeholder={typeof stats.hit_dice === "string" ? stats.hit_dice : ""}
                        className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-base font-semibold text-zinc-900 outline-none ring-zinc-900 focus:ring-2" style={{ minWidth: 0 }} />
                    </label>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
                    <div className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Proficiency Bonus</span>
                      <p className="mt-1 text-base font-semibold text-zinc-900">{formatModifier(proficiencyBonus)}</p>
                    </div>
                    <div className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 flex flex-col items-end">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">Death Saves</span>
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-700 mr-1">Successes</span>
                          {[0,1,2].map(idx => (
                            <button key={"success-"+idx} type="button" aria-label={`Death Save Success ${idx+1}`}
                              className={`h-5 w-5 rounded-full border-2 ${idx < deathSaveSuccesses ? 'bg-green-500 border-green-700' : 'bg-white border-zinc-400'} transition-colors`}
                              onClick={() => handleToggleDeathSave("success", idx)} />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-700 mr-1">Failures</span>
                          {[0,1,2].map(idx => (
                            <button key={"failure-"+idx} type="button" aria-label={`Death Save Failure ${idx+1}`}
                              className={`h-5 w-5 rounded-full border-2 ${idx < deathSaveFailures ? 'bg-red-500 border-red-700' : 'bg-white border-zinc-400'} transition-colors`}
                              onClick={() => handleToggleDeathSave("failure", idx)} />
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
                    const total = modifiers[entry.ability] + (isProficient ? proficiencyBonus : 0);
                    return (
                      <div key={entry.ability} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-4 w-4 items-center justify-center rounded-sm border text-[10px] font-bold leading-none ${isProficient ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-400 bg-white text-zinc-900'}`}>{isProficient ? "✓" : ""}</span>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{entry.name}</p>
                            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{entry.ability}</p>
                          </div>
                        </div>
                        <span className="text-base font-semibold text-zinc-900">{formatModifier(total)}</span>
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
                      const skillKey = entry.name.toLowerCase().replace(/ /g, "_");
                      const isProficient = Boolean(stats[`prof_skill_${skillKey}`]);
                      const isExpertise = Boolean(stats[`expertise_skill_${skillKey}`]);
                      const skillTotal = modifiers[entry.ability] + (isExpertise ? proficiencyBonus * 2 : isProficient ? proficiencyBonus : 0);
                      return (
                        <div key={entry.name} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`flex h-4 w-4 items-center justify-center rounded-sm border text-[10px] font-bold leading-none transition ${isExpertise ? 'border-amber-500 bg-amber-500 text-white' : isProficient ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-400 bg-white text-zinc-900'}`}>
                              {isExpertise ? "✦" : isProficient ? "✓" : ""}
                            </span>
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
              <div className="mt-6 flex flex-col items-start gap-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Level Up (enter new level)</label>
                <input type="number" min={1}
                  className="w-32 rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter level" value={levelInput} onChange={(e) => setLevelInput(e.target.value)} />
                <button type="button" onClick={handleLevelUp} disabled={isSaving}
                  className="rounded bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 mt-1">
                  Level Up
                </button>
                {saveError && <p className="mt-1 text-xs text-red-700">{saveError}</p>}
              </div>
            </section>
          </div>
        </section>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <button type="button" onClick={() => window.location.href = `/use/abilities-and-items?characterId=${characterId}`}
          className="flex items-center justify-center h-10 w-10 rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-md"
          aria-label="View abilities and items">
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
