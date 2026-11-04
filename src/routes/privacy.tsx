import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadPublicConfig } from "@/lib/wish-client";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy | Happy Diwali 2026" },
      { name: "description", content: "What the Happy Diwali 2026 greeting site stores, and how long it is kept." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const [retention, setRetention] = useState<number | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void loadPublicConfig().then((config) => {
      setRetention(config.retentionDays);
      setEmail(config.contactEmail);
    });
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <Link to="/" className="text-sm text-muted-foreground">
        ← Home
      </Link>
      <h1 className="mt-4 font-display text-4xl font-bold text-gold sm:text-5xl">Privacy</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed">
        <p>Anyone can create a Diwali greeting. There is no account, no recipient list, and no payment.</p>
        <p>
          A saved greeting keeps the sender name, the language, the design, an optional message, a random link id, and the time it was created. Share clicks, successful link copies, greeting opens, and image downloads are counted separately. A button click is not treated as a message that was delivered.
        </p>
        <p>
          The site does not ask for a recipient name. It does not store raw IP addresses. Rate limits use a short-lived hash when a network hint is available. The browser keeps an anonymous session id in session storage for that visit only.
        </p>
        <p>
          Google Analytics and Cloudflare Web Analytics load only after you allow analytics. They receive the language, design, and share method. They do not receive sender names or greeting text.
        </p>
        <p>
          {retention === 0
            ? "Automatic deletion is turned off for this deployment."
            : `Greetings and activity records are deleted after ${retention ?? 365} days.`}{" "}
          {email ? (
            <>
              To ask for a greeting to be removed sooner, write to <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${email}`}>{email}</a>.
            </>
          ) : (
            "The site owner can configure a contact address for earlier deletion requests."
          )}
        </p>
        <p className="text-muted-foreground">ગોપનીયતા: તમારું નામ અને શુભેચ્છા સાચવવામાં આવે છે. મુલાકાતની ગણતરી ત્યારે જ થાય છે જ્યારે તમે એનાલિટિક્સની મંજૂરી આપો.</p>
        <p className="text-muted-foreground">गोपनीयता: आपका नाम और शुभकामना सहेजी जाती है। विज़िट की गिनती तभी होती है जब आप एनालिटिक्स की अनुमति देते हैं।</p>
      </div>
    </main>
  );
}
