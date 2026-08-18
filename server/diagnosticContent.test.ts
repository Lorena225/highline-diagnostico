import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_SECTIONS, TOTAL_QUESTIONS } from "../shared/diagnostic";

describe("estrutura do diagnóstico", () => {
  it("inicia com o Bloco 1 de contexto, estrutura e oferta educacional completo", () => {
    const firstSection = DIAGNOSTIC_SECTIONS[0];

    expect(firstSection).toMatchObject({
      id: "contexto-oferta",
      title: "Contexto, estrutura e oferta educacional",
    });
    expect(firstSection?.questions).toHaveLength(15);
    expect(firstSection?.questions.map(question => question.id)).toEqual([
      "pitch_30s",
      "segmentos_atendidos",
      "unidades_enderecos",
      "capacidade_maxima",
      "alunos_atuais",
      "vagas_prioritarias",
      "turmas_maior_procura",
      "turmas_ociosidade",
      "mensalidades_taxas",
      "investimento_anual",
      "condicoes_comerciais",
      "limites_comerciais",
      "fontes_receita",
      "ofertas_estrategicas",
      "matricula_ideal",
    ]);
  });

  it("mantém a contagem total derivada de todas as seções", () => {
    expect(TOTAL_QUESTIONS).toBe(DIAGNOSTIC_SECTIONS.reduce((total, section) => total + section.questions.length, 0));
  });

  it("inclui as novas perguntas de branding, privacidade e percepção de valor", () => {
    const essence = DIAGNOSTIC_SECTIONS.find(section => section.id === "origem-essencia");
    const experience = DIAGNOSTIC_SECTIONS.find(section => section.id === "produto-experiencia");
    const positioning = DIAGNOSTIC_SECTIONS.find(section => section.id === "concorrencia-posicionamento");

    expect(essence?.questions.some(question => question.id === "branding_mal_interpretado")).toBe(true);
    expect(experience?.questions.find(question => question.id === "provas_qualidade")?.note).toContain("autorização específica");
    expect(positioning?.questions.some(question => question.id === "percepcao_valor_qualidade")).toBe(true);
  });
});
