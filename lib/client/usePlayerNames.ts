"use client";
import { useEffect, useState } from "react";

type Meta = { id: string; name: string; team?: string; pos?: string };

export function usePlayerNames(ids: string[]) {
  const [map, setMap] = useState<Record<string, Meta>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const uniq = Array.from(new Set(ids)).filter(Boolean);
    if (!uniq.length) { setMap({}); return; }
    setLoading(true);
    fetch(`/api/players/ids?ids=${encodeURIComponent(uniq.join(","))}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setMap(d.map || {}))
      .catch(() => setMap({}))
      .finally(() => setLoading(false));
  }, [JSON.stringify([...new Set(ids)])]); // stable dep

  return { map, loading };
}
