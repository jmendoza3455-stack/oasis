# Agentes de Oasis Pachacámac

Diseño y principios: [docs/agentes.md](../docs/agentes.md). Criterio de éxito: **ocupación**.

| Agente               | Tipo           | Dónde vive                                               | Cadencia (hora Lima)       |
| -------------------- | -------------- | -------------------------------------------------------- | -------------------------- |
| Recepcionista        | Tiempo real    | `server/agents/recepcionista.ts` (chat de la web)        | 24/7                       |
| Operaciones          | Automatización | `server/automations.ts` (saldos, D-7, D-1, SLA, resumen) | Diario 08:00 · cada 15 min |
| Closer               | Por cadencia   | [closer.md](closer.md)                                   | Diario 09:00               |
| Revenue manager      | Por cadencia   | [revenue.md](revenue.md)                                 | Lunes 09:30                |
| Growth / estratega   | Por cadencia   | [growth.md](growth.md)                                   | Lunes 10:00                |
| Planners             | Por cadencia   | [planners.md](planners.md)                               | Miércoles 10:00            |
| Controller           | Por cadencia   | [controller.md](controller.md)                           | Viernes 09:00              |
| Contenido / redactor | Por cadencia   | [contenido.md](contenido.md)                             | Lunes 11:00                |
| Editor de video      | Por cadencia   | [editor-video.md](editor-video.md)                       | Martes y jueves 09:00      |
| Diseñador            | Por cadencia   | [disenador.md](disenador.md)                             | Martes 10:00               |
| Director creativo    | Subagente      | [director-creativo.md](director-creativo.md)             | En cada entrega            |

El equipo de marketing (estratega, redactor, editor, diseñador y director creativo) trabaja con su
propio manual: [docs/261019 Equipo de marketing.md](../docs/261019%20Equipo%20de%20marketing.md). El
editor y el diseñador **entregan piezas a revisión** (`pnpm marketing submit`) en lugar de propuestas;
André las aprueba y publica en `/admin/marketing`.

## Cómo corre un agente por cadencia

Es una tarea programada de Claude Code sobre este repositorio (entorno con acceso a Supabase).
Cada corrida:

1. Lee su playbook (`agents/<agente>.md`).
2. Toma el contexto de solo lectura: `node scripts/agent.mts snapshot <agente>`.
3. Analiza y redacta **propuestas** concretas (máximo 3 por corrida, priorizadas por impacto en ocupación).
4. Registra cada propuesta: `node scripts/agent.mts propose <agente> <tipo> "<título>" <archivo.md>`.
   Aparecen en `/admin/agentes` para que André o Carlos aprueben o rechacen.

## Límites (no negociables)

- Solo **leen y proponen**. Nunca validan pagos, cambian tarifas o parámetros, aprueban descuentos,
  pagan comisiones ni modifican reservas (CLAUDE.md regla 6).
- No inventan datos: si falta información, la propuesta lo dice.
- No contactan a clientes ni planners directamente; los mensajes van como borrador en la propuesta.
- Todo queda en `audit_log` con `actor_type = agent` y el nombre del agente.

## Formato de una propuesta

```markdown
## Qué propongo

Una acción concreta y su alcance.

## Por qué (datos)

Cifras del snapshot que lo justifican.

## Impacto esperado en ocupación

Días o eventos que se ganarían, con supuestos explícitos.

## Cómo se aplica

Pasos para el admin (pantalla y campo) o borrador del mensaje.
```
