# Skill — Normas gerais de desenvolvimento

## Objetivo

Garantir que toda evolução do frontend seja segura, rastreável e compatível com um ERP real.

## Princípios obrigatórios

1. Desenvolver sobre a última versão aprovada e commitada.
2. Não usar versão bloqueada como base aprovada.
3. Não inventar funcionalidade, regra fiscal, payload ou endpoint.
4. Não tratar módulo crítico como CRUD visual.
5. Não criar mock produtivo nem fallback silencioso para API real.
6. Não remover arquivo rastreado sem justificativa explícita e escopo próprio.
7. Não reescrever store, mock, contrato de API ou fluxo sensível fora do escopo.
8. Não expor segredo, token, certificado, XML completo ou payload sensível em tela, log ou teste.
9. Não permitir digitação manual de GUID para entidade relacionada.
10. Toda mudança deve ter documentação coerente com o ZIP entregue.

## Decisão antes de implementar

Antes de alterar arquivos, responder internamente:

```text
Qual versão é a base correta?
A versão anterior foi aprovada?
Existe bloqueio aberto?
A entrega é funcional nova ou corretiva?
O escopo altera tela, API, contrato, teste, documentação ou gate?
Existe impacto fiscal, financeiro, estoque, segurança ou LGPD?
Existe risco de mock produtivo?
Existe risco de remover arquivo rastreado?
Quais gates protegem esta entrega?
```

## Conduta durante implementação

- Alterar somente arquivos necessários ao escopo.
- Preferir mudanças pequenas, revisáveis e protegidas por teste.
- Manter nomes técnicos consistentes com o backend.
- Documentar riscos e validações não executadas.
- Gerar pacote limpo, sem artefatos locais.

## Artefatos locais proibidos no ZIP

```text
node_modules/
.next/
.vs/
coverage/
playwright-report/
test-results/
dist/
build/
package-lock.json não rastreado
```
