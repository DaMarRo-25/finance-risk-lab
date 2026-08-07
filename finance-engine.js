(() => {
  'use strict';

  const STORAGE_TRANSFER = 'frl-comparator-transfer-v1';
  const STORAGE_COMPARATOR_STATE = 'frl-comparator-state-v1';

  const money = value =>
    new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'PAB',
      minimumFractionDigits: 2
    }).format(Number.isFinite(Number(value)) ? Number(value) : 0).replace('PAB', 'B/.');

  const toNumber = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  const calculatePayment = (principal, annualRate, months) => {
    principal = toNumber(principal);
    annualRate = toNumber(annualRate);
    months = Math.max(0, Math.floor(toNumber(months)));
    if (principal <= 0 || months <= 0) return 0;
    const monthlyRate = annualRate / 1200;
    if (monthlyRate === 0) return principal / months;
    const factor = Math.pow(1 + monthlyRate, months);
    if (!Number.isFinite(factor) || factor <= 1) return 0;
    return principal * monthlyRate * factor / (factor - 1);
  };

  const costAmount = (cost, requestedAmount) => {
    const value = toNumber(cost?.value);
    return cost?.unit === 'percent' ? requestedAmount * value / 100 : value;
  };

  const buildLoanModel = ({
    requestedAmount = 0,
    annualRate = 0,
    months = 0,
    insuranceMonthly = 0,
    otherMonthly = 0,
    costs = []
  } = {}) => {
    requestedAmount = toNumber(requestedAmount);
    annualRate = toNumber(annualRate);
    months = Math.max(0, Math.floor(toNumber(months)));
    insuranceMonthly = toNumber(insuranceMonthly);
    otherMonthly = toNumber(otherMonthly);

    const normalizedCosts = (Array.isArray(costs) ? costs : [])
      .map(cost => ({
        concept: cost.concept || 'other',
        label: cost.label || 'Otro costo',
        value: toNumber(cost.value),
        unit: cost.unit === 'percent' ? 'percent' : 'amount',
        treatment: ['paid', 'deducted', 'financed'].includes(cost.treatment)
          ? cost.treatment
          : 'paid'
      }))
      .filter(cost => cost.value > 0);

    let financedCosts = 0;
    let deductedCosts = 0;
    let upfrontCosts = 0;
    let initialCostsTotal = 0;

    normalizedCosts.forEach(cost => {
      const amount = costAmount(cost, requestedAmount);
      initialCostsTotal += amount;
      if (cost.treatment === 'financed') financedCosts += amount;
      if (cost.treatment === 'deducted') deductedCosts += amount;
      if (cost.treatment === 'paid') upfrontCosts += amount;
    });

    const financedPrincipal = requestedAmount + financedCosts;
    const netProceeds = Math.max(0, requestedAmount - deductedCosts);
    const financialPayment = calculatePayment(financedPrincipal, annualRate, months);
    const monthlyPayment = financialPayment + insuranceMonthly + otherMonthly;
    const financedPaymentsTotal = financialPayment * months;
    const interest = Math.max(0, financedPaymentsTotal - financedPrincipal);
    const recurringCostsTotal = (insuranceMonthly + otherMonthly) * months;
    const totalPaid = financedPaymentsTotal + recurringCostsTotal + upfrontCosts;

    return {
      requestedAmount,
      annualRate,
      months,
      costs: normalizedCosts,
      financedCosts,
      deductedCosts,
      upfrontCosts,
      initialCostsTotal,
      financedPrincipal,
      netProceeds,
      insuranceMonthly,
      otherMonthly,
      financialPayment,
      monthlyPayment,
      interest,
      recurringCostsTotal,
      totalPaid
    };
  };

  const costCatalog = {
    closing_fee: 'Comisión de cierre',
    closing_costs: 'Gastos de cierre',
    legal: 'Gastos legales',
    appraisal: 'Avalúo',
    initial_insurance: 'Seguro inicial',
    other: 'Otro costo inicial'
  };

  const costHelp = {
    paid: 'Se paga por separado al inicio. No aumenta el saldo financiado.',
    deducted: 'Se descuenta del desembolso. Reduce el dinero neto que recibes.',
    financed: 'Se suma al préstamo. Aumenta el capital financiado y puede generar intereses.'
  };

  const productMapToCalculator = product => ({
    personal_privado: 'personal_privado',
    personal_publico: 'personal_publico',
    personal_jubilados: 'personal_jubilados',
    hipoteca_preferencial: 'hipoteca_preferencial',
    hipoteca_no_preferencial: 'hipoteca_no_preferencial',
    auto: 'auto',
    otro: 'personal_privado'
  }[product] || 'personal_privado');

  const productMapFromCalculator = product => {
    if (['personal_privado', 'personal_publico', 'personal_jubilados'].includes(product)) return 'personal';
    if (['hipoteca_preferencial', 'hipoteca_no_preferencial'].includes(product)) return 'hipoteca';
    if (product === 'auto') return 'auto';
    return 'otro';
  };

  const createCostRow = ({ proposal = '', data = {}, onChange = () => {}, lockConcept = false } = {}) => {
    const row = document.createElement('div');
    row.className = 'frl-cost-row';
    const selectedConcept = data.concept || 'closing_fee';
    row.dataset.costConcept = selectedConcept;
    const conceptControl = lockConcept
      ? `<input class="frl-cost-concept" type="hidden" value="${selectedConcept}"><div class="frl-locked-concept"><span>Concepto</span><strong>${costCatalog[selectedConcept] || 'Otro costo inicial'}</strong></div>`
      : `<label><span>Concepto</span><select class="frl-cost-concept">${Object.entries(costCatalog).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>`;

    row.innerHTML = `
      <div class="frl-cost-row-grid">
        ${conceptControl}
        <label>
          <span>Valor</span>
          <div class="frl-value-unit">
            <input class="frl-cost-value" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00">
            <select class="frl-cost-unit" aria-label="Tipo de valor">
              <option value="amount">B/.</option>
              <option value="percent">%</option>
            </select>
          </div>
        </label>
        <label>
          <span>¿Cómo se aplica?</span>
          <select class="frl-cost-treatment">
            <option value="paid">Lo pago al inicio</option>
            <option value="deducted">Se descuenta del desembolso</option>
            <option value="financed">Se financia / capitaliza</option>
          </select>
        </label>
        ${lockConcept ? '' : '<button class="frl-cost-remove" type="button" aria-label="Eliminar costo">Eliminar</button>'}
      </div>
      <small class="frl-cost-impact"></small>
    `;

    const concept = row.querySelector('.frl-cost-concept');
    const value = row.querySelector('.frl-cost-value');
    const unit = row.querySelector('.frl-cost-unit');
    const treatment = row.querySelector('.frl-cost-treatment');
    const impact = row.querySelector('.frl-cost-impact');
    if (!lockConcept && concept?.tagName === 'SELECT') concept.value = selectedConcept;
    value.value = data.value || '';
    unit.value = data.unit || 'amount';
    treatment.value = data.treatment || 'paid';

    const updateImpact = () => {
      impact.textContent = costHelp[treatment.value] || '';
      onChange();
    };
    [concept, value, unit, treatment].filter(Boolean).forEach(field => {
      field.addEventListener('input', updateImpact);
      field.addEventListener('change', updateImpact);
    });
    row.querySelector('.frl-cost-remove')?.addEventListener('click', () => {
      row.remove();
      onChange();
    });
    updateImpact();
    return row;
  };

  const readCostRows = container => [...container.querySelectorAll('.frl-cost-row')].map(row => {
    const concept = row.querySelector('.frl-cost-concept')?.value || 'other';
    return {
      concept,
      label: costCatalog[concept] || 'Otro costo inicial',
      value: toNumber(row.querySelector('.frl-cost-value')?.value),
      unit: row.querySelector('.frl-cost-unit')?.value || 'amount',
      treatment: row.querySelector('.frl-cost-treatment')?.value || 'paid'
    };
  }).filter(cost => cost.value > 0);

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  function initComparatorV2() {
    const page = document.querySelector('body[data-page="comparator"]');
    if (!page || !document.getElementById('compareAmount')) return;

    const product = document.getElementById('compareProduct');
    const amount = document.getElementById('compareAmount');
    const costContainers = {
      A: document.querySelector('[data-proposal="A"].frl-cost-chooser'),
      B: document.querySelector('[data-proposal="B"].frl-cost-chooser')
    };

    const initialConcepts = new Set(Object.keys(costCatalog));
    let restoringComparatorState = false;

    const toggleCost = (proposal, concept, checked) => {
      const toggle = page.querySelector(`[data-cost-toggle="${concept}"][data-proposal="${proposal}"]`);
      toggle?.closest('.frl-cost-choice')?.classList.toggle('is-active', checked);

      if (concept === 'insurance_monthly') {
        const panel = document.getElementById(`compareInsurancePanel${proposal}`);
        if (panel) panel.hidden = !checked;
        if (!checked) {
          const input = document.getElementById(`compareInsurance${proposal}`);
          if (input) input.value = '0';
        }
        update();
        return;
      }

      if (concept === 'other_monthly') {
        const panel = document.getElementById(`compareOtherMonthlyPanel${proposal}`);
        if (panel) panel.hidden = !checked;
        if (!checked) {
          const input = document.getElementById(`compareOtherMonthly${proposal}`);
          if (input) input.value = '0';
        }
        update();
        return;
      }

      if (!initialConcepts.has(concept)) return;
      const container = costContainers[proposal];
      if (!container) return;
      const slot = container.querySelector(`[data-cost-slot="${concept}"][data-proposal="${proposal}"]`);
      const existing = slot?.querySelector(`[data-cost-concept="${concept}"]`);
      if (checked && !existing && slot) {
        slot.appendChild(createCostRow({ proposal, data: { concept }, lockConcept: true, onChange: update }));
      } else if (!checked && existing) {
        existing.remove();
      }
      update();
    };

    page.querySelectorAll('[data-cost-toggle]').forEach(toggle => {
      toggle.addEventListener('change', () => {
        toggleCost(toggle.dataset.proposal, toggle.dataset.costToggle, toggle.checked);
      });
    });

    const calculateProposal = proposal => buildLoanModel({
      requestedAmount: toNumber(amount.value),
      annualRate: toNumber(document.getElementById(`compareRate${proposal}`)?.value),
      months: toNumber(document.getElementById(`compareMonths${proposal}`)?.value),
      insuranceMonthly: toNumber(document.getElementById(`compareInsurance${proposal}`)?.value),
      otherMonthly: toNumber(document.getElementById(`compareOtherMonthly${proposal}`)?.value),
      costs: readCostRows(costContainers[proposal])
    });

    const name = proposal => document.getElementById(`compareName${proposal}`)?.value.trim() || `Propuesta ${proposal}`;

    const statusElement = document.getElementById('compareInformationStatus');
    const setStatus = (state, title, text) => {
      if (statusElement) statusElement.dataset.level = state;
      setText('compareInformationStatusTitle', title);
      setText('compareInformationStatusText', text);
    };

    const renderDetails = (proposal, model) => {
      setText(`compareFinanced${proposal}`, money(model.financedPrincipal));
      setText(`compareNet${proposal}`, money(model.netProceeds));
      setText(`compareUpfront${proposal}`, money(model.upfrontCosts));
    };

    const serializeCostRows = container => [...(container?.querySelectorAll('.frl-cost-row') || [])].map(row => ({
      concept: row.querySelector('.frl-cost-concept')?.value || 'other',
      value: row.querySelector('.frl-cost-value')?.value || '',
      unit: row.querySelector('.frl-cost-unit')?.value || 'amount',
      treatment: row.querySelector('.frl-cost-treatment')?.value || 'paid'
    }));

    const saveComparatorState = () => {
      if (restoringComparatorState) return;
      const state = {
        version: 1,
        amount: amount.value,
        product: product?.value || 'personal',
        proposals: {}
      };

      ['A', 'B'].forEach(proposal => {
        const details = page.querySelector(`[data-proposal=\"${proposal}\"]`)?.closest('details.compare-additional-details');
        state.proposals[proposal] = {
          name: document.getElementById(`compareName${proposal}`)?.value || '',
          rate: document.getElementById(`compareRate${proposal}`)?.value || '',
          months: document.getElementById(`compareMonths${proposal}`)?.value || '',
          insurance: document.getElementById(`compareInsurance${proposal}`)?.value || '0',
          otherMonthly: document.getElementById(`compareOtherMonthly${proposal}`)?.value || '0',
          selectedCosts: [...page.querySelectorAll(`[data-cost-toggle][data-proposal=\"${proposal}\"]`)]
            .filter(toggle => toggle.checked)
            .map(toggle => toggle.dataset.costToggle),
          costRows: serializeCostRows(costContainers[proposal]),
          detailsOpen: Boolean(details?.open)
        };
      });

      sessionStorage.setItem(STORAGE_COMPARATOR_STATE, JSON.stringify(state));
    };

    const restoreComparatorState = () => {
      const raw = sessionStorage.getItem(STORAGE_COMPARATOR_STATE);
      if (!raw) return false;

      try {
        const state = JSON.parse(raw);
        if (!state || state.version !== 1) return false;
        restoringComparatorState = true;

        if (state.amount !== undefined) amount.value = state.amount;
        if (product && state.product && [...product.options].some(option => option.value === state.product)) {
          product.value = state.product;
        }

        ['A', 'B'].forEach(proposal => {
          const saved = state.proposals?.[proposal] || {};
          const nameField = document.getElementById(`compareName${proposal}`);
          const rateField = document.getElementById(`compareRate${proposal}`);
          const monthsField = document.getElementById(`compareMonths${proposal}`);
          const insuranceField = document.getElementById(`compareInsurance${proposal}`);
          const otherMonthlyField = document.getElementById(`compareOtherMonthly${proposal}`);
          if (nameField && saved.name !== undefined) nameField.value = saved.name;
          if (rateField && saved.rate !== undefined) rateField.value = saved.rate;
          if (monthsField && saved.months !== undefined) monthsField.value = saved.months;

          const rowMap = Object.fromEntries((saved.costRows || []).map(row => [row.concept, row]));
          (saved.selectedCosts || []).forEach(concept => {
            const toggle = page.querySelector(`[data-cost-toggle=\"${concept}\"][data-proposal=\"${proposal}\"]`);
            if (!toggle) return;
            toggle.checked = true;
            toggleCost(proposal, concept, true);
            if (concept === 'insurance_monthly') {
              if (insuranceField && saved.insurance !== undefined) insuranceField.value = saved.insurance;
            } else if (concept === 'other_monthly') {
              if (otherMonthlyField && saved.otherMonthly !== undefined) otherMonthlyField.value = saved.otherMonthly;
            } else {
              const row = costContainers[proposal]?.querySelector(`[data-cost-concept=\"${concept}\"]`);
              const rowState = rowMap[concept];
              if (row && rowState) {
                const valueField = row.querySelector('.frl-cost-value');
                const unitField = row.querySelector('.frl-cost-unit');
                const treatmentField = row.querySelector('.frl-cost-treatment');
                if (valueField) valueField.value = rowState.value ?? '';
                if (unitField) unitField.value = rowState.unit || 'amount';
                if (treatmentField) treatmentField.value = rowState.treatment || 'paid';
                treatmentField?.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          });

          const details = page.querySelector(`[data-proposal=\"${proposal}\"]`)?.closest('details.compare-additional-details');
          if (details && saved.detailsOpen) details.open = true;
        });

        restoringComparatorState = false;
        return true;
      } catch (error) {
        restoringComparatorState = false;
        sessionStorage.removeItem(STORAGE_COMPARATOR_STATE);
        return false;
      }
    };

    const update = () => {
      const a = calculateProposal('A');
      const b = calculateProposal('B');
      const nameA = name('A');
      const nameB = name('B');

      ['1', '2', '3'].forEach(index => {
        setText(`compareResultNameA${index}`, nameA);
        setText(`compareResultNameB${index}`, nameB);
      });

      // Mantiene los nombres elegidos por el usuario en todos los puntos
      // de la comparación, incluso antes de que una condición pase a ser diferente.
      ['Financed', 'Net', 'Upfront'].forEach(key => {
        setText(`compare${key}NameA`, nameA);
        setText(`compare${key}NameB`, nameB);
      });
      setText('compareTransferA', `Analizar ${nameA}`);
      setText('compareTransferB', `Analizar ${nameB}`);

      setText('compareMonthlyA', money(a.monthlyPayment));
      setText('compareMonthlyB', money(b.monthlyPayment));
      setText('compareInterestA', money(a.interest));
      setText('compareInterestB', money(b.interest));
      setText('compareTotalCostA', money(a.totalPaid));
      setText('compareTotalCostB', money(b.totalPaid));
      renderDetails('A', a);
      renderDetails('B', b);

      const detailItems = [
        { key: 'Financed', a: a.financedPrincipal, b: b.financedPrincipal },
        { key: 'Net', a: a.netProceeds, b: b.netProceeds },
        { key: 'Upfront', a: a.upfrontCosts, b: b.upfrontCosts }
      ];
      const sharedItems = detailItems.filter(item => Math.abs(item.a - item.b) < 0.01);
      const differentItems = detailItems.filter(item => Math.abs(item.a - item.b) >= 0.01);
      const sharedBlock = document.getElementById('compareSharedConditions');
      const differentBlock = document.getElementById('compareDifferentConditions');

      const explanations = {
        Financed: (higher, lower, difference) => `${higher} financia ${money(difference)} más. Esto ocurre cuando una propuesta incorpora más costos al préstamo en lugar de pagarlos por separado o descontarlos.`,
        Net: (higher, lower, difference) => `${higher} entrega ${money(difference)} más de dinero neto. Una propuesta puede entregar menos cuando algunos costos se descuentan antes del desembolso.`,
        Upfront: (higher, lower, difference) => `${higher} requiere ${money(difference)} más al inicio. Esto ocurre cuando una mayor parte de los costos se paga por separado al formalizar la operación.`
      };

      detailItems.forEach(item => {
        const isShared = Math.abs(item.a - item.b) < 0.01;
        document.getElementById(`compare${item.key}SharedCard`)?.toggleAttribute('hidden', !isShared);
        if (isShared) setText(`compare${item.key}Shared`, money(item.a));

        const differenceCard = document.getElementById(`compare${item.key}DifferenceCard`);
        differenceCard?.toggleAttribute('hidden', isShared);
        if (!isShared) {
          setText(`compare${item.key}NameA`, nameA);
          setText(`compare${item.key}NameB`, nameB);
          const difference = Math.abs(item.a - item.b);
          const higher = item.a > item.b ? nameA : nameB;
          const lower = item.a > item.b ? nameB : nameA;
          setText(`compare${item.key}Difference`, `Diferencia: ${money(difference)}`);
          setText(`compare${item.key}Explanation`, explanations[item.key](higher, lower, difference));
        }
      });
      sharedBlock?.toggleAttribute('hidden', sharedItems.length === 0);
      differentBlock?.toggleAttribute('hidden', differentItems.length === 0);
      setText('compareSharedConditionsText', sharedItems.length === 3
        ? 'Estos valores no cambian entre las propuestas. Los mostramos una sola vez para que puedas concentrarte en las diferencias que sí afectan la comparación.'
        : 'Estos valores son iguales en ambas propuestas. Los mostramos una sola vez; debajo verás por separado las condiciones que sí cambian.');

      const complete = a.requestedAmount > 0 && a.months > 0 && b.months > 0;
      const hasRecurring = a.insuranceMonthly + a.otherMonthly + b.insuranceMonthly + b.otherMonthly > 0;
      const allCosts = [...a.costs, ...b.costs];
      const hasInitial = allCosts.length > 0;

      if (!complete) {
        setStatus('pending', 'Información pendiente', 'Completa el monto y el plazo de ambas propuestas para iniciar la comparación.');
      } else if (hasInitial) {
        setStatus('detailed', 'Comparación detallada', 'Incluye costos iniciales y la forma en que se pagan, descuentan o financian. Sigue siendo una estimación basada en los datos ingresados.');
      } else if (hasRecurring) {
        setStatus('expanded', 'Comparación ampliada', 'Incluye costos mensuales adicionales informados. El resultado se aproxima mejor a la propuesta, aunque puede haber otros cargos no incluidos.');
      } else {
        setStatus('basic', 'Comparación básica', 'Usa monto, tasa y plazo. No incluye comisiones, seguros, gastos legales u otros cargos, por lo que el resultado puede cambiar si tu propuesta los contiene.');
      }

      const monthlyDifference = Math.abs(a.monthlyPayment - b.monthlyPayment);
      const totalDifference = Math.abs(a.totalPaid - b.totalPaid);

      if (!complete) {
        setText('compareObservationTitle1', 'Completa los datos requeridos');
        setText('compareObservationText1', 'Introduce el monto y el plazo de ambas propuestas para realizar la comparación.');
        setText('compareObservationTitle2', 'Agrega solo los costos que conozcas');
        setText('compareObservationText2', 'Puedes comparar con datos básicos y ampliar la estimación cuando tengas más información.');
      } else {
        if (monthlyDifference < 0.01) {
          setText('compareObservationTitle1', 'Los pagos mensuales estimados son similares');
          setText('compareObservationText1', `La diferencia estimada entre ${nameA} y ${nameB} es menor de B/. 0.01 al mes.`);
        } else {
          const lower = a.monthlyPayment < b.monthlyPayment ? nameA : nameB;
          setText('compareObservationTitle1', `${lower} muestra un pago mensual estimado menor`);
          setText('compareObservationText1', `La diferencia mensual estimada entre ambas propuestas es de ${money(monthlyDifference)}.`);
        }

        if (totalDifference < 0.01) {
          setText('compareObservationTitle2', 'Los totales estimados son similares');
          setText('compareObservationText2', 'Con los datos ingresados, ambas propuestas muestran un total estimado similar.');
        } else {
          const lower = a.totalPaid < b.totalPaid ? nameA : nameB;
          setText('compareObservationTitle2', `${lower} muestra un total estimado menor`);
          setText('compareObservationText2', `La diferencia estimada en el total pagado es de ${money(totalDifference)}. Esto no determina por sí solo cuál propuesta se ajusta mejor a tus necesidades.`);
        }

        const sameStructure = Math.abs(a.financedPrincipal - b.financedPrincipal) < 0.01 && Math.abs(a.netProceeds - b.netProceeds) < 0.01 && Math.abs(a.upfrontCosts - b.upfrontCosts) < 0.01 && Math.abs(a.insuranceMonthly - b.insuranceMonthly) < 0.01 && Math.abs(a.otherMonthly - b.otherMonthly) < 0.01;
        if (sameStructure && Math.abs(a.annualRate - b.annualRate) >= 0.001 && a.months === b.months) {
          setText('compareObservationTitle2', '¿Qué está causando la diferencia?');
          setText('compareObservationText2', `En este caso, ambas propuestas tienen el mismo monto, plazo y estructura de costos. La diferencia proviene principalmente de la tasa de interés: ${nameA} usa ${a.annualRate.toFixed(2)}% y ${nameB} ${b.annualRate.toFixed(2)}%. Una tasa mayor aumenta los intereses y normalmente también el pago mensual.`);
        }
      }

      const transferable = complete && product?.value !== 'otro';
      document.getElementById('compareTransferA')?.toggleAttribute('disabled', !transferable);
      document.getElementById('compareTransferB')?.toggleAttribute('disabled', !transferable);
      saveComparatorState();
    };

    const saveTransfer = proposal => {
      const model = calculateProposal(proposal);
      if (model.requestedAmount <= 0 || model.months <= 0 || product?.value === 'otro') return;
      const payload = {
        version: 1,
        source: 'comparator',
        proposal,
        name: name(proposal),
        product: product?.value || 'personal',
        requestedAmount: model.requestedAmount,
        annualRate: model.annualRate,
        months: model.months,
        insuranceMonthly: model.insuranceMonthly,
        otherMonthly: model.otherMonthly,
        costs: model.costs
      };
      saveComparatorState();
      localStorage.setItem(STORAGE_TRANSFER, JSON.stringify(payload));
      window.location.href = 'calculadora.html?from=comparator';
    };

    document.getElementById('compareTransferA')?.addEventListener('click', () => saveTransfer('A'));
    document.getElementById('compareTransferB')?.addEventListener('click', () => saveTransfer('B'));

    const watched = page.querySelectorAll('#compareAmount, #compareProduct, [id^="compareName"], [id^="compareRate"], [id^="compareMonths"], [id^="compareInsurance"], [id^="compareOtherMonthly"]');
    watched.forEach(field => {
      field.addEventListener('input', update);
      field.addEventListener('change', update);
    });

    const normalizePdfText = value => String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').replace(/\s+/g, ' ').trim();

    const pdfEscape = value => normalizePdfText(value)
      .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

    const latin1Bytes = value => {
      const bytes = new Uint8Array(value.length);
      for (let i = 0; i < value.length; i += 1) bytes[i] = value.charCodeAt(i) & 255;
      return bytes;
    };

    const wrapPdfLine = (value, max = 88) => {
      const text = normalizePdfText(value);
      if (!text) return [''];
      const words = text.split(' ');
      const lines = [];
      let line = '';
      words.forEach(word => {
        const candidate = line ? `${line} ${word}` : word;
        if (candidate.length > max && line) { lines.push(line); line = word; }
        else line = candidate;
      });
      if (line) lines.push(line);
      return lines;
    };

    const createPdf = lines => {
      const pageWidth = 612, pageHeight = 792, left = 48, top = 742, lineHeight = 14, perPage = 47;
      const pages = [];
      for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
      if (!pages.length) pages.push(['Finance & Risk Lab']);
      const objects = [];
      const add = value => { objects.push(value); return objects.length; };
      const catalogId = add('');
      const pagesId = add('');
      const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const pageIds = [];
      pages.forEach((pageLines, pageIndex) => {
        const commands = ['BT'];
        pageLines.forEach((line, lineIndex) => {
          const y = top - lineIndex * lineHeight;
          const size = pageIndex === 0 && lineIndex === 0 ? 17 : pageIndex === 0 && lineIndex === 1 ? 11 : 9;
          commands.push(`/F1 ${size} Tf`, `1 0 0 1 ${left} ${y} Tm`, `(${pdfEscape(line)}) Tj`);
        });
        commands.push('ET');
        const stream = commands.join('\n');
        const contentId = add(`<< /Length ${latin1Bytes(stream).length} >>\nstream\n${stream}\nendstream`);
        pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
      });
      objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
      objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
      let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
      const offsets = [0];
      objects.forEach((obj, index) => { offsets.push(latin1Bytes(pdf).length); pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`; });
      const xref = latin1Bytes(pdf).length;
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return new Blob([latin1Bytes(pdf)], { type: 'application/pdf' });
    };

    const pdfButton = document.getElementById('compareExportPdfV2');
    pdfButton?.addEventListener('click', () => {
      const a = calculateProposal('A');
      const b = calculateProposal('B');
      const raw = [
        'Finance & Risk Lab',
        'Comparador de propuestas bancarias',
        '',
        `Producto: ${product?.options[product.selectedIndex]?.text || ''}`,
        `Monto solicitado: ${money(a.requestedAmount)}`,
        '',
        name('A'),
        `Pago mensual estimado: ${money(a.monthlyPayment)}`,
        `Capital financiado: ${money(a.financedPrincipal)}`,
        `Dinero neto recibido: ${money(a.netProceeds)}`,
        `Pago inicial: ${money(a.upfrontCosts)}`,
        `Intereses estimados: ${money(a.interest)}`,
        `Total estimado pagado: ${money(a.totalPaid)}`,
        ...a.costs.map(c => `Costo: ${c.label} - ${c.unit === 'percent' ? c.value.toFixed(2) + '%' : money(c.value)} - ${costHelp[c.treatment]}`),
        '',
        name('B'),
        `Pago mensual estimado: ${money(b.monthlyPayment)}`,
        `Capital financiado: ${money(b.financedPrincipal)}`,
        `Dinero neto recibido: ${money(b.netProceeds)}`,
        `Pago inicial: ${money(b.upfrontCosts)}`,
        `Intereses estimados: ${money(b.interest)}`,
        `Total estimado pagado: ${money(b.totalPaid)}`,
        ...b.costs.map(c => `Costo: ${c.label} - ${c.unit === 'percent' ? c.value.toFixed(2) + '%' : money(c.value)} - ${costHelp[c.treatment]}`),
        '',
        'Resultado educativo basado unicamente en los datos ingresados. Finance & Risk Lab no recomienda bancos ni selecciona una propuesta.'
      ];
      const lines = [];
      raw.forEach(line => wrapPdfLine(line).forEach(part => lines.push(part)));
      const blob = createPdf(lines);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'finance-risk-lab-comparador.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    });

    restoreComparatorState();
    update();
  }

  function initCalculatorV2() {
    const page = document.querySelector('body[data-page="calculator"]');
    if (!page || !document.getElementById('amount')) return;

    const product = document.getElementById('product');
    const amount = document.getElementById('amount');
    const rate = document.getElementById('rate');
    const months = document.getElementById('months');
    const insurance = document.getElementById('calculatorInsurance');
    const otherMonthly = document.getElementById('calculatorOtherMonthly');
    const status = document.getElementById('calculatorInformationStatus');
    const transferNotice = document.getElementById('calculatorTransferNotice');
    const extraDetails = page.querySelector('.frl-calculator-extra');
    let v2Interacted = false;
    let calculatorOrigin = { source: 'calculator', name: '' };

    const initialConcepts = ['closing_fee', 'closing_costs', 'legal', 'appraisal', 'initial_insurance', 'other'];

    const initialCostRows = () => readCostRows(page);

    const model = () => buildLoanModel({
      requestedAmount: toNumber(amount.value),
      annualRate: toNumber(rate.value),
      months: toNumber(months.value),
      insuranceMonthly: toNumber(insurance?.value),
      otherMonthly: toNumber(otherMonthly?.value),
      costs: initialCostRows()
    });

    const setActiveChoice = (toggle, active) => {
      toggle?.closest('.frl-cost-choice')?.classList.toggle('is-active', active);
    };

    const toggleMonthlyCost = (concept, enabled) => {
      const isInsurance = concept === 'insurance_monthly';
      const panel = document.getElementById(isInsurance ? 'calculatorInsurancePanel' : 'calculatorOtherMonthlyPanel');
      const field = isInsurance ? insurance : otherMonthly;
      if (panel) panel.hidden = !enabled;
      if (!enabled && field) field.value = '0';
    };

    const toggleInitialCost = (concept, enabled, data = null) => {
      const slot = page.querySelector(`[data-calculator-cost-slot="${concept}"]`);
      if (!slot) return;
      if (!enabled) {
        slot.innerHTML = '';
        return;
      }
      if (!slot.querySelector('.frl-cost-row')) {
        slot.appendChild(createCostRow({
          data: { concept, ...(data || {}) },
          lockConcept: true,
          onChange: () => calculate(true)
        }));
      }
    };

    page.querySelectorAll('[data-calculator-cost-toggle]').forEach(toggle => {
      toggle.addEventListener('change', () => {
        v2Interacted = true;
        const concept = toggle.dataset.calculatorCostToggle;
        setActiveChoice(toggle, toggle.checked);
        if (concept === 'insurance_monthly' || concept === 'other_monthly') {
          toggleMonthlyCost(concept, toggle.checked);
        } else {
          toggleInitialCost(concept, toggle.checked);
        }
        calculate(true);
      });
    });

    const renderVisual = result => {
      const total = result.totalPaid;
      const parts = {
        principal: result.financedPrincipal,
        interest: result.interest,
        recurring: result.recurringCostsTotal,
        upfront: result.upfrontCosts
      };
      const pct = value => total > 0 ? Math.max(0, Math.min(100, value / total * 100)) : 0;

      setText('calculatorVisualTotal', money(total));
      setText('calculatorVisualPrincipalValue', money(parts.principal));
      setText('calculatorVisualInterestValue', money(parts.interest));
      setText('calculatorVisualRecurringValue', money(parts.recurring));
      setText('calculatorVisualUpfrontValue', money(parts.upfront));

      const widths = {
        calculatorVisualPrincipal: pct(parts.principal),
        calculatorVisualInterest: pct(parts.interest),
        calculatorVisualRecurring: pct(parts.recurring),
        calculatorVisualUpfront: pct(parts.upfront)
      };
      Object.entries(widths).forEach(([id, width]) => {
        const element = document.getElementById(id);
        if (element) element.style.width = `${width}%`;
      });

      const composition = document.querySelector('.frl-payment-composition');
      if (composition) {
        composition.setAttribute(
          'aria-label',
          `Del total estimado de ${money(total)}, ${money(parts.principal)} corresponden al capital financiado, ${money(parts.interest)} a intereses, ${money(parts.recurring)} a seguros y cargos mensuales y ${money(parts.upfront)} a costos pagados al inicio.`
        );
      }

      if (total <= 0) {
        setText('calculatorVisualExplanation', 'Agrega un monto y un plazo para visualizar la composición estimada.');
        return;
      }

      const principalPct = pct(parts.principal);
      const interestPct = pct(parts.interest);
      const costsPct = pct(parts.recurring + parts.upfront);
      const costText = costsPct >= 0.5
        ? ` y cerca de B/. ${costsPct.toFixed(0)} a seguros y otros costos informados`
        : '';
      setText(
        'calculatorVisualExplanation',
        `De cada B/. 100 del total estimado, aproximadamente B/. ${principalPct.toFixed(0)} corresponden al capital financiado, B/. ${interestPct.toFixed(0)} a intereses${costText}.`
      );
    };

    function calculate(saveState = false) {
      if (product?.value === 'tdc') return;
      const hasRequired = toNumber(amount?.value) > 0 && String(rate?.value ?? '').trim() !== '' && toNumber(months?.value) > 0;
      const emptyState = document.getElementById('calculatorResultsEmpty');
      const resultsState = document.getElementById('calculatorLoanResults');
      if (emptyState) emptyState.hidden = hasRequired;
      if (resultsState) resultsState.hidden = !hasRequired;
      if (!hasRequired) return;
      const result = model();
      setText('monthly', money(result.monthlyPayment));
      setText('total', money(result.totalPaid));
      setText('interest', money(result.interest));
      setText('calculatorFinancialPayment', money(result.financialPayment));
      setText('calculatorFinancedPrincipal', money(result.financedPrincipal));
      setText('calculatorNetProceeds', money(result.netProceeds));
      setText('calculatorUpfront', money(result.upfrontCosts));
      renderVisual(result);

      if (status) {
        const hasInitial = result.costs.length > 0;
        const hasRecurring = result.insuranceMonthly + result.otherMonthly > 0;
        status.dataset.level = hasInitial ? 'detailed' : hasRecurring ? 'expanded' : 'basic';
        status.querySelector('strong').textContent = hasInitial ? 'Estimación detallada' : hasRecurring ? 'Estimación ampliada' : 'Estimación básica';
        status.querySelector('p').textContent = hasInitial
          ? 'Incluye costos iniciales y cómo se aplican. Sigue siendo una estimación basada en los datos ingresados.'
          : hasRecurring
            ? 'Incluye los costos mensuales que informaste. Pueden existir otros cargos no incluidos.'
            : 'No incluye comisiones, seguros, gastos legales u otros costos. Puedes agregarlos si aparecen en tu propuesta.';
      }

      const capacityButton = document.getElementById('to-capacity');
      if (capacityButton) capacityButton.dataset.payment = result.monthlyPayment.toFixed(2);

      const simulation = {
        version: 3,
        source: calculatorOrigin.source,
        sourceName: calculatorOrigin.name,
        amount: result.requestedAmount,
        financedPrincipal: result.financedPrincipal,
        rate: result.annualRate,
        months: result.months,
        product: product?.value || 'personal_privado',
        insuranceMonthly: result.insuranceMonthly,
        otherMonthly: result.otherMonthly,
        costs: result.costs,
        monthlyPayment: result.monthlyPayment
      };
      const hasAdvancedCosts = result.costs.length > 0 || result.insuranceMonthly > 0 || result.otherMonthly > 0;
      if (saveState && v2Interacted && result.requestedAmount > 0 && result.months > 0) {
        localStorage.setItem('frl-calculator-simulation', JSON.stringify(simulation));
        // El amortizador actual todavia no interpreta todos los costos de esta version.
        localStorage.setItem('frl-calculator-interacted', hasAdvancedCosts ? 'false' : 'true');
      }
    }

    const activateTransferredCosts = transfer => {
      const insuranceToggle = page.querySelector('[data-calculator-cost-toggle="insurance_monthly"]');
      const otherToggle = page.querySelector('[data-calculator-cost-toggle="other_monthly"]');

      if (insurance) insurance.value = transfer.insuranceMonthly || 0;
      if (otherMonthly) otherMonthly.value = transfer.otherMonthly || 0;
      if (insuranceToggle) {
        insuranceToggle.checked = toNumber(transfer.insuranceMonthly) > 0;
        setActiveChoice(insuranceToggle, insuranceToggle.checked);
        toggleMonthlyCost('insurance_monthly', insuranceToggle.checked);
      }
      if (otherToggle) {
        otherToggle.checked = toNumber(transfer.otherMonthly) > 0;
        setActiveChoice(otherToggle, otherToggle.checked);
        toggleMonthlyCost('other_monthly', otherToggle.checked);
      }

      initialConcepts.forEach(concept => {
        const toggle = page.querySelector(`[data-calculator-cost-toggle="${concept}"]`);
        const cost = (transfer.costs || []).find(item => item.concept === concept);
        if (!toggle) return;
        toggle.checked = Boolean(cost);
        setActiveChoice(toggle, toggle.checked);
        toggleInitialCost(concept, toggle.checked, cost || null);
      });

      if (extraDetails && (toNumber(transfer.insuranceMonthly) > 0 || toNumber(transfer.otherMonthly) > 0 || (transfer.costs || []).length)) {
        extraDetails.open = true;
      }
    };

    const applyTransfer = () => {
      const raw = localStorage.getItem(STORAGE_TRANSFER);
      if (!raw) return;
      try {
        const transfer = JSON.parse(raw);
        if (!transfer || transfer.source !== 'comparator') return;
        v2Interacted = true;
        calculatorOrigin = { source: 'comparator', name: transfer.name || `Propuesta ${transfer.proposal || ''}` };
        product.value = productMapToCalculator(transfer.product);
        amount.value = transfer.requestedAmount || '';
        rate.value = transfer.annualRate ?? '';
        months.value = transfer.months || '';
        activateTransferredCosts(transfer);
        if (transferNotice) {
          transferNotice.hidden = false;
          transferNotice.querySelector('strong').textContent = `${transfer.name || `Propuesta ${transfer.proposal || ''}`} cargada desde el Comparador`;
        }
        calculate(true);
        localStorage.removeItem(STORAGE_TRANSFER);
      } catch (error) {
        localStorage.removeItem(STORAGE_TRANSFER);
      }
    };

    const updateCardVisibility = () => {
      const isCard = product?.value === 'tdc';
      document.getElementById('calculatorLoanFields')?.toggleAttribute('hidden', isCard);
      document.getElementById('calculatorCardUnavailable')?.toggleAttribute('hidden', !isCard);
      document.getElementById('calculatorLoanResults')?.toggleAttribute('hidden', isCard);
      if (!isCard) calculate(false);
    };

    [amount, rate, months, insurance, otherMonthly]
      .filter(Boolean)
      .forEach(field => {
        field.addEventListener('input', () => { v2Interacted = true; calculate(true); });
        field.addEventListener('change', () => { v2Interacted = true; calculate(true); });
      });

    product?.addEventListener('change', () => { v2Interacted = true; updateCardVisibility(); calculate(true); });
    document.getElementById('use-reference')?.addEventListener('click', () => { v2Interacted = true; setTimeout(() => calculate(true), 0); });
    document.getElementById('to-capacity')?.addEventListener('click', () => {
      const result = model();
      localStorage.setItem('frl-new-payment-context', JSON.stringify({
        source: 'calculator',
        payment: result.monthlyPayment,
        financialPayment: result.financialPayment,
        insuranceMonthly: result.insuranceMonthly,
        otherMonthly: result.otherMonthly
      }));
    });

    document.getElementById('to-amortization')?.addEventListener('click', () => {
      if (product?.value === 'tdc') return;
      const result = model();
      if (result.requestedAmount <= 0 || result.months <= 0 || String(rate?.value ?? '').trim() === '') return;
      const simulation = {
        version: 3,
        source: calculatorOrigin.source,
        sourceName: calculatorOrigin.name,
        amount: result.requestedAmount,
        financedPrincipal: result.financedPrincipal,
        rate: result.annualRate,
        months: result.months,
        product: product?.value || 'personal_privado',
        insuranceMonthly: result.insuranceMonthly,
        otherMonthly: result.otherMonthly,
        costs: result.costs,
        monthlyPayment: result.monthlyPayment
      };
      localStorage.setItem('frl-calculator-simulation', JSON.stringify(simulation));
      localStorage.setItem('frl-calculator-interacted', 'true');
      window.location.href = 'amortizacion.html';
    });

    applyTransfer();
    updateCardVisibility();
  }

  window.FRLFinance = {
    money,
    calculatePayment,
    buildLoanModel,
    productMapFromCalculator
  };

  document.addEventListener('DOMContentLoaded', () => {
    initComparatorV2();
    initCalculatorV2();
  });
})();
