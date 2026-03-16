"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const abilityId = searchParams.get("abilityId");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAbility = async () => {
      if (!abilityId) return setLoading(false);
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("character_attacks")
        .select("*")
        .eq("id", abilityId)
        .maybeSingle();
      if (error) setError(error.message);
      setLoading(false);
    };
    void fetchAbility();
  }, [abilityId]);

  if (loading) return <main className="p-8">Loading...</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;

  return (
    <main className="p-8">Client ability details loaded.</main>
  );
}
