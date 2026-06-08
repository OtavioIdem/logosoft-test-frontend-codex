# Levantamento de pendências do frontend

## Escopo do levantamento

Este documento registra o que ainda falta implementar, validar ou amadurecer no frontend do LogoSoft ERP a partir da base aprovada `v1.11.0a8b29` e da preparação `v1.11.0a8b30`.

O objetivo não é inventar novas telas ou endpoints. O objetivo é separar o que já existe, o que depende de backend real/controlado e o que precisa virar etapa própria com escopo, critérios de aceite e gates.

## Estado consolidado atual

Já existe frontend operacional para:

- autenticação, sessão, permissões e proteção de rotas;
- administração: empresas, filiais, setores, cargos e centros de custo;
- pessoas, clientes e fornecedores;
- produtos, categorias, marcas e unidades de medida;
- estoque: saldos, movimentos, reservas, locais e inventários;
- vendas: pedidos, itens e detalhe operacional;
- compras: pedidos, itens e detalhe operacional;
- financeiro: contas, formas e condições de pagamento;
- fiscal: listagem, detalhe, workflow, resumo, observabilidade, exportação, DANFE, inutilização e ações críticas;
- auditoria operacional;
- dashboard inicial;
- CI, gates estruturais, skills, isolamento de mocks e E2E fiscal mockado.

## Pendências bloqueantes para validação real

1. Preparar ambiente backend controlado com dados descartáveis e estáveis.
2. Gerar usuário/token com permissões coerentes para fiscal, estoque, financeiro, vendas e auditoria.
3. Criar seed de empresa, filial, cliente, produto, pedido de venda e condição/forma de pagamento.
4. Confirmar que `NEXT_PUBLIC_API_URL` aponta para a API real/controlada correta.
5. Preencher `.env.backend-controlled.local` sem versionar segredo.
6. Executar `npm run test:contract:fiscal` com variáveis reais/controladas.
7. Executar `npm run test:e2e:fiscal:backend` somente em homologação/sandbox/base descartável.
8. Registrar divergências de contrato como correções formais, não como ajuste visual improvisado.

## Pendências funcionais por módulo

### Fiscal

- Executar contrato fiscal contra backend real/controlado com dados reais de homologação.
- Executar E2E fiscal backend controlado ponta a ponta com pedido de venda preparado.
- Validar oficialmente regras NF-e/NFC-e/NFS-e com documentação fiscal vigente e especialista humano.
- Confirmar que cancelamento, inutilização, carta de correção, DANFE, XML e rejeições respeitam backend e legislação aplicável.
- Expandir contratos para cenários de erro: rejeição, bloqueio de workflow, permissão negada e payload sensível mascarado.
- Separar o que é homologação técnica do que é validação fiscal oficial.

### Financeiro

- Validar em backend real os fluxos gerados pelo fiscal e por vendas.
- Cobrir baixa parcial, baixa total, estorno, cancelamento, juros, multa e desconto quando os endpoints estiverem disponíveis.
- Confirmar que nenhuma conta quitada pode ser alterada diretamente pela UI.
- Criar E2E controlado de conta a receber originada de venda/nota fiscal.
- Ampliar testes de contrato para contas a receber, contas a pagar e movimentações financeiras.

### Estoque

- Validar em backend real baixa de estoque fiscal e movimentações operacionais.
- Cobrir reserva, estorno, inventário, transferência e bloqueios de saldo insuficiente.
- Confirmar que saldo não é editado diretamente e sempre deriva de movimento.
- Criar E2E controlado para reserva/baixa/estorno com produto preparado.
- Ampliar contratos para saldos por empresa, filial e local de estoque.

### Vendas

- Validar criação, edição, aprovação e faturamento de pedido contra backend real.
- Confirmar regras de pedido cancelado, pedido faturado, itens com quantidade inválida e produto inativo.
- Cobrir geração de financeiro, geração fiscal e impacto em estoque com E2E controlado.
- Ampliar testes de componente para dialogs de ação e mensagens de bloqueio.

### Compras

- Validar pedido de compra, recebimento parcial/total e integração com estoque/financeiro quando o backend estiver pronto.
- Cobrir bloqueios de recebimento maior que pedido, cancelamento e devolução ao fornecedor.
- Criar contrato de API para recebimento e conta a pagar gerada por compra.

### Segurança

- Validar permissões reais por usuário/grupo/empresa/filial contra backend.
- Cobrir alteração de permissões e expiração/invalidação de sessão quando o backend invalidar cache/token.
- Planejar MFA, bloqueio por tentativas, recuperação de senha e auditoria de credenciais quando os endpoints existirem.
- Confirmar que o frontend nunca é a única barreira de autorização.

### Administração, Pessoas, Clientes e Fornecedores

- Validar campos obrigatórios e mensagens reais do backend em ambiente controlado.
- Ampliar testes de contrato para paginação, filtros, criação, edição e inativação.
- Validar minimização LGPD em listagens, selects e exportações futuras.
- Confirmar regras de multiempresa/multifilial em todos os endpoints.

### Produtos

- Validar cadastro completo contra backend real incluindo unidade, categoria, marca e dados fiscais parametrizados.
- Confirmar que dados fiscais de produto não são inventados no frontend.
- Criar contrato para busca server-side usada por selects de módulos relacionados.

### Auditoria

- Validar consulta de auditoria real após operações críticas.
- Criar E2E controlado que execute ação crítica e verifique evento de auditoria correspondente.
- Garantir que payload sensível não apareça em tela ou log técnico do frontend.

### Dashboard e Relatórios

- Validar métricas contra backend real e regras de permissão.
- Planejar cache, paginação e carregamento incremental para dados agregados.
- Criar testes de contrato para endpoints de indicadores.
- Impedir exposição de dados financeiros, fiscais ou pessoais sem permissão específica.

### Integrações, Contábil, RH e Suporte/TI

- Definir escopo real antes de criar telas.
- Mapear endpoints, permissões e auditoria obrigatória.
- Não tratar como CRUD quando houver regra contábil, trabalhista, regulatória ou integração externa.
- Criar versão própria para cada módulo quando houver contrato backend.

## Testes ainda necessários

1. Contratos de API por módulo além do fiscal.
2. E2E real/controlado para vendas, estoque e financeiro integrados.
3. E2E real/controlado de auditoria após operação crítica.
4. Testes de componente para dialogs de ação crítica por módulo.
5. Testes de permissão negada por rota e por ação operacional usando permissões reais.
6. Testes de erro de backend: ProblemDetails, 400, 401, 403, 404, 409 e 500.
7. Testes de LGPD para documentos, payloads e exportações futuras.
8. Testes de regressão para todo bug bloqueante encontrado em review.

## Pendências técnicas e operacionais

- Definir estratégia de secrets para CI quando as suítes real/controladas forem executadas em ambiente seguro.
- Definir seed resetável para backend de homologação.
- Definir usuário técnico de teste com permissões mínimas e rastreáveis.
- Definir critérios para diferenciar ambiente local, homologação, sandbox fiscal e produção.
- Criar runbook de execução real/controlada com evidências de validação.
- Atualizar documentação sempre que README ou CHANGELOG mudarem.

## Critério para próximas versões

A próxima versão só deve implementar tela ou integração nova quando houver:

1. endpoint real ou contrato formal;
2. regra de negócio documentada;
3. permissão definida;
4. auditoria esperada;
5. tratamento de loading, vazio, erro e sucesso;
6. teste unitário/componente;
7. contrato ou E2E quando o fluxo for crítico;
8. documentação da versão coerente com o ZIP.
