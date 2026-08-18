import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, CircleHelp, ClipboardList, Compass, Loader2, Mail, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import { DIAGNOSTIC_SECTIONS, MATERIALS_REQUESTED, TOTAL_QUESTIONS, type DiagnosticQuestion } from "@shared/diagnostic";
import { trpc } from "@/lib/trpc";

type AnswerMap = Record<string, string | string[]>;
type Respondent = { name: string; role: string; email: string; phone: string };

const DRAFT_KEY = "highline-diagnostic-draft-v1";
const asset = {
  logo: "/manus-storage/logo-virtruvia_189e486f.png",
  texture: "/manus-storage/hero-texture-logo_640382f7.webp",
  renaissance: "/manus-storage/hero-renaissance_a008c2cd.webp",
};

function VitruvianMark({ small = false }: { small?: boolean }) {
  return <svg aria-hidden="true" className={small ? "vitruvian-mark vitruvian-mark--small" : "vitruvian-mark"} viewBox="0 0 200 200" fill="none"><circle cx="100" cy="100" r="85"/><circle cx="100" cy="100" r="60"/><circle cx="100" cy="100" r="35"/><path d="M100 15v170M15 100h170M40 40l120 120M160 40 40 160"/><path d="m100 18 75 44v76l-75 44-75-44V62l75-44Z"/></svg>;
}

function QuestionField({ question, answer, onChange, questionNumber }: { question: DiagnosticQuestion; answer: string | string[] | undefined; onChange: (value: string | string[]) => void; questionNumber: number }) {
  const textValue = typeof answer === "string" ? answer : "";
  const selected = Array.isArray(answer) ? answer : [];
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

  const isCompact = ["text", "email", "tel", "number"].includes(question.type || "textarea");
  return <div className="question-field"><label htmlFor={inputId}><span className="question-number">{String(questionNumber).padStart(2, "0")}</span>{question.label}</label>{question.helper && <p className="field-helper">{question.helper}</p>}{isCompact ? <input id={inputId} className="text-input" type={question.type || "text"} value={textValue} onChange={event => onChange(event.target.value)} /> : <textarea id={inputId} className="answer-area" rows={5} value={textValue} onChange={event => onChange(event.target.value)} placeholder="Escreva sua resposta com o máximo de contexto que puder…"/>}</div>;
}

function getAnsweredCount(answers: AnswerMap) {
  return Object.values(answers).filter(value => Array.isArray(value) ? value.length > 0 : value.trim().length > 0).length;
}

export default function Home() {
  const [activeStep, setActiveStep] = useState(-1);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [respondent, setRespondent] = useState<Respondent>({ name: "", role: "", email: "", phone: "" });
  const [accepted, setAccepted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const submit = trpc.diagnostic.submit.useMutation();

  useEffect(() => {
    const draft = window.localStorage.getItem(DRAFT_KEY);
    if (!draft) return;
    try {
      const parsed = JSON.parse(draft) as { answers?: AnswerMap; respondent?: Respondent; accepted?: boolean; activeStep?: number };
      setAnswers(parsed.answers ?? {});
      setRespondent(parsed.respondent ?? { name: "", role: "", email: "", phone: "" });
      setAccepted(Boolean(parsed.accepted));
      setActiveStep(typeof parsed.activeStep === "number" ? parsed.activeStep : -1);
    } catch { window.localStorage.removeItem(DRAFT_KEY); }
  }, []);

  useEffect(() => {
    if (complete) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, respondent, accepted, activeStep }));
  }, [answers, respondent, accepted, activeStep, complete]);

  const answeredCount = useMemo(() => getAnsweredCount(answers), [answers]);
  const totalSteps = DIAGNOSTIC_SECTIONS.length + 1;
  const currentSection = activeStep >= 0 ? DIAGNOSTIC_SECTIONS[activeStep] : null;
  const progress = activeStep < 0 ? 0 : Math.min(100, Math.round(((activeStep + 1) / totalSteps) * 100));
  const questionOffset = activeStep <= 0 ? 0 : DIAGNOSTIC_SECTIONS.slice(0, activeStep).reduce((total, section) => total + section.questions.length, 0);

  const begin = () => {
    setActiveStep(0);
    document.querySelector("#diagnostico")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const updateAnswer = (id: string, value: string | string[]) => setAnswers(current => ({ ...current, [id]: value }));
  const updateRespondent = (key: keyof Respondent, value: string) => setRespondent(current => ({ ...current, [key]: value }));
  const jumpTo = (index: number) => { setActiveStep(index); setShowMenu(false); document.querySelector("#diagnostico")?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const handleSubmit = async () => {
    if (!respondent.name.trim() || !respondent.email.trim()) { setError("Informe seu nome e e-mail para concluir o diagnóstico."); setActiveStep(0); return; }
    if (!accepted) { setError("Confirme que você está autorizado(a) a compartilhar estas informações antes de enviar."); return; }
    setError("");
    try {
      const result = await submit.mutateAsync({ respondent, answers });
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
      <div className="hero-content"><div className="hero-eyebrow"><img src={asset.logo} alt=""/><span/><p>Consultoria estratégica</p></div><p className="kicker">Diagnóstico 360° VirtruvIA</p><h1>Uma estratégia de crescimento começa por <em>conhecer a verdade.</em></h1><div className="hero-rule"/><p className="hero-description">Este diagnóstico é o ponto de partida para uma estratégia feita sob medida para a High Line School Goiânia: marca, experiência pedagógica, público, reputação, marketing, comercial e capacidade de crescimento.</p><div className="hero-actions"><button className="primary-button" type="button" onClick={begin}>Iniciar diagnóstico <ArrowDown size={17}/></button><span className="duration-note"><ClipboardList size={17}/> 10 blocos de reflexão estratégica</span></div></div>
      <div className="hero-footer"><span>VirtruvIA · 2026</span><span>Alta confidencialidade · Uso estratégico</span></div>
    </section>

    <section className="introduction-section"><div className="intro-side"><p className="eyebrow">Antes de começar</p><h2>Não é um formulário genérico.</h2></div><div className="intro-body"><p>Queremos compreender profundamente a escola: sua história, visão educacional, proposta pedagógica, experiência das famílias, processo de matrícula, reputação, público atual e ambição de futuro.</p><p>Responda com sinceridade e contexto. Sempre que possível, traga exemplos reais, números, nomes de projetos, materiais e situações vividas. Caso não tenha uma informação, escreva <strong>“não sei”</strong> ou <strong>“precisamos levantar”</strong>.</p><div className="intro-note"><CircleHelp size={18}/><span>Considere os últimos 6 a 12 meses sempre que uma pergunta envolver dados ou indicadores.</span></div></div></section>

    <section id="diagnostico" className="diagnostic-section">
      <div className="progress-wrap"><div className="progress-copy"><span>{activeStep < 0 ? "Pronto para começar" : `Etapa ${Math.min(activeStep + 1, totalSteps)} de ${totalSteps}`}</span><span>{activeStep < 0 ? "" : `${progress}% concluído`}</span></div><div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }}/></div></div>
      <div className="diagnostic-layout">
        <aside className="step-aside"><p className="eyebrow">Mapa do diagnóstico</p><div className="step-list"><button type="button" className={`step-link ${activeStep === 0 ? "step-link--active" : ""}`} onClick={() => jumpTo(0)}><span>00</span>Identificação</button>{DIAGNOSTIC_SECTIONS.map((section, index) => <button type="button" className={`step-link ${activeStep === index ? "step-link--active" : ""}`} onClick={() => jumpTo(index)} key={section.id}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</button>)}</div><div className="aside-status"><Compass size={16}/><span>{answeredCount} de {TOTAL_QUESTIONS} perguntas respondidas</span></div></aside>
        <div className="form-card">
          {activeStep < 0 ? <div className="ready-state"><span className="ready-icon"><Sparkles size={21}/></span><p className="eyebrow">Ponto de partida</p><h2>Vamos construir uma leitura completa da High Line.</h2><p>O questionário está organizado em dez blocos. Você pode navegar livremente entre as etapas: suas respostas ficam salvas neste dispositivo até o envio final.</p><button type="button" className="primary-button" onClick={begin}>Começar agora <ArrowRight size={17}/></button></div> : activeStep === 0 ? <div className="identity-step"><p className="eyebrow">Etapa 00 · Identificação</p><h2>Quem está respondendo?</h2><p className="step-intro">Esses dados permitem que a VirtruvIA compreenda o contexto de cada resposta e faça os acompanhamentos necessários.</p><div className="identity-grid"><div className="question-field"><label htmlFor="respondent-name"><span className="question-number">01</span>Nome completo <b>*</b></label><input id="respondent-name" className="text-input" value={respondent.name} onChange={event => updateRespondent("name", event.target.value)} autoComplete="name"/></div><div className="question-field"><label htmlFor="respondent-role"><span className="question-number">02</span>Cargo ou área</label><input id="respondent-role" className="text-input" value={respondent.role} onChange={event => updateRespondent("role", event.target.value)}/></div><div className="question-field"><label htmlFor="respondent-email"><span className="question-number">03</span>E-mail <b>*</b></label><input id="respondent-email" className="text-input" type="email" value={respondent.email} onChange={event => updateRespondent("email", event.target.value)} autoComplete="email"/></div><div className="question-field"><label htmlFor="respondent-phone"><span className="question-number">04</span>Telefone</label><input id="respondent-phone" className="text-input" type="tel" value={respondent.phone} onChange={event => updateRespondent("phone", event.target.value)} autoComplete="tel"/></div></div></div> : currentSection ? <div className="section-step"><div className="section-heading"><div><p className="eyebrow">Bloco {String(activeStep).padStart(2, "0")}</p><h2>{currentSection.title}</h2></div><span className="question-total">{currentSection.questions.length} perguntas</span></div><p className="section-rationale">{currentSection.rationale}</p><div className="section-questions">{currentSection.questions.map((question, index) => <QuestionField question={question} answer={answers[question.id]} onChange={value => updateAnswer(question.id, value)} questionNumber={questionOffset + index + 1} key={question.id}/>)}</div></div> : null}

          {activeStep >= 0 && <div className="form-navigation">{activeStep > 0 ? <button className="secondary-button" type="button" onClick={() => jumpTo(activeStep - 1)}><ArrowLeft size={16}/> Voltar</button> : <span/>}{activeStep < DIAGNOSTIC_SECTIONS.length - 1 ? <button className="primary-button" type="button" onClick={() => jumpTo(activeStep + 1)}>Continuar <ArrowRight size={16}/></button> : <button className="primary-button" type="button" onClick={() => { document.querySelector("#submission")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Revisar e enviar <ArrowRight size={16}/></button>}</div>}
        </div>
      </div>

      {activeStep >= 0 && <section id="submission" className="submission-section"><div className="materials-card"><div><p className="eyebrow">Materiais para envio</p><h2>O que também ajudará nossa leitura.</h2><p>Quando disponível, reúna os materiais abaixo. Eles complementam as respostas e serão solicitados pela equipe da VirtruvIA no momento adequado.</p></div><ul>{MATERIALS_REQUESTED.map(item => <li key={item}><Check size={15}/><span>{item}</span></li>)}</ul></div><div className="consent-card"><div className="consent-heading"><Mail size={21}/><div><p className="eyebrow">Finalização estratégica</p><h2>Preparado para enviar?</h2></div></div><p>As respostas serão armazenadas com segurança e encaminhadas para a equipe responsável pelo diagnóstico estratégico da VirtruvIA.</p><label className={`consent-check ${accepted ? "consent-check--checked" : ""}`}><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)}/><span className="choice-indicator"><Check size={13}/></span><span>Confirmo que estou autorizado(a) a compartilhar estas informações em nome da High Line School. <b>*</b></span></label>{error && <p className="form-error">{error}</p>}<button type="button" className="primary-button primary-button--wide" onClick={handleSubmit} disabled={submit.isPending}>{submit.isPending ? <><Loader2 size={17} className="spin"/> Validando e enviando…</> : <>Enviar diagnóstico completo <ChevronRight size={17}/></>}</button><p className="security-note"><ShieldCheck size={15}/> Informações utilizadas exclusivamente para o projeto estratégico da High Line School.</p></div></section>}
    </section>

    <footer className="site-footer"><span className="footer-renaissance" style={{ backgroundImage: `url(${asset.renaissance})` }}/><div><img src={asset.logo} alt="VirtruvIA"/><p>Estratégia, verdade e crescimento com intenção.</p></div><div className="footer-note">Diagnóstico 360°<br/>High Line School Goiânia</div></footer>

    {submit.isPending && <div className="submit-overlay" role="status" aria-live="polite" aria-label="Enviando o diagnóstico"><div className="submit-panel"><div className="loading-orbit"><VitruvianMark small/><span className="loading-orbit__center"><Loader2 size={23} className="spin"/></span></div><p className="eyebrow">Momento de síntese</p><h2>Estamos guardando cada resposta com cuidado.</h2><p>Registrando o diagnóstico e preparando a confirmação para a equipe VirtruvIA.</p><div className="loading-line"><span/></div><div className="loading-steps"><span><i/>Respostas registradas</span><span><i/>Confirmação em processamento</span></div></div></div>}

    {showMenu && <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Etapas do diagnóstico"><button className="menu-backdrop" aria-label="Fechar menu" onClick={() => setShowMenu(false)}/><div className="menu-panel"><button className="close-menu" aria-label="Fechar" onClick={() => setShowMenu(false)}><X size={19}/></button><p className="eyebrow">Navegação</p><h2>Etapas do diagnóstico</h2><button type="button" className="step-link" onClick={() => jumpTo(0)}><span>00</span>Identificação</button>{DIAGNOSTIC_SECTIONS.map((section, index) => <button type="button" className="step-link" onClick={() => jumpTo(index)} key={section.id}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</button>)}</div></div>}
  </main>;
}
