# Happy Diwali 2026 Greeting Website (from Jasmin Shukla)

A single, mobile-first, cinematic greeting page at `/` built from the uploaded brief.

## What you'll get
- Cinematic intro: diya lights up, golden particles, mandala, heading and message fade in, soft fireworks.
- Language switch at top: ગુજરાતી (default) | हिंदी | English — all text changes instantly.
- Greeting card with the provided texts and "With Best Wishes, Jasmin Shukla" signature.
- "Light a Diya, Spread Happiness" section: tap to light, glow + sparkles + blessing.
- "Celebrate Diwali" button: golden fireworks + light confetti (calmer when reduced motion is on).
- Personalized greeting: type a name -> "Happy Diwali, Rahul!" card + shareable link `/?name=Rahul` that opens personalized.
- Share: native share on phones, WhatsApp and Copy Link fallbacks, in the chosen language.
- Floating music button (play/pause, loops, starts only after a tap). Music file slot at `/audio/diwali-instrumental.mp3` — no track is included, so the button hides gracefully until you add one.
- Elegant footer: "Made with Love & Light · Happy Diwali 2026".

## Design
Midnight navy #080F24, royal purple #30104D, gold #D4AF37, saffron #FF9933, cream text. Fonts: Cormorant/Yatra One-style display + Noto Sans Gujarati/Devanagari. Glass cards, rangoli/mandala SVGs, marigold accents.

## Technical
- `src/routes/index.tsx` with `validateSearch` for `name`; head() meta in each language-neutral English.
- Components: LanguageSelector, Intro, DiyaSection, Fireworks (canvas, requestAnimationFrame), PersonalGreeting, ShareButtons, MusicToggle, Footer.
- `src/lib/i18n.ts` translation dictionary; tokens in `src/styles.css`; fonts via `<link>` in __root.
