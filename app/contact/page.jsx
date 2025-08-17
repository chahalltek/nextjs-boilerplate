import { useState } from "react";

export const metadata = { title: "Contact — Hey Skol Sister" };

export default function Page() {
 const [status, setStatus] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      name: form.name.value,
      email: form.email.value,
      reason: form.reason.value,
      message: form.message.value,
    };
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (r.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="container py-12">
      <h1 className="text-3xl md:text-4xl font-bold">Contact</h1>
      {status === "success" ? (
        <p className="mt-4 text-green-400">Your message was sent. We'll follow up shortly.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-w-xl">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
            <input id="name" name="name" type="text" required className="w-full p-2 rounded text-black" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input id="email" name="email" type="email" required className="w-full p-2 rounded text-black" />
          </div>
          <div>
            <label htmlFor="reason" className="block text-sm font-medium mb-1">Reason</label>
            <select id="reason" name="reason" className="w-full p-2 rounded text-black">
              <option>Advice</option>
              <option>Site Feedback</option>
              <option>Partnership</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
            <textarea id="message" name="message" rows="5" required className="w-full p-2 rounded text-black" />
          </div>
          <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded">Send</button>
          {status === "error" && <p className="text-red-500">Something went wrong. Please try again.</p>}
        </form>
      )}
    </div>
  );
}  