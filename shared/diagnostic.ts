export type QuestionType = "textarea" | "text" | "email" | "tel" | "number" | "checkbox" | "radio" | "scale" | "structured";

export type DiagnosticQuestion = {
  id: string;
  label: string;
  type?: QuestionType;
  helper?: string;
  note?: string;
  options?: string[];
  fields?: string[];
  required?: boolean;
};

export type DiagnosticSection = {
  id: string;
  title: string;
  rationale: string;
  questions: DiagnosticQuestion[];
};

const text = (id: string, label: string, helper?: string, note?: string): DiagnosticQuestion => ({ id, label, helper, note, type: "textarea" });
const structured = (id: string, label: string, fields: string[], helper?: string, note?: string): DiagnosticQuestion => ({ id, label, fields, helper, note, type: "structured" });

export const DIAGNOSTIC_SECTIONS: DiagnosticSection[] = [
  {
    id: "contexto-oferta",
    title: "Contexto, oferta e prioridades de matrícula",
    rationale: "Antes de falar sobre comunicação e campanhas, precisamos entender a estrutura atual da High Line, onde existem oportunidades de crescimento e quais matrículas são prioritárias. Isso orienta uma estratégia que atrai demanda qualificada para as vagas certas.",
    questions: [
      text("pitch_30s", "Em poucas frases, como você apresentaria a High Line School para uma família que ainda não conhece a escola?"),
      structured("oferta_e_regioes", "Quais segmentos, séries, turnos, programas ou serviços a High Line oferece atualmente e quais são as unidades, endereços ou principais regiões atendidas?", ["Segmentos, séries, turnos, programas e serviços", "Unidades, endereços e regiões atendidas"]),
      text("vagas_prioritarias", "Quais turmas, séries, segmentos ou turnos possuem vagas e precisam ser priorizados na captação de novas matrículas?"),
      text("ocupacao_demanda", "Quais turmas ou segmentos apresentam maior ocupação, procura recorrente ou lista de espera?"),
      text("faixa_investimento", "Qual é a faixa de investimento para uma família estudar na High Line, considerando mensalidade, taxas e serviços relevantes? Caso existam condições comerciais, bolsas ou descontos, descreva de forma geral."),
      text("matricula_ideal_capacidade", "Qual é o perfil de matrícula ideal para a High Line neste momento? Há alguma limitação de capacidade, equipe, estrutura ou experiência a considerar antes de ampliar a captação? Quais oportunidades de crescimento imediato existem sem comprometer a qualidade?"),
    ],
  },
  {
    id: "origem-essencia",
    title: "Origem, essência e visão de futuro",
    rationale: "Este bloco busca compreender a origem, as convicções e a visão que dão identidade à High Line. As respostas serão utilizadas para traduzir a essência real da escola em posicionamento, conteúdo, experiência de visita e comunicação com as famílias.",
    questions: [
      text("historia_origem", "Conte a história de origem da High Line: como ela surgiu, que experiência ou incômodo motivou sua criação e qual problema da educação vocês desejavam resolver?"),
      text("visao_inegociavel", "Qual era a visão original da High Line e o que continua absolutamente inegociável na proposta da escola, mesmo após sua evolução?"),
      text("visao_educacao_aluno", "Qual é a visão da High Line sobre infância e educação, o que a escola acredita que o modelo tradicional frequentemente deixa de desenvolver e que tipo de aluno deseja formar?"),
      text("equilibrio_formacao", "Como a High Line equilibra desenvolvimento acadêmico, autonomia, acolhimento, repertório e competências socioemocionais?"),
      text("entrega_melhor_que_explicacao", "O que a High Line entrega melhor do que hoje consegue comunicar para uma família que ainda não a conhece?"),
      text("mensagens_mal_compreendidas", "Quais mensagens ou crenças da High Line hoje são mal compreendidas, pouco comunicadas ou tratadas com receio? Como vocês gostariam que famílias e colaboradores as interpretassem?", "A intenção é identificar convicções que possam ser explicadas com clareza, contexto e responsabilidade, e não criar campanhas controversas."),
      text("orgulho_futuro_legado", "Qual parte da experiência High Line mais representa o orgulho da escola e deveria ser conhecida antes de uma visita? Como a High Line deve estar daqui a 5 anos em termos de impacto, crescimento, reconhecimento, comunidade e legado?"),
      text("essencia_protegida", "Com o crescimento, qual elemento da essência da High Line não pode ser perdido e o que precisa ser protegido para preservá-lo?"),
    ],
  },
  {
    id: "publico-demanda",
    title: "Público atual, família ideal e demanda",
    rationale: "O objetivo é diferenciar o público que chega hoje da família que a High Line deseja atrair e converter. Não buscamos gerar mais leads a qualquer custo, mas atrair famílias alinhadas com proposta, experiência e faixa de investimento.",
    questions: [
      text("familias_que_valorizam", "Descreva as famílias atuais que mais valorizam e permanecem na High Line: perfil, região, momento de vida, valores e principais razões de escolha."),
      structured("perfil_predominante", "Preencha, se possível, o quadro de perfil predominante das famílias atuais.", ["Faixas de investimento percebidas: Faixa 1, Faixa 2 e Faixa 3", "Bairros, regiões, condomínios ou cidades de origem", "Perfis profissionais mais recorrentes", "Valores, expectativas e critérios de escolha", "Hábitos, eventos, fontes de informação e temas consumidos", "Valores culturais, familiares ou religiosos relevantes para a experiência escolar", "Elogios, sugestões, críticas ou dúvidas recorrentes", "Temas de alinhamento entre escola e família"], undefined, "Não é necessário identificar famílias individualmente. O objetivo é compreender padrões de comunidade, decisão e comunicação, sem usar valores religiosos como classificação ou segmentação."),
      text("decisao_matricula", "Quem normalmente inicia a busca, influencia e toma a decisão final de matrícula dentro da família?"),
      text("familia_ideal", "Descreva a família ideal da High Line: capacidade de investimento, bairro ou região, profissão, valores, comportamento, repertório cultural, expectativa pedagógica e momento de vida."),
      text("objecoes_e_desalinhamento", "Quais são as dúvidas e objeções mais recorrentes antes, durante e depois da visita? Descreva também o perfil dos leads que não avançam por incompatibilidade de investimento ou expectativa e sua percepção sobre a causa."),
      text("circulos_relacionamento", "Quais regiões, comunidades, parceiros ou círculos de relacionamento concentram as famílias que a High Line deseja atrair?"),
    ],
  },
  {
    id: "produto-experiencia",
    title: "Produto, experiência e provas de valor",
    rationale: "A High Line precisa transformar sua entrega educacional em experiências e evidências que uma família consiga perceber, compreender e valorizar antes da matrícula. Este bloco identifica o que deve aparecer na comunicação, na visita e na argumentação comercial.",
    questions: [
      text("pilares_pedagogicos", "Quais são os pilares pedagógicos da High Line e como eles aparecem concretamente na rotina, nos projetos e na experiência dos alunos?"),
      text("acolhimento_devolutivas", "Como a High Line acolhe, acompanha e comunica o desenvolvimento de cada criança à família, desde a adaptação até as devolutivas periódicas?"),
      text("modelo_devolutiva", "Existe algum modelo institucional de relatório, portfólio, apresentação ou roteiro de devolutiva utilizado na comunicação com as famílias? Caso exista, indique se há um modelo anonimizado que possa ser compartilhado posteriormente."),
      text("compreensao_devolutivas", "Como as famílias recebem e compreendem as devolutivas sobre o desenvolvimento dos filhos? Quais dúvidas, expectativas, interpretações ou objeções aparecem com maior frequência?"),
      text("docentes_e_frentes", "O que o corpo docente faz de diferente e como isso se manifesta na experiência da criança e da família? Quais frentes mais diferenciam a proposta, como inglês, projetos, tecnologia, artes, leitura, esporte e desenvolvimento socioemocional, e como elas se integram?"),
      text("cuidado_e_comunicacao", "Quais padrões de cuidado, segurança e comunicação com famílias são diferenciais percebidos da High Line?"),
      text("momentos_mostrar", "Quais momentos, projetos e experiências melhor materializam a essência da High Line e merecem ser mostrados para famílias que ainda não conhecem a escola?"),
      text("provas_e_depoimentos", "Quais provas institucionais, resultados, portfólios anonimizados, produções, indicadores ou histórias autorizadas ajudam a demonstrar a qualidade da metodologia? Quais histórias ou depoimentos de famílias poderiam ser usados, mediante autorização, como prova social?", undefined, "Quando houver interesse em compartilhar materiais, utilize apenas exemplos institucionais, autorizados ou anonimizados. Nenhum dado pessoal de crianças deve ser enviado nesta etapa."),
    ],
  },
  {
    id: "concorrencia-posicionamento",
    title: "Concorrência e posicionamento",
    rationale: "A High Line não compete apenas com outras escolas: disputa atenção, confiança e percepção de valor. Este bloco ajuda a identificar brechas de mercado e a posição que a escola deve conquistar na mente das famílias.",
    questions: [
      text("concorrentes_prioritarios", "Cite até três concorrentes prioritários da High Line e indique se eles competem principalmente na Educação Infantil, no Ensino Fundamental ou em ambos os segmentos."),
      structured("leitura_concorrentes", "Para cada concorrente, descreva brevemente a proposta percebida, força de marca ou comunicação, o que fazem bem, em que a High Line acredita ser superior e o risco ou oportunidade que representam.", ["Concorrente 1", "Concorrente 2", "Concorrente 3"]),
      text("comparacao_lacuna", "Quando famílias comparam a High Line com outras escolas, quais critérios pesam mais, onde vocês acreditam que perdem e qual lacuna de mercado podem ocupar?"),
      text("marcas_admiradas", "Cite até três marcas ou instituições que vocês admiram pela experiência, atendimento ou comunicação. O que especificamente admiram em cada uma?"),
      text("percepcao_valor_qualidade", "Em uma frase, sobre percepção de valor e posição em qualidade, o que vocês gostariam que viesse à mente de uma família goiana ao ouvir o nome High Line School?", "Pense na associação espontânea que a marca deve conquistar: não apenas no que a escola faz, mas no lugar que deve ocupar na mente das famílias."),
    ],
  },
  {
    id: "marketing-reputacao",
    title: "Marketing, presença e reputação",
    rationale: "Este bloco avalia como a High Line se apresenta ao mercado hoje. O foco não é apenas alcance ou volume de leads, mas a capacidade de comunicar a essência da escola, gerar confiança e atrair famílias compatíveis.",
    questions: [
      text("acoes_e_agencia", "Descreva as principais ações, canais, campanhas e investimentos de marketing dos últimos 12 meses. O que funcionou, o que não funcionou e quais responsabilidades a agência atual assume? O que ela compreende bem sobre a High Line e o que ainda não consegue traduzir ou entregar?"),
      text("ativos_e_conteudos", "Quais ativos digitais e conteúdos melhor traduzem a High Line hoje e quais parecem desconectados da essência ou não geram interesse qualificado?"),
      { id: "nota_presenca_digital", label: "Em uma escala de 0 a 10, como você avalia a presença digital atual da High Line? Por quê?", type: "scale" },
      text("acervo_conteudo", "A escola possui fotos, vídeos, histórias, professores e famílias disponíveis para uma produção recorrente de conteúdo? Descreva brevemente o que existe hoje, priorizando materiais institucionais, autorizados ou anonimizados."),
      text("reputacao_recorrente", "Quais elogios, críticas, dúvidas ou temas recorrentes aparecem em avaliações, mensagens e conversas com famílias?"),
      text("comunicacao_nao_associar", "Que tipo de linguagem, conteúdo, estética ou campanha não deve ser associada à High Line de forma alguma?"),
    ],
  },
  {
    id: "comercial-conversao",
    title: "Jornada comercial, visita e conversão",
    rationale: "Uma matrícula é consequência de uma jornada bem conduzida. Este bloco identifica como uma família é recebida, qualificada, encantada e acompanhada até a decisão, sem transformar o processo em uma venda genérica ou pressionada.",
    questions: [
      text("primeiro_atendimento", "Como funciona o primeiro atendimento e a qualificação de um lead, desde a entrada do contato até o agendamento de uma visita? Quem atende hoje, por quais canais e qual é a percepção da escola sobre agilidade e qualidade desse atendimento?"),
      text("investimento_objecoes", "Como o time apresenta o investimento, lida com objeções e registra o relacionamento com a família até a decisão de matrícula?"),
      text("experiencia_visita", "Descreva a experiência atual de visita: quem recebe a família, o que ela conhece, como a proposta é apresentada e o que ela recebe ao final."),
      text("pos_visita", "O que acontece depois da visita: proposta, contatos posteriores, acompanhamento, principais perdas e próximos passos?"),
      text("ponto_perda", "Em qual momento da jornada a escola acredita perder mais famílias hoje e por quê?"),
      text("visita_inesquecivel", "Como seria uma experiência de visita e matrícula inesquecível, coerente com a promessa premium da High Line?"),
    ],
  },
  {
    id: "indicacao-governanca",
    title: "Indicação, metas e governança",
    rationale: "Em Goiânia, confiança e indicação têm peso decisivo na escolha de uma escola. Este bloco identifica como ampliar reputação, transformar famílias em promotoras e alinhar a estratégia com metas, responsáveis e capacidade de execução.",
    questions: [
      text("indicacao_promotores", "Como a indicação funciona hoje: participação nas matrículas, registro de origem, famílias promotoras e ações de reconhecimento? Quais experiências tornam uma família orgulhosa e mais propensa a recomendar a High Line?"),
      text("eventos_parcerias", "Quais eventos, parcerias, comunidades ou canais de relacionamento fortalecem ou poderiam fortalecer a reputação e a indicação da escola?"),
      text("metas_prioridades", "Quais são as metas prioritárias da High Line para os próximos 3, 6 e 12 meses em relação a matrículas, ocupação, faturamento, reconhecimento ou crescimento? Quais turmas, segmentos ou objetivos devem receber prioridade nos próximos 90 dias?"),
      text("investimento_sustentavel", "Qual investimento mensal em mídia e produção de conteúdo a escola considera sustentável para uma estratégia de pelo menos 90 dias?"),
      text("responsaveis_aprovacoes", "Quem será o principal ponto de contato com a VirtruvIA e quem aprova conteúdo, campanhas, investimento e decisões relacionadas à jornada de matrícula?"),
      text("prazo_e_sucesso", "Qual é o prazo máximo aceitável para aprovações, quais limitações precisam ser consideradas e o que precisaria acontecer nos primeiros 90 dias para que a gestão considerasse a parceria no caminho certo?"),
    ],
  },
];

export const TOTAL_QUESTIONS = DIAGNOSTIC_SECTIONS.reduce((total, section) => total + section.questions.length, 0);
