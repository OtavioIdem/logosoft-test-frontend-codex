# Skill — Padrão de execução comum a todos os agentes

## Briefing mínimo

Nenhum agente começa sem estes cinco itens. Faltando qualquer um, ele **para e devolve**, em vez
de adivinhar:

```text
1. Missão em uma frase: o que deve estar pronto quando ele terminar.
2. Recorte: módulo, telas, rotas e arquivos que ele pode tocar.
3. Fronteira: o que ele não toca, mesmo que pareça errado.
4. Insumo: plano de versão, decisão travada (Dn) ou inventário que sustenta o trabalho.
5. Saída esperada: arquivo, formato e onde entregar.
```

Devolver briefing incompleto custa uma mensagem. Adivinhar custa uma versão.

## Ordem de leitura, sempre a mesma

```text
1. skills/agentes/00_padrao_de_execucao.md  (este arquivo)
2. skills/agentes/<o proprio agente>.md
3. A skill de regra da frente: projeto, desenvolvimento ou review
4. O insumo do briefing (plano, decisão, inventário)
5. O código — por último, e só o do recorte
```

Abrir código antes de saber o recorte é como o contexto se enche de arquivo irrelevante.

## Economia de contexto

O que mais desperdiça trabalho, em ordem:

```text
Ler módulo inteiro quando bastava um arquivo.
Reler arquivo que já está no contexto.
Rodar a suíte completa de testes em vez do escopo do módulo.
Reconstruir raciocínio que o plano da versão já resolveu.
Explicar o que se vai fazer antes de fazer.
```

Regras práticas:

- Comece por `grep`/`glob` com termo específico, não por listar diretório.
- Leia o arquivo que o inventário ou o plano nomeou; só amplie se ele apontar para outro.
- Teste por módulo: `npx vitest run tests/unit/<modulo>*.test.ts`. A suíte completa é lenta
  nesta máquina e estoura timeout de ambiente, produzindo falha que não é falha.
- Se três arquivos já responderam a pergunta, pare de procurar o quarto.

## Evidência

Toda afirmação de fato carrega origem:

```text
Fato        arquivo:linha, ou saída de comando colada.
Medição     o comando que produziu o número.
Intuição    rotulada na frase: "isto é intuição, não medição".
```

Comando que não rodou não vira "validado". Vira **não verificado**, escrito assim.

## Entrega

Toda entrega responde, na ordem:

```text
1. O que foi feito.
2. Arquivos tocados, um por linha.
3. O que foi verificado, e com qual comando ou rota.
4. O que NÃO foi verificado, e por quê.
5. O que ficou fora do escopo de propósito.
6. Riscos e a próxima decisão que alguém precisa tomar.
```

Item 4 vazio quando algo não rodou é o defeito mais caro que um agente comete: transforma
"não sei" em "está certo".

## Handoff entre agentes

```text
projeto        → arquiteto-frontend    entrega decisão travada (Dn) + inventário
arquiteto-frontend → dev-senior-react  entrega plano com arquivo alvo por passo
dev-senior-react   → engenheiro-testes entrega o comportamento novo e o caso de borda conhecido
dev-senior-react   → designer-ux-erp   entrega a tela funcionando; refino visual vem depois
qualquer um    → qa-revisor            entrega diff fechado, nunca trabalho em andamento
qa-revisor     → dev-senior-react      entrega achado com arquivo, linha, causa e correção indicada
```

Quem recebe não reabre a decisão de quem entregou. Se discordar, **escala para o orquestrador**;
não corrige por conta própria fora do seu papel.

## Anti-padrões que valem para todos

```text
Implementar direto no fio da conversa, sem plano.
Inventar endpoint, campo, enum ou regra fiscal.
Criar mock no caminho produtivo ou fallback silencioso para API real.
Aceitar GUID digitado para vínculo de entidade.
Reescrever arquivo fora do escopo porque "estava ruim".
Remover arquivo rastreado sem justificativa e escopo próprio.
Expor token, senha, certificado ou XML completo em tela, log ou teste.
Declarar aprovação sem saída de gate.
Alterar versão em package.json sem que a entrega seja de versão.
```

## Quando parar e escalar

```text
O contrato do backend diverge do que a tela lê.
A permissão exigida não existe no catálogo.
O plano exige decisão de desenho que ninguém travou.
O gate falha por motivo fora do recorte.
Cumprir o briefing exigiria tocar arquivo proibido pela fronteira.
```

Parar cedo com pergunta específica é barato. Seguir e entregar coisa errada custa a versão
inteira, mais a corretiva `.cN`.
