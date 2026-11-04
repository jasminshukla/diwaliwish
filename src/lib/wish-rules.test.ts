import { describe, expect, it } from "vitest";
import {
  counterDeltas,
  createPublicId,
  isPublicId,
  normalizeLanguage,
  normalizeTemplate,
  parseStatsRange,
  rangeStartIso,
  rateWindowStart,
  sanitizeGaParams,
  timingSafeEqual,
  validateEventInput,
  validateWishInput,
  wishPath,
} from "./wish-rules";

describe("wish validation", () => {
  it("accepts a Gujarati royal-gold greeting and stores the canonical design", () => {
    const result = validateWishInput({
      senderName: "  Rahul   Patel ",
      language: "gujarati",
      template: "royal-gold",
      customMessage: "શુભ દિવાળી",
      recipientName: "ignored",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        senderName: "Rahul Patel",
        language: "gu",
        template: "royal",
        customMessage: "શુભ દિવાળી",
      });
    }
  });

  it("rejects an empty name, an unknown language, and a long message", () => {
    expect(validateWishInput({ senderName: "   ", language: "en", template: "royal" }).ok).toBe(false);
    expect(validateWishInput({ senderName: "Asha", language: "fr", template: "royal" }).ok).toBe(false);
    expect(validateWishInput({ senderName: "Asha", language: "en", template: "royal", customMessage: "x".repeat(281) }).ok).toBe(false);
  });

  it("normalizes Hindi and English aliases", () => {
    expect(normalizeLanguage("Hindi")).toBe("hi");
    expect(normalizeLanguage("english")).toBe("en");
    expect(normalizeTemplate("luxury-purple")).toBe("purple");
  });
});

describe("public links and events", () => {
  it("builds an 8-character share path", () => {
    const id = createPublicId();
    expect(isPublicId(id)).toBe(true);
    expect(wishPath(id)).toBe(`/w/${id}`);
  });

  it("counts share clicks, copies, and greeting opens separately", () => {
    expect(counterDeltas("share_clicked")).toEqual({ share: 1, view: 0 });
    expect(counterDeltas("whatsapp_share_clicked")).toEqual({ share: 1, view: 0 });
    expect(counterDeltas("copy_link_clicked")).toEqual({ share: 1, view: 0 });
    expect(counterDeltas("greeting_opened")).toEqual({ share: 0, view: 1 });
    expect(counterDeltas("download_clicked")).toEqual({ share: 0, view: 0 });
  });

  it("requires a wish id only when a greeting is opened", () => {
    expect(validateEventInput({ type: "greeting_opened" }).ok).toBe(false);
    const opened = validateEventInput({ type: "greeting_opened", wishId: "abcdefgh" });
    expect(opened.ok).toBe(true);
    const share = validateEventInput({ type: "whatsapp_share_clicked", action: "whatsapp", language: "hi" });
    expect(share.ok).toBe(true);
  });
});

describe("analytics and ranges", () => {
  it("drops sender names before they can reach analytics", () => {
    expect(sanitizeGaParams({ language: "gu", template: "royal", senderName: "Rahul Patel", method: "whatsapp" })).toEqual({
      language: "gu",
      template: "royal",
      method: "whatsapp",
    });
  });

  it("starts today at UTC midnight and leaves all-time open", () => {
    const now = new Date("2026-11-04T18:30:00.000Z");
    expect(rangeStartIso("today", now)).toBe("2026-11-04T00:00:00.000Z");
    expect(rangeStartIso("7d", now)).toBe("2026-10-28T18:30:00.000Z");
    expect(rangeStartIso("all", now)).toBeNull();
    expect(parseStatsRange("nope")).toBe("7d");
  });

  it("aligns rate-limit windows", () => {
    expect(rateWindowStart(Date.parse("2026-11-04T01:20:00.000Z"))).toBe(Math.floor(Date.parse("2026-11-04T01:00:00.000Z") / 1000));
  });

  it("compares admin tokens without treating a short secret as valid", async () => {
    expect(await timingSafeEqual("local-dev-admin-token", "local-dev-admin-token")).toBe(true);
    expect(await timingSafeEqual("local-dev-admin-token", "local-dev-admin-tokex")).toBe(false);
    expect(await timingSafeEqual("short", "longer-token")).toBe(false);
  });
});
