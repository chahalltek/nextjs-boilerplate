// components/survivor/BracketBuilder.tsx
"use client";
import { useState } from "react";

export default function BracketBuilder({ season, locked }: { season:any; locked:boolean }) {
  const [order, setOrder] = useState<string[]>(season.contestants.map((c:any)=>c.id));
  const [final3, setFinal3] = useState<string[]>(order.slice(-3).reverse()); // [winner, 2nd, 3rd]
  const [name, setName] = useState("");

  async function submit() {
    const res = await fetch("/api/survivor/entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId: season.id, name, picks: { bootOrder: order, final3 } })
    });
    if (!res.ok) alert("Submit failed");
    else window.location.href = "/survivor/leaderboard";
  }

  return (
    <div className="space-y-4">
      {/* TODO: swap to dnd-kit later; for MVP up/down buttons are fine */}
      <ol className="rounded-xl border border-white/10 divide-y divide-white/10">
        {order.map((id, i) => {
          const c = season.contestants.find((x:any)=>x.id===id)!;
          return (
            <li key={id} className="flex items-center justify-between gap-3 p-2">
              <span className="text-sm opacity-70 w-8">{i+1}.</span>
              <span className="flex-1">{c.name}</span>
              {!locked && (
                <span className="flex gap-1">
                  <button className="px-2 py-1 rounded bg-white/10" onClick={()=>{
                    if (i===0) return;
                    const copy = order.slice(); [copy[i-1], copy[i]] = [copy[i], copy[i-1]]; setOrder(copy);
                  }}>↑</button>
                  <button className="px-2 py-1 rounded bg-white/10" onClick={()=>{
                    if (i===order.length-1) return;
                    const copy = order.slice(); [copy[i+1], copy[i]] = [copy[i], copy[i+1]]; setOrder(copy);
                  }}>↓</button>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-2">
        <label className="text-sm opacity-80">Final 3 (Winner → Second → Third)</label>
        <select className="rounded border border-white/20 bg-transparent p-2" value={final3[0]} onChange={e=>setFinal3([e.target.value, final3[1], final3[2]])}>
          {order.map(id => <option key={id} value={id}>{season.contestants.find((c:any)=>c.id===id)?.name}</option>)}
        </select>
        <select className="rounded border border-white/20 bg-transparent p-2" value={final3[1]} onChange={e=>setFinal3([final3[0], e.target.value, final3[2]])}>
          {order.map(id => <option key={id} value={id}>{season.contestants.find((c:any)=>c.id===id)?.name}</option>)}
        </select>
        <select className="rounded border border-white/20 bg-transparent p-2" value={final3[2]} onChange={e=>setFinal3([final3[0], final3[1], e.target.value])}>
          {order.map(id => <option key={id} value={id}>{season.contestants.find((c:any)=>c.id===id)?.name}</option>)}
        </select>
      </div>

      {!locked && (
        <div className="flex flex-wrap gap-2">
          <input className="rounded border border-white/20 bg-transparent p-2" placeholder="Display name" value={name} onChange={e=>setName(e.target.value)} />
          <button className="btn-gold" onClick={submit}>Submit Bracket</button>
        </div>
      )}

      {locked && <p className="text-sm text-white/60">Picks are locked for this season.</p>}
    </div>
  );
}
