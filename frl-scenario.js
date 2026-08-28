/* Finance & Risk Lab — contexto compartido entre herramientas.
 * Mantiene las herramientas desacopladas: cada módulo puede funcionar sin él,
 * pero puede recibir un escenario cuando el usuario viene de otra herramienta.
 */
(() => {
  const KEY = 'frl-financial-scenario';
  const LEGACY_PAYMENT_KEY = 'frl-new-payment-context';

  function safeParse(value) {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  }

  function read() {
    return safeParse(sessionStorage.getItem(KEY)) || safeParse(localStorage.getItem(KEY));
  }

  function readCardComparator() {
    return safeParse(sessionStorage.getItem('frl-card-comparator-state'));
  }

  function write(scenario, { persist = false } = {}) {
    const payload = { version: 1, ...scenario, updatedAt: new Date().toISOString() };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
    if (persist) localStorage.setItem(KEY, JSON.stringify(payload));
    return payload;
  }

  function clear() {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  }

  function fromLegacyPayment() {
    const legacy = safeParse(localStorage.getItem(LEGACY_PAYMENT_KEY));
    if (!legacy || legacy.source !== 'credit-card') return null;
    return write({
      type: 'credit-card',
      source: 'credit-card',
      data: { payment: Number(legacy.payment || legacy.financialPayment || 0) }
    });
  }

  window.FRLScenario = { KEY, read, write, clear, fromLegacyPayment, readCardComparator };
})();
