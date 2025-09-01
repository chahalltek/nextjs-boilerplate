{/* 2.5) Send a test */}
<section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
  <h2 className="text-lg font-semibold">Send a test</h2>
  <form onSubmit={onSendTest} className="flex flex-wrap items-end gap-2">
    <input type="hidden" name="id" value={existing.id} />
    <label className="grid gap-1 text-sm min-w-[260px] flex-1">
      <span className="text-white/80">Recipient(s)</span>
      <input
        name="to"
        placeholder="you@example.com, other@site.com"
        value={testTo}
        onChange={(e) => setTestTo(e.target.value)}
        className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
      />
    </label>
    <button
      disabled={sendingTest}
      className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10 disabled:opacity-60"
    >
      {sendingTest ? "Sending…" : "Send test"}
    </button>
  </form>

  {testResult && (
    <div
      className={`rounded border px-3 py-2 text-sm ${
        testResult.ok
          ? "border-emerald-400 text-emerald-200 bg-emerald-400/10"
          : "border-red-400 text-red-200 bg-red-400/10"
      }`}
    >
      {testResult.message || (testResult.ok ? "Test email sent." : "Test failed.")}
    </div>
  )}
</section>
