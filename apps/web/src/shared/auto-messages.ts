import "server-only";

import fs from "fs";
import path from "path";
import type { AutoMessageTemplates } from "./auto-messages.types";
import { DEFAULT_AUTO_MESSAGES } from "./auto-messages.utils";

const MESSAGE_FILE_PATH = path.join(process.cwd(), "content", "auto-messages.md");

const parseMessageFile = (content: string): Partial<AutoMessageTemplates> => {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const templates: Record<string, string[]> = {};
  let currentKey: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith("## ")) {
      currentKey = line.replace(/^##\s+/, "").trim();
      if (!templates[currentKey]) {
        templates[currentKey] = [];
      }
      continue;
    }

    if (currentKey) {
      templates[currentKey].push(rawLine);
    }
  }

  const parsed: Partial<AutoMessageTemplates> = {};
  for (const [key, value] of Object.entries(templates)) {
    const cleaned = value.join("\n").trim();
    if (cleaned) {
      parsed[key as keyof AutoMessageTemplates] = cleaned;
    }
  }

  return parsed;
};

export function getAutoMessageTemplates(): AutoMessageTemplates {
  try {
    const content = fs.readFileSync(MESSAGE_FILE_PATH, "utf-8");
    const parsed = parseMessageFile(content);
    return { ...DEFAULT_AUTO_MESSAGES, ...parsed };
  } catch (error) {
    console.error("[auto-messages] Falha ao ler templates:", error);
    return DEFAULT_AUTO_MESSAGES;
  }
}
