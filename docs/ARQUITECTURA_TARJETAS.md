# Arquitectura de Tarjetas — Finance & Risk Lab

## Principio
El comparador de préstamos/hipotecas y el comparador de tarjetas son módulos especializados. Comparten lenguaje visual y contexto de navegación, pero no mezclan campos ni motores financieros.

## Préstamos e hipotecas
- `comparador.html` conserva su flujo original.
- Monto solicitado es un dato común de la propuesta de financiamiento.
- Tasa, plazo y costos adicionales pertenecen a ese modelo.

## Tarjetas
- `comparador-tarjetas.html` compara únicamente tarjetas.
- Datos principales: límite de crédito, tasa de interés anual, anualidad y pago mínimo indicado.
- Beneficios son opcionales y se agregan mediante desplegable.
- No se solicita plazo de tarjeta ni interés estimado como campo.
- No se solicita banco ni nombre de tarjeta para la comparación: A y B ya identifican las propuestas.

## Transferencia
La propuesta elegida se escribe en `FRLScenario` y se lleva a `tarjetas.html`. Solo viajan datos disponibles; no se inventan campos faltantes.

## Capacidad de pago
El pago probado de una tarjeta representa una obligación financiera. Una compra nueva es un candidato a gasto adicional y no debe sumarse automáticamente si ya forma parte del presupuesto del usuario.

## Regla de regresión
No modificar la lógica existente de `comparador.html` para añadir funcionalidades de tarjeta. Los cambios de tarjeta deben vivir en sus propios archivos.
