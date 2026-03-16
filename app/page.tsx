"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type Character = {
  id: number;
  user_id: string;
  name: string;
  class: string;
  lv: number;
  race?: string | null;
};

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characterClass, setCharacterClass] = useState("");
  const [characterLevel, setCharacterLevel] = useState("1");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<
    "signin" | "create-character" | "update-email" | "update-password" | "signout" | null
  >(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      setLoading(false);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setNewEmail(nextUser?.email ?? "");
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadCharacters = async () => {
      if (!user) {
        setCharacters([]);
        return;
      }

      setCharactersLoading(true);
      setErrorMessage("");

      // Join character_inventory to get race
      const { data, error } = await supabase
        .from("characters")
        .select("id, user_id, name, class, lv, character_inventory(race)")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setCharacters([]);
      } else {
        // Map race from joined character_inventory
        setCharacters(
          (data ?? []).map((character: any) => ({
            ...character,
            race: character.character_inventory?.race ?? "",
          }))
        );
      }

      setCharactersLoading(false);
    };

    void loadCharacters();
  }, [user]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveAction("signin");
    setSuccessMessage("");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
    }

    setActiveAction(null);
  };

  const handleUpdateEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveAction("update-email");
    setSuccessMessage("");
    setErrorMessage("");

    const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage(
        "Email update requested. Check your inbox if Supabase asks for confirmation."
      );
    }

    setActiveAction(null);
  };

  const handleCreateCharacter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setErrorMessage("You must be signed in to create a character.");
      return;
    }

    setActiveAction("create-character");
    setSuccessMessage("");
    setErrorMessage("");

    const parsedLevel = Number.parseInt(characterLevel, 10);

    if (!Number.isInteger(parsedLevel) || parsedLevel < 1) {
      setErrorMessage("Level must be a whole number greater than 0.");
      setActiveAction(null);
      return;
    }

    const { data, error } = await supabase
      .from("characters")
      .insert({
        user_id: user.id,
        name: characterName,
        class: characterClass,
        lv: parsedLevel,
      })
      .select("id")
      .single();

    if (error) {
      setErrorMessage(error.message);
      setActiveAction(null);
      return;
    }

    setCharacterName("");
    setCharacterClass("");
    setCharacterLevel("1");
    setActiveAction(null);
    router.push(`/stat-sheet?characterId=${data.id}`);
  };

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveAction("update-password");
    setSuccessMessage("");
    setErrorMessage("");

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage("Password updated successfully.");
      setNewPassword("");
    }

    setActiveAction(null);
  };

  const handleSignOut = async () => {
    setActiveAction("signout");
    setSuccessMessage("");
    setErrorMessage("");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage(error.message);
    }
    setActiveAction(null);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-10">
        <p className="text-sm text-zinc-600">Loading account...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        {user ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">My Characters</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Characters linked to your account are shown here.
            </p>

            <section className="mt-6">
              {charactersLoading ? (
                <p className="text-sm text-zinc-600">Loading characters...</p>
              ) : characters.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px_80px] gap-4 border-b border-zinc-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <span>Name</span>
                    <span>Class</span>
                    <span>Race</span>
                    <span>Level</span>
                    <span></span>
                  </div>

                  {characters.map((character) => (
                    <div
                      key={character.id}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px_80px] gap-4 border-b border-zinc-100 px-4 py-3 last:border-b-0"
                    >
                      <span className="font-medium text-zinc-900">{character.name}</span>
                      <span className="text-zinc-700">{character.class}</span>
                      <span className="text-zinc-700">{character.race || "-"}</span>
                      <span className="text-zinc-700">{character.lv}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/stat-sheet?characterId=${character.id}`)}
                          className="w-fit rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/use-character?characterId=${character.id}`)}
                          className="w-fit rounded-md border border-green-400 bg-white px-2.5 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-50"
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-600">No characters found for this account yet.</p>
              )}
            </section>

            <section className="mt-8 border-t border-zinc-200 pt-8">
              <h2 className="text-2xl font-semibold tracking-tight">Create New Character</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Add a character and continue to its stat sheet.
              </p>

              <form className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_auto]" onSubmit={handleCreateCharacter}>
                <input
                  type="text"
                  value={characterName}
                  onChange={(event) => setCharacterName(event.target.value)}
                  required
                  placeholder="Name"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
                />
                <input
                  type="text"
                  value={characterClass}
                  onChange={(event) => setCharacterClass(event.target.value)}
                  required
                  placeholder="Class"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={characterLevel}
                  onChange={(event) => setCharacterLevel(event.target.value)}
                  required
                  placeholder="Lv"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={activeAction !== null}
                  className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activeAction === "create-character" ? "Creating..." : "Create character"}
                </button>
              </form>
            </section>

            <section className="mt-10 border-t border-zinc-200 pt-8">
              <h2 className="text-2xl font-semibold tracking-tight">Account</h2>
              <p className="mt-2 text-sm text-zinc-600 break-all">Signed in as {user.email}</p>

              <form className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleUpdateEmail}>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={activeAction !== null}
                  className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activeAction === "update-email" ? "Saving..." : "Update email"}
                </button>
              </form>

              <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleUpdatePassword}>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
                  placeholder="New password"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={activeAction !== null}
                  className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activeAction === "update-password" ? "Saving..." : "Update password"}
                </button>
              </form>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={activeAction !== null}
                className="mt-6 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activeAction === "signout" ? "Signing out..." : "Sign out"}
              </button>
            </section>
          </>
        ) : (
          <section className="w-full max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-2 text-sm text-zinc-600">Sign in with your email and password.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
                />
              </div>

              <button
                type="submit"
                disabled={activeAction !== null}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activeAction === "signin" ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </section>
        )}

        {errorMessage ? (
          <p className="mt-5 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-5 max-w-2xl rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
