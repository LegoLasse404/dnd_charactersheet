"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

// ── Characters ────────────────────────────────────────────────────────────────

export async function getCharacters() {
  const session = await getSession();
  const rows = await sql`
    SELECT c.id, c.user_id, c.name, c.class, c.lv, ci.race
    FROM characters c
    LEFT JOIN character_inventory ci ON ci.character_id = c.id
    WHERE c.user_id = ${session.user.id}
    ORDER BY c.name ASC
  `;
  return rows as { id: number; user_id: string; name: string; class: string; lv: number; race: string | null }[];
}

export async function createCharacter(name: string, cls: string, lv: number) {
  const session = await getSession();
  const rows = await sql`
    INSERT INTO characters (user_id, name, class, lv)
    VALUES (${session.user.id}, ${name}, ${cls}, ${lv})
    RETURNING id
  `;
  return rows[0].id as number;
}

export async function getCharacter(characterId: number) {
  const session = await getSession();
  const rows = await sql`
    SELECT id, user_id, name, class, lv
    FROM characters
    WHERE id = ${characterId} AND user_id = ${session.user.id}
  `;
  if (rows.length === 0) return null;
  return rows[0] as { id: number; user_id: string; name: string; class: string; lv: number };
}

// ── Character Stats ───────────────────────────────────────────────────────────

export async function getCharacterStats(characterId: number) {
  const rows = await sql`SELECT * FROM character_stats WHERE character_id = ${characterId}`;
  return rows[0] ?? null;
}

export async function upsertCharacterStats(characterId: number, payload: Record<string, unknown>) {
  const existing = await sql`SELECT character_id FROM character_stats WHERE character_id = ${characterId} LIMIT 1`;
  if (existing.length > 0) {
    const sets = Object.keys(payload).map((c, i) => `"${c}" = $${i + 2}`).join(", ");
    await sql.query(`UPDATE character_stats SET ${sets} WHERE character_id = $1`, [characterId, ...Object.values(payload)]);
  } else {
    const columns = ["character_id", ...Object.keys(payload)];
    const values = [characterId, ...Object.values(payload)];
    const colList = columns.map((c) => `"${c}"`).join(", ");
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    await sql.query(`INSERT INTO character_stats (${colList}) VALUES (${placeholders})`, values);
  }
}

// ── Character Inventory ───────────────────────────────────────────────────────

export async function getCharacterInventory(characterId: number) {
  const rows = await sql`SELECT * FROM character_inventory WHERE character_id = ${characterId}`;
  return rows[0] ?? null;
}

export async function upsertCharacterInventory(characterId: number, payload: Record<string, unknown>) {
  const existing = await sql`SELECT character_id FROM character_inventory WHERE character_id = ${characterId} LIMIT 1`;
  if (existing.length > 0) {
    const sets = Object.keys(payload).map((c, i) => `"${c}" = $${i + 2}`).join(", ");
    await sql.query(`UPDATE character_inventory SET ${sets} WHERE character_id = $1`, [characterId, ...Object.values(payload)]);
  } else {
    const columns = ["character_id", ...Object.keys(payload)];
    const values = [characterId, ...Object.values(payload)];
    const colList = columns.map((c) => `"${c}"`).join(", ");
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    await sql.query(`INSERT INTO character_inventory (${colList}) VALUES (${placeholders})`, values);
  }
}

// ── Character Actions ─────────────────────────────────────────────────────────

export async function getCharacterActions(characterId: number) {
  return sql`SELECT * FROM character_actions WHERE character_id = ${characterId} ORDER BY name ASC`;
}

export async function createCharacterAction(characterId: number, payload: Record<string, unknown>) {
  const columns = ["character_id", ...Object.keys(payload)];
  const values = [characterId, ...Object.values(payload)];
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await sql.query(
    `INSERT INTO character_actions (${colList}) VALUES (${placeholders}) RETURNING id`,
    values
  );
  return rows[0].id as number;
}

export async function updateCharacterAction(id: number, payload: Record<string, unknown>) {
  const sets = Object.keys(payload).map((c, i) => `"${c}" = $${i + 2}`).join(", ");
  await sql.query(`UPDATE character_actions SET ${sets} WHERE id = $1`, [id, ...Object.values(payload)]);
}

export async function deleteCharacterAction(id: number) {
  await sql`DELETE FROM character_actions WHERE id = ${id}`;
}

// ── Character Spells ──────────────────────────────────────────────────────────

export async function getCharacterSpells(characterId: number) {
  return sql`SELECT * FROM character_spells WHERE character_id = ${characterId} ORDER BY spell_level ASC, name ASC`;
}

export async function createCharacterSpell(characterId: number, payload: Record<string, unknown>) {
  const columns = ["character_id", ...Object.keys(payload)];
  const values = [characterId, ...Object.values(payload)];
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await sql.query(
    `INSERT INTO character_spells (${colList}) VALUES (${placeholders}) RETURNING id`,
    values
  );
  return rows[0].id as number;
}

export async function updateCharacterSpell(id: number, payload: Record<string, unknown>) {
  const sets = Object.keys(payload).map((c, i) => `"${c}" = $${i + 2}`).join(", ");
  await sql.query(`UPDATE character_spells SET ${sets} WHERE id = $1`, [id, ...Object.values(payload)]);
}

export async function deleteCharacterSpell(id: number) {
  await sql`DELETE FROM character_spells WHERE id = ${id}`;
}

// ── Character Cantrips ────────────────────────────────────────────────────────

export async function getCharacterCantrips(characterId: number) {
  return sql`SELECT * FROM character_cantrips WHERE character_id = ${characterId} ORDER BY name ASC`;
}

export async function createCharacterCantrip(characterId: number, payload: Record<string, unknown>) {
  const columns = ["character_id", ...Object.keys(payload)];
  const values = [characterId, ...Object.values(payload)];
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await sql.query(
    `INSERT INTO character_cantrips (${colList}) VALUES (${placeholders}) RETURNING id`,
    values
  );
  return rows[0].id as number;
}

export async function updateCharacterCantrip(id: number, payload: Record<string, unknown>) {
  const sets = Object.keys(payload).map((c, i) => `"${c}" = $${i + 2}`).join(", ");
  await sql.query(`UPDATE character_cantrips SET ${sets} WHERE id = $1`, [id, ...Object.values(payload)]);
}

export async function deleteCharacterCantrip(id: number) {
  await sql`DELETE FROM character_cantrips WHERE id = ${id}`;
}

// ── Auth actions ──────────────────────────────────────────────────────────────

export async function updateCharacterSpellSlots(characterId: number, updates: Record<string, number>) {
  if (Object.keys(updates).length === 0) return;
  const sets = Object.keys(updates).map((c, i) => `"${c}" = $${i + 2}`).join(", ");
  await sql.query(`UPDATE character_stats SET ${sets} WHERE character_id = $1`, [characterId, ...Object.values(updates)]);
}

export async function updateCharacterCurrentStats(characterId: number, updates: Record<string, unknown>) {
  if (Object.keys(updates).length === 0) return;
  const sets = Object.keys(updates).map((c, i) => `"${c}" = $${i + 2}`).join(", ");
  await sql.query(`UPDATE character_stats SET ${sets} WHERE character_id = $1`, [characterId, ...Object.values(updates)]);
}

export async function updateAbilityCharges(table: "character_actions" | "character_cantrips", id: number, currCharges: number) {
  if (table === "character_actions") {
    await sql`UPDATE character_actions SET curr_charges = ${currCharges} WHERE id = ${id}`;
  } else {
    await sql`UPDATE character_cantrips SET curr_charges = ${currCharges} WHERE id = ${id}`;
  }
}

export async function patchCharacterInventory(characterId: number, field: string, value: string) {
  const allowedFields = ["inventory_text", "race", "age", "height", "weight", "eyes", "skin", "hair", "other_traits", "languages", "feats"];
  if (!allowedFields.includes(field)) throw new Error("Invalid field");
  await sql.query(`UPDATE character_inventory SET "${field}" = $1 WHERE character_id = $2`, [value, characterId]);
}

export async function updateCharacterLevel(characterId: number, level: number) {
  await getSession();
  await sql`UPDATE characters SET lv = ${level} WHERE id = ${characterId}`;
}

export async function updateCharacter(characterId: number, name: string, cls: string, lv: number) {
  const session = await getSession();
  await sql`UPDATE characters SET name = ${name}, class = ${cls}, lv = ${lv} WHERE id = ${characterId} AND user_id = ${session.user.id}`;
}

export async function getAbility(type: "action" | "spell" | "cantrip", id: number) {
  const table = type === "action" ? "character_actions" : type === "spell" ? "character_spells" : "character_cantrips";
  const rows = await sql.query(`SELECT * FROM "${table}" WHERE id = $1`, [id]);
  return rows[0] ?? null;
}
