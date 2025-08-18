// app/privacy/page.jsx
import Link from "next/link";
export const runtime = "nodejs";
export const metadata = {
  title: "Privacy Policy — Hey Skol Sister",
  description: "How we handle your data.",
};

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString();
  return (
    <div className="container max-w-3xl py-12 prose prose-invert">
      <h1>Privacy Policy</h1>
      <p>
        <em>Last updated: {lastUpdated}</em>
      </p>

      <section>
        <h2><strong>What we collect</strong></h2>
        <ul>
          <li>
             Email address if you subscribe to updates.
          </li>
          <li>
          Basic usage data that our hosting provider or analytics tools record
            (e.g., pages viewed, approximate region, device).
          </li>
        </ul>
      </section>

      <section>
       <h2><strong>How we store it</strong></h2>
        <p>
           Subscriber emails are stored securely with our email service or in our site’s back-end.
          <br />
          We do not sell your personal information.
        </p>
      </section>
      <br />

         <section>
       <h2><strong>How long we keep it</strong></h2>
      </section>
       <br />

       <section>
       <h2><strong>Your choices</strong></h2>
        <ul>
          <li>You can unsubscribe anytime using the link in our emails.</li>
          <li>You can request deletion of your email by contacting us.</li>
        </ul>
      </section>
       <br />
       <section>
       <h2><strong>Contact</strong></h2>
        <p>
           Questions?
          <br />
          Use our <Link href="/contact">contact form</Link>.
        </p>
      </section>
    </div>
  );
}
