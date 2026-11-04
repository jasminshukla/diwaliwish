export type PublicWish = {
  id: string;
  senderName: string;
  language: "gu" | "hi" | "en";
  template: string;
  customMessage: string | null;
  createdAt: string;
};
