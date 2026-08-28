# Finance & Risk Lab — Auditoría de publicación v4.0

## Objetivo

Esta versión es una limpieza controlada de la versión funcional v3.19. No rediseña las herramientas ni cambia sus modelos financieros. El objetivo es reducir duplicación técnica, separar responsabilidades y dejar una base más segura para publicación.

## Principios de publicación

- Los datos de ejemplo nunca deben confundirse con datos reales.
- Un dato guardado no equivale a un dato transferido.
- Una herramienta solo recibe información de otra mediante una acción explícita del usuario.
- Préstamos y tarjetas mantienen motores y flujos financieros distintos.
- Cada módulo debe poder abrirse y utilizarse de forma independiente.
- Los cambios futuros deben ser incrementales y verificarse antes de tocar otras herramientas.

## Flujo principal

### Préstamos e hipotecas

Inicio → Comparador → Calculadora → Amortización
                         ↘ Capacidad de Pago

Calculadora → Capacidad de Pago
Calculadora → Amortización

### Tarjetas

Inicio → Comparador de Tarjetas → Tarjetas
                                  ↘ Capacidad de Pago

### Herramientas independientes

Inicio → Calculadora
Inicio → Tarjetas
Inicio → Capacidad de Pago
Inicio → Amortización
Inicio → Tasas
Inicio → Aprender
Inicio → Metodología

## Fronteras de datos

### Calculadora

Produce una simulación de préstamo y puede transferir explícitamente la obligación mensual a Capacidad de Pago o la simulación a Amortización.

### Tarjetas

Produce un escenario de tarjeta y puede transferir explícitamente el pago mensual y las compras nuevas a Capacidad de Pago. No utiliza automáticamente una simulación de préstamo.

### Capacidad de Pago

Puede funcionar sola. Si recibe una transferencia, utiliza solo los datos enviados explícitamente y deja el resto para el usuario. Las compras nuevas no se convierten automáticamente en una obligación mensual: se presentan como gasto potencial para evitar doble conteo.

### Amortización

Puede funcionar sola. Solo importa una simulación de Calculadora cuando existe el handoff explícito correspondiente y la URL indica el origen. No recupera una simulación vieja solo porque exista en almacenamiento.

## Limpieza técnica v4.0

- Se eliminaron los inicializadores antiguos de Calculadora y Comparador que ya no eran llamados y duplicaban lógica de `finance-engine.js`.
- Se eliminó el objeto de referencias de tasas que solo utilizaba el inicializador antiguo.
- Se eliminaron copias exactas de documentación, logo y datos que estaban duplicadas en la raíz y en `docs/`, `assets/` o `data/`.
- No se eliminaron archivos funcionales de herramientas.
- No se fusionaron `styles.css`, `etapa1.css` ni `etapa3.css` porque cumplen responsabilidades diferentes y una fusión prematura aumentaría el riesgo de regresión.

## Resultado esperado

La publicación debe mantener el comportamiento funcional de v3.19, pero con menos código muerto y menos ambigüedad sobre qué archivo es la fuente vigente de cada recurso.
