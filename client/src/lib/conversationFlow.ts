export type ConversationAnswer = string | string[] | Record<string, string>;

export function isConversationAnswerPresent(value: ConversationAnswer | undefined) {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.values(value).some(entry => entry.trim().length > 0);
  return value.trim().length > 0;
}

export function isConversationAnswerDetailed(value: ConversationAnswer | undefined, isNarrative: boolean) {
  if (!isConversationAnswerPresent(value)) return false;
  if (!isNarrative || typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  if (["não sei", "nao sei", "precisamos levantar"].includes(normalized)) return true;
  return normalized.split(/\s+/).length >= 10;
}

export function nextConversationPosition(activeStep: number, questionPage: number, pageCount: number) {
  if (questionPage < pageCount - 1) return { activeStep, questionPage: questionPage + 1 };
  return { activeStep: activeStep + 1, questionPage: 0 };
}

export function previousConversationPosition(activeStep: number, questionPage: number) {
  if (questionPage > 0) return { activeStep, questionPage: questionPage - 1 };
  return { activeStep: Math.max(0, activeStep - 1), questionPage: 0 };
}
