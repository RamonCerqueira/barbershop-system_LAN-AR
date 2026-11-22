# Portal do cliente

## Rotas

- `/cliente`: vitrine, busca por nome/bairro/serviço, cidade, categoria, avaliações, abertos agora e distância aproximada.
- `/cliente/cadastro`, `/cliente/entrar`, `/cliente/recuperar`: conta independente do acesso administrativo.
- `/cliente/barbearia/[id]`: fotos reais, serviços, profissionais, horários, regras e reserva em três etapas.
- `/cliente/agendamentos`: reservas futuras, remarcação/cancelamento dentro do prazo, aviso de PIX e exportação de calendário.
- `/cliente/historico`: atendimentos anteriores, avaliação de atendimento concluído e agendar novamente.
- `/cliente/favoritos` e `/cliente/perfil`: dados persistentes da conta, foto e troca de senha.

## Identidade e histórico

A sessão do cliente usa cookie HTTP-only separado, com token aleatório armazenado somente como hash no banco. Não concede acesso administrativo e não cria usuários para os profissionais.

As reservas novas feitas com a conta são vinculadas no servidor. Telefone ou e-mail iguais não liberam histórico legado. O link privado válido de uma reserva anônima permite guardá-la na própria conta. A mudança de cliente em uma reserva administrativa atualiza sua titularidade. Contas existentes não são criadas ou vinculadas automaticamente pela migration.

Remarcação e cancelamento usam o prazo da barbearia, com mínimo de duas horas, e revalidam o atendimento dentro da transação. Só o titular de um atendimento concluído pode avaliá-lo. As avaliações públicas exibem apenas o primeiro nome.

## Fotos e localização

O administrador publica até oito fotos em Configurações → Geral. A primeira foto é a capa. Logomarcas usam o cadastro atual da empresa. Não há fotos fictícias ou avaliações geradas no portal.

Fotos da vitrine e do cliente ficam em `UPLOAD_DIR/company-gallery` e `UPLOAD_DIR/customer-avatars`; em desenvolvimento, o padrão é `storage/`. PNG, JPG ou WEBP até 2 MB. O proxy deve permitir 3 MB para acomodar o envelope multipart. A localização do navegador é solicitada somente após o clique do cliente; cidade e busca textual funcionam sem permissão de localização. Distâncias são aproximadas, em linha reta.

## E-mail e publicação

A recuperação exige `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` e, conforme o provedor, `SMTP_USER`/`SMTP_PASS`. Credenciais permanecem no arquivo privado de ambiente da VPS, nunca no Git. Sem configuração, a API informa indisponibilidade e não simula envio. O código expira em 15 minutos, é de uso único e invalida as sessões anteriores após a troca de senha.

O calendário exportado é um arquivo ICS que o cliente importa por iniciativa própria; seu lembrete não depende de envio por e-mail ou WhatsApp.

Aplicar a migration `202611210001_customer_portal` durante o deploy. Verificar build, `npm test`, `npm run test:customer` e fluxos reais no navegador antes da troca de release. Os dados de validação devem ser isolados e removidos depois da conferência.
