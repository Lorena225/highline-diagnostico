import { describe, expect, it } from "vitest";
import { canNavigateToConversationStep, isConversationAnswerDetailed, nextConversationPosition, previousConversationPosition } from "../client/src/lib/conversationFlow";

describe("fluxo conversacional do diagnóstico", () => {
  it("bloqueia respostas narrativas curtas e aceita contexto suficiente", () => {
    expect(isConversationAnswerDetailed("muito bom", true)).toBe(false);
    expect(isConversationAnswerDetailed("A proposta une acolhimento, autonomia, repertório, presença e excelência acadêmica de forma consistente.", true)).toBe(true);
    expect(isConversationAnswerDetailed("não sei", true)).toBe(true);
  });

  it("avança e retorna preservando a pergunta exata na jornada", () => {
    expect(nextConversationPosition(2, 1, 3)).toEqual({ activeStep: 2, questionPage: 2 });
    expect(nextConversationPosition(2, 2, 3)).toEqual({ activeStep: 3, questionPage: 0 });
    expect(previousConversationPosition(3, 0)).toEqual({ activeStep: 2, questionPage: 0 });
    expect(previousConversationPosition(2, 2)).toEqual({ activeStep: 2, questionPage: 1 });
  });

  it("não permite saltar para blocos futuros pela navegação lateral", () => {
    expect(canNavigateToConversationStep(2, 3)).toBe(false);
    expect(canNavigateToConversationStep(2, 2)).toBe(true);
    expect(canNavigateToConversationStep(2, 1)).toBe(true);
  });
});
