import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_SECTIONS, TOTAL_QUESTIONS } from "../shared/diagnostic";

describe("estrutura do diagnóstico", () => {
  it("inicia com o Bloco 1 de contexto, oferta e prioridades de matrícula", () => {
    const firstSection = DIAGNOSTIC_SECTIONS[0];

    expect(firstSection).toMatchObject({
      id: "contexto-oferta",
      title: "Contexto, oferta e prioridades de matrícula",
    });
    expect(firstSection?.questions).toHaveLength(6);
    expect(firstSection?.questions.map(question => question.id)).toEqual([
      "pitch_30s",
      "oferta_e_regioes",
      "vagas_prioritarias",
      "ocupacao_demanda",
      "faixa_investimento",
      "matricula_ideal_capacidade",
    ]);
  });

  it("mantém a contagem total derivada de todas as seções", () => {
    expect(TOTAL_QUESTIONS).toBe(DIAGNOSTIC_SECTIONS.reduce((total, section) => total + section.questions.length, 0));
    expect(TOTAL_QUESTIONS).toBe(51);
    expect(DIAGNOSTIC_SECTIONS).toHaveLength(8);
  });

  it("inclui as novas perguntas de branding, privacidade e percepção de valor", () => {
    const essence = DIAGNOSTIC_SECTIONS.find(section => section.id === "origem-essencia");
    const experience = DIAGNOSTIC_SECTIONS.find(section => section.id === "produto-experiencia");
    const positioning = DIAGNOSTIC_SECTIONS.find(section => section.id === "concorrencia-posicionamento");

    expect(essence?.questions.some(question => question.id === "mensagens_mal_compreendidas")).toBe(true);
    expect(experience?.questions.find(question => question.id === "provas_e_depoimentos")?.note).toContain("Nenhum dado pessoal");
    expect(positioning?.questions.some(question => question.id === "percepcao_valor_qualidade")).toBe(true);
  });
});
