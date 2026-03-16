"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");
  const abilityId = searchParams.get("abilityId");
  const [headerLoading, setHeaderLoading] = useState(true);

  useEffect(() => {
    setHeaderLoading(false);
  }, [characterId, abilityId]);

  return (
    <main className="p-8">Client add-ability UI loaded.</main>
  );
}
