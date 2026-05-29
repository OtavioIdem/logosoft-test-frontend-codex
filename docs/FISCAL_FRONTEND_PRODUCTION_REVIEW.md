# Revisão final de produção — Frontend Fiscal — v1.11.0a8b25

## 1. Objetivo

Esta revisão consolida os critérios mínimos para considerar o frontend fiscal pronto para validação operacional controlada, antes de qualquer uso em produção real.

O foco desta etapa é segurança visual, consistência de contrato, proteção de payload sensível, permissões, workflow e execução dos gates técnicos. Esta revisão não cria regra fiscal oficial e não substitui validações do backend/domínio.

## 2. Escopo revisado

Foram considerados os seguintes blocos do frontend fiscal:

- listagem fiscal;
- detalhe da nota fiscal;
- painéis de workflow, XMLs, eventos, integrações e documentos auxiliares;
- observabilidade fiscal;
- inutilização fiscal;
- exportação CSV auditada;
- ações críticas com `correlationId`;
- E2E fiscal mockado;
- contrato fiscal contra backend controlado;
- E2E fiscal backend controlado opt-in.

## 3. Critérios obrigatórios

### 3.1 Segurança de exibição

- XML fiscal completo não deve aparecer em listagem, detalhe, observabilidade, toast ou erro.
- `payloadResumo` deve passar por mascaramento defensivo antes de renderizar.
- Tokens, senhas, certificados, segredos e Bearer tokens devem ser mascarados.
- Documento auxiliar deve ser exibido por metadados e baixado por endpoint protegido.
- GUID técnico não deve ser solicitado manualmente quando representar entidade do ERP.

### 3.2 Workflow e permissões

- Botões fiscais críticos devem depender de permissão visual e estado operacional retornado pelo backend.
- Quando houver workflow, usar `workflow.proximasAcoes` como fonte principal.
- Quando houver resumo operacional, usar `resumo.acoes` como fallback explícito.
- `motivoBloqueio`, `bloqueios` e `alertas` devem ser visíveis ao operador.
- Frontend não deve inventar regra fiscal legal.

### 3.3 Multiempresa e multifilial

- Consultas fiscais devem exigir empresa quando o contrato exigir.
- Filial opcional não deve ser enviada como parâmetro vazio.
- Ao trocar empresa, limpar filial e referências dependentes.
- Ao trocar filial, limpar referências dependentes do escopo.

### 3.4 Idempotência e auditoria operacional

- Ações críticas devem enviar `correlationId` quando previsto no contrato.
- `correlationId` deve ser gerado por tentativa operacional.
- Reprocessamento deve usar log de integração ou correlation original, além de um novo correlation ID.

## 4. Gates técnicos obrigatórios

Executar antes de commit:

```bash
npm install
npm run validate:source
npm run validate:fiscal:production
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:e2e:fiscal:backend
git diff --check
git diff --cached --check
```

## 5. Execução opt-in de contrato real/controlado

A suíte de contrato fiscal contra backend só deve validar backend real quando as variáveis abaixo forem fornecidas:

```bash
LOGOSOFT_CONTRACT_API_URL=http://localhost:8080
LOGOSOFT_CONTRACT_ACCESS_TOKEN=token-jwt-valido
LOGOSOFT_CONTRACT_EMPRESA_ID=empresa-guid
npm run test:contract:fiscal
```

Sem essas variáveis, a suíte deve ficar como skipped de forma explícita.

## 6. Execução opt-in do E2E backend fiscal

O E2E backend fiscal é mutável e só deve rodar em ambiente controlado:

```bash
LOGOSOFT_E2E_RUN_BACKEND_FISCAL=true
LOGOSOFT_E2E_API_URL=http://localhost:8080
LOGOSOFT_E2E_ACCESS_TOKEN=token-jwt-valido
LOGOSOFT_E2E_EMPRESA_ID=empresa-guid
LOGOSOFT_E2E_PEDIDO_VENDA_ID=pedido-venda-guid
npm run test:e2e:fiscal:backend
```

Não executar essa suíte contra produção real.

## 7. Pontos críticos para revisão humana

- Confirmar se o backend retorna `resumo-operacional` e `workflow-operacional` com todos os flags necessários para guiar a UI.
- Confirmar se exportação CSV registra auditoria com motivo, filtros e hash do arquivo.
- Confirmar se logs de integração já chegam sanitizados pelo backend.
- Confirmar se documentos auxiliares não retornam conteúdo bruto na API de detalhe.
- Confirmar se permissões do usuário logado refletem corretamente empresa/filial/grupo.
- Confirmar se o E2E backend está usando ambiente mockado/homologado, nunca produção.

## 8. Riscos que permanecem

- Contrato real pode divergir dos fixtures locais se o backend evoluir sem atualizar DTOs.
- E2E backend real fica skipped quando não há variáveis, portanto não comprova integração real nesse cenário.
- Regras fiscais legais continuam fora do frontend e dependem do backend/domínio e validação fiscal oficial.
- NFS-e, CT-e, MDF-e, SPED, apuração e cálculo tributário oficial não estão liberados como prontos por esta revisão.

## 9. Pendências pós-revisão

- Executar contrato real contra backend controlado com dados conhecidos.
- Executar E2E backend fiscal em ambiente controlado com pedido de venda preparado.
- Criar pipeline/CI com gates fiscais obrigatórios.
- Criar runbook operacional final para QA, frontend e backend.
- Fazer varredura global do ERP contra GUID manual fora do módulo fiscal.

## 10. Conclusão

A v1.11.0a8b25 fecha a revisão de produção do frontend fiscal em nível de interface, contrato e segurança visual. A aprovação final ainda depende da execução dos gates no repositório principal e, quando houver ambiente controlado disponível, da execução real das suítes opt-in de contrato e E2E backend.
