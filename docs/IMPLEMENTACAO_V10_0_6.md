# Implementação v10.0.6 — build hardening e validação preventiva

Esta versão é uma etapa de estabilização antes de continuar refinando módulos funcionais.

## Objetivo

Evitar regressões de compilação já observadas em versões anteriores e falhar mais cedo, com mensagem clara, antes do `next build`.

## Alterações

- `package.json` atualizado para `10.0.6`.
- Rodapé passa a exibir `© logosoft v10.0.6` via `config/app.ts`.
- Script `build` agora executa `npm run validate:source` antes de `next build`.
- `scripts/validate-source.mjs` foi endurecido para bloquear:
  - `console.*` em código de aplicação;
  - resíduos da engrenagem do template (`pi-cog`, `layout-config-button`, `AppConfig`, `AppConfigProps`, `configSidebarVisible`);
  - identificadores corrompidos por substituição textual indevida;
  - declaração TypeScript com identificador quebrado por espaço;
  - `messages?.[0]` em mapeamento Zod;
  - export default direto de client page que pode quebrar prerender do Next.
- Tipos residuais do configurador do template foram removidos:
  - `AppConfigProps`;
  - `configSidebarVisible`.
- Adicionado `.dockerignore` para impedir envio de `node_modules`, `.next`, cobertura e artefatos locais para o contexto do Docker.

## Validação local recomendada

```bash
npm install
npm run validate:source
npm run typecheck
npm run test
npm run build
```

## Docker

O Dockerfile permanece sem `npm ci`, conforme definido durante os ajustes anteriores.

```bash
docker build --no-cache -t logosoft-frontend:latest .
```
