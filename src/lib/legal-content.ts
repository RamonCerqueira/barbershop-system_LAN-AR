export const CONTRACT_VERSION = '2026-11-25.1'
export const PRIVACY_VERSION = '2026-11-25.1'
export const LEGAL_PROVIDER = {
  name: 'Ramon Santos Cerqueira',
  taxId: '032.078.345-66',
  address: 'Parque Tecnológico da Bahia, Rua Mundo, nº 121, Edifício Tecnocentro, Trobogy, Salvador/BA, CEP 41745-715',
  email: 'redetech.ofc@gmail.com'
} as const

export const PRIVACY_TEXT = `POLÍTICA DE PRIVACIDADE BARBERPRO — versão ${PRIVACY_VERSION}

1. RESPONSÁVEIS E CONTATO
O BarberPro é fornecido por ${LEGAL_PROVIDER.name}, CPF ${LEGAL_PROVIDER.taxId}, no endereço ${LEGAL_PROVIDER.address}. Atendimento e privacidade: ${LEGAL_PROVIDER.email}.

2. FINALIDADES E PAPÉIS
O fornecedor trata dados cadastrais, autenticação, contratação, cobrança, segurança e registros de aceite para executar o contrato, cumprir obrigações legais e proteger direitos, conforme a base legal adequada. Também é responsável pelos dados da conta independente do portal do cliente e por recursos como perfil, favoritos e descoberta de estabelecimentos. A barbearia determina as finalidades dos dados de seus atendimentos, clientes, profissionais e registros de serviço; nesses tratamentos, o BarberPro atua em seu nome, segundo instruções lícitas. Cada responsável deve atender suas obrigações na LGPD.

3. DADOS UTILIZADOS
Usamos dados de identificação e contato, cadastro da barbearia, agenda, serviços, histórico, transações, comprovantes enviados, preferências, sessões e registros de segurança. O aceite registra identidade da conta, data, versão, conteúdo e resumo das condições comerciais. Não exigimos documentos biométricos para assinar. Fotos de cortes e comunicações opcionais dependem das permissões específicas disponíveis no sistema. Evite inserir dados de saúde ou outros dados sensíveis desnecessários em campos livres.

4. COMPARTILHAMENTO E SERVIÇOS EXTERNOS
Dados são disponibilizados à barbearia envolvida no atendimento, aos operadores de infraestrutura necessários à prestação do serviço e, quando exigido, a autoridades competentes. Ao ativar o WhatsApp, telefone e conteúdo da comunicação são tratados na integração Evolution API e nos serviços do WhatsApp. Prestadores podem realizar tratamento internacional; esse tratamento deve observar os mecanismos e requisitos legais aplicáveis. Não vendemos cadastros de clientes. Perfis, avaliações e imagens somente são apresentados conforme a finalidade e as opções de publicação do recurso.

5. COMUNICAÇÕES E CONSENTIMENTO
Aceitar o contrato não autoriza campanhas de marketing nem publicação de imagens. Autorizações opcionais devem ser específicas e podem ser alteradas nos controles do produto ou pelo contato de privacidade. A retirada de consentimento não invalida tratamentos anteriores lícitos nem impede tratamentos fundados em outra base legal adequada.

6. SEGURANÇA E CONSERVAÇÃO
Adotamos controle de acesso por conta e empresa, senhas com hash, registros operacionais e backups. Nenhum serviço conectado à internet é livre de risco. Incidentes serão tratados e comunicados conforme as obrigações legais de cada responsável. Dados permanecem pelo tempo necessário às finalidades informadas, às obrigações legais e ao exercício regular de direitos. Encerrada essa necessidade, serão eliminados ou anonimizados; backups seguem seu ciclo de retenção e acesso restrito. Registros contratuais e financeiros podem ser conservados quando houver fundamento legal, mesmo após o encerramento da conta.

7. DIREITOS E SOLICITAÇÕES
Para solicitar confirmação, acesso, correção, informação sobre compartilhamento, portabilidade quando aplicável, revogação de consentimento ou eliminação nos limites legais, contate ${LEGAL_PROVIDER.email}. Poderá ser necessária verificação proporcional de identidade. Solicitações sobre dados controlados pela barbearia serão encaminhadas ao responsável correspondente, com cooperação do fornecedor. O titular pode apresentar reclamação à ANPD e aos órgãos competentes.

8. COOKIES E ATUALIZAÇÕES
Cookies de sessão e mecanismos locais mantêm autenticação e preferências. Recursos de terceiros podem receber dados técnicos necessários ao carregamento. Esta política é versionada; alterações serão informadas e novo consentimento será solicitado quando essa for a base legal necessária. A versão aceita do contrato permanece disponível no painel.`

export const CONTRACT_TEXT = `CONTRATO DE LICENÇA DE USO E PRESTAÇÃO DE SERVIÇOS BARBERPRO — versão ${CONTRACT_VERSION}

1. FORNECEDOR E OBJETO
Fornecedor: ${LEGAL_PROVIDER.name}, CPF ${LEGAL_PROVIDER.taxId}, endereço ${LEGAL_PROVIDER.address}, atendimento ${LEGAL_PROVIDER.email}. O contrato concede licença de uso não exclusiva do BarberPro, como serviço online de gestão de barbearias, nos recursos e limites do plano escolhido. O contratante declara ter poderes para representar o estabelecimento cadastrado. O fornecedor conserva os direitos sobre o software; o contratante conserva os direitos sobre seus dados e conteúdos.

2. PLANOS E RECURSOS
Essencial: até dois profissionais ativos agendáveis, agenda, cadastro e histórico de clientes, serviços, link de agendamento e portal do cliente. Profissional: até cinco profissionais, recursos do Essencial, caixa, financeiro, comissões, produtos, vendas e estoque básico, confirmações e lembretes por WhatsApp. Elite: até dez profissionais, recursos do Profissional, custos, rentabilidade, Curva ABC de serviços, análises avançadas e campanhas com consentimento. Contas administrativas não consomem o limite de profissionais. O sistema não cria contas de acesso para barbeiros.

3. TESTE, PREÇOS E PAGAMENTO
O teste gratuito dura sete dias e libera recursos de gestão Elite, sem conexão ou envios automáticos de WhatsApp. Desde a primeira contratação paga, valem os recursos do plano escolhido. Os valores do ciclo e eventuais descontos aparecem no resumo comercial aceito. Semestral tem 10% e anual 15% de desconto sobre a soma das mensalidades. Esses valores são totais pagos pelo ciclo, não mensalidades parceladas. A contratação atual utiliza PIX sujeito a confirmação, sem débito automático. Renovação exige nova contratação de período; acesso após vencimento depende da regularização. Pagamentos e condições já aceitos não são alterados retroativamente por mudança de tabela.

4. UPGRADE, DOWNGRADE E RENOVAÇÃO
Mudança de nível ou duração exige aceite de aditivo com recursos, preço, desconto e vigência. Upgrade elegível semestral ou anual recebe 10% adicional nessa contratação; esse desconto não se repete na renovação. O upgrade libera novos benefícios após a confirmação do pagamento e acrescenta o ciclo ao saldo vigente, sem conversão proporcional do saldo. Downgrade mantém os benefícios pagos até o fim do período vigente e entra na renovação; é preciso adequar antes os profissionais ativos ao novo limite. Uma mudança paga já agendada impede contratar outra até sua vigência. Cadastros e históricos não são excluídos apenas pela mudança de plano.

5. WHATSAPP E DEPENDÊNCIAS EXTERNAS
Profissional inclui até 3.000 e Elite até 6.000 envios por mês-calendário de Brasília, com um número conectado por barbearia. Não há cobrança excedente: os envios pausam ao atingir a cota. Campanhas são exclusivas do Elite. Resultados de envio incertos reservam cota até conferência; não há repetição automática. A integração usa Evolution API e conexão por QR Code ao WhatsApp Web. O contratante deve manter conexão e permissões, respeitar consentimento e regras do serviço e evitar mensagens ilícitas ou abusivas. Reconexões, indisponibilidade ou restrições do serviço externo podem afetar os envios. Isso não afasta a responsabilidade do fornecedor por falhas próprias ou deveres legais. Não se promete entrega garantida, ausência de bloqueios ou disponibilidade integral de serviços de terceiros.

6. OBRIGAÇÕES E SEGURANÇA
O fornecedor mantém os recursos contratados, controles de acesso, backups operacionais e atendimento pelo contato informado. Manutenções e correções podem exigir interrupções; não há promessa de disponibilidade de 100% ou atendimento 24 horas. O contratante deve manter dados corretos, proteger credenciais, controlar seus auxiliares administrativos e usar conteúdos e imagens com autorização. É proibido acessar dados de terceiros, comprometer a segurança ou usar o serviço para finalidades ilícitas. Suspensões por abuso ou risco devem ser justificadas e proporcionais, preservados os direitos legais.

7. DADOS PESSOAIS E LGPD
A Política de Privacidade integra este contrato, sem transformar o aceite contratual em consentimento genérico para marketing ou imagens. A barbearia é responsável pelas decisões e bases legais relativas aos dados de seus atendimentos e deve informar os titulares. O fornecedor segue instruções lícitas quando atua como operador, restringe acessos e coopera com solicitações e incidentes conforme a LGPD. Para cadastros próprios, cobrança, segurança e conta independente do portal, o fornecedor assume suas responsabilidades como controlador. Cada parte responde por seus atos e omissões nos termos da lei; nenhuma cláusula transfere integralmente obrigações legais ao contratante.

8. CANCELAMENTO E DADOS
Cancelamento e pedidos de reembolso podem ser solicitados por ${LEGAL_PROVIDER.email}. O fornecedor analisará o período contratado, os serviços prestados, a oferta aceita e os direitos aplicáveis. Quando incidir o Código de Defesa do Consumidor, são preservados o direito de arrependimento e os demais direitos legais, inclusive o prazo do art. 49 nas hipóteses previstas. O teste gratuito não substitui nem reduz direitos legais. O encerramento não impede solicitar acesso ou cópia dos dados nos limites legais; a conservação posterior deve ter fundamento legítimo e observar a política de privacidade.

9. RESPONSABILIDADE E SOLUÇÃO DE CONFLITOS
As partes respondem por danos conforme a legislação e o nexo com seus atos. Não há renúncia ao direito de ação, exclusão de responsabilidade por falha própria, promessa de imunidade judicial ou afastamento de obrigações da LGPD e do CDC. Limitações decorrentes da natureza do serviço e de dependências externas não eliminam direitos obrigatórios. Recomenda-se contato prévio para solução amigável, sem impedir acesso ao Judiciário ou aos órgãos competentes. Aplicam-se a legislação brasileira e as regras legais de competência, inclusive as protetivas do consumidor quando cabíveis.

10. ACEITE E VERSÕES
O aceite eletrônico é expresso, sem caixa pré-marcada, vinculado à conta e ao resumo comercial. São registrados conteúdo, versão, hash de integridade e data do servidor, sem certificação ICP-Brasil. O registro e os aditivos ficam disponíveis ao administrador da barbearia. A validade e a força probatória dependem dos requisitos legais e das circunstâncias. Alterações comerciais posteriores dependem de novo aceite e não reescrevem instrumentos anteriores.`
