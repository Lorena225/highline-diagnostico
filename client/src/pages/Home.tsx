import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, CircleHelp, ClipboardList, Compass, FileText, FileUp, Loader2, Mail, Menu, Paperclip, ShieldCheck, Sparkles, X } from "lucide-react";
import { DIAGNOSTIC_SECTIONS, TOTAL_QUESTIONS, type DiagnosticQuestion } from "@shared/diagnostic";
import { isSupportedMaterialFile, MATERIAL_ACCEPT_ATTRIBUTE, MAX_MATERIAL_FILE_BYTES } from "@shared/materials";
import { trpc } from "@/lib/trpc";
import { parseDiagnosticDraft, serializeDiagnosticDraft } from "@/lib/diagnosticDraft";
import { isConversationAnswerDetailed, isConversationAnswerPresent, nextConversationPosition, previousConversationPosition } from "@/lib/conversationFlow";

type StructuredAnswer = Record<string, string>;
type AnswerValue = string | string[] | StructuredAnswer;
type AnswerMap = Record<string, AnswerValue>;
type Respondent = { name: string; role: string; email: string; phone: string };
type MaterialCategory = "digital" | "commercial" | "institutional";
type MaterialAreaState = { category: MaterialCategory; notes: string; files: File[] };
const QUESTIONS_PER_PAGE = 1;

const DRAFT_KEY = "highline-diagnostic-draft-v2";
const asset = {
  logo: "/manus-storage/logo-virtruvia_189e486f.png",
  texture: "/manus-storage/hero-texture-logo_640382f7.webp",
  renaissance: "/manus-storage/hero-renaissance_a008c2cd.webp",
};
const MATERIAL_AREAS: Array<{ category: MaterialCategory; title: string; description: string }> = [
  { category: "digital", title: "Links e ativos digitais", description: "Site, redes sociais, Google Business Profile, landing pages, campanhas, anúncios, vídeos e outros ativos públicos." },
  { category: "commercial", title: "Dados e materiais comerciais", description: "Visão de funil, dados de leads, visitas, matrículas, origem, perdas, relatórios de mídia, apresentações comerciais, scripts, materiais de visita e documentos que ajudem a compreender a jornada de matrícula." },
  { category: "institutional", title: "Materiais institucionais e provas de valor", description: "Proposta pedagógica, projetos, portfólios anonimizados, depoimentos autorizados, materiais institucionais, fotos, vídeos, eventos e outros exemplos que traduzam a experiência High Line." },
];

function VitruvianMark({ small = false }: { small?: boolean }) {
  return <svg aria-hidden="true" className={small ? "vitruvian-mark vitruvian-mark--small" : "vitruvian-mark"} viewBox="0 0 200 200" fill="none"><circle cx="100" cy="100" r="85"/><circle cx="100" cy="100" r="60"/><circle cx="100" cy="100" r="35"/><path d="M100 15v170M15 100h170M40 40l120 120M160 40 40 160"/><path d="m100 18 75 44v76l-75 44-75-44V62l75-44Z"/></svg>;
}

function QuestionField({ question, answer, onChange, questionNumber }: { question: DiagnosticQuestion; answer: AnswerValue | undefined; onChange: (value: AnswerValue) => void; questionNumber: number }) {
  const textValue = typeof answer === "string" ? answer : "";
  const selected = Array.isArray(answer) ? answer : [];
  const structuredValue = answer && typeof answer === "object" && !Array.isArray(answer) ? answer : {};
  const inputId = `question-${question.id}`;

  if (question.type === "checkbox") {
    return <fieldset className="question-field"><legend><span className="question-number">{String(questionNumber).padStart(2, "0")}</span>{question.label}</legend>{question.helper && <p className="field-helper">{question.helper}</p>}<div className="choice-grid">{question.options?.map(option => <label className={`choice-card ${selected.includes(option) ? "choice-card--selected" : ""}`} key={option}><input type="checkbox" checked={selected.includes(option)} onChange={() => onChange(selected.includes(option) ? selected.filter(item => item !== option) : [...selected, option])}/><span className="choice-indicator"><Check size={13}/></span><span>{option}</span></label>)}</div></fieldset>;
  }

  if (question.type === "radio") {
    return <fieldset className="question-field"><legend><span className="question-number">{String(questionNumber).padStart(2, "0")}</span>{question.label}</legend>{question.helper && <p className="field-helper">{question.helper}</p>}<div className="radio-stack">{question.options?.map(option => <label className={`radio-option ${textValue === option ? "radio-option--selected" : ""}`} key={option}><input type="radio" name={question.id} value={option} checked={textValue === option} onChange={() => onChange(option)}/><span className="radio-dot"/><span>{option}</span></label>)}</div></fieldset>;
  }

  if (question.type === "scale") {
    return <fieldset className="question-field"><legend><span className="question-number">{String(questionNumber).padStart(2, "0")}</span>{question.label}</legend>{question.helper && <p className="field-helper">{question.helper}</p>}<div className="scale-row" role="group" aria-label={question.label}>{Array.from({ length: 11 }, (_, index) => <button type="button" className={`scale-option ${textValue === String(index) ? "scale-option--selected" : ""}`} onClick={() => onChange(String(index))} aria-pressed={textValue === String(index)} key={index}>{index}</button>)}</div><div className="scale-labels"><span>0 — Precisa evoluir muito</span><span>10 — Muito consistente</span></div></fieldset>;
  }

  if (question.type === "structured") {
    return <div className="question-field structured-field"><label><span className="question-number">{String(questionNumber).padStart(2, "0")}</span>{question.label}</label>{question.helper && <p className="field-helper">{question.helper}</p>}<div className="structured-grid">{question.fields?.map(field => <label className="structured-input" key={field}><span>{field}</span><textarea rows={3} value={structuredValue[field] ?? ""} onChange={event => onChange({ ...structuredValue, [field]: event.target.value })} placeholder="Preencha se tiver esta informação…"/></label>)}</div>{question.note && <p className="question-note"><ShieldCheck size={14}/><span>{question.note}</span></p>}</div>;
  }

  const isCompact = ["text", "email", "tel", "number"].includes(question.type || "textarea");
  const isStrategicNarrative = ["historia_origem", "visao_inegociavel", "visao_educacao_aluno", "entrega_melhor_que_explicacao", "familias_que_valorizam", "familia_ideal", "experiencia_visita", "visita_inesquecivel"].includes(question.id);
  const wordCount = textValue.trim() ? textValue.trim().split(/\s+/).length : 0;
  return <div className={`question-field ${isStrategicNarrative ? "question-field--narrative" : ""}`}><label htmlFor={inputId}><span className="question-number">{String(questionNumber).padStart(2, "0")}</span>{question.label}<b>*</b></label>{question.helper && <p className="field-helper">{question.helper}</p>}{isCompact ? <input id={inputId} className="text-input" type={question.type || "text"} value={textValue} onChange={event => onChange(event.target.value)} /> : <><textarea id={inputId} className="answer-area" rows={isStrategicNarrative ? 8 : 5} value={textValue} onChange={event => onChange(event.target.value)} placeholder="Escreva sua resposta com o máximo de contexto que puder…"/><p className={`response-guidance ${textValue && wordCount < 10 ? "response-guidance--short" : ""}`}>{wordCount === 0 ? "Uma resposta com contexto ajudará nossa leitura." : wordCount < 10 ? `Resposta curta (${wordCount} palavras). Traga mais contexto antes de continuar.` : `${wordCount} palavras · contexto suficiente para avançar.`}</p></>}{question.note && <p className="question-note"><ShieldCheck size={14}/><span>{question.note}</span></p>}</div>;
}

export default function Home() {
  const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("preview") : null;
  const previewStep = preview === "final" ? DIAGNOSTIC_SECTIONS.length : preview?.startsWith("step-") ? Math.min(DIAGNOSTIC_SECTIONS.length, Math.max(0, Number(preview.replace("step-", "")) || 0)) : null;
  const isPreviewing = previewStep !== null;
  const [activeStep, setActiveStep] = useState(() => previewStep ?? -1);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [respondent, setRespondent] = useState<Respondent>({ name: "", role: "", email: "", phone: "" });
  const [accepted, setAccepted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [questionPage, setQuestionPage] = useState(() => preview === "final" ? Math.ceil(DIAGNOSTIC_SECTIONS.at(-1)!.questions.length / QUESTIONS_PER_PAGE) - 1 : 0);
  const [draftStatus, setDraftStatus] = useState("Rascunho salvo neste dispositivo");
  const [materialAreas, setMaterialAreas] = useState<MaterialAreaState[]>(() => MATERIAL_AREAS.map(area => ({ category: area.category, notes: "", files: [] })));
  const submit = trpc.diagnostic.submit.useMutation();

  useEffect(() => {
    if (isPreviewing) return;
    const draft = window.localStorage.getItem(DRAFT_KEY);
    if (!draft) return;
    try {
      const parsed = parseDiagnosticDraft(draft);
      if (!parsed) throw new Error("Rascunho inválido");
      setAnswers(parsed.answers as AnswerMap);
      setRespondent(parsed.respondent);
      setAccepted(parsed.accepted);
      setActiveStep(parsed.activeStep);
      setQuestionPage(parsed.questionPage);
      setDraftStatus("Rascunho recuperado");
    } catch { window.localStorage.removeItem(DRAFT_KEY); }
  }, []);

  useEffect(() => {
    if (complete || isPreviewing) return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, serializeDiagnosticDraft({ answers, respondent, accepted, activeStep, questionPage }));
      setDraftStatus("Rascunho salvo automaticamente");
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [answers, respondent, accepted, activeStep, questionPage, complete]);

  const totalSteps = DIAGNOSTIC_SECTIONS.length + 1;
  const currentSection = activeStep > 0 ? DIAGNOSTIC_SECTIONS[activeStep - 1] : null;
  const sectionPageCount = currentSection ? Math.ceil(currentSection.questions.length / QUESTIONS_PER_PAGE) : 1;
  const visibleQuestions = currentSection ? currentSection.questions.slice(questionPage * QUESTIONS_PER_PAGE, (questionPage + 1) * QUESTIONS_PER_PAGE) : [];
  const progress = activeStep < 0 ? 0 : Math.min(100, Math.round(((activeStep + 1) / totalSteps) * 100));
  const questionOffset = (activeStep <= 1 ? 0 : DIAGNOSTIC_SECTIONS.slice(0, activeStep - 1).reduce((total, section) => total + section.questions.length, 0)) + questionPage * QUESTIONS_PER_PAGE;

  const begin = () => {
    setActiveStep(0);
    document.querySelector("#diagnostico")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const updateAnswer = (id: string, value: AnswerValue) => setAnswers(current => ({ ...current, [id]: value }));
  const updateRespondent = (key: keyof Respondent, value: string) => setRespondent(current => ({ ...current, [key]: value }));
  const saveDraft = () => { window.localStorage.setItem(DRAFT_KEY, serializeDiagnosticDraft({ answers, respondent, accepted, activeStep, questionPage })); setDraftStatus("Rascunho salvo manualmente agora"); };
  const jumpTo = (index: number) => { setActiveStep(index); setQuestionPage(0); setShowMenu(false); setError(""); document.querySelector("#diagnostico")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const previousPage = () => { const previous = previousConversationPosition(activeStep, questionPage); setActiveStep(previous.activeStep); setQuestionPage(previous.questionPage); setError(""); document.querySelector("#diagnostico")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const currentQuestion = visibleQuestions[0];
  const validateCurrentStep = () => {
    if (activeStep === 0) {
      if (!respondent.name.trim() || !respondent.email.trim()) { setError("Preencha nome completo e e-mail para continuar."); return false; }
      return true;
    }
    if (!currentQuestion) return true;
    const value = answers[currentQuestion.id];
    if (!isConversationAnswerPresent(value)) { setError("Esta resposta é necessária para continuar."); return false; }
    if (!isConversationAnswerDetailed(value, currentQuestion.type === "textarea")) { setError("Esta resposta ainda está curta. Tente trazer mais contexto ou escreva “não sei” se a informação precisar ser levantada."); return false; }
    return true;
  };
  const nextPage = () => { if (!validateCurrentStep()) return; setError(""); const next = nextConversationPosition(activeStep, questionPage, sectionPageCount); setActiveStep(next.activeStep); setQuestionPage(next.questionPage); document.querySelector("#diagnostico")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const updateMaterialNotes = (category: MaterialCategory, notes: string) => setMaterialAreas(current => current.map(area => area.category === category ? { ...area, notes } : area));
  const removeMaterialFile = (category: MaterialCategory, fileName: string) => setMaterialAreas(current => current.map(area => area.category === category ? { ...area, files: area.files.filter(file => `${file.name}-${file.lastModified}` !== fileName) } : area));
  const addMaterialFiles = (category: MaterialCategory, fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const accepted = incoming.filter(isSupportedMaterialFile);
    if (accepted.length !== incoming.length) setError(`Use arquivos permitidos de até ${Math.round(MAX_MATERIAL_FILE_BYTES / 1024 / 1024)} MB por item. Não envie dados pessoais de crianças, famílias ou colaboradores.`);
    setMaterialAreas(current => current.map(area => area.category === category ? { ...area, files: [...area.files, ...accepted].slice(0, 2) } : area));
  };
  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",").at(-1) ?? ""); reader.onerror = () => reject(new Error(`Não foi possível preparar ${file.name}.`)); reader.readAsDataURL(file); });

  const handleSubmit = async () => {
    if (!respondent.name.trim() || !respondent.email.trim()) { setError("Informe seu nome e e-mail para concluir o diagnóstico."); setActiveStep(0); return; }
    const incomplete = DIAGNOSTIC_SECTIONS.flatMap((section, sectionIndex) => section.questions.map((question, questionIndex) => ({ sectionIndex, questionIndex, question }))).find(({ question }) => !isConversationAnswerDetailed(answers[question.id], question.type === "textarea"));
    if (incomplete) { setActiveStep(incomplete.sectionIndex + 1); setQuestionPage(incomplete.questionIndex); setError("Há uma resposta obrigatória pendente ou curta. Complete-a antes de enviar."); document.querySelector("#diagnostico")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (!accepted) { setError("Confirme que você está autorizado(a) a compartilhar estas informações antes de enviar."); return; }
    setError("");
    try {
      const materials = await Promise.all(materialAreas.filter(area => area.notes.trim() || area.files.length > 0).map(async area => ({ category: area.category, notes: area.notes.trim() || undefined, files: await Promise.all(area.files.map(async file => ({ name: file.name, contentType: file.type || "application/octet-stream", dataBase64: await toBase64(file) }))) })));
      const result = await submit.mutateAsync({ respondent, answers, materials });
      if (!result.emailDelivered) {
        setError("As respostas foram registradas, mas a notificação por e-mail ainda não foi confirmada. Não reenvie este formulário para evitar duplicidade; a equipe VirtruvIA pode verificar o registro salvo.");
        return;
      }
      window.localStorage.removeItem(DRAFT_KEY);
      setComplete(true);
      document.querySelector("#diagnostico")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch { setError("Não foi possível concluir o envio agora. Suas respostas permanecem salvas neste dispositivo; tente novamente em alguns instantes."); }
  };

  if (complete) {
    return <main className="page-shell confirmation-page"><span className="success-radiance"/><span className="success-star success-star--one"/><span className="success-star success-star--two"/><span className="success-star success-star--three"/><section className="confirmation-card"><div className="success-seal"><span className="success-seal__ring"/><span className="success-seal__ring success-seal__ring--inner"/><div className="confirmation-icon"><CheckCircle2 strokeWidth={1.6}/></div></div><p className="success-status"><span/>Diagnóstico concluído</p><h1>Obrigada por compartilhar a visão da <em>High Line.</em></h1><div className="hairline"/><p>Suas respostas foram registradas com segurança e a confirmação foi enviada para a equipe VirtruvIA. Este material será a base da leitura estratégica 360°.</p><div className="success-details"><div><ShieldCheck size={17}/><span><b>Respostas registradas</b>Banco de dados atualizado</span></div><div><Mail size={17}/><span><b>E-mail confirmado</b>Equipe notificada</span></div></div><div className="confirmation-meta"><Check size={15}/><span>Envio concluído com sucesso.</span></div></section></main>;
  }

  return <main className="page-shell">
    <header className="top-bar"><a href="#topo" className="brand-link" aria-label="VirtruvIA"><img src={asset.logo} alt="VirtruvIA"/></a><span className="top-bar-divider"/><span className="top-bar-label">Diagnóstico estratégico</span><div className="top-bar-right"><span>High Line School · Goiânia</span><button type="button" className="menu-button" aria-label="Abrir etapas do diagnóstico" onClick={() => setShowMenu(true)}><Menu size={19}/></button></div></header>

    <section id="topo" className="hero-section">
      <span className="hero-texture" style={{ backgroundImage: `url(${asset.texture})` }}/><span className="hero-renaissance" style={{ backgroundImage: `url(${asset.renaissance})` }}/><span className="hero-veil"/><VitruvianMark/><div className="hero-orb"><VitruvianMark small/></div>
      <div className="hero-content"><div className="hero-eyebrow"><img src={asset.logo} alt=""/><span/><p>Consultoria estratégica</p></div><p className="kicker">Diagnóstico 360° VirtruvIA</p><h1>Antes de definir para onde crescer, precisamos enxergar com clareza <em>onde estamos.</em></h1><div className="hero-rule"/><p className="hero-description">Este diagnóstico revela o cenário real da High Line School Goiânia e cria as bases para uma estratégia verdadeiramente sob medida. Analisamos marca, experiência pedagógica, público, reputação, marketing, comercial e capacidade de crescimento para transformar percepções em decisões estratégicas.</p><div className="hero-actions"><button className="primary-button" type="button" onClick={begin}>Iniciar diagnóstico <ArrowDown size={17}/></button><span className="duration-note"><ClipboardList size={17}/> 8 blocos de reflexão estratégica</span></div></div>
      <div className="hero-footer"><span>VirtruvIA · 2026</span><span>Alta confidencialidade · Uso estratégico</span></div>
    </section>

    <section className="introduction-section"><div className="intro-side"><p className="eyebrow">Antes de definir</p><h2>O próximo passo, precisamos compreender o ponto de partida.</h2></div><div className="intro-body"><p>Este diagnóstico é um convite para olhar a High Line School Goiânia com profundidade e honestidade: compreender sua essência, sua realidade e o futuro que deseja construir.</p><p>Não buscamos respostas perfeitas, mas respostas verdadeiras. Compartilhe contextos, exemplos, números e situações reais. Se algo ainda não for conhecido, escreva <strong>“não sei”</strong> ou <strong>“precisamos levantar”</strong>. Reconhecer o que ainda precisa ser compreendido também faz parte do processo.</p><div className="intro-note"><CircleHelp size={18}/><span>Considere os últimos 6 a 12 meses sempre que uma pergunta envolver dados ou indicadores.</span></div></div></section>

    <section id="diagnostico" className="diagnostic-section">
      <div className="progress-wrap"><div className="progress-copy"><span>{activeStep < 0 ? "Pronto para começar" : activeStep === 0 ? "Identificação" : `Bloco ${activeStep} de ${DIAGNOSTIC_SECTIONS.length}`}</span><button type="button" className="draft-button" onClick={saveDraft}><Check size={14}/> Salvar rascunho</button></div><p className="draft-status" aria-live="polite">{draftStatus}</p><div className="progress-track" role="progressbar" aria-label={activeStep < 0 ? "Pronto para começar" : activeStep === 0 ? "Identificação" : `Bloco ${activeStep} de ${DIAGNOSTIC_SECTIONS.length}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }}/></div></div>
      <div className="diagnostic-layout">
        <aside className="step-aside"><p className="eyebrow">Mapa do diagnóstico</p><div className="step-list"><button type="button" className={`step-link ${activeStep === 0 ? "step-link--active" : ""}`} onClick={() => jumpTo(0)}><span>00</span>Identificação</button>{DIAGNOSTIC_SECTIONS.map((section, index) => <button type="button" className={`step-link ${activeStep === index + 1 ? "step-link--active" : ""}`} onClick={() => jumpTo(index + 1)} key={section.id}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</button>)}</div><div className="aside-status"><Compass size={16}/><span>8 blocos estratégicos</span></div></aside>
        <div className="form-card">
          {activeStep < 0 ? <div className="ready-state"><span className="ready-icon"><Sparkles size={21}/></span><p className="eyebrow">Ponto de partida</p><h2>Vamos construir uma leitura completa da High Line.</h2><p>O questionário está organizado em oito blocos estratégicos. Você pode navegar livremente entre as etapas: suas respostas ficam salvas neste dispositivo até o envio final.</p><button type="button" className="primary-button" onClick={begin}>Começar agora <ArrowRight size={17}/></button></div> : activeStep === 0 ? <div className="identity-step"><p className="eyebrow">Etapa 00 · Identificação</p><h2>Quem está respondendo?</h2><p className="step-intro">Esses dados permitem que a VirtruvIA compreenda o contexto de cada resposta e faça os acompanhamentos necessários.</p><div className="identity-grid"><div className="question-field"><label htmlFor="respondent-name"><span className="question-number">01</span>Nome completo <b>*</b></label><input id="respondent-name" className="text-input" value={respondent.name} onChange={event => updateRespondent("name", event.target.value)} autoComplete="name"/></div><div className="question-field"><label htmlFor="respondent-role"><span className="question-number">02</span>Cargo ou área</label><input id="respondent-role" className="text-input" value={respondent.role} onChange={event => updateRespondent("role", event.target.value)}/></div><div className="question-field"><label htmlFor="respondent-email"><span className="question-number">03</span>E-mail <b>*</b></label><input id="respondent-email" className="text-input" type="email" value={respondent.email} onChange={event => updateRespondent("email", event.target.value)} autoComplete="email"/></div><div className="question-field"><label htmlFor="respondent-phone"><span className="question-number">04</span>Telefone</label><input id="respondent-phone" className="text-input" type="tel" value={respondent.phone} onChange={event => updateRespondent("phone", event.target.value)} autoComplete="tel"/></div></div></div> : currentSection ? <div className="section-step"><div className="section-heading"><div><p className="eyebrow">Bloco {String(activeStep).padStart(2, "0")}</p><h2>{currentSection.title}</h2></div><span className="question-total">Parte {questionPage + 1} de {sectionPageCount}</span></div><p className="section-rationale">{currentSection.rationale}</p><div className="section-questions">{visibleQuestions.map((question, index) => <QuestionField question={question} answer={answers[question.id]} onChange={value => updateAnswer(question.id, value)} questionNumber={questionOffset + index + 1} key={question.id}/>)}</div></div> : null}

          {error && activeStep >= 0 && <p className="conversation-error" role="alert">{error}</p>}{activeStep >= 0 && <div className="form-navigation">{activeStep > 0 || questionPage > 0 ? <button className="secondary-button" type="button" onClick={previousPage}><ArrowLeft size={16}/> Voltar</button> : <span/>}{currentSection && questionPage < sectionPageCount - 1 ? <button className="primary-button" type="button" onClick={nextPage}>Continuar <ArrowRight size={16}/></button> : activeStep < DIAGNOSTIC_SECTIONS.length ? <button className="primary-button" type="button" onClick={nextPage}>Próximo bloco <ArrowRight size={16}/></button> : <button className="primary-button" type="button" onClick={() => { if (validateCurrentStep()) document.querySelector("#submission")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Revisar e enviar <ArrowRight size={16}/></button>}</div>}
        </div>
      </div>

      {activeStep === DIAGNOSTIC_SECTIONS.length && questionPage === sectionPageCount - 1 && <section id="submission" className="submission-section"><div className="final-transition"><span className="final-transition__line"/><p className="eyebrow">Etapa final</p><h2>Você chegou à etapa final do diagnóstico.</h2><p>As respostas acima já são suficientes para iniciarmos uma leitura estratégica da High Line. Os materiais de apoio abaixo são complementares e poderão ser organizados posteriormente, conforme disponibilidade da escola.</p></div><section className="support-materials"><div className="support-materials__heading"><p className="eyebrow">Materiais de apoio para aprofundamento</p><h2>Contextos que ajudam a transformar visão em recomendação.</h2><p>Não é necessário reunir todos os documentos antes de concluir este formulário. Se algum item não existir, não estiver disponível agora ou depender de autorização interna, basta sinalizar. Nosso objetivo é aprofundar a análise, não criar uma carga adicional para a equipe.</p></div><div className="support-materials__grid">{MATERIAL_AREAS.map(config => { const area = materialAreas.find(item => item.category === config.category)!; return <article className="material-area" key={config.category}><div className="material-area__icon"><Paperclip size={17}/></div><h3>{config.title}</h3><p>{config.description}</p><label className="material-label" htmlFor={`material-notes-${config.category}`}>Links ou observações</label><textarea id={`material-notes-${config.category}`} value={area.notes} onChange={event => updateMaterialNotes(config.category, event.target.value)} placeholder="Cole links ou acrescente um contexto institucional…" rows={3}/><label className="material-upload" htmlFor={`material-upload-${config.category}`}><FileUp size={17}/><span><b>Adicionar arquivos</b>Opcional · até 2 arquivos de 3 MB</span><input id={`material-upload-${config.category}`} type="file" accept={MATERIAL_ACCEPT_ATTRIBUTE} multiple onChange={event => { addMaterialFiles(config.category, event.target.files); event.currentTarget.value = ""; }}/></label>{area.files.length > 0 && <ul className="material-file-list">{area.files.map(file => { const fileKey = `${file.name}-${file.lastModified}`; return <li key={fileKey}><FileText size={14}/><span>{file.name}</span><button type="button" aria-label={`Remover ${file.name}`} onClick={() => removeMaterialFile(config.category, fileKey)}><X size={14}/></button></li>})}</ul>}</article>})}</div><p className="materials-privacy"><ShieldCheck size={16}/><span>Envie apenas materiais institucionais, públicos, autorizados ou anonimizados. Não inclua dados pessoais, imagens identificáveis ou informações individuais de crianças, famílias e colaboradores.</span></p></section><div className="consent-card"><div className="consent-heading"><Mail size={21}/><div><p className="eyebrow">Finalização estratégica</p><h2>Preparado para enviar?</h2></div></div><p className="final-thanks">As informações compartilhadas até aqui já nos permitem iniciar uma leitura profunda da High Line. Obrigada por dividir a história, a visão e os desafios da escola conosco.</p><p>O diagnóstico analisará essência e posicionamento, percepção de valor, perfil das famílias atuais e desejadas, comunicação, marketing e reputação, atração e qualificação de leads, experiência de visita, jornada comercial e conversão, indicação, comunidade e crescimento. O objetivo não é gerar mais leads indiscriminadamente, mas construir uma estratégia para que a High Line seja mais compreendida, desejada, recomendada e escolhida pelas famílias compatíveis com sua proposta.</p><label className={`consent-check ${accepted ? "consent-check--checked" : ""}`}><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)}/><span className="choice-indicator"><Check size={13}/></span><span>Confirmo que estou autorizado(a) a compartilhar estas informações em nome da High Line School. <b>*</b></span></label>{error && <p className="form-error">{error}</p>}<button type="button" className="primary-button primary-button--wide" onClick={handleSubmit} disabled={submit.isPending}>{submit.isPending ? <><Loader2 size={17} className="spin"/> Validando e enviando…</> : <>Enviar diagnóstico completo <ChevronRight size={17}/></>}</button><p className="security-note"><ShieldCheck size={15}/> Informações utilizadas exclusivamente para o projeto estratégico da High Line School.</p></div></section>}
    </section>

    <footer className="site-footer"><span className="footer-renaissance" style={{ backgroundImage: `url(${asset.renaissance})` }}/><div><img src={asset.logo} alt="VirtruvIA"/><p>Estratégia, verdade e crescimento com intenção.</p></div><div className="footer-note">Diagnóstico 360°<br/>High Line School Goiânia</div></footer>

    {submit.isPending && <div className="submit-overlay" role="status" aria-live="polite" aria-label="Enviando o diagnóstico"><div className="submit-panel"><div className="loading-orbit"><VitruvianMark small/><span className="loading-orbit__center"><Loader2 size={23} className="spin"/></span></div><p className="eyebrow">Momento de síntese</p><h2>Estamos guardando cada resposta com cuidado.</h2><p>Registrando o diagnóstico e preparando a confirmação para a equipe VirtruvIA.</p><div className="loading-line"><span/></div><div className="loading-steps"><span><i/>Respostas registradas</span><span><i/>Confirmação em processamento</span></div></div></div>}

    {showMenu && <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Etapas do diagnóstico"><button className="menu-backdrop" aria-label="Fechar menu" onClick={() => setShowMenu(false)}/><div className="menu-panel"><button className="close-menu" aria-label="Fechar" onClick={() => setShowMenu(false)}><X size={19}/></button><p className="eyebrow">Navegação</p><h2>Etapas do diagnóstico</h2><button type="button" className="step-link" onClick={() => jumpTo(0)}><span>00</span>Identificação</button>{DIAGNOSTIC_SECTIONS.map((section, index) => <button type="button" className="step-link" onClick={() => jumpTo(index + 1)} key={section.id}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</button>)}</div></div>}
  </main>;
}
