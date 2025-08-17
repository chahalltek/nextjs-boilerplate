import ContactForm from "./ContactForm";

export const metadata = { title: "Contact — Hey Skol Sister" };

export default function Page() {

  return (
    <div className="container py-12">
      <h1 className="text-3xl md:text-4xl font-bold">Contact</h1>
      <ContactForm />
    </div>
  );
}  