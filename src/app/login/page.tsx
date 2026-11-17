"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Crown,
  Building2,
  Lock,
  Mail,
  KeyRound,
  X,
  Scissors,
} from "lucide-react";
import Link from "next/link";
import { SaasAlert, SaasField, SaasSubmitButton, saasInputClass } from "@/components/ui/SaasUI";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<"company" | "admin">("company");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
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

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.type === "SYSTEM_OWNER") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/dashboard";
        }
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
      alert(data.message);
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="dashboard-shell flex min-h-screen items-center justify-center p-4 text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link
            href="/"
            className="mb-6 inline-flex items-center text-sm text-slate-400 transition-colors hover:text-[#f5b51b]"
          >
            <ArrowLeft size={18} className="mr-2" />
            Voltar ao site
          </Link>

          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="dashboard-brand-mark flex h-12 w-12 items-center justify-center rounded-2xl">
              <Scissors size={24} />
            </span>
            <div className="text-2xl font-black tracking-[0.16em] text-white">
              BARBER<span className="text-[#f5b51b]">PRO</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white">Acessar Plataforma</h1>
          <p className="mt-1 text-sm text-[#a0a9b6]">
            Entre com suas credenciais para gerenciar sua barbearia
          </p>
        </div>

        {/* Login Type Selector */}
        <div className="flex rounded-2xl border border-white/10 bg-[#141920] p-1">
          <button
            type="button"
            onClick={() => setLoginType("company")}
            className={`flex flex-1 items-center justify-center rounded-xl py-2.5 px-4 text-xs font-semibold transition ${loginType === "company"
              ? "bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] text-[#15120b]"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <Building2 size={16} className="mr-2" />
            Barbearia
          </button>
          <button
            type="button"
            onClick={() => setLoginType("admin")}
            className={`flex flex-1 items-center justify-center rounded-xl py-2.5 px-4 text-xs font-semibold transition ${loginType === "admin"
              ? "bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] text-[#15120b]"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <Crown size={16} className="mr-2" />
            SuperAdmin
          </button>
        </div>

        {/* Login Form */}
        <div className="rounded-[18px] border border-white/[0.085] bg-gradient-to-br from-[#181d24] to-[#10141a] p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {loginError && (
              <SaasAlert variant="error" message={loginError} />
            )}

            <SaasField label="E-mail" required htmlFor="email">
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`${saasInputClass} pl-10`}
                  placeholder="seu@email.com"
                />
              </div>
            </SaasField>

            <SaasField label="Senha" required htmlFor="password">
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={`${saasInputClass} pl-10 pr-11`}
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </SaasField>

            <div className="flex items-center justify-between text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded accent-[#f5b51b]"
                />
                <span>Lembrar de mim</span>
              </label>
              <button
                type="button"
                className="font-semibold text-[#f5b51b] hover:text-amber-300"
                onClick={() => {
                  setResetEmail(formData.email);
                  setResetStep(1);
                  setResetMessage("");
                  setResetError("");
                  setShowResetModal(true);
                }}
              >
                Esqueceu a senha?
              </button>
            </div>

            <SaasSubmitButton loading={isLoading} loadingText="Entrando..." className="w-full py-3">
              Entrar no Sistema
            </SaasSubmitButton>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5 text-center">
            <p className="text-sm text-slate-400">
              Ainda não tem conta?{" "}
              <Link
                href="/contratar"
                className="font-semibold text-[#f5b51b] hover:text-amber-300"
              >
                Testar 7 dias grátis
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="dashboard-dialog-panel w-full max-w-md rounded-[18px] border border-white/10 bg-[#141920] p-6 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="text-[#f5b51b]" size={20} />
                <h3 className="text-lg font-bold">Recuperar Senha</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

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
                <div className="flex justify-end space-x-2 pt-2">
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
                <div className="flex justify-end space-x-2 pt-2">
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
          </div>
        </div>
      )}
    </div>
  );
}
