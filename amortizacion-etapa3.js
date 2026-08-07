(() => {
  'use strict';

  const SIM_KEY = 'frl-calculator-simulation';
  const IMPORT_KEY = 'frl-amortization-import-context-v1';
  const COSTS = { closing_fee:'Comisión de cierre', closing_costs:'Gastos de cierre', legal:'Gastos legales', appraisal:'Avalúo', initial_insurance:'Seguro inicial', other:'Otro costo' };
  let manualCosts = [];
  let syncingPrincipal = false;

  const number = value => {
    const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  const money = value => window.FRLFinance?.money
    ? window.FRLFinance.money(value)
    : `B/. ${number(value).toFixed(2)}`;

  const readSimulation = () => {
    try {
      const raw = localStorage.getItem(SIM_KEY);
      if (!raw) return null;
      const simulation = JSON.parse(raw);
      if (Number(simulation.amount) <= 0 || Number(simulation.months) <= 0) return null;
      if (simulation.product === 'tdc') return null;
      return simulation;
    } catch (error) {
      return null;
    }
  };

  const fullModel = simulation => {
    if (!simulation) return null;
    if (window.FRLFinance?.buildLoanModel) {
      return window.FRLFinance.buildLoanModel({
        requestedAmount: simulation.amount,
        annualRate: simulation.rate,
        months: simulation.months,
        insuranceMonthly: simulation.insuranceMonthly || 0,
        otherMonthly: simulation.otherMonthly || 0,
        costs: simulation.costs || []
      });
    }
    return {
      requestedAmount: number(simulation.amount),
      financedPrincipal: number(simulation.financedPrincipal || simulation.amount),
      netProceeds: number(simulation.amount),
      upfrontCosts: 0,
      financedCosts: Math.max(0, number(simulation.financedPrincipal) - number(simulation.amount)),
      deductedCosts: 0,
      insuranceMonthly: number(simulation.insuranceMonthly),
      otherMonthly: number(simulation.otherMonthly)
    };
  };

  const productMap = product => {
    if (['personal_privado', 'personal_publico', 'personal_jubilados'].includes(product)) return 'personal';
    if (['hipoteca_preferencial', 'hipoteca_no_preferencial'].includes(product)) return 'mortgage';
    if (product === 'auto') return 'auto';
    return 'other';
  };

  const setValueAndNotify = (element, value) => {
    if (!element) return;
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const saveImportContext = (simulation, model) => {
    const context = {
      createdAt: Date.now(),
      requestedAmount: model.requestedAmount,
      financedPrincipal: model.financedPrincipal,
      netProceeds: model.netProceeds,
      financedCosts: model.financedCosts,
      deductedCosts: model.deductedCosts,
      upfrontCosts: model.upfrontCosts,
      insuranceMonthly: model.insuranceMonthly,
      otherMonthly: model.otherMonthly,
      product: simulation.product,
      source: simulation.source || 'calculator',
      sourceName: simulation.sourceName || '',
      costs: simulation.costs || [],
      annualRate: simulation.rate,
      months: simulation.months
    };
    sessionStorage.setItem(IMPORT_KEY, JSON.stringify(context));
    return context;
  };

  const renderImportSummary = context => {
    const target = document.getElementById('amortization-import-summary');
    if (!target || !context) return;
    const hasDifference = Math.abs(context.financedPrincipal - context.requestedAmount) > 0.005 ||
      context.upfrontCosts > 0 || context.deductedCosts > 0;
    target.hidden = false;
    target.innerHTML = `
      <div class="frl-import-heading">
        <span class="eyebrow">Simulación incorporada</span>
        <strong>${context.source === 'comparator' && context.sourceName ? `Simulación de ${context.sourceName}` : 'Simulación importada desde la Calculadora'}</strong>
      </div>
      <div class="frl-import-metrics">
        <div><span>Monto solicitado</span><strong>${money(context.requestedAmount)}</strong></div>
        <div><span>Capital financiado</span><strong>${money(context.financedPrincipal)}</strong></div>
        <div><span>Dinero neto estimado</span><strong>${money(context.netProceeds)}</strong></div>
      </div>
      ${context.costs?.length ? `<div class="frl-import-cost-list"><strong>Costos informados</strong>${context.costs.map(cost => `<span>${cost.label || COSTS[cost.concept] || 'Costo'}: ${cost.treatment === 'financed' ? 'financiado dentro del préstamo' : cost.treatment === 'deducted' ? 'descontado del desembolso' : 'pagado al inicio'}</span>`).join('')}</div>` : ''}
      ${hasDifference ? `<p>Los costos financiados forman parte del saldo y por eso aparecen en la amortización. Una comisión financiada no se suma otra vez a cada cuota: ya está incluida dentro del capital financiado y puede generar intereses. Los costos pagados al inicio o descontados afectan tu desembolso, pero no se convierten en capital dentro de esta tabla.</p>` : `<p>En esta simulación el monto solicitado y el capital financiado coinciden.</p>`}
    `;
  };

  const importAdvancedSimulation = simulation => {
    const model = fullModel(simulation);
    if (!model) return;
    const context = saveImportContext(simulation, model);

    setValueAndNotify(document.getElementById('amortization-requested-amount'), Number(model.requestedAmount).toFixed(2));
    setValueAndNotify(document.getElementById('amortization-amount'), Number(model.financedPrincipal).toFixed(2));
    setValueAndNotify(document.getElementById('amortization-rate'), Number(simulation.rate).toFixed(2));
    setValueAndNotify(document.getElementById('amortization-months'), Math.floor(Number(simulation.months)));
    setValueAndNotify(document.getElementById('amortization-product'), productMap(simulation.product));

    const insuranceType = document.getElementById('amortization-insurance-type');
    if (number(simulation.insuranceMonthly) > 0) {
      setValueAndNotify(insuranceType, 'fixed');
      setTimeout(() => setValueAndNotify(document.getElementById('amortization-insurance-amount'), Number(simulation.insuranceMonthly).toFixed(2)), 0);
    } else {
      setValueAndNotify(insuranceType, 'none');
    }
    setValueAndNotify(document.getElementById('amortization-other-charges'), Number(simulation.otherMonthly || 0).toFixed(2));
    activateCostToggles(simulation);
    renderManualCosts(simulation.costs || []);
    renderImportSummary(context);
  };

  const parseMoneyCell = cell => {
    const text = String(cell?.textContent || '').trim();
    const cleaned = text
      .replace(/B\/\.\s*/gi, '')
      .replace(/PAB\s*/gi, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  const renderEvolutionChart = () => {
    const body = document.getElementById('amortization-representative-body');
    const chart = document.getElementById('amortization-evolution-chart');
    const insight = document.getElementById('amortization-evolution-insight');
    if (!body || !chart) return;

    const allRows = [...body.querySelectorAll('tr')];
    if (!allRows.length) {
      chart.innerHTML = '<p class="helper">Completa los datos para ver la evolución visual.</p>';
      if (insight) insight.textContent = '';
      return;
    }

    const indexes = [...new Set([0, Math.floor((allRows.length - 1) / 2), allRows.length - 1])];
    const rows = indexes.map(index => allRows[index]).filter(Boolean);

    chart.innerHTML = rows.map(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 8) return '';
      const label = cells[0].textContent.trim();
      const interest = parseMoneyCell(cells[2]);
      const capital = parseMoneyCell(cells[3]);
      const insurance = parseMoneyCell(cells[4]);
      const other = parseMoneyCell(cells[5]);
      const rawTotal = interest + capital + insurance + other;
      if (rawTotal <= 0.005) return '';
      const total = rawTotal;
      const capitalPct = capital / total * 100;
      const interestPct = interest / total * 100;
      const costsPct = (insurance + other) / total * 100;
      return `
        <article class="frl-evolution-row">
          <div class="frl-evolution-row-heading"><strong>${label}</strong><span>${money(total)}</span></div>
          <div class="frl-evolution-track" role="img" aria-label="${label}: ${money(capital)} a capital, ${money(interest)} a intereses y ${money(insurance + other)} a seguro y cargos">
            <span class="frl-evolution-capital" style="width:${capitalPct}%"></span>
            <span class="frl-evolution-interest" style="width:${interestPct}%"></span>
            <span class="frl-evolution-costs" style="width:${costsPct}%"></span>
          </div>
          <div class="frl-evolution-values">
            <span>Capital ${money(capital)}</span><span>Interés ${money(interest)}</span>${insurance + other > 0 ? `<span>Costos ${money(insurance + other)}</span>` : ''}
          </div>
        </article>`;
    }).join('');

    const firstCells = rows[0]?.querySelectorAll('td');
    const lastCells = rows.at(-1)?.querySelectorAll('td');
    if (firstCells?.length >= 8 && lastCells?.length >= 8 && insight) {
      const firstInterest = parseMoneyCell(firstCells[2]);
      const lastInterest = parseMoneyCell(lastCells[2]);
      const firstCapital = parseMoneyCell(firstCells[3]);
      const lastCapital = parseMoneyCell(lastCells[3]);
      insight.textContent = lastInterest < firstInterest && lastCapital > firstCapital
        ? `A medida que baja el saldo, el interés estimado de estas cuotas pasa de ${money(firstInterest)} a ${money(lastInterest)}, mientras la parte destinada a capital aumenta de ${money(firstCapital)} a ${money(lastCapital)}.`
        : 'La composición puede variar según la tasa, el saldo y las condiciones informadas.';
    }
  };

  const costRow = (concept, cost = null) => {
    const label = COSTS[concept];
    const value = cost?.value ?? '';
    const unit = cost?.unit || 'amount';
    const treatment = cost?.treatment || 'paid';
    const help = treatment === 'financed'
      ? 'Se suma al préstamo. Aumenta el capital financiado y puede generar intereses.'
      : treatment === 'deducted'
        ? 'Se descuenta del desembolso. Reduce el dinero neto que recibes.'
        : 'Se paga por separado al inicio. No aumenta el saldo financiado.';
    return `<div class="frl-cost-row" data-cost-concept="${concept}"><div class="frl-cost-row-grid"><input class="frl-cost-concept" type="hidden" value="${concept}"><div class="frl-locked-concept"><span>Concepto</span><strong>${label}</strong></div><label><span>Valor</span><div class="frl-value-unit"><input class="frl-cost-value" data-amort-cost-value="${concept}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" value="${value}"><select class="frl-cost-unit" data-amort-cost-unit="${concept}" aria-label="Tipo de valor"><option value="amount" ${unit==='amount'?'selected':''}>B/.</option><option value="percent" ${unit==='percent'?'selected':''}>%</option></select></div></label><label><span>¿Cómo se aplica?</span><select class="frl-cost-treatment" data-amort-cost-treatment="${concept}"><option value="paid" ${treatment==='paid'?'selected':''}>Lo pago al inicio</option><option value="deducted" ${treatment==='deducted'?'selected':''}>Se descuenta del desembolso</option><option value="financed" ${treatment==='financed'?'selected':''}>Se financia / capitaliza</option></select></label></div><small class="frl-cost-impact">${help}</small></div>`;
  };

  const collectManualCosts = () => Object.keys(COSTS).flatMap(concept => {
    const toggle = document.querySelector(`[data-amort-cost-toggle="${concept}"]`);
    if (!toggle?.checked) return [];
    const value = number(document.querySelector(`[data-amort-cost-value="${concept}"]`)?.value);
    if (value <= 0) return [];
    return [{concept, label:COSTS[concept], value, unit:document.querySelector(`[data-amort-cost-unit="${concept}"]`)?.value || 'amount', treatment:document.querySelector(`[data-amort-cost-treatment="${concept}"]`)?.value || 'paid'}];
  });

  const syncManualPrincipal = () => {
    if (syncingPrincipal) return;
    const requested = number(document.getElementById('amortization-requested-amount')?.value);
    const rate = number(document.getElementById('amortization-rate')?.value);
    const months = number(document.getElementById('amortization-months')?.value);
    const insurance = document.getElementById('amortization-insurance-toggle')?.checked ? number(document.getElementById('amortization-insurance-amount')?.value) : 0;
    const other = document.getElementById('amortization-other-toggle')?.checked ? number(document.getElementById('amortization-other-charges')?.value) : 0;
    const costs = collectManualCosts();
    const model = window.FRLFinance?.buildLoanModel ? window.FRLFinance.buildLoanModel({requestedAmount:requested, annualRate:rate, months, insuranceMonthly:insurance, otherMonthly:other, costs}) : {financedPrincipal:requested};
    syncingPrincipal = true;
    setValueAndNotify(document.getElementById('amortization-amount'), requested > 0 ? Number(model.financedPrincipal).toFixed(2) : '');
    syncingPrincipal = false;
  };

  const renderManualCosts = (costs = []) => {
    Object.keys(COSTS).forEach(concept => {
      const toggle = document.querySelector(`[data-amort-cost-toggle="${concept}"]`);
      const slot = document.querySelector(`[data-amort-cost-slot="${concept}"]`);
      const cost = costs.find(item => item.concept === concept) || null;
      if (!toggle || !slot) return;
      toggle.checked = Boolean(cost);
      toggle.closest('.frl-cost-choice')?.classList.toggle('is-active', Boolean(cost));
      slot.innerHTML = cost ? costRow(concept, cost) : '';
    });

    document.querySelectorAll('[data-amort-cost-toggle]').forEach(toggle => {
      if (toggle.dataset.frlBound === 'true') return;
      toggle.dataset.frlBound = 'true';
      toggle.addEventListener('change', () => {
        const concept = toggle.dataset.amortCostToggle;
        const slot = document.querySelector(`[data-amort-cost-slot="${concept}"]`);
        toggle.closest('.frl-cost-choice')?.classList.toggle('is-active', toggle.checked);
        if (slot) slot.innerHTML = toggle.checked ? costRow(concept) : '';
        bindCostFields(slot);
        syncManualPrincipal();
      });
    });
    document.querySelectorAll('[data-amort-cost-slot]').forEach(bindCostFields);
    syncManualPrincipal();
  };

  const bindCostFields = slot => {
    if (!slot) return;
    slot.querySelectorAll('input,select').forEach(el => {
      if (el.dataset.frlBound === 'true') return;
      el.dataset.frlBound = 'true';
      const updateImpact = () => {
        const row = el.closest('.frl-cost-row');
        if (row) {
          const treatment = row.querySelector('.frl-cost-treatment')?.value || 'paid';
          const impact = row.querySelector('.frl-cost-impact');
          if (impact) impact.textContent = treatment === 'financed'
            ? 'Se suma al préstamo. Aumenta el capital financiado y puede generar intereses.'
            : treatment === 'deducted'
              ? 'Se descuenta del desembolso. Reduce el dinero neto que recibes.'
              : 'Se paga por separado al inicio. No aumenta el saldo financiado.';
        }
        syncManualPrincipal();
      };
      el.addEventListener('input', updateImpact);
      el.addEventListener('change', updateImpact);
    });
  };

  const activateCostToggles = simulation => {
    const ins = document.getElementById('amortization-insurance-toggle');
    const insPanel = document.getElementById('amortization-insurance-panel');
    const oth = document.getElementById('amortization-other-toggle');
    const othPanel = document.getElementById('amortization-other-panel');
    if (ins) { ins.checked = number(simulation.insuranceMonthly) > 0; ins.closest('.frl-cost-choice')?.classList.toggle('is-active', ins.checked); }
    if (insPanel) insPanel.hidden = !ins?.checked;
    if (oth) { oth.checked = number(simulation.otherMonthly) > 0; oth.closest('.frl-cost-choice')?.classList.toggle('is-active', oth.checked); }
    if (othPanel) othPanel.hidden = !oth?.checked;
  };

  const initAmortizationEnhancements = () => {
    const page = document.querySelector('body[data-page="amortization"]');
    if (!page) return;
    const simulation = readSimulation();
    const calculatorOption = document.getElementById('amortization-calculator-option');
    renderManualCosts([]);
    const insToggle = document.getElementById('amortization-insurance-toggle');
    const otherToggle = document.getElementById('amortization-other-toggle');
    insToggle?.addEventListener('change', () => { document.getElementById('amortization-insurance-panel').hidden = !insToggle.checked; insToggle.closest('.frl-cost-choice')?.classList.toggle('is-active', insToggle.checked); if (!insToggle.checked) setValueAndNotify(document.getElementById('amortization-insurance-type'),'none'); syncManualPrincipal(); });
    otherToggle?.addEventListener('change', () => { document.getElementById('amortization-other-panel').hidden = !otherToggle.checked; otherToggle.closest('.frl-cost-choice')?.classList.toggle('is-active', otherToggle.checked); if (!otherToggle.checked) setValueAndNotify(document.getElementById('amortization-other-charges'),''); syncManualPrincipal(); });
    ['amortization-requested-amount','amortization-rate','amortization-months','amortization-insurance-amount','amortization-other-charges'].forEach(id => document.getElementById(id)?.addEventListener('input', syncManualPrincipal));

    document.querySelectorAll('[data-amortization-mode]').forEach(button => {
      button.addEventListener('click', () => {
        setTimeout(() => {
          if (calculatorOption && button.dataset.amortizationMode === 'new' && simulation) calculatorOption.hidden = false;
          if (button.dataset.amortizationMode !== 'new') document.getElementById('amortization-import-summary')?.setAttribute('hidden', '');
        }, 0);
      });
    });

    document.getElementById('amortization-use-calculator')?.addEventListener('click', event => {
      const current = readSimulation();
      if (!current || Number(current.version || 1) < 2) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      importAdvancedSimulation(current);
    }, true);

    document.getElementById('amortization-use-manual')?.addEventListener('click', () => {
      sessionStorage.removeItem(IMPORT_KEY);
      const summary = document.getElementById('amortization-import-summary');
      if (summary) summary.hidden = true;
    }, true);

    const body = document.getElementById('amortization-representative-body');
    if (body) {
      new MutationObserver(renderEvolutionChart).observe(body, { childList: true, subtree: true, characterData: true });
      renderEvolutionChart();
    }
  };

  const initPrintContext = () => {
    const page = document.querySelector('body[data-page="amortization-print"]');
    if (!page) return;
    try {
      const context = JSON.parse(sessionStorage.getItem(IMPORT_KEY) || 'null');
      const target = document.getElementById('amortization-print-context');
      if (!context || !target) return;
      const params = new URLSearchParams(location.search);
      const principal = number(params.get('principal'));
      if (Math.abs(principal - number(context.financedPrincipal)) > 0.02) return;
      target.hidden = false;
      target.innerHTML = `<strong>Contexto de la simulación:</strong> monto solicitado ${money(context.requestedAmount)}, capital financiado ${money(context.financedPrincipal)} y dinero neto estimado ${money(context.netProceeds)}. Los costos iniciales no financiados no forman parte de la tabla de amortización.`;
    } catch (error) {
      return;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    initAmortizationEnhancements();
    initPrintContext();
  });
})();
