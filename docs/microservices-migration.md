# Monolito Modular -> Microservicios

## Reglas de desacoplamiento

- Cada modulo es owner de su modelo y tablas.
- Los contratos entre modulos se exponen por casos de uso o eventos.
- No se permite importar `infrastructure` de otro modulo.
- Los eventos de integracion son versionados y backward-compatible.
- Todo handler de jobs/eventos debe ser idempotente.

## Fases de migracion

1. Consolidar boundaries en el monolito modular.
2. Publicar eventos de forma transaccional con outbox.
3. Activar dual publish con feature flag hacia broker externo.
4. Extraer primero modulos asincronos (`notifications`, `analytics`, `search`).
5. Extraer dominios de frontera clara (`chat`, `documents`, `payments`).
6. Mantener BFF/API gateway con compatibilidad de contratos.
7. Retirar dependencias internas y apagar consumidores legacy.
