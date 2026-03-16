"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ClientPage() {
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [characterId]);

  if (loading) return <main className="p-8">Loading...</main>;

  return <main className="p-8">Client use-character loaded.</main>;
}
