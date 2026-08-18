export type StoredDiagnosticDraft = {
  answers: Record<string, unknown>;
  respondent: { name: string; role: string; email: string; phone: string };
  accepted: boolean;
  activeStep: number;
  questionPage: number;
};

export function serializeDiagnosticDraft(draft: StoredDiagnosticDraft) {
  return JSON.stringify(draft);
}

export function parseDiagnosticDraft(raw: string): StoredDiagnosticDraft | null {
  try {
    const value = JSON.parse(raw) as Partial<StoredDiagnosticDraft>;
    if (!value.answers || !value.respondent || typeof value.activeStep !== "number" || typeof value.questionPage !== "number") return null;
    return {
      answers: value.answers,
      respondent: value.respondent,
      accepted: Boolean(value.accepted),
      activeStep: Math.max(0, value.activeStep),
      questionPage: Math.max(0, value.questionPage),
    };
  } catch {
    return null;
  }
}
