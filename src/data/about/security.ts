import type { LocalizedText } from "./types";

export interface SecurityItem {
  title: LocalizedText;
  description: LocalizedText;
  scope: LocalizedText;
  icon: string;
}
