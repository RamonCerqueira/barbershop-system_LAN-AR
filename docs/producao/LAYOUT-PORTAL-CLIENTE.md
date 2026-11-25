# Revisão visual do portal do cliente

Revisão iniciada em 23/11/2026; validação final em 25/11/2026.

## 1. Escopo aprovado

Somente `/cliente` e suas páginas derivadas: descoberta, favoritos, perfil da barbearia e reserva, próximos horários, histórico, avisos/lista de espera, perfil, entrada, cadastro e recuperação. A página `/`, o administrativo, as APIs, o banco e a configuração global do Capacitor não fazem parte desta revisão.

Após a leitura do documento, o usuário restringiu expressamente o trabalho a layout. Por isso, a descoberta continua pública, a reserva mantém as três etapas existentes e não há novas rotas, permissões ou funcionalidades.

## 2. Auditoria e problemas encontrados

- Textos de operação entre 9 e 13 px, com hierarquia pouco evidente.
- Mesma apresentação de painel em telas com objetivos diferentes.
- Navegação desktop ocupando o cabeçalho, com pouco espaço para identificar a seção.
- Áreas de toque pequenas em elementos secundários e seleção de fotos.
- Foco do campo de busca duplicado e estilos administrativos herdados nos campos dos diálogos do cliente.
- Aproveitamento limitado da fotografia institucional já existente.
- Preferências, lista de espera e avisos em uma coluna longa também no desktop.

## 3. Conceito visual

Grafite com nuance verde, superfícies discretas, marfim e dourado fosco. A tipografia de interface usa as fontes do sistema operacional; o destaque editorial usa uma fonte serifada do próprio dispositivo. Não há download de fontes ou dependências novas.

| Elemento | Tratamento |
|---|---|
| Fundo | `#101211` |
| Superfícies | `#191c1a` / `#1a211b` |
| Texto principal | `#f5f3ec` |
| Texto secundário | `#a5ada6` |
| Destaques | `#dfbd84` |
| Contornos de campos | `#65735f`, contraste 3,48:1 sobre `#141b15` |
| Controles principais | Altura de 44–51 px; inputs a partir de 16 px |
| Movimento | Interações curtas; respeita `prefers-reduced-motion` |

Todos os seletores de apresentação ficam dentro de `.customer-portal`, inclusive as personalizações dos diálogos compartilhados. Isso evita que os estilos persistentes da navegação Next.js alterem a administração.

## 4. Telas reformuladas

- Descoberta: composição editorial com a imagem institucional existente, busca destacada, filtros e cards de barbearias com informação mais legível.
- Favoritos: cabeçalho de coleção e o mesmo catálogo funcional existente.
- Barbearia/reserva: capa, identificação, informações da casa, serviços, profissionais, horários e resumo com nova hierarquia.
- Próximos horários: primeiro atendimento com destaque visual, status legível, ações e pagamento organizados.
- Histórico: tratamento de linha do tempo, mantendo avaliação, fotos e novo agendamento.
- Perfil: resumo da conta e formulários organizados, upload, segurança e saída preservados.
- Avisos: preferências em coluna lateral no desktop e sequência vertical no celular, com fila e notificações diferenciadas.
- Acesso/cadastro/recuperação: composição editorial e formulários adaptados ao toque, sem mudar a autenticação.

## 5. Componentes criados e reaproveitados

Criados `CustomerPageHeading` e `CustomerEmptyState`, no arquivo `CustomerUI.tsx`, exclusivamente de apresentação. Reorganizado o invólucro existente `CustomerPortal`, com navegação lateral no desktop, navegação inferior no celular/tablet, cabeçalho compacto e link de salto para teclado.

Reutilizados `ShopDiscovery`, `ShopCard`, `ShopProfile`, `CustomerAuthForm`, `CustomerAppointments`, `CustomerProfile`, `CustomerActivity`, `WaitlistJoin`, `CutPhotos`, os ícones Lucide e `SaasModal`. O componente compartilhado de diálogo não foi alterado; sua apresentação é ajustada somente dentro do portal.

## 6. Funcionalidades preservadas

Mantidos os endpoints, cookies e sessões, consentimento no cadastro, redirecionamento após acesso, busca/filtros/localização, favoritos, disponibilidade real, idempotência da reserva, preços, regras de sinal, prazos e conflitos, remarcação/cancelamento, arquivo ICS, avaliações verificadas, fotos e consentimento de publicação, preferências e lista de espera, dados de perfil e troca de senha.

Nenhuma alteração em arquivos de API, Prisma, migrações, regras comerciais, serviços administrativos ou configuração nativa global. Não foram adicionados dados de demonstração ao produto nem à produção. A validação visual usa fixtures locais temporárias e as remove ao terminar.

## 7. Capacitor e responsividade

O Capacitor existente utiliza WebView com servidor remoto. Esta revisão prepara a apresentação das rotas do cliente para esse ambiente com `viewport-fit=cover`, `env(safe-area-inset-*)`, altura dinâmica, alvos de toque e navegação inferior. A fonte do sistema acompanha iOS/Android. O zoom do usuário continua permitido.

Não foram adicionados plugins, push, biometria, modo offline, novas permissões nativas ou alterações em `capacitor.config.ts`. Pacotes APK/IPA e testes em aparelho físico não são entregas deste ajuste de layout.

## 8. Validação

- `npm run typecheck`: aprovado.
- `npm run test:customer`: 23/23 casos aprovados, incluindo isolamento, reservas, sinal, fila e privacidade de fotos.
- `npm run build`: aprovado, com as mesmas 85 páginas e nenhuma rota nova. Permanecem apenas avisos preexistentes de imagens nos componentes institucionais fora deste escopo.
- Navegador com a build de produção: cadastro, login, favorito, reserva, remarcação, download ICS, avaliação, histórico/fotos, edição de perfil, preferências e bloqueio de acesso privado aprovados. Nenhum erro de console nessa rodada estável.
- Vinte capturas geradas, com revisão visual dos principais fluxos; verificação de largura em 320, 390, 834 e 1440 px, sem rolagem horizontal indevida.
- Emulação de toque: filtros operáveis por toque e os quatro itens da navegação inferior com alvos de pelo menos 44 × 44 px.
- `prefers-reduced-motion`: animações/transições desativadas conforme a preferência.
- Isolamento CSS: 482 regras verificadas com prefixo `.customer-portal`, além das animações de nome exclusivo. Sem diferenças em backend, administração, página principal, dependências ou Capacitor global.
- Contrastes principais calculados: texto principal 16,94:1, secundário 7,15:1 e botão principal 10,98:1. Campos compilados verificados no navegador: contorno 3,48:1, fonte de 16 px e foco dourado visível.

A revisão foi feita em navegador Chromium com tamanhos e toque emulados. Não houve execução de APK/IPA em aparelhos físicos iOS/Android e não se trata de certificação formal de acessibilidade.

Endereço de entrega: `https://barberpro.genioplay.com.br/cliente`. A publicação usa o processo existente de releases da VPS, com backup e rollback; não muda as rotinas automáticas instaladas.

## 9. Pendências e alterações que exigem aprovação

Não foi identificada necessidade de funcionalidade nova para entregar o layout. A nova home privada com próximo agendamento, a substituição da descoberta pública por uma página institucional e a exigência de login antes de consultar o catálogo são propostas distintas e viáveis, mas mudam navegação/acesso e precisam de aprovação antes da implementação. A revisão visual não depende delas.

As configurações de provedores de e-mail/WhatsApp e a distribuição nativa continuam com o estado anterior; não foram modificadas para viabilizar o visual.
