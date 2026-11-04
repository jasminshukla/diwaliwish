export const SITE_ORIGIN = "https://bestwishes.jasminshukla.com";
export const SHARE_IMAGE = `${SITE_ORIGIN}/og-image.png`;
const SHARE_ALT = "Happy Diwali 2026 — a lit gold diya and marigolds";

export function shareMeta(options: { title: string; description: string; path?: string }) {
  const url = new URL(options.path ?? "/", SITE_ORIGIN).toString();
  return [
    { title: options.title },
    { name: "description", content: options.description },
    { property: "og:title", content: options.title },
    { property: "og:description", content: options.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "Happy Diwali 2026" },
    { property: "og:image", content: SHARE_IMAGE },
    { property: "og:image:secure_url", content: SHARE_IMAGE },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: SHARE_ALT },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: options.title },
    { name: "twitter:description", content: options.description },
    { name: "twitter:image", content: SHARE_IMAGE },
    { name: "twitter:image:alt", content: SHARE_ALT },
  ];
}
