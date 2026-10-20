# Rodada 23 — Escopo: AJ-07 limites do leiaute

## Linha de corte

### Dentro da próxima fatia funcional, proposta como `b79`

- NCM, CEST, sigla de unidade e unidade tributável no cadastro de Produto.
- CFOP enviado pelo mapeamento de Natureza de operação.
- IE e IM enviados por Empresa, Filial e Pessoa.
- Regressões de Série fiscal 0–999 já existente.
- Testes nominais por limite, borda, normalização sem perda e payload estrito.

### Fora

- GTIN: a K5 o exclui e o payload atual não expõe um campo fiscal próprio. Gatilho: contrato publicar o campo/semântica.
- CNPJ alfanumérico (AJ-09): possui algoritmo e superfícies próprias. Gatilho: rodada K6.
- Máscara visual, correção de lote, mutação de dado legado, endpoint e permissão nova. Gatilho: necessidade operacional documentada.
- Regra de contribuinte, imposto ou emissão: continua no backend.

### Depois

- Metadado gerado de leiaute no frontend, quando R1 o disponibilizar; ele substitui gradualmente o helper para formulários de nota.

## Sequência e trade-off

`b79` só recebe ritual de versão depois de `b77` e `b78` serem revisadas/aceitas; o `package.json` ainda declara b76. O corte de GTIN é reversível porque não há campo de contrato. O corte de IE/IM não é seguro: o backend já aplica o limite às três identidades e elas entram agora.

```json
{
  "agent": "arquiteto-escopo-entrega",
  "node": "projeto",
  "assunto": "aj07-limites-leiaute",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/23-escopo-aj07-limites-leiaute.md",
  "decisoesPropostas": [{ "id": "D108", "titulo": "AJ-07 entra como formato de cadastro, sem GTIN ou AJ-09", "reversivel": true, "gatilho": "novo campo contratado" }],
  "discordancias": [],
  "pendencias": [{ "tipo": "processo", "pergunta": "b77 e b78 serão aceitas antes do ritual de b79?", "decide": "numeração e release" }],
  "riscos": ["Versão b79 não pode ser carimbada sobre fatias anteriores ainda sem QA formal."]
}
```
