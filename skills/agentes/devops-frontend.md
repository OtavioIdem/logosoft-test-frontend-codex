# Skill — devops-frontend

## Missão

Subir, buildar e empacotar sempre do mesmo jeito, e diagnosticar falha de build, execução ou CI
do mais barato para o mais caro.

## Entrada obrigatória

```text
O que se quer: dev server, build, imagem Docker, ou diagnóstico de falha.
Autorização explícita, quando envolve Docker ou publicação.
A falha, quando é diagnóstico: comando, saída e ambiente.
```

**Docker só sob pedido explícito do usuário.** Não builde nem rode container por iniciativa
própria.

## Dev server

Sempre pelo preview, nunca por `npm run dev` solto em background:

```text
preview_start com a configuração logosoft-dev (.claude/launch.json, porta 3000)
preview_logs para ver a saída do servidor
read_console_messages para erro de runtime no navegador
preview_stop ao encerrar
```

## Build

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run build` deste projeto executa `validate:source` antes do `next build`. Build vermelho com
typecheck verde quase sempre é gate estrutural, não erro de compilação: leia a mensagem do
validador antes de mexer no código.

## Gates de CI

```bash
npm run validate:ci
npm run ci:gates
```

`ci:gates` é a pipeline inteira e é cara. Rode-a quando o pedido for validar a pipeline; para
conferir uma entrega, rode os gates do escopo.

## Docker, quando autorizado

```bash
docker build -t logosoft-frontend:local .
docker run -d --name logosoft-local -p 3000:3000 logosoft-frontend:local
docker logs -f logosoft-local
```

O Dockerfile é multi-stage e o estágio de build roda `npm run build`. Falha no build da imagem
reproduz localmente com `npm run build` — comece por aí, é mais barato.

## Variáveis de ambiente

```text
.env.example                     base do que a aplicação espera
.env.backend-controlled.example  cenário de backend controlado
.env.test                        execução de teste
```

Nunca coloque segredo real em arquivo versionado, log, saída de comando ou mensagem de entrega.

## Diagnóstico, do mais barato para o mais caro

```text
1. Ler a mensagem de erro inteira, até o fim.
2. Reproduzir com o menor comando possível (typecheck antes de build; build antes de Docker).
3. Conferir ambiente: Node 24 e npm 11 são exigidos por este projeto.
4. Conferir se o gate que falhou é estrutural, e o que ele exige.
5. Só então abrir código.
```

Falha de build **para e escala** quando a causa está no código de feature: quem corrige é o
`dev-senior-react`.

## Saída

Comando executado, resultado, trecho relevante da saída, causa provável com evidência, e o que
falta verificar. Nunca "subiu normalmente" sem log.

## Erros que já custaram tempo

```text
Rodar dev server pela Bash em vez do preview, e perder o log.
Buildar imagem Docker sem o usuário ter pedido.
Rodar ci:gates para validar uma mudança de uma tela.
Tratar aviso de ambiente como falha de código.
Corrigir código de feature em vez de escalar.
Alterar .env versionado para "destravar" a execução.
```
