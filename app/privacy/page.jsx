// app/privacy/page.jsx
export const runtime = "nodejs";
export const metadata = {
  title: "Privacy Policy — Hey Skol Sister",
  description: "How we handle your data.",
};

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString();  
  const contactEmail = "admin@heyskolsister.com";

  return (
    <div className="container max-w-3xl py-12 prose prose-invert">
      <h1>Privacy Policy</h1>
     <p>
        <em>Last updated: {lastUpdated}</em>
      </p>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Email address</strong> if you subscribe to updates.
          </li>
          <li>
          Basic usage data that our hosting provider or analytics tools record
            (e.g., pages viewed, approximate region, device).
          </li>
        </ul>
      </section>

      <section>
        <h2>How we store it</h2>
        <p>
          Subscriber emails are stored securely with our email service or in our
          site’s back-end. We do not sell your personal information.
        </p>
      </section>

         <section>
        <h2>How long we keep it</h2>
        <p>We keep your email until you unsubscribe or ask us to remove it.</p>
      </section>

       <section>
        <h2>Your choices</h2>
        <ul>
          <li>You can unsubscribe anytime using the link in our emails.</li>
          <li>You can request deletion of your email by contacting us.</li>
        </ul>
      </section>

       <section>
        <h2>Contact</h2>
        <p>
          Questions? Email us at{" "}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      </section>
    </div>
  );
}
