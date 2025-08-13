"use client";

export default function Error({ error, reset }) {
  return (
    <div className="container py-12">
      <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
      {error?.digest && (
        <p className="text-white/60">Digest: {error.digest}</p>
      )}
      <button className="btn-gold mt-4" onClick={() => reset()}>Try again</button>
    </div>
  );
}
