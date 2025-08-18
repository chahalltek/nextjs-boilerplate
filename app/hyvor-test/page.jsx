// app/hyvor-test/page.jsx
"use client";
import HyvorComments from "@/components/HyvorComments";

export default function Page() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-4">Hyvor Test</h1>
      <HyvorComments pageId="test:hello" />
    </div>
  );
}
