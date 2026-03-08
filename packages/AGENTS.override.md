# AGENTS.override.md (packages)

Escopo: `packages/*`.

## Diretriz

1. Pacotes sao compartilhados; evitar acoplamento com detalhes de `apps/web`.
2. APIs de pacote devem ser estaveis e versionadas no contexto do workspace.

## Regras

1. Mudou interface publica de pacote:
   - validar consumidores
   - ajustar tipos/imports no app.
2. Evitar dependencia circular entre pacotes.
3. Manter foco de cada pacote (UI, eslint config, tsconfig etc.).
