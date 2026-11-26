"use client";

import { SaasModal } from '@/components/ui/SaasModal'

import { useState } from "react";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Users,
  Sparkles,
  LoaderCircle,
  Lock,
  Mail,
  Scissors,
} from "lucide-react";
import Link from "next/link";
import { SaasAlert, SaasField, SaasSubmitButton, saasInputClass } from "@/components/ui/SaasUI";

import "./login.css";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Modal de Recuperação de Senha
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setLoginError("");
    setLoginNotice("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({email:formData.email.trim().toLowerCase(),password:formData.password}),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));

        const destination = new URL(data.redirectTo || "/dashboard", window.location.origin);
        if (destination.origin !== window.location.origin) throw new Error("Destino de acesso inválido.");
        window.location.assign(destination.pathname);
      } else {
        setLoginError(data.error || "Credenciais inválidas ou conta inativa.");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      setLoginError("Erro interno de conexão. Tente novamente mais tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetLoading) return;
    setResetLoading(true);
    setResetMessage("");
    setResetError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar código");
      setResetMessage(data.message);
      setResetStep(2);
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetLoading) return;
    setResetLoading(true);
    setResetError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          code: resetCode,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao redefinir senha");
      setShowResetModal(false);
      setResetStep(1);
      setResetCode("");
      setNewPassword("");
      setFormData((prev) => ({ ...prev, email: resetEmail }));
      setLoginError("");
      setLoginNotice(data.message || "Senha atualizada. Entre novamente para continuar.");
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="platform-login">
      <header className="login-topbar">
        <Link href="/" className="login-brand" aria-label="BarberPro, voltar ao site"><span className="login-brand-symbol"><Scissors size={23}/></span><span>BARBER<span>PRO</span></span></Link>
        <Link href="/" className="login-back"><ArrowLeft size={16}/>Voltar ao site</Link>
      </header>
      <div className="login-grid">
        <aside className="login-intro" aria-label="BarberPro para sua rotina">
          <span className="login-eyebrow"><Sparkles size={15}/>FEITO PARA A SUA BARBEARIA</span>
          <h2>Toda a sua gestão.<br/><span>No ritmo da sua<br/>barbearia.</span></h2>
          <p className="login-intro-copy">Organize os horários, conheça seus clientes e cuide do próximo atendimento com mais tranquilidade.</p>
          <div className="login-feature-list">
            <div><span><CalendarDays size={22}/></span><div><strong>Seu dia, bem organizado</strong><p>Agenda e reservas em um só lugar.</p></div></div>
            <div><span><Users size={22}/></span><div><strong>Cada cliente tem uma história</strong><p>Mantenha os próximos encontros por perto.</p></div></div>
          </div>
          <Link href="/planos" className="login-discover">Conheça os recursos do BarberPro<ArrowRight size={17}/></Link>
          <span className="login-decoration" aria-hidden="true"><Scissors size={150} strokeWidth={.6}/></span>
        </aside>
        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-panel-heading"><span className="login-panel-kicker">BOM TER VOCÊ POR AQUI</span><h1 id="login-title">Bem-vindo de volta.</h1><p>Entre com seu e-mail e senha para continuar.</p></div>
          <form onSubmit={handleSubmit} className="login-form">
            {loginError&&<div id="login-error"><SaasAlert variant="error" message={loginError}/></div>}
            {loginNotice&&<SaasAlert variant="success" message={loginNotice}/>}
            <div className="login-field"><label htmlFor="email">E-mail</label><div className="login-input-wrap"><Mail size={19} aria-hidden="true"/><input id="email" name="email" type="email" required autoComplete="username" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={Boolean(loginError)} aria-describedby={loginError?'login-error':undefined} value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} placeholder="seu@email.com"/></div></div>
            <div className="login-field"><label htmlFor="password">Senha</label><div className="login-input-wrap"><Lock size={19} aria-hidden="true"/><input id="password" name="password" type={showPassword?'text':'password'} required autoComplete="current-password" aria-invalid={Boolean(loginError)} aria-describedby={loginError?'login-error':undefined} value={formData.password} onChange={e=>setFormData({...formData,password:e.target.value})} placeholder="Digite sua senha"/><button type="button" className="login-password-toggle" aria-label={showPassword?'Ocultar senha':'Mostrar senha'} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></div>
            <div className="login-options"><button type="button" onClick={()=>{setResetEmail(formData.email);setResetStep(1);setResetMessage('');setResetError('');setShowResetModal(true)}}>Esqueceu sua senha?</button></div>
            <button type="submit" className="login-submit" disabled={isLoading} aria-busy={isLoading}>{isLoading?<><LoaderCircle size={19} className="login-spinner"/>Entrando…</>:<>Acessar minha conta<ArrowRight size={19}/></>}</button>
          </form>
          <div className="login-signup"><p>Ainda não usa o BarberPro?</p><Link href="/contratar">Experimente por 7 dias<ArrowRight size={16}/></Link></div>
          <div className="login-customer"><span>Quer agendar um horário?</span><Link href="/cliente">Abrir portal do cliente<ArrowRight size={15}/></Link></div>
        </section>
      </div>
      <footer className="login-footer"><span>© {new Date().getFullYear()} BarberPro</span><nav aria-label="Informações legais"><Link href="/contrato">Termos de uso</Link><Link href="/privacidade">Privacidade</Link></nav></footer>

      {/* Modal de Recuperação de Senha */}
      {showResetModal && (
        <SaasModal title={<>Recuperar Senha</>} description="Recupere o acesso à sua conta com segurança." icon="security" onClose={() => setShowResetModal(false)}>

            {resetError && (
              <div className="mb-4">
                <SaasAlert variant="error" message={resetError} />
              </div>
            )}

            {resetStep === 1 ? (
              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <p className="text-xs text-slate-300">
                  Informe o e-mail cadastrado para receber o código de recuperação.
                </p>
                <SaasField label="E-mail cadastrado" required htmlFor="reset-email">
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className={saasInputClass}
                    placeholder="seu@email.com"
                  />
                </SaasField>
                <div className="flex justify-end space-x-2 pt-2 saas-modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <SaasSubmitButton loading={resetLoading} loadingText="Enviando...">
                    Enviar Código
                  </SaasSubmitButton>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-4">
                {resetMessage && (
                  <SaasAlert variant="info" message={resetMessage} />
                )}
                <SaasField label="Código de Recuperação" required htmlFor="reset-code">
                  <input
                    id="reset-code"
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className={saasInputClass}
                    placeholder="Cole o código enviado por e-mail"
                  />
                </SaasField>
                <SaasField
                  label="Nova Senha"
                  required
                  htmlFor="reset-new-password"
                  hint="Mínimo 8 caracteres, com letra, número e símbolo."
                >
                  <input
                    id="reset-new-password"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={saasInputClass}
                    placeholder="8+ caracteres, letra, número e símbolo"
                  />
                </SaasField>
                <div className="flex justify-end space-x-2 pt-2 saas-modal-actions">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Voltar
                  </button>
                  <SaasSubmitButton loading={resetLoading} loadingText="Salvando...">
                    Redefinir Senha
                  </SaasSubmitButton>
                </div>
              </form>
            )}
          </SaasModal>
      )}
    </main>
  );
}
