# Preparação para produção

Estudo inicial realizado em 30/10/2026. Estado atual: **não liberar para produção**. O [status de implementação](STATUS-IMPLEMENTACAO.md) registra as correções e verificações posteriores. A [análise da VPS](ANALISE-VPS.md) registra inspeção e contenção limitada de incidentes.

1. [Estudo do sistema](ESTUDO-DO-SISTEMA.md): funcionamento, atores, pontos fortes, fragilidades e evidências.
2. [Plano de implementação](PLANO-DE-IMPLEMENTACAO.md): sete fases, tarefas priorizadas, dependências, estimativa e critérios de liberação.
3. [Validação dos fluxos](VALIDACAO-DOS-FLUXOS.md): matriz por módulo, limites do que foi executado e casos de homologação.
4. [Auditoria dos handlers](auditoria-handlers.json): 22 casos isolados — 14 achados, 8 contratos, nenhum erro do harness.
5. [Verificações do ambiente](verificacoes-ambiente.json): resultados de instalação, compilação, lint, Prisma e conectividade.
6. [Inventário dos fontes](inventario-fontes.json): 77 fontes, hashes, páginas, rotas e diagnóstico sintático.

Reprodução da auditoria: `node scripts/audit-production.cjs` na raiz do projeto, com dependências instaladas. Ela usa os handlers reais e adaptadores simulados, sem SQL ou rede externa. Sucesso da auditoria significa que as evidências foram reproduzidas, **não** que o produto passou em segurança ou E2E.

O estudo e inventários descrevem a linha de base antes das correções. Para o estado atual, use o status de implementação e os resultados da suíte de integração; a implantação remota não foi realizada.
