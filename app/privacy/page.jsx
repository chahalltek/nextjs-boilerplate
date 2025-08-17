// app/privacy/page.jsx
export const runtime = "nodejs";
export const metadata = {
  title: "Privacy Policy — Hey Skol Sister",
  description: "How we handle your data.",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-12 prose prose-invert">
      <h1>Privacy Policy</h1>
      <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Email address</strong> if you subscribe to updates.</li>
        <li>Basic usage data our hosting provider or analytics may record (e.g., pages viewed, approximate region, device).</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To send you newsletters or alerts you requested.</li>
        <li>To improve the site’s content and performance.</li>
      </ul>

      <h2>How we store it</h2>
      <p>
        Subscriber emails are stored securely with our email service or in our site’s back-end.
        We do not sell your personal information.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your email until you unsubscribe or ask us to remove it.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can unsubscribe anytime using the link in our emails.</li>
        <li>You can request deletion of your email by contacting us.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions? Email us at <a href="mailto:admin@theskolsisters.com">admin@heyskolsister.com</a>.
      </p>
    </div>
  );
}
