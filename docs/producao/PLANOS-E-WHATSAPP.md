# Planos e WhatsApp por QR Code

## Catálogo comercial

Valores em reais, desde a primeira cobrança. Teste gratuito de sete dias com recursos de gestão Elite, sem conexão ou envios automáticos de WhatsApp.

| Plano | Mensal | Semestral (10%) | Anual (15%) | Profissionais ativos | WhatsApp/mês |
|---|---:|---:|---:|---:|---:|
| Essencial | 89,90 | 485,46 | 916,98 | 2 | — |
| Profissional | 129,90 | 701,46 | 1.324,98 | 5 | 3.000 |
| Elite | 159,90 | 863,46 | 1.630,98 | 10 | 6.000 |

O Profissional acrescenta caixa, financeiro, comissões, produtos, estoque e mensagens transacionais. O Elite acrescenta custos, rentabilidade, Curva ABC de serviços, análises avançadas e campanhas com consentimento. Não anunciar Curva ABC de estoque nem suporte prioritário.

`src/lib/plans.ts` centraliza preços, benefícios e classificação de rotas. Autenticação e assinatura continuam obrigatórias. A administração da empresa e os profissionais agendáveis são conceitos separados; não são criadas contas para barbeiros.

Upgrades elegíveis de seis ou doze meses recebem desconto adicional de 10% somente nessa contratação. A renovação usa o preço integral do ciclo. O ciclo adquirido é somado ao saldo vigente e os benefícios do upgrade são liberados após aprovação. Reduções pagas são agendadas para o fim do período vigente; a capacidade inferior fica reservada desde a aprovação. Pagamentos preservam valor-base, desconto e valor aprovado. Nunca recalcular registros históricos com o catálogo atual.

## Integração

Evolution API v2.3.8, imagem fixada por digest, é usada exclusivamente como serviço de backend. A tela de Configurações informa seu uso, conforme a exigência de atribuição da licença. Não utilizamos nem alteramos seu frontend.

- Projeto: https://github.com/evolution-foundation/evolution-api/tree/2.3.8
- Licença: https://github.com/evolution-foundation/evolution-api/blob/2.3.8/LICENSE
- Avisos: https://github.com/evolution-foundation/evolution-api/blob/2.3.8/NOTICE

Instalação na VPS: executar como root `bash /opt/barberpro/repository/deploy/vps/setup-evolution.sh`. O script é idempotente, cria segredos somente no ambiente privado e não os imprime. O serviço publica apenas `127.0.0.1:8088`; banco e Redis não publicam portas. Não instalar o gerenciador público. Os arquivos privados ficam em `/opt/barberpro/shared/evolution`.

Variáveis da aplicação: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_SECRET` e o `APP_URL` HTTPS já existente. A chave global nunca chega ao navegador. Cada empresa tem uma instância derivada no servidor; parâmetros de instância enviados pelo cliente não são aceitos. QR Code não é persistido em arquivos públicos ou logs.

`/api/whatsapp` permite ao ADMIN consultar estado/cota, gerar QR e desconectar. `/api/webhooks/evolution` autentica eventos por segredo em cabeçalho, localiza a empresa pela instância e apenas avança estados de mensagens correspondentes. O webhook genérico antigo fica reservado às mensagens da plataforma. A cobrança do BarberPro nunca usa o número da barbearia.

Envios contam no mês-calendário de Brasília quando aceitos pelo provedor; reservas em andamento e resultados incertos ocupam cota preventivamente. O controle é transacional por empresa. Não há cobrança excedente: a fila pausa e gera aviso. O consumo não zera ao desconectar, reconectar ou trocar de plano. Instâncias desconectadas não impedem notificações internas.

Consentimento e telefone são conferidos ao enfileirar e antes do envio. Lembretes vencidos e versões antigas de agendamentos são descartados. Timeout após envio pode significar mensagem aceita: marcar `UNKNOWN` e conferir o WhatsApp antes de qualquer ação manual, sem repetição automática. Não prometer entrega garantida nem ausência de bloqueios.

## Operação e backup

O grupo Docker usa limites de 1 GiB para API, 256 MiB para PostgreSQL e 128 MiB para Redis. A capacidade para várias sessões reais precisa ser observada antes de ampliar a oferta; não equivale a um teste de carga com números conectados.

`backup-evolution.sh` integra-se ao backup diário do BarberPro. Pausa brevemente apenas a API Evolution, salva banco e sessões/ambiente privado, retoma a API e restaura o dump em um banco temporário exclusivo para verificar sua integridade. Não altera outros serviços da VPS. Backups contêm credenciais e permanecem restritos a root.

Após implantação, validar saúde da aplicação e API, criar uma instância de teste sem telefone e verificar o QR Code. A validação de ponta a ponta com entrega real depende de um administrador conectar seu número em Configurações → WhatsApp e de um destinatário que tenha consentido. E-mail continua adiado.

## Informação comercial e contratos

`/planos` apresenta preços, comparação de recursos, limites, condições do teste e dependências do WhatsApp. Landing page e cadastro apontam para essa comparação. `/contrato` e `/privacidade` disponibilizam os textos públicos. O contato informado pelo fornecedor é `redetech.ofc@gmail.com`; a identificação usa o titular do PIX e o endereço do Parque Tecnológico da Bahia, conforme instruções do proprietário. A indicação de endereço não constitui afirmação de vínculo institucional com o Parque.

O cadastro exige aceite da versão atual do contrato de adesão ao teste. Cada pedido de pagamento exige aceite do instrumento comercial correspondente: contratação, renovação, upgrade ou downgrade, incluindo redução de duração no mesmo nível. O backend recompõe o conteúdo a partir dos dados da empresa, identidade da conta e catálogo, comparando versão e hash antes de gravar o pagamento e o aceite na mesma transação.

O registro conserva conteúdo integral, hash SHA-256, versão contratual e de privacidade, conta, nome/e-mail do aceitante e data do servidor. Não armazena senha, token de sessão ou QR Code como evidência. O aceite não serve como autorização genérica para marketing ou imagens. Documentos não têm endpoints de edição ou exclusão. A empresa pode consultar e baixar seus instrumentos em `/dashboard/contratos`; o proprietário do sistema pode consultar o instrumento vinculado à revisão do pagamento. Alterar o plano diretamente pelo cadastro administrativo é recusado: mudanças contratuais passam pelo aceite da barbearia.

Os textos preservam direitos obrigatórios, distinguem controlador e operador conforme a finalidade, indicam canal de privacidade e não prometem imunidade judicial ou certificação ICP-Brasil. A implementação não equivale a parecer jurídico ou certificação de conformidade; recomenda-se revisão jurídica das condições comerciais e dos procedimentos operacionais.

Fontes legais e cadastrais consultadas:

- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- CDC: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- Endereço do Parque Tecnológico: https://parquetecnologico-ba.org.br/como-chegar/

Validação funcional: 180 combinações de preços/descontos; 17 casos de assinatura, permissões, capacidade, WhatsApp e contratos; 27 casos gerais; 23 casos do portal do cliente. Build de produção e validação visual são repetidos após as alterações finais de interface.


## Entrada unificada

A tela pública de `/login` não exibe seleção de perfil ou indicação do proprietário do sistema. O endpoint autentica e-mail/senha e devolve o destino correspondente à identidade registrada; parâmetros de perfil enviados pelo cliente não alteram permissões. As rotas protegidas continuam validando a sessão e o papel no servidor. O formulário mantém senha oculta por padrão, suporte a gerenciadores de senha, recuperação e acesso separado ao portal do cliente. O retorno da recuperação aparece como aviso na própria tela. Nenhuma senha é salva em armazenamento local.
