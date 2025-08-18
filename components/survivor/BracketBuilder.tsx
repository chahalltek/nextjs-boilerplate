// components/survivor/BracketBuilder.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Contestant = { id: string; name: string; tribe?: string; image?: string };
type Season = {
  id: string;
  name: string;
  lockAt: string;
  contestants: Contestant[];
  actualBootOrder: string[];
};

export default function BracketBuilder({
  season,
  locked,
}: {
  season: Season;
  locked: boolean;
}) {
  const [order, setOrder] = useState<string[]>(
    season.contestants.map((c) => c.id)
  );
  const [final3, setFinal3] = useState<string[]>(["", "", ""]); // [winner, second, third]
  const [name, setName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const byId = useMemo(
    () => new Map(season.contestants.map((c) => [c.id, c])),
    [season.contestants]
  );

  function dropIntoFinal(slotIndex: number, contestantId: string) {
    setFinal3((prev) => {
      const next = prev.slice();
      // ensure uniqueness across slots
      for (let i = 0; i < 3; i++) {
        if (next[i] === contestantId) next[i] = "";
      }
      next[slotIndex] = contestantId;
      return next;
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    const active = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    setActiveId(null);
    if (!over) return;

    // Reorder within boot list
    if (over.startsWith("boot-") && active.startsWith("boot-")) {
      const aId = active.replace("boot-", "");
      const oId = over.replace("boot-", "");
      if (aId === oId) return;
      const oldIndex = order.indexOf(aId);
      const newIndex = order.indexOf(oId);
      if (oldIndex !== -1 && newIndex !== -1) {
        setOrder((prev) => arrayMove(prev, oldIndex, newIndex));
      }
      return;
    }

    // Drop from boot list into a Final 3 slot
    if (over.startsWith("final-") && active.startsWith("boot-")) {
      const slotIndex = Number(over.split("-")[1]);
      const aId = active.replace("boot-", "");
      dropIntoFinal(slotIndex, aId);
      return;
    }
  }

  async function submit() {
    const cleanFinal3 = final3.filter(Boolean);
    if (cleanFinal3.length !== 3) {
      alert("Please fill all Final 3 slots.");
      return;
    }
    const res = await fetch("/api/survivor/entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId: season.id,
        name,
        picks: { bootOrder: order, final3: cleanFinal3 },
      }),
    });
    if (!res.ok) {
      alert("Submit failed");
      return;
    }
    window.location.href = "/survivor/leaderboard";
  }

  return (
    <div className="space-y-6">
      {/* Final 3 slots */}
      <section className="grid gap-2">
        <h2 className="text-sm opacity-80">Final 3 (Winner → Second → Third)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <FinalSlot
              key={i}
              id={`final-${i}`}
              label={["Winner", "Second", "Third"][i]}
              contestant={final3[i] ? byId.get(final3[i]) : undefined}
              highlightId={activeId}
              locked={locked}
              onClear={() =>
                setFinal3((prev) => {
                  const next = prev.slice();
                  next[i] = "";
                  return next;
                })
              }
            />
          ))}
        </div>
        <p className="text-xs text-white/50">
          Tip: drag from the list into a slot. Dropping another person replaces the current one.
        </p>
      </section>

      {/* Boot order list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={order.map((id) => `boot-${id}`)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="rounded-xl border border-white/10 divide-y divide-white/10">
            {order.map((id, i) => (
              <SortableRow
                key={id}
                id={`boot-${id}`}
                index={i}
                label={byId.get(id)?.name || id}
                disabled={locked}
              />
            ))}
          </ol>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeId && activeId.startsWith("boot-") ? (
            <RowVisual label={byId.get(activeId.replace("boot-", ""))?.name || ""} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Submit */}
      {!locked ? (
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded border border-white/20 bg-transparent px-3 py-2"
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="button" className="btn-gold" onClick={submit}>
            Submit Bracket
          </button>
        </div>
      ) : (
        <p className="text-sm text-white/60">Picks are locked for this season.</p>
      )}
    </div>
  );
}

/* ---------------------------- sub-components ------------------------- */

function RowVisual({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2">
      <span className="text-sm">{label}</span>
    </div>
  );
}

function SortableRow({
  id,
  label,
  index,
  disabled,
}: {
  id: string;
  label: string;
  index: number;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        "flex items-center justify-between gap-3 px-3 py-2 bg-transparent",
        isDragging ? "opacity-70" : "",
      ].join(" ")}
    >
      <span className="text-sm opacity-70 w-8">{index + 1}.</span>
      <span className="flex-1">{label}</span>
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 rounded border border-white/20 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
          aria-label="Drag to reorder"
        >
          Drag
        </button>
      )}
    </li>
  );
}

function FinalSlot({
  id,
  label,
  contestant,
  highlightId,
  locked,
  onClear,
}: {
  id: string;
  label: string;
  contestant?: Contestant;
  highlightId: string | null;
  locked: boolean;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const showGlow = !locked && isOver && highlightId?.startsWith("boot-");

  return (
    <div
      ref={setNodeRef}
      className={[
        "rounded-xl border border-white/15 p-3 min-h-[64px]",
        showGlow ? "outline outline-2 outline-[color:var(--skol-gold)]" : "",
      ].join(" ")}
    >
      <div className="text-xs uppercase tracking-wide text-white/60 mb-1">
        {label}
      </div>
      {contestant ? (
        <div className="flex items-center justify-between gap-2">
          <div className="rounded-lg bg-white/10 px-3 py-2">{contestant.name}</div>
          {!locked && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-white/60 hover:text-white/90"
              aria-label={`Clear ${label}`}
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/15 px-3 py-2 text-white/40 text-sm">
          Drag a contestant here
        </div>
      )}
    </div>
  );
}
