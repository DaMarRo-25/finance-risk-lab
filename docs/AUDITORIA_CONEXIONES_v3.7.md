# Auditoría de conexiones — v3.7

## Regla central
Los datos solo viajan entre módulos mediante una acción explícita del usuario. La existencia de datos guardados no autoriza a otra herramienta a cargarlos automáticamente.

## Mapa revisado

| Origen | Acción | Destino | Datos permitidos | No debe viajar |
|---|---|---|---|---|
| Comparador de préstamos | Analizar propuesta / continuar | Calculadora | Datos de la propuesta necesarios para calcular | Datos de tarjeta |
| Calculadora | Analizar capacidad de pago | Capacidad de Pago | Nueva obligación mensual | Ejemplos, obligaciones del presupuesto |
| Calculadora | Explorar tabla de pagos | Amortización | Simulación explícitamente entregada | Estado de Capacidad de Pago |
| Comparador de tarjetas | Analizar propuesta A/B | Tarjetas | Límite, tasa, anualidad, pago mínimo y beneficios registrados; identificador de propuesta | Banco, nombre de tarjeta, datos de otra propuesta |
| Tarjetas | Analizar capacidad de pago | Capacidad de Pago | Saldo, pago propuesto, compras nuevas y contexto de propuesta | Ingresos, gastos y obligaciones no introducidos |
| Capacidad de Pago | Explorar tabla de pagos | Amortización | Ninguna simulación de préstamo salvo entrega explícita desde Calculadora | Datos viejos de Calculadora |

## Estado: ejemplos vs. datos reales
- Los ejemplos se cargan solo después de que la persona elige ver/probar un ejemplo.
- Un escenario real no se reemplaza silenciosamente por un ejemplo.
- Un escenario recibido no se reconstruye desde el almacenamiento global de otro módulo.
- Una herramienta independiente comienza sin datos de otro producto.
- La persistencia de un módulo no implica autorización para otro módulo.

## Corrección de esta versión
`tarjetas.js` deja de leer `FRLScenario.read()` al abrir Tarjetas. Solo acepta `frl-card-comparator-transfer`, que es escrito por el Comparador de Tarjetas cuando la persona elige analizar una propuesta. Esto evita que una visita directa a Tarjetas herede una cuota, propuesta o escenario de Calculadora/Capacidad.

Capacidad de Pago mantiene el modelo de handoff explícito `frl-capacity-handoff-v1`. Su navegación hacia Amortización no crea un handoff de Calculadora cuando el origen no es Calculadora.

## Navegación contextual
Capacidad de Pago muestra `Tarjetas` en el encabezado y no muestra `Amortización`, porque la tabla de pagos se ofrece como siguiente paso dentro del contenido.
