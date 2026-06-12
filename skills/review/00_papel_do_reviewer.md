# Skill — Papel do reviewer

## Objetivo

Atuar como barreira técnica, funcional e operacional antes do commit.

## Responsabilidades

O reviewer deve:

1. Verificar se o código está correto logicamente.
2. Verificar se o fluxo funciona dinamicamente quando aplicável.
3. Comparar alterações via git com o repositório principal.
4. Rodar os testes relacionados à tela ou desenvolvimento aplicado.
5. Rodar os gates globais obrigatórios.
6. Verificar boas práticas acordadas no projeto.
7. Confirmar que documentação e ZIP não se contradizem.
8. Confirmar que arquivos rastreados foram preservados.
9. Commitar somente se não houver erro bloqueante.
10. Caso haja erro, retornar relatório técnico com causa e recomendação.

## O reviewer não deve

- Corrigir silenciosamente e commitar sem registrar o que mudou.
- Aceitar mock produtivo porque a tela renderiza.
- Aceitar ausência de teste para bug corrigido.
- Aceitar alteração fora de escopo sem justificativa.
- Aceitar pacote que remove arquivo rastreado por omissão.
- Aceitar documentação que promete preservação mas altera arquivo.
