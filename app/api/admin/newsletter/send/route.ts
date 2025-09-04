"use client";

import { useState, useTransition } from "react";
import { dryRunSend, sendNow, scheduleSend } from "./actions";

export default function NewsletterAdmin() {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [scheduleAt, setScheduleAt] = useState(""); // ISO or "YYYY-MM-DDTHH:mm"
  const [status, setStatus] = useState<string>("");
  const [sending, startTransition] = useTransition();

  async function onDry() {
    setStatus("Running dry run…");
    startTransition(async () => {
      try {
        const r = await dryRunSend({ subject, html });
        setStatus(`✅ Dry run: ${r.recipients} recipients, ${r.batches} batch(es).`);
      } catch (e: any) {
        setStatus(`❌ Dry run failed: ${e.message}`);
      }
    });
  }

  async function onSend() {
    setStatus("Sending…");
    startTransition(async () => {
      try {
        const r = await sendNow({ subject, html });
        // indicator *next to the button* can just render `status`
        setStatus(`✅ Sent ${r.sent}/${r.recipients} (${r.batches} batch${r.batches > 1 ? "es" : ""}).`);
      } catch (e: any) {
        setStatus(`❌ Send failed: ${e.message}`);
      }
    });
  }

  async function onSchedule() {
    if (!scheduleAt) return setStatus("⚠️ Choose a schedule date/time.");
    setStatus("Scheduling…");
    startTransition(async () => {
      try {
        const r = await scheduleSend({ subject, html, scheduleAt });
        setStatus(`⏰ Scheduled for ${new Date(r.scheduleAt).toLocaleString()} (${r.recipients} recipients).`);
      } catch (e: any) {
        setStatus(`❌ Schedule failed: ${e.message}`);
      }
    });
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onDry} disabled={sending} className="btn">Dry run</button>
        <button onClick={onSend} disabled={sending} className="btn">Send now</button>

        <input
          type="datetime-local"
          value={scheduleAt}
          onChange={(e) => setScheduleAt(e.target.value)}
          className="rounded border border-white/20 bg-transparent px-2 py-1"
          title="Schedule time"
        />
        <button onClick={onSchedule} disabled={sending} className="btn">Schedule</button>

        {/* Indicator lives in the same row, right of buttons */}
        <span className="ml-3 text-sm">{status}</span>
      </div>
    </section>
  );
}
