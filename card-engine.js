/* Finance & Risk Lab — motor independiente de tarjetas.
 * Simulación educativa por períodos. Los campos son opcionales: el motor no
 * inventa datos que el usuario no haya proporcionado.
 */
(() => {
  const clamp = (n, min = 0) => Math.max(min, Number.isFinite(n) ? n : 0);
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;

  function minimumPayment({ balance, minimum, percent, fees, useFormula }) {
    const b = clamp(balance);
    if (!useFormula) return minimum > 0 ? round(Math.min(b, clamp(minimum))) : 0;
    if (percent <= 0 && fees <= 0) return 0;
    return round(Math.min(b, b * clamp(percent) / 100 + clamp(fees)));
  }

  function simulate(input = {}) {
    const hasBalance = Number.isFinite(Number(input.balance)) && Number(input.balance) > 0;
    const initial = clamp(Number(input.balance));
    const hasRate = Number.isFinite(Number(input.annualRate)) && Number(input.annualRate) >= 0 && input.annualRate !== '';
    const annualRate = hasRate ? clamp(Number(input.annualRate)) / 100 : 0;
    const monthlyRate = annualRate / 12;
    const hasExplicitPayment = Number.isFinite(Number(input.payment)) && input.payment !== '';
    const minimumValue = minimumPayment({
      balance: initial,
      minimum: Number(input.minimum),
      percent: Number(input.minimumPercent),
      fees: Number(input.minimumFees),
      useFormula: Boolean(input.useMinimumFormula)
    });
    // Si la persona ya tiene un pago mínimo indicado pero todavía no ha
    // escrito un pago para probar, lo usamos como pago de referencia.
    // No inventamos un pago cuando tampoco existe un mínimo conocido.
    const hasPayment = hasExplicitPayment || minimumValue > 0;
    const payment = hasExplicitPayment ? clamp(Number(input.payment)) : minimumValue;
    const hasSpend = Number.isFinite(Number(input.newSpend)) && input.newSpend !== '';
    const newSpend = hasSpend ? clamp(Number(input.newSpend)) : 0;
    const hasMonths = Number.isFinite(Number(input.months)) && Number(input.months) > 0;
    const months = hasMonths ? Math.min(60, Math.max(1, Math.floor(Number(input.months)))) : 0;
    const limit = Number.isFinite(Number(input.limit)) && input.limit !== '' ? clamp(Number(input.limit)) : null;
    const minimum = minimumValue;

    const rows = [];
    let balance = initial;
    let totalInterest = 0;
    let totalPaid = 0;
    let totalSpend = 0;

    if (hasBalance && hasPayment && months > 0) {
      for (let period = 1; period <= months; period += 1) {
        const start = balance;
        const purchase = hasSpend ? newSpend : 0;
        const interest = hasRate ? round(start * monthlyRate) : 0;
        const beforePayment = round(start + interest + purchase);
        const appliedPayment = round(Math.min(beforePayment, payment));
        const ending = round(Math.max(0, beforePayment - appliedPayment));
        totalInterest = round(totalInterest + interest);
        totalPaid = round(totalPaid + appliedPayment);
        totalSpend = round(totalSpend + purchase);
        rows.push({ period, start, purchase, interest, beforePayment, payment: appliedPayment, ending });
        balance = ending;
        if (balance <= 0.005 && purchase <= 0) break;
      }
    }

    let snapshot = null;
    if (hasBalance && hasPayment && months === 0) {
      const purchase = hasSpend ? newSpend : 0;
      const interest = hasRate ? round(initial * monthlyRate) : 0;
      const beforePayment = round(initial + interest + purchase);
      const appliedPayment = round(Math.min(beforePayment, payment));
      snapshot = {
        start: initial, purchase, interest, payment: appliedPayment,
        ending: round(Math.max(0, beforePayment - appliedPayment))
      };
    }

    return {
      initial, limit, annualRate: hasRate ? Number(input.annualRate) : null,
      hasBalance, hasRate, hasPayment, hasExplicitPayment, hasSpend, hasMonths,
      newSpend: hasSpend ? newSpend : null, months: rows.length,
      ending: rows.length ? balance : snapshot ? snapshot.ending : null,
      totalInterest: rows.length && hasRate ? totalInterest : snapshot && hasRate ? snapshot.interest : null,
      totalPaid: rows.length ? totalPaid : snapshot ? snapshot.payment : null,
      totalSpend: rows.length && hasSpend ? totalSpend : snapshot && hasSpend ? snapshot.purchase : null,
      snapshot,
      plannedPayment: hasPayment ? payment : null,
      minimum: minimum > 0 ? minimum : null,
      rows,
      model: 'periodic-balance-educational-v2'
    };
  }

  window.FRLCardEngine = { simulate, minimumPayment };
})();
