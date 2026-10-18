# El Oasis

Sistema comercial y operativo de El Oasis, casa de campo para eventos en Pachacámac (Lima, Perú):
web pública, portal de planners, back-office, dashboard gerencial y automatizaciones.

- Especificación: [OASIS.md](OASIS.md)
- Convenciones para agentes y desarrolladores: [CLAUDE.md](CLAUDE.md)
- Cambios: [CHANGELOG.md](CHANGELOG.md)
- Supuestos vigentes: [docs/supuestos.md](docs/supuestos.md)

## Requisitos

- Node 22 y pnpm 10 (`corepack enable`)
- Proyecto de Supabase (o Supabase CLI para entorno local)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # completa las variables
pnpm dev                     # http://localhost:3000
```

## Verificación

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm build && pnpm test:e2e  # capturas en test-results/screenshots
```

## Despliegue

Vercel conectado al repo: preview por rama y producción desde `main`.
La guía completa de puesta en producción estará en `docs/`.
