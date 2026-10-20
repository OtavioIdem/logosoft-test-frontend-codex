# Rodada 23 — Design: AJ-07 limites do leiaute

## Padrão de UX

AJ-07 não cria tela. Os erros de formato aparecem no `FieldError` já usado pelos diálogos: mensagem no campo, preservação do que foi digitado e nenhuma máscara que esconda caractere removido. Produto, Natureza, Série, Empresa, Filial e Pessoa mantêm o padrão PrimeReact/Sakai atual.

- Não criar componente compartilhado visual: há um único padrão de erro de formulário (`FieldError`), já reutilizado.
- Não usar `maxLength` cego em NCM/CEST/CFOP, pois pontuação permitida pode ter mais caracteres que o valor normalizado; o schema deve explicar o formato ao salvar.
- Campo bloqueado por permissão mantém o motivo atual; nenhuma permissão muda nesta fatia.
- Estados de carregamento/vazio/erro/sucesso das telas permanecem; a novidade é apenas erro local recuperável no campo.

## O que abro mão

Não haverá máscara nova ou reformulação dos formulários. O gatilho para padronizar máscara é uma decisão posterior que abranja CNPJ alfanumérico e tenha teste de acessibilidade próprio.

```json
{
  "agent": "arquiteto-design-system",
  "node": "projeto",
  "assunto": "aj07-limites-leiaute",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/23-design-aj07-limites-leiaute.md",
  "decisoesPropostas": [{ "id": "D108", "titulo": "Erro de formato no campo, sem máscara nova", "reversivel": true, "gatilho": "rodada AJ-09" }],
  "discordancias": [],
  "pendencias": [],
  "riscos": []
}
```
