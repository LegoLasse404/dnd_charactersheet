"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

type AbilityScores = Record<AbilityKey, number>;
type SkillProficiencies = Record<string, boolean>;

type DerivedEntry = {
  name: string;
  ability: AbilityKey;
};

type CharacterHeader = {
  id: number;
  user_id: string;
  name: string;
  class: string;
  lv: number;
};

type CharacterStatsRow = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  ac: number;
  speed: number;
  hp_max: number;
  hit_dice: string;
} & Record<string, unknown>;

const abilityLabels: Array<{ key: AbilityKey; label: string; name: string }> = [
  { key: "str", label: "STR", name: "Strength" },
  { key: "dex", label: "DEX", name: "Dexterity" },
  { key: "con", label: "CON", name: "Constitution" },
  { key: "int", label: "INT", name: "Intelligence" },
  { key: "wis", label: "WIS", name: "Wisdom" },
  { key: "cha", label: "CHA", name: "Charisma" },
];

const defaultScores: AbilityScores = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

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

function formatModifier(modifier: number) {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

function calculateProficiencyBonus(level: number) {
  const safeLevel = Math.max(1, level);
  return 2 + Math.floor((safeLevel - 1) / 4);
}

const savingThrowColumnByName: Record<string, string> = {
  Strength: "prof_save_str",
  Dexterity: "prof_save_dex",
  Constitution: "prof_save_con",
  Intelligence: "prof_save_int",
  Wisdom: "prof_save_wis",
  Charisma: "prof_save_cha",
};

const skillColumnByName: Record<string, string> = {
  Acrobatics: "prof_skill_acrobatics",
  "Animal Handling": "prof_skill_animal_handling",
  Arcana: "prof_skill_arcana",
  Athletics: "prof_skill_athletics",
  Deception: "prof_skill_deception",
  History: "prof_skill_history",
  Insight: "prof_skill_insight",
  Intimidation: "prof_skill_intimidation",
  Investigation: "prof_skill_investigation",
  Medicine: "prof_skill_medicine",
  Nature: "prof_skill_nature",
  Perception: "prof_skill_perception",
  Performance: "prof_skill_performance",
  Persuasion: "prof_skill_persuasion",
  Religion: "prof_skill_religion",
  "Sleight of Hand": "prof_skill_sleight_of_hand",
  Stealth: "prof_skill_stealth",
  Survival: "prof_skill_survival",
};

function buildDefaultSkillProficiencies() {
  return skillEntries.reduce<SkillProficiencies>((accumulator, skill) => {
    accumulator[skill.name] = false;
    return accumulator;
  }, {});
}

function buildDefaultSavingThrowProficiencies() {
  return savingThrowEntries.reduce<SkillProficiencies>((accumulator, savingThrow) => {
    accumulator[savingThrow.name] = false;
    return accumulator;
  }, {});
}

export default function StatSheetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");
  const [scores, setScores] = useState<AbilityScores>(defaultScores);
  const [character, setCharacter] = useState<CharacterHeader | null>(null);
  const [skillProficiencies, setSkillProficiencies] = useState<SkillProficiencies>(
    buildDefaultSkillProficiencies
  );
  const [savingThrowProficiencies, setSavingThrowProficiencies] = useState<SkillProficiencies>(
    buildDefaultSavingThrowProficiencies
  );
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerError, setHeaderError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSavingAndContinuing, setIsSavingAndContinuing] = useState(false);
  const [armorClass, setArmorClass] = useState("10");
  const [speedFeet, setSpeedFeet] = useState("30");
  const [maxHp, setMaxHp] = useState("");
  const [hitDiceTotal, setHitDiceTotal] = useState("");
  const modifiers = abilityLabels.reduce<Record<AbilityKey, number>>((accumulator, ability) => {
    accumulator[ability.key] = calculateModifier(scores[ability.key]);
    return accumulator;
  }, {} as Record<AbilityKey, number>);
  const proficiencyBonus = calculateProficiencyBonus(character?.lv ?? 1);
  const initiativeModifier = modifiers.dex;
  const halfSkillsIndex = Math.ceil(skillEntries.length / 2);
  const firstSkillColumn = skillEntries.slice(0, halfSkillsIndex);
  const secondSkillColumn = skillEntries.slice(halfSkillsIndex);

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

        const { data: statData, error: statsError } = await supabase
          .from("character_stats")
          .select(
            "str, dex, con, int, wis, cha, ac, speed, hp_max, hit_dice, prof_save_str, prof_save_dex, prof_save_con, prof_save_int, prof_save_wis, prof_save_cha, prof_skill_acrobatics, prof_skill_animal_handling, prof_skill_arcana, prof_skill_athletics, prof_skill_deception, prof_skill_history, prof_skill_insight, prof_skill_intimidation, prof_skill_investigation, prof_skill_medicine, prof_skill_nature, prof_skill_perception, prof_skill_performance, prof_skill_persuasion, prof_skill_religion, prof_skill_sleight_of_hand, prof_skill_stealth, prof_skill_survival"
          )
          .eq("character_id", parsedCharacterId)
          .maybeSingle<CharacterStatsRow>();

        if (statsError) {
          setHeaderError(statsError.message);
        } else if (statData) {
          setScores({
            str: statData.str,
            dex: statData.dex,
            con: statData.con,
            int: statData.int,
            wis: statData.wis,
            cha: statData.cha,
          });
          setArmorClass(String(statData.ac));
          setSpeedFeet(String(statData.speed));
          setMaxHp(String(statData.hp_max));
          setHitDiceTotal(statData.hit_dice);

          const nextSavingThrowProficiencies = buildDefaultSavingThrowProficiencies();
          for (const [name, column] of Object.entries(savingThrowColumnByName)) {
            const value = statData[column];
            if (typeof value === "boolean") {
              nextSavingThrowProficiencies[name] = value;
            }
          }
          setSavingThrowProficiencies(nextSavingThrowProficiencies);

          const nextSkillProficiencies = buildDefaultSkillProficiencies();
          for (const [name, column] of Object.entries(skillColumnByName)) {
            const value = statData[column];
            if (typeof value === "boolean") {
              nextSkillProficiencies[name] = value;
            }
          }
          setSkillProficiencies(nextSkillProficiencies);
        } else {
          setScores(defaultScores);
          setArmorClass("10");
          setSpeedFeet("30");
          setMaxHp("");
          setHitDiceTotal("");
          setSavingThrowProficiencies(buildDefaultSavingThrowProficiencies());
          setSkillProficiencies(buildDefaultSkillProficiencies());
        }
      }

      setHeaderLoading(false);
    };

    void loadCharacter();
  }, [characterId]);

  const handleScoreChange = (key: AbilityKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number.parseInt(event.target.value, 10);

    setScores((currentScores) => ({
      ...currentScores,
      [key]: Number.isNaN(nextValue) ? 0 : nextValue,
    }));
  };

  const handleSkillProficiencyToggle = (skillName: string) => {
    setSkillProficiencies((current) => ({
      ...current,
      [skillName]: !current[skillName],
    }));
  };

  const handleSavingThrowProficiencyToggle = (savingThrowName: string) => {
    setSavingThrowProficiencies((current) => ({
      ...current,
      [savingThrowName]: !current[savingThrowName],
    }));
  };

  const handleNext = async () => {
    if (!characterId) {
      setSaveError("Missing character id.");
      return;
    }

    const parsedCharacterId = Number.parseInt(characterId, 10);

    if (Number.isNaN(parsedCharacterId)) {
      setSaveError("Invalid character id.");
      return;
    }

    setIsSavingAndContinuing(true);
    setSaveError("");

    const payload: Record<string, boolean | number> = {
      character_id: parsedCharacterId,
      str: scores.str,
      dex: scores.dex,
      con: scores.con,
      int: scores.int,
      wis: scores.wis,
      cha: scores.cha,
      ac: Number.parseInt(armorClass, 10) || 10,
      speed: Number.parseInt(speedFeet, 10) || 30,
      hp_max: Number.parseInt(maxHp, 10) || 0,
      hit_dice: hitDiceTotal.trim(),
    };

    for (const [name, isProficient] of Object.entries(savingThrowProficiencies)) {
      const column = savingThrowColumnByName[name];
      if (column) {
        payload[column] = isProficient;
      }
    }

    for (const [name, isProficient] of Object.entries(skillProficiencies)) {
      const column = skillColumnByName[name];
      if (column) {
        payload[column] = isProficient;
      }
    }

    const { error } = await supabase.from("character_stats").upsert(payload, {
      onConflict: "character_id",
    });

    if (error) {
      setSaveError(error.message);
      setIsSavingAndContinuing(false);
      return;
    }

    router.push(`/abilities-and-items?characterId=${parsedCharacterId}`);
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto w-full max-w-5xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Character Sheet
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {headerLoading ? "Loading character..." : character?.name ?? "Stat Sheet"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {headerLoading
              ? "Fetching character details."
              : character
                ? `${character.class} • Level ${character.lv}`
                : headerError}
          </p>
        </header>

        <section className="mt-6 grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)] xl:items-start">
          <div className="rounded-[1.6rem] bg-zinc-100 p-2.5">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {abilityLabels.map((ability) => {
                const score = scores[ability.key];
                const modifier = modifiers[ability.key];

                return (
                  <article
                    key={ability.key}
                    className="relative min-h-[92px] rounded-[1.2rem] border-2 border-zinc-900 bg-white px-2.5 pb-7 pt-2.5 shadow-sm"
                  >
                    <span className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 rounded-tl-[0.6rem] border-l-2 border-t-2 border-zinc-900" />
                    <span className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 rounded-tr-[0.6rem] border-r-2 border-t-2 border-zinc-900" />
                    <span className="pointer-events-none absolute bottom-5 left-1.5 h-3 w-3 rounded-bl-[0.6rem] border-b-2 border-l-2 border-zinc-900" />
                    <span className="pointer-events-none absolute bottom-5 right-1.5 h-3 w-3 rounded-br-[0.6rem] border-b-2 border-r-2 border-zinc-900" />

                    <div className="relative text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-800">
                        {ability.name}
                      </p>
                    </div>

                    <div className="mt-2 grid gap-1">
                      <label htmlFor={ability.key} className="sr-only">
                        {ability.name}
                      </label>
                      <input
                        id={ability.key}
                        type="number"
                        inputMode="numeric"
                        value={score}
                        onChange={handleScoreChange(ability.key)}
                        className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-center text-base font-semibold outline-none ring-zinc-900 focus:ring-2"
                      />
                    </div>

                    <div className="absolute bottom-[-8px] left-1/2 flex h-9 w-16 -translate-x-1/2 items-center justify-center rounded-full border-2 border-zinc-900 bg-white shadow-sm">
                      <p className="text-lg font-semibold text-zinc-900">
                        {formatModifier(modifier)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Armor Class
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={armorClass}
                      onChange={(event) => setArmorClass(event.target.value)}
                      className="mt-1 w-full bg-transparent text-base font-semibold text-zinc-900 outline-none"
                    />
                  </label>

                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Initiative
                    </span>
                    <p className="mt-1 text-base font-semibold text-zinc-900">
                      {formatModifier(initiativeModifier)}
                    </p>
                  </label>

                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Speed
                    </span>
                    <div className="mt-1 flex items-center gap-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={speedFeet}
                        onChange={(event) => setSpeedFeet(event.target.value)}
                        className="w-full bg-transparent text-base font-semibold text-zinc-900 outline-none"
                      />
                      <span className="text-xs font-semibold text-zinc-500">ft</span>
                    </div>
                  </label>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Hit Point Maximum
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={maxHp}
                      onChange={(event) => setMaxHp(event.target.value)}
                      className="mt-1 w-full bg-transparent text-base font-semibold text-zinc-900 outline-none"
                    />
                  </label>

                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Hit Dice
                    </span>
                    <input
                      type="text"
                      value={hitDiceTotal}
                      onChange={(event) => setHitDiceTotal(event.target.value)}
                      placeholder="e.g. 2d8"
                      className="mt-1 w-full bg-transparent text-base font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
                    />
                  </label>
                </div>

                <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Proficiency Bonus
                  </span>
                  <p className="mt-1 text-base font-semibold text-zinc-900">
                    {formatModifier(proficiencyBonus)}
                  </p>
                </div>

              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                  Saving Throws
                </h2>
                <div className="mt-3 space-y-2">
                  {savingThrowEntries.map((entry) => {
                    const isProficient = savingThrowProficiencies[entry.name] ?? false;
                    const savingThrowTotal =
                      modifiers[entry.ability] + (isProficient ? proficiencyBonus : 0);

                    return (
                      <div
                        key={entry.ability}
                        className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <label className="inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={isProficient}
                              onChange={() => handleSavingThrowProficiencyToggle(entry.name)}
                              className="peer sr-only"
                              aria-label={`Toggle proficiency for ${entry.name} saving throw`}
                            />
                            <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-zinc-400 bg-white text-[10px] font-bold leading-none text-zinc-900 transition peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white">
                              {isProficient ? "✓" : ""}
                            </span>
                          </label>

                          <div>
                            <p className="text-sm font-medium text-zinc-900">{entry.name}</p>
                            <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                              {entry.ability}
                            </p>
                          </div>
                        </div>
                        <span className="text-base font-semibold text-zinc-900">
                          {formatModifier(savingThrowTotal)}
                        </span>
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
                      const isProficient = skillProficiencies[entry.name] ?? false;
                      const skillTotal =
                        modifiers[entry.ability] + (isProficient ? proficiencyBonus : 0);

                      return (
                        <div
                          key={entry.name}
                          className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={isProficient}
                                onChange={() => handleSkillProficiencyToggle(entry.name)}
                                className="peer sr-only"
                                aria-label={`Toggle proficiency for ${entry.name}`}
                              />
                              <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-zinc-400 bg-white text-[10px] font-bold leading-none text-zinc-900 transition peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white">
                                {isProficient ? "✓" : ""}
                              </span>
                            </label>

                            <div>
                              <p className="text-sm font-medium text-zinc-900">{entry.name}</p>
                              <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                                {entry.ability}
                              </p>
                            </div>
                          </div>
                          <span className="text-base font-semibold text-zinc-900">
                            {formatModifier(skillTotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleNext}
            disabled={isSavingAndContinuing || headerLoading || !character}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingAndContinuing ? "Saving..." : "Next"}
          </button>
        </div>

        {saveError ? <p className="mt-3 text-sm text-red-700">{saveError}</p> : null}
      </div>
    </main>
  );
}
