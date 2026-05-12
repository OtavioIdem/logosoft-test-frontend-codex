# Revisão de build — logosoft frontend v9.3

## Problemas corrigidos

1. Dockerfile não usa mais comando de instalação limpa.
   - Motivo: o pacote original não tinha `package-lock.json`, então comando de instalação limpa quebrava a instalação.
   - Correção: `RUN npm install --no-audit --no-fund`.

2. Dockerfile usa Node LTS.
   - Correção: `FROM node:lts-alpine` em todas as etapas.

3. Conflito de dependência do Vite.
   - Motivo: sem `vite` fixado, o npm podia resolver Vite 7 automaticamente pelo peer do plugin.
   - Correção: `vite` fixado em `^5.4.11` e `@types/node` atualizado para `^24.0.0`.

4. Type error do PrimeReact `Tag`.
   - Motivo: `Tag` no PrimeReact 10.2.1 aceita `success`, `info`, `warning`, `danger`, `null` ou `undefined`; não aceita `secondary` nem `contrast`.
   - Correção: `getStatusSeverity` agora retorna somente severities compatíveis com `Tag`.

5. Schema dinâmico Zod.
   - Motivo: o código anterior chamava `.min()` em uma variável tipada genericamente como `ZodTypeAny`.
   - Correção: criação separada de schemas de texto, número e booleano.

6. Refs do Topbar.
   - Correção: refs tipadas explicitamente como `HTMLButtonElement` e `HTMLDivElement`.

7. Código legado de upload.
   - Correção: removido `app/api/upload.ts`, que usava `any` e não era necessário para a aplicação ERP.

8. Logs diretos.
   - Validação: nenhum `console.log`, `console.error`, `console.warn` ou `console.*` foi encontrado no código da aplicação.

## Comandos recomendados

```bash
npm install
npm run typecheck
npm run build
```

Com Docker:

```bash
docker build --no-cache -t logosoft-frontend:latest .
docker run --name logosoft-frontend -p 3000:3000 --env-file .env.local logosoft-frontend:latest
```
