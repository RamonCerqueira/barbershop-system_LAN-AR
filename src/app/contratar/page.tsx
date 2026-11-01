'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Check, CreditCard, Building, User } from 'lucide-react';
import Link from 'next/link';
import { trackConversionEvent } from '@/lib/landing-utils';
import { passwordInput, validCpf } from '@/lib/validation';

// Schema de validação com Zod
const contractSchema = z.object({
  // Dados pessoais
  cpf: z.string()
    .min(11, 'CPF deve ter 11 dígitos')
    .max(14, 'CPF inválido')
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido')
    .refine((val) => validCpf(val.replace(/\D/g, '')), 'CPF inválido (verifique os dígitos)'),
  fullName: z.string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  birthDate: z.string()
    .min(1, 'Data de nascimento é obrigatória')
    .refine(
      (val) => /^\d{4}-\d{2}-\d{2}$/.test(val) && val < new Date().toISOString().slice(0, 10),
      'Informe uma data de nascimento válida no passado'
    ),
  email: z.string()
    .trim()
    .email('Email inválido')
    .min(1, 'Email é obrigatório'),
  password: passwordInput,
  confirmPassword: z.string(),

  // Dados da barbearia
  barbershopName: z.string()
    .trim()
    .min(2, 'Nome da barbearia deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  street: z.string()
    .trim()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  number: z.string()
    .trim()
    .min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string()
    .trim()
    .min(2, 'Bairro deve ter pelo menos 2 caracteres'),
  city: z.string()
    .trim()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  state: z.string()
    .trim()
    .min(2, 'Estado deve ter pelo menos 2 caracteres'),
  zipCode: z.string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  phone: z.string()
    .min(10, 'Telefone obrigatório')
    .refine((val) => /^\d{10,15}$/.test(val.replace(/\D/g, '')), 'Telefone inválido (informe DDD + número)'),

  // Plano selecionado
  plan: z.enum(['monthly', 'quarterly', 'annual']),

  // Termos
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Você deve aceitar os termos de uso'
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type ContractFormData = z.infer<typeof contractSchema>;

const plans = {
  monthly: { name: 'Mensal', price: 10, period: 'mês' },
  quarterly: { name: 'Trimestral', price: 30, period: 'trimestre' },
  annual: { name: 'Anual', price: 120, period: 'ano' },
};

export default function ContractPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'quarterly' | 'annual'>('annual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    setValue,
    watch,
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      plan: selectedPlan,
      acceptTerms: false,
      phone: '',
    },
  });

  const watchedPlan = watch('plan');
  const watchedData = watch();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get('plan');
      if (planParam === 'monthly' || planParam === 'quarterly' || planParam === 'annual') {
        setSelectedPlan(planParam);
        setValue('plan', planParam);
      }
      trackConversionEvent('signup_started', {
        section: 'contratar_page',
        planId: planParam || 'annual',
      });
    }
  }, [setValue]);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const formatZipCode = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const nextStep = async () => {
    setSubmitError('');
    let fieldsToValidate: (keyof ContractFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['cpf', 'fullName', 'birthDate', 'email', 'password', 'confirmPassword'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['barbershopName', 'phone', 'street', 'number', 'neighborhood', 'city', 'state', 'zipCode'];
    } else if (currentStep === 3) {
      fieldsToValidate = ['plan'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setSubmitError('');
    setCurrentStep(currentStep - 1);
  };

  const onSubmit = async (data: ContractFormData) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const complementPart = data.complement?.trim() ? ` (${data.complement.trim()})` : '';
      const fullAddress = `${data.street}, ${data.number}${complementPart} - ${data.neighborhood}, ${data.city}/${data.state} - ${data.zipCode}`;

      const response = await fetch('/api/companies/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.barbershopName,
          email: data.email,
          cpf: data.cpf.replace(/\D/g, ''),
          fullName: data.fullName,
          birthDate: data.birthDate,
          address: fullAddress,
          phone: data.phone.replace(/\D/g, ''),
          plan: data.plan.toUpperCase(),
          password: data.password,
          acceptTerms: data.acceptTerms
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        trackConversionEvent('signup_completed', {
          section: 'contratar_page',
          planId: data.plan,
        });
        trackConversionEvent('subscription_started', {
          section: 'contratar_page',
          planId: data.plan,
          value: plans[data.plan].price,
        });
        alert('Contratação realizada com sucesso! Redirecionando para o painel administrativo...');
        window.location.href = '/dashboard';
      } else {
        const errorMessage = result.error || 'Não foi possível concluir o cadastro. Verifique os dados informados.';
        setSubmitError(errorMessage);
        alert(`Erro: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Erro na contratação:', error);
      setSubmitError('Erro interno de conexão. Tente novamente mais tarde.');
      alert('Erro interno. Tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 py-4">
        <div className="container mx-auto px-4 flex items-center">
          <Link href="/" className="flex items-center text-gray-300 hover:text-orange-500 transition-colors">
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </Link>
          <div className="text-2xl font-bold text-orange-500 ml-8">
            BarberPro
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-400">Etapa {currentStep} de 4</div>
              <div className="text-sm text-gray-400">
                Plano: {plans[selectedPlan].name} - R$ {plans[selectedPlan].price}/{plans[selectedPlan].period}
              </div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              ></div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Etapa 1: Dados Pessoais */}
            {currentStep === 1 && (
              <div className="bg-gray-900 p-8 rounded-xl border border-gray-800">
                <div className="flex items-center mb-6">
                  <User className="text-orange-500 mr-3" size={24} />
                  <h2 className="text-2xl font-bold">Dados Pessoais</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">CPF *</label>
                    <input
                      {...register('cpf')}
                      type="text"
                      maxLength={14}
                      placeholder="000.000.000-00"
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        e.target.value = formatted;
                        setValue('cpf', formatted, { shouldValidate: true, shouldDirty: true });
                      }}
                    />
                    {errors.cpf && <p className="text-red-400 text-sm mt-1">{errors.cpf.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Nome Completo *</label>
                    <input
                      {...register('fullName')}
                      type="text"
                      placeholder="Seu nome completo"
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                    />
                    {errors.fullName && <p className="text-red-400 text-sm mt-1">{errors.fullName.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Data de Nascimento *</label>
                    <input
                      {...register('birthDate')}
                      type="date"
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                    />
                    {errors.birthDate && <p className="text-red-400 text-sm mt-1">{errors.birthDate.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="seu@email.com"
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                    />
                    {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Senha *</label>
                    <input
                      {...register('password')}
                      type="password"
                      placeholder="8+ caracteres, letra, número e símbolo"
                      autoComplete="new-password"
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                    />
                    {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Confirmar Senha *</label>
                    <input
                      {...register('confirmPassword')}
                      type="password"
                      placeholder="Confirme sua senha"
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                    />
                    {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 2: Dados da Barbearia */}
            {currentStep === 2 && (
              <div className="bg-gray-900 p-8 rounded-xl border border-gray-800">
                <div className="flex items-center mb-6">
                  <Building className="text-orange-500 mr-3" size={24} />
                  <h2 className="text-2xl font-bold">Dados da Barbearia</h2>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nome da Barbearia *</label>
                      <input
                        {...register('barbershopName')}
                        type="text"
                        placeholder="Nome da sua barbearia"
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                      />
                      {errors.barbershopName && <p className="text-red-400 text-sm mt-1">{errors.barbershopName.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Telefone / WhatsApp *</label>
                      <input
                        {...register('phone')}
                        type="tel"
                        maxLength={15}
                        placeholder="(11) 99999-9999"
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          e.target.value = formatted;
                          setValue('phone', formatted, { shouldValidate: true, shouldDirty: true });
                        }}
                      />
                      {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Endereço *</label>
                      <input
                        {...register('street')}
                        type="text"
                        placeholder="Rua, Avenida, etc."
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                      />
                      {errors.street && <p className="text-red-400 text-sm mt-1">{errors.street.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Número *</label>
                      <input
                        {...register('number')}
                        type="text"
                        placeholder="123"
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                      />
                      {errors.number && <p className="text-red-400 text-sm mt-1">{errors.number.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Complemento</label>
                      <input
                        {...register('complement')}
                        type="text"
                        placeholder="Apto, Sala, etc. (opcional)"
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Bairro *</label>
                      <input
                        {...register('neighborhood')}
                        type="text"
                        placeholder="Nome do bairro"
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                      />
                      {errors.neighborhood && <p className="text-red-400 text-sm mt-1">{errors.neighborhood.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Cidade *</label>
                      <input
                        {...register('city')}
                        type="text"
                        placeholder="Nome da cidade"
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                      />
                      {errors.city && <p className="text-red-400 text-sm mt-1">{errors.city.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Estado *</label>
                      <input
                        {...register('state')}
                        type="text"
                        placeholder="SP, RJ, MG..."
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                      />
                      {errors.state && <p className="text-red-400 text-sm mt-1">{errors.state.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">CEP *</label>
                      <input
                        {...register('zipCode')}
                        type="text"
                        maxLength={9}
                        placeholder="00000-000"
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                        onChange={(e) => {
                          const formatted = formatZipCode(e.target.value);
                          e.target.value = formatted;
                          setValue('zipCode', formatted, { shouldValidate: true, shouldDirty: true });
                        }}
                      />
                      {errors.zipCode && <p className="text-red-400 text-sm mt-1">{errors.zipCode.message}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 3: Seleção de Plano */}
            {currentStep === 3 && (
              <div className="bg-gray-900 p-8 rounded-xl border border-gray-800">
                <div className="flex items-center mb-6">
                  <CreditCard className="text-orange-500 mr-3" size={24} />
                  <h2 className="text-2xl font-bold">Escolha seu Plano</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(plans).map(([key, plan]) => (
                    <div
                      key={key}
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${watchedPlan === key
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                      onClick={() => {
                        setSelectedPlan(key as never);
                        setValue('plan', key as never);
                      }}
                    >
                      <div className="text-center">
                        <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                        <div className="mb-4">
                          <span className="text-3xl font-bold">R$ {plan.price}</span>
                          <span className="text-gray-300">/{plan.period}</span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-300">
                          <div className="flex items-center">
                            <Check className="text-green-400 mr-2" size={16} />
                            Agendamentos ilimitados
                          </div>
                          <div className="flex items-center">
                            <Check className="text-green-400 mr-2" size={16} />
                            Gestão completa
                          </div>
                          <div className="flex items-center">
                            <Check className="text-green-400 mr-2" size={16} />
                            WhatsApp integrado
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <input type="hidden" {...register('plan')} />
              </div>
            )}

            {/* Etapa 4: Confirmação e Pagamento */}
            {currentStep === 4 && (
              <div className="bg-gray-900 p-8 rounded-xl border border-gray-800">
                <div className="flex items-center mb-6">
                  <Check className="text-orange-500 mr-3" size={24} />
                  <h2 className="text-2xl font-bold">Confirmação e Pagamento</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Resumo da Contratação</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-gray-700">
                        <span className="text-gray-400">Responsável:</span>
                        <span className="font-medium">{watchedData.fullName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-700">
                        <span className="text-gray-400">CPF / E-mail:</span>
                        <span className="font-medium">{watchedData.cpf} • {watchedData.email}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-700">
                        <span className="text-gray-400">Barbearia:</span>
                        <span className="font-medium">{watchedData.barbershopName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-700">
                        <span className="text-gray-400">Telefone / WhatsApp:</span>
                        <span className="font-medium">{watchedData.phone}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-700">
                        <span className="text-gray-400">Endereço:</span>
                        <span className="font-medium text-right">
                          {watchedData.street}, {watchedData.number}
                          {watchedData.complement ? ` (${watchedData.complement})` : ''} - {watchedData.neighborhood}, {watchedData.city}/{watchedData.state}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-gray-400">Plano:</span>
                        <span className="font-medium">{plans[watchedPlan].name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Valor:</span>
                        <span className="text-orange-500 font-bold text-base">
                          R$ {plans[watchedPlan].price}/{plans[watchedPlan].period}
                        </span>
                      </div>
                    </div>
                  </div>

                  {submitError && (
                    <div role="alert" className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 text-sm">
                      {submitError}
                    </div>
                  )}

                  {Object.keys(errors).length > 0 && (
                    <div role="alert" className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 text-sm space-y-1">
                      <p className="font-semibold">Verifique os campos pendentes antes de finalizar:</p>
                      <ul className="list-disc list-inside">
                        {Object.entries(errors).map(([field, err]) => (
                          <li key={field}>{err?.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-start">
                    <input
                      {...register('acceptTerms')}
                      type="checkbox"
                      id="acceptTerms"
                      aria-invalid={Boolean(errors.acceptTerms)}
                      aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
                      className="mt-1 mr-3 h-4 w-4 shrink-0 accent-orange-500"
                    />
                    <label htmlFor="acceptTerms" className="cursor-pointer text-sm text-gray-300">
                      Li e aceito os termos de uso e a política de privacidade *
                    </label>
                  </div>
                  {errors.acceptTerms && <p id="acceptTerms-error" role="alert" className="text-red-400 text-sm">{errors.acceptTerms.message}</p>}

                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      <strong>Nota:</strong> Este é um sistema de demonstração.
                      Nenhum pagamento real será processado.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Navegação */}
            <div className="flex justify-between">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 border border-gray-600 text-white rounded-lg hover:border-orange-500 transition-colors"
                >
                  Voltar
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="ml-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-semibold rounded-lg transition-colors"
                >
                  Próximo
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ml-auto px-8 py-3 bg-orange-500 hover:bg-orange-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Processando...' : 'Finalizar Contratação'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

