const referenceRates = {
  personal_privado: {
    group: "Préstamos personales",
    name: "Personal privado",
    rate: 10.79,
    min: 8.50,
    max: 18.50,
    banks: 6,
    note:
      "Referencia exclusiva para trabajadores del sector privado."
  },

  personal_publico: {
    group: "Préstamos personales",
    name: "Personal público o gobierno",
    rate: 9.52,
    min: 7.00,
    max: 15.00,
    banks: 7,
    note:
      "Referencia para empleados públicos o de gobierno."
  },

  personal_jubilados: {
    group: "Préstamos personales",
    name: "Jubilados / CSS",
    rate: 7.60,
    min: 6.00,
    max: 12.75,
    banks: 6,
    note:
      "Referencia para jubilados y pensionados de la CSS."
  },

  hipoteca_preferencial: {
    group: "Hipotecas",
    name: "Primera vivienda · interés preferencial",
    rate: 2.84,
    min: 1.00,
    max: 6.25,
    banks: 7,
    note:
      "Referencia separada para primera vivienda bajo condiciones preferenciales."
  },

  hipoteca_no_preferencial: {
    group: "Hipotecas",
    name: "Hipoteca regular · no preferencial",
    rate: 7.66,
    min: 6.00,
    max: 9.25,
    banks: 7,
    note:
      "Referencia para operaciones hipotecarias regulares."
  },

  auto: {
    group: "Otros productos",
    name: "Préstamo de auto",
    rate: 7.88,
    min: 6.75,
    max: 11.00,
    banks: 6,
    note:
      "Promedio de la tasa representativa de cada banco."
  },

  tdc: {
    group: "Otros productos",
    name: "Tarjeta de crédito",
    rate: 20.08,
    min: 7.99,
    max: 37.77,
    banks: 7,
    note:
      "Referencia general. La tasa puede variar según el segmento y las condiciones de la tarjeta."
  }
};

const money = value =>
  new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "PAB",
    minimumFractionDigits: 2
  })
    .format(Number.isFinite(value) ? value : 0)
    .replace("PAB", "B/.");

const num = id =>
  Math.max(
    0,
    Number(
      document.getElementById(id)?.value || 0
    )
  );

function initCalculator() {
  const product =
    document.getElementById("product");

  const amount =
    document.getElementById("amount");

  const rate =
    document.getElementById("rate");

  const months =
    document.getElementById("months");

  if (!amount || !rate || !months) return;

  let userInteracted = false;

  const saveCalculatorSimulation = () => {
    if (!userInteracted) return;

    const simulation = {
      amount: num("amount"),
      rate: num("rate"),
      months: Math.floor(
        num("months")
      ),
      product:
        product?.value ||
        "personal_privado"
    };

    if (
      simulation.amount <= 0 ||
      simulation.months <= 0
    ) {
      return;
    }

    localStorage.setItem(
      "frl-calculator-interacted",
      "true"
    );

    localStorage.setItem(
      "frl-calculator-simulation",
      JSON.stringify(simulation)
    );
  };

  const calculate = () => {
    const principal =
      num("amount");

    const numberOfMonths = Math.max(
      1,
      Math.floor(
        num("months")
      )
    );

    const monthlyRate =
      num("rate") / 1200;

    const payment =
      monthlyRate === 0
        ? principal / numberOfMonths
        : (
            principal *
            monthlyRate *
            Math.pow(
              1 + monthlyRate,
              numberOfMonths
            )
          ) /
          (
            Math.pow(
              1 + monthlyRate,
              numberOfMonths
            ) - 1
          );

    const total =
      payment * numberOfMonths;

    document.getElementById(
      "monthly"
    ).textContent = money(payment);

    document.getElementById(
      "total"
    ).textContent = money(total);

    document.getElementById(
      "interest"
    ).textContent = money(
      total - principal
    );

    const item =
      referenceRates[
        product?.value ||
        "personal_privado"
      ];

    const difference =
      num("rate") - item.rate;

    document.getElementById(
      "comparison-text"
    ).textContent =
      Math.abs(difference) < 0.005
        ? "Tu tasa coincide con la referencia seleccionada."
        : `Tu tasa está ${Math.abs(
            difference
          ).toFixed(2)} puntos porcentuales ${
            difference > 0
              ? "por encima"
              : "por debajo"
          } de la referencia histórica.`;

    const capacityButton =
      document.getElementById(
        "to-capacity"
      );

    if (capacityButton) {
      capacityButton.dataset.payment =
        payment.toFixed(2);
    }

    saveCalculatorSimulation();
  };

  const updateReference = () => {
    const item =
      referenceRates[
        product.value
      ];

    document.getElementById(
      "reference-button-rate"
    ).textContent =
      `${item.rate.toFixed(2)}%`;

    const context =
      document.getElementById(
        "product-context"
      );

    if (product.value === "tdc") {
      context.innerHTML =
        "<strong>Nota sobre tarjetas:</strong> " +
        "la tasa puede variar por segmento. " +
        "Esta simulación supone un saldo financiado " +
        "a plazo fijo y no representa el pago mínimo " +
        "contractual.";

      context.hidden = false;
    } else {
      context.hidden = true;
    }

    calculate();
  };

  const handleUserInput = () => {
    userInteracted = true;
    calculate();
  };

  [amount, rate, months].forEach(
    field => {
      field.addEventListener(
        "input",
        handleUserInput
      );
    }
  );

  product?.addEventListener(
    "change",
    () => {
      userInteracted = true;
      updateReference();
    }
  );

  document.getElementById(
    "use-reference"
  )?.addEventListener(
    "click",
    () => {
      userInteracted = true;

      rate.value =
        referenceRates[
          product.value
        ].rate.toFixed(2);

      calculate();
    }
  );

  document.getElementById(
    "to-capacity"
  )?.addEventListener(
    "click",
    event => {
      localStorage.setItem(
        "frl-new-payment",
        event.currentTarget
          .dataset.payment || "0"
      );

      location.href =
        "capacidad-pago.html";
    }
  );

  /*
   * La primera ejecución calcula los valores visibles,
   * pero no guarda la simulación porque el usuario todavía
   * no ha interactuado con la herramienta.
   */
  updateReference();
}

function initCapacity() {
  const inputs = [
    ...document.querySelectorAll(
      ".capacity-input"
    )
  ];

  if (!inputs.length) return;

  const saved = Number(
    localStorage.getItem(
      "frl-new-payment"
    )
  );

  if (saved > 0) {
    document.getElementById(
      "newPayment"
    ).value = saved.toFixed(2);
  }

  const radios = [
    ...document.querySelectorAll(
      'input[name="incomeMode"]'
    )
  ];

  const setWidth = (
    id,
    value
  ) => {
    document.getElementById(
      id
    ).style.width =
      `${Math.max(
        0,
        Math.min(100, value)
      )}%`;
  };

  function update() {
    const grossMode =
      radios.find(
        radio => radio.checked
      )?.value === "gross";

    const primaryIncome =
      grossMode
        ? Math.max(
            0,
            num("grossIncome") -
            num("deductions")
          )
        : num("netIncome");

    const income =
      primaryIncome +
      num("otherIncome");

    const family =
      num("housing") +
      num("food") +
      num("services") +
      num("transport") +
      num("educationHealth") +
      num("otherExpenses");

    const obligations =
      num("obligations");

    const payment =
      num("newPayment");

    const additional =
      num("additionalAmount") /
      Math.max(
        1,
        num("additionalFrequency")
      );

    const before =
      income -
      family -
      obligations -
      additional;

    const after =
      before - payment;

    const pct = value =>
      income > 0
        ? (value / income) * 100
        : 0;

    const availablePct =
      pct(
        Math.max(0, after)
      );

    const debtBeforePct =
      pct(obligations);

    const debtAfterPct =
      pct(
        obligations + payment
      );

    document.getElementById(
      "additionalMonthlyLabel"
    ).textContent =
      money(additional);

    document.getElementById(
      "metricIncome"
    ).textContent =
      money(income);

    document.getElementById(
      "metricAvailable"
    ).textContent =
      money(after);

    document.getElementById(
      "availablePct"
    ).textContent =
      `${availablePct.toFixed(
        1
      )}% disponible del ingreso`;

    document.getElementById(
      "debtBefore"
    ).textContent =
      `${debtBeforePct.toFixed(1)}%`;

    document.getElementById(
      "metricDebt"
    ).textContent =
      `${debtAfterPct.toFixed(1)}%`;

    document.getElementById(
      "metricExpenses"
    ).textContent =
      `${pct(family).toFixed(1)}%`;

    const segments = {
      expenses: pct(family),
      obligations: pct(obligations),
      payment: pct(payment),
      additional: pct(additional),
      available:
        Math.max(
          0,
          pct(after)
        )
    };

    Object.entries(
      segments
    ).forEach(
      ([key, value]) => {
        const segment =
          document.querySelector(
            `.seg.${key}`
          );

        if (segment) {
          segment.style.width =
            `${Math.max(
              0,
              Math.min(100, value)
            )}%`;
        }
      }
    );

    document.getElementById(
      "beforeAvailable"
    ).textContent =
      money(before);

    document.getElementById(
      "afterAvailable"
    ).textContent =
      money(after);

    setWidth(
      "beforeBar",
      pct(
        Math.max(0, before)
      )
    );

    setWidth(
      "afterBar",
      pct(
        Math.max(0, after)
      )
    );

    document.getElementById(
      "obsDistribution"
    ).textContent =
      income > 0
        ? `De cada B/. 100 que ingresan al hogar, aproximadamente B/. ${pct(
            family
          ).toFixed(
            0
          )} se destinan a gastos familiares, B/. ${pct(
            obligations
          ).toFixed(
            0
          )} a obligaciones actuales, B/. ${pct(
            payment
          ).toFixed(
            0
          )} a la nueva cuota y B/. ${availablePct.toFixed(
            0
          )} quedan disponibles.`
        : "Agrega tus ingresos para visualizar cómo se distribuye tu presupuesto.";

    document.getElementById(
      "obsImpact"
    ).textContent =
      payment > 0
        ? `La nueva cuota hará que tu dinero disponible al mes se reduzca a ${money(
            after
          )}.`
        : `Sin una nueva cuota, tu dinero disponible al mes es de ${money(
            before
          )}.`;
  }

  const toggle = () => {
    const gross =
      radios.find(
        radio => radio.checked
      )?.value === "gross";

    document.getElementById(
      "gross-income-fields"
    ).hidden = !gross;

    document.getElementById(
      "net-income-fields"
    ).hidden = gross;

    update();
  };

  inputs.forEach(
    element => {
      element.addEventListener(
        "input",
        update
      );
    }
  );

  radios.forEach(
    radio => {
      radio.addEventListener(
        "change",
        toggle
      );
    }
  );

  toggle();
}

function initAmortization() {
  const page = document.querySelector('body[data-page="amortization"]');
  if (!page) return;

  const $ = selector => page.querySelector(selector);
  const $$ = selector => [...page.querySelectorAll(selector)];

  const modeButtons = $$('[data-amortization-mode]');
  const scenarioButtons = $$('[data-amortization-scenario]');
  const selectionPanel = $('#amortization-selection');
  const selectionTitle = $('#amortization-selection-title');
  const selectionText = $('#amortization-selection-text');
  const formSection = $('#amortization-form-section');
  const formTitle = $('#amortization-form-title');
  const calculatorOption = $('#amortization-calculator-option');
  const useCalculatorButton = $('#amortization-use-calculator');
  const useManualButton = $('#amortization-use-manual');
  const insuranceType = $('#amortization-insurance-type');
  const insuranceAmountField = $('#amortization-insurance-amount-field');
  const insuranceRateField = $('#amortization-insurance-rate-field');
  const originalAmountField = $('#amortization-original-amount-field');
  const updateStatus = $('#amortization-update-status');

  const amountField = $('#amortization-amount');
  const balanceField = $('#amortization-balance');
  const originalAmountInput = $('#amortization-original-amount');
  const rateField = $('#amortization-rate');
  const monthsField = $('#amortization-months');
  const remainingMonthsField = $('#amortization-remaining-months');
  const currentPaymentField = $('#amortization-current-payment');
  const currentInstallmentField = $('#amortization-current-installment');
  const productField = $('#amortization-product');
  const insuranceAmountInput = $('#amortization-insurance-amount');
  const insuranceRateInput = $('#amortization-insurance-rate');
  const otherChargesField = $('#amortization-other-charges');

  const resultsEmpty = $('#amortization-results-empty');
  const resultsEmptyTitle = resultsEmpty?.querySelector('strong');
  const resultsEmptyText = resultsEmpty?.querySelector('p');
  const results = $('#amortization-results');

  const totalPaymentElement = $('#amortization-total-payment');
  const financialPaymentElement = $('#amortization-financial-payment');
  const insurancePaymentElement = $('#amortization-insurance-payment');
  const otherPaymentElement = $('#amortization-other-payment');
  const capitalValueElement = $('#amortization-capital-value');
  const interestValueElement = $('#amortization-interest-value');
  const insuranceValueElement = $('#amortization-insurance-value');
  const otherValueElement = $('#amortization-other-value');
  const capitalPercentElement = $('#amortization-capital-percent');
  const interestPercentElement = $('#amortization-interest-percent');
  const insurancePercentElement = $('#amortization-insurance-percent');
  const otherPercentElement = $('#amortization-other-percent');
  const capitalBar = $('#amortization-capital-bar');
  const interestBar = $('#amortization-interest-bar');
  const insuranceBar = $('#amortization-insurance-bar');
  const otherBar = $('#amortization-other-bar');
  const capitalExplanation = $('#amortization-capital-explanation');
  const interestExplanation = $('#amortization-interest-explanation');
  const costsExplanation = $('#amortization-costs-explanation');

  const baseSummary = $('#amortization-base-summary');
  const representativeBody = $('#amortization-representative-body');
  const scenarioForm = $('#amortization-scenario-form');
  const extraAmountField = $('#amortization-extra-amount');
  const extraStartField = $('#amortization-extra-start');
  const extraStartHelp = $('#amortization-extra-start-help');
  const extraFrequencyField = $('#amortization-extra-frequency-field');
  const extraFrequency = $('#amortization-extra-frequency');
  const resetScenarioButton = $('#amortization-reset-scenario');
  const scenarioResults = $('#amortization-scenario-results');
  const scenarioResultTitle = $('#amortization-scenario-result-title');
  const scenarioResultText = $('#amortization-scenario-result-text');
  const scenarioSummary = $('#amortization-scenario-summary');
  const scenarioRepresentativeBody = $('#amortization-scenario-representative-body');
  const toggleFullScheduleButton = $('#amortization-toggle-full-schedule');
  const fullSchedule = $('#amortization-full-schedule');
  const fullScheduleBody = $('#amortization-full-schedule-body');

  const printInsideButton = $('#amortization-print-results');
  const printEvolutionButton = $('#amortization-print-evolution');
  const printScenarioButton = $('#amortization-print-scenario');
  const printFullButton = $('#amortization-print-full');

  if (!modeButtons.length || !selectionPanel || !formSection || !results) return;

  let selectedMode = '';
  let selectedScenario = '';
  let statusTimer;
  let baseSchedule = [];
  let activeScenarioSchedule = [];

  const modeContent = {
    new: {
      title: 'Obligación nueva',
      text: 'Podrás ingresar los datos de una nueva obligación o utilizar una simulación que hayas realizado previamente en la Calculadora.',
      formTitle: 'Datos de la nueva obligación'
    },
    existing: {
      title: 'Obligación existente',
      text: 'Trabajaremos con el saldo actual, la tasa y el plazo pendiente de una obligación que ya tienes.',
      formTitle: 'Datos actuales de la obligación'
    }
  };

  const getFieldNumber = field => {
    const value = Number(field?.value || 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };

  const setText = (element, value) => {
    if (element) element.textContent = value;
  };

  const setBarWidth = (element, value) => {
    if (!element) return;
    element.style.width = Math.max(0, Math.min(100, value)) + '%';
  };

  const calculateFinancialPayment = (principal, annualRate, months) => {
    if (principal <= 0 || months <= 0) return 0;
    const monthlyRate = annualRate / 1200;
    if (monthlyRate === 0) return principal / months;
    const factor = Math.pow(1 + monthlyRate, months);
    if (!Number.isFinite(factor) || factor <= 1) return 0;
    return principal * monthlyRate * factor / (factor - 1);
  };

  const getPrincipal = () => selectedMode === 'new'
    ? getFieldNumber(amountField)
    : selectedMode === 'existing'
      ? getFieldNumber(balanceField)
      : 0;

  const getMonths = () => selectedMode === 'new'
    ? Math.floor(getFieldNumber(monthsField))
    : selectedMode === 'existing'
      ? Math.floor(getFieldNumber(remainingMonthsField))
      : 0;

  const getOriginalPrincipal = principal => {
    if (selectedMode === 'new') return principal;
    return getFieldNumber(originalAmountInput);
  };

  const getInsuranceConfiguration = principal => {
    const type = insuranceType?.value || 'none';
    const originalPrincipal = getOriginalPrincipal(principal);
    let included = true;
    let note = '';

    if (type === 'unknown') {
      included = false;
      note = 'El seguro no se incluyó porque indicaste que no conoces su forma de cálculo.';
    }

    if (type === 'original-rate' && originalPrincipal <= 0) {
      included = false;
      note = 'El seguro no se incluyó porque falta el monto original de la obligación.';
    }

    return {
      type,
      included,
      note,
      fixedAmount: getFieldNumber(insuranceAmountInput),
      monthlyRate: getFieldNumber(insuranceRateInput) / 100,
      originalPrincipal
    };
  };

  const calculateScheduleInsurance = (openingBalance, config) => {
    if (!config.included) return 0;
    if (config.type === 'fixed') return config.fixedAmount;
    if (config.type === 'balance-rate') return openingBalance * config.monthlyRate;
    if (config.type === 'original-rate') return config.originalPrincipal * config.monthlyRate;
    return 0;
  };

  const getDisplayInstallment = relativeInstallment => {
    if (selectedMode !== 'existing') return relativeInstallment;
    const lastPaid = Math.floor(getFieldNumber(currentInstallmentField));
    return lastPaid > 0 ? lastPaid + relativeInstallment : relativeInstallment;
  };

  const getInstallmentLabel = row => {
    if (selectedMode === 'existing' && getFieldNumber(currentInstallmentField) <= 0) {
      return row.relativeInstallment === 1
        ? 'Próxima cuota'
        : 'Proyectada ' + row.relativeInstallment;
    }
    return 'Cuota ' + row.displayInstallment;
  };

  const generateSchedule = ({
    principal,
    annualRate,
    months,
    financialPayment,
    insuranceConfig,
    otherCharges,
    extraAmount = 0,
    extraStart = 1,
    extraFrequencyValue = 'once',
    strategy = 'base'
  }) => {
    const schedule = [];
    const monthlyRate = annualRate / 1200;
    let balance = principal;
    let currentPayment = financialPayment;
    const maxPeriods = strategy === 'shorter' ? Math.max(months * 3, months + 1200) : months;

    const frequencyMonths = {
      monthly: 1,
      quarterly: 3,
      semiannual: 6,
      annual: 12
    };

    for (let installment = 1; installment <= maxPeriods && balance > 0.005; installment += 1) {
      const openingBalance = balance;
      const interest = openingBalance * monthlyRate;
      let scheduledPrincipal = Math.max(0, currentPayment - interest);
      scheduledPrincipal = Math.min(openingBalance, scheduledPrincipal);
      let actualFinancialPayment = interest + scheduledPrincipal;
      let extraPrincipal = 0;

      const atOrAfterStart = installment >= extraStart;
      const shouldApplyRecurring = extraFrequencyValue === 'once'
        ? installment === extraStart
        : atOrAfterStart && (installment - extraStart) % frequencyMonths[extraFrequencyValue] === 0;

      if (strategy === 'shorter' && extraAmount > 0 && shouldApplyRecurring) {
        extraPrincipal = Math.min(extraAmount, Math.max(0, openingBalance - scheduledPrincipal));
      }

      if (strategy === 'lower' && extraAmount > 0 && installment === extraStart) {
        extraPrincipal = Math.min(extraAmount, Math.max(0, openingBalance - scheduledPrincipal));
      }

      balance = Math.max(0, openingBalance - scheduledPrincipal - extraPrincipal);
      const insurance = calculateScheduleInsurance(openingBalance, insuranceConfig);
      const totalPayment = actualFinancialPayment + extraPrincipal + insurance + otherCharges;

      schedule.push({
        relativeInstallment: installment,
        displayInstallment: getDisplayInstallment(installment),
        openingBalance,
        financialPayment: actualFinancialPayment,
        interest,
        scheduledPrincipal,
        extraPrincipal,
        insurance,
        otherCharges,
        totalPayment,
        closingBalance: balance
      });

      if (strategy === 'lower' && installment === extraStart && balance > 0.005) {
        const remainingMonths = Math.max(0, months - installment);
        currentPayment = remainingMonths > 0
          ? calculateFinancialPayment(balance, annualRate, remainingMonths)
          : 0;
      }

      if (strategy !== 'shorter' && installment >= months) break;
    }

    return schedule;
  };

  const summarizeSchedule = schedule => schedule.reduce((summary, row) => {
    summary.installments = schedule.length;
    summary.totalInterest += row.interest;
    summary.totalInsurance += row.insurance;
    summary.totalOtherCharges += row.otherCharges;
    summary.totalExtraPrincipal += row.extraPrincipal;
    summary.totalPaid += row.totalPayment;
    return summary;
  }, {
    installments: schedule.length,
    totalInterest: 0,
    totalInsurance: 0,
    totalOtherCharges: 0,
    totalExtraPrincipal: 0,
    totalPaid: 0
  });

  const representativeRows = schedule => {
    if (!schedule.length) return [];
    const total = schedule.length;
    const positions = [1, 2, 10, 20, Math.ceil(total / 2), total];
    return [...new Set(positions.filter(position => position >= 1 && position <= total))]
      .map(position => schedule[position - 1]);
  };

  const renderMetric = (label, value, detail = '') => `
    <article class="amortization-metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      ${detail ? `<small>${detail}</small>` : ''}
    </article>
  `;

  const renderBaseSummary = schedule => {
    if (!baseSummary) return;
    const summary = summarizeSchedule(schedule);
    const first = schedule[0];
    baseSummary.innerHTML = [
      renderMetric('Plazo estimado', summary.installments + ' cuotas'),
      renderMetric('Intereses estimados', money(summary.totalInterest)),
      renderMetric('Cuota financiera inicial', money(first?.financialPayment || 0)),
      renderMetric('Total estimado pagado', money(summary.totalPaid), 'Incluye seguro y otros cargos informados.')
    ].join('');
  };

  const renderRows = (tbody, rows, includeExtra = false, full = false) => {
    if (!tbody) return;
    tbody.innerHTML = rows.map(row => {
      const cells = full
        ? `
          <td>${getInstallmentLabel(row)}</td>
          <td>${money(row.openingBalance)}</td>
          <td>${money(row.financialPayment)}</td>
          <td>${money(row.interest)}</td>
          <td>${money(row.scheduledPrincipal)}</td>
          <td>${money(row.extraPrincipal)}</td>
          <td>${money(row.insurance)}</td>
          <td>${money(row.otherCharges)}</td>
          <td>${money(row.totalPayment)}</td>
          <td>${money(row.closingBalance)}</td>
        `
        : includeExtra
          ? `
            <td>${getInstallmentLabel(row)}</td>
            <td>${money(row.openingBalance)}</td>
            <td>${money(row.interest)}</td>
            <td>${money(row.scheduledPrincipal)}</td>
            <td>${money(row.extraPrincipal)}</td>
            <td>${money(row.insurance)}</td>
            <td>${money(row.totalPayment)}</td>
            <td>${money(row.closingBalance)}</td>
          `
          : `
            <td>${getInstallmentLabel(row)}</td>
            <td>${money(row.openingBalance)}</td>
            <td>${money(row.interest)}</td>
            <td>${money(row.scheduledPrincipal)}</td>
            <td>${money(row.insurance)}</td>
            <td>${money(row.otherCharges)}</td>
            <td>${money(row.totalPayment)}</td>
            <td>${money(row.closingBalance)}</td>
          `;

      return `<tr class="${row.extraPrincipal > 0 ? 'amortization-extra-row' : ''}">${cells}</tr>`;
    }).join('');
  };

  const showUpdateStatus = (message = 'Resultados actualizados con la información más reciente.') => {
    if (!updateStatus) return;
    updateStatus.textContent = message;
    updateStatus.hidden = false;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      updateStatus.hidden = true;
    }, 1800);
  };

  const showEmptyResults = (title, text) => {
    if (resultsEmpty) resultsEmpty.hidden = false;
    results.hidden = true;
    setText(resultsEmptyTitle, title || 'Completa los datos de la obligación para ver la estimación.');
    setText(resultsEmptyText, text || 'Los resultados se actualizarán automáticamente a medida que ingreses o modifiques la información.');
  };

  const showCalculatedResults = () => {
    if (resultsEmpty) resultsEmpty.hidden = true;
    results.hidden = false;
  };

  const renderScenario = () => {
    if (!selectedScenario || !baseSchedule.length) {
      if (scenarioResults) scenarioResults.hidden = true;
      return;
    }

    const extraAmount = getFieldNumber(extraAmountField);
    const extraStart = Math.max(1, Math.floor(getFieldNumber(extraStartField) || 1));
    if (extraAmount <= 0) {
      if (scenarioResults) scenarioResults.hidden = true;
      return;
    }

    const principal = getPrincipal();
    const months = getMonths();
    const annualRate = getFieldNumber(rateField);
    const otherCharges = getFieldNumber(otherChargesField);
    const financialPayment = calculateFinancialPayment(principal, annualRate, months);
    const insuranceConfig = getInsuranceConfiguration(principal);

    activeScenarioSchedule = generateSchedule({
      principal,
      annualRate,
      months,
      financialPayment,
      insuranceConfig,
      otherCharges,
      extraAmount,
      extraStart,
      extraFrequencyValue: selectedScenario === 'lower' ? 'once' : (extraFrequency?.value || 'monthly'),
      strategy: selectedScenario
    });

    const base = summarizeSchedule(baseSchedule);
    const scenario = summarizeSchedule(activeScenarioSchedule);
    const interestSavings = Math.max(0, base.totalInterest - scenario.totalInterest);
    const installmentReduction = Math.max(0, base.installments - scenario.installments);
    const basePayment = baseSchedule[0]?.financialPayment || 0;
    const afterExtraRow = activeScenarioSchedule[Math.min(extraStart, activeScenarioSchedule.length - 1)];
    const newPayment = selectedScenario === 'lower'
      ? (afterExtraRow?.financialPayment || activeScenarioSchedule.at(-1)?.financialPayment || 0)
      : basePayment;

    if (selectedScenario === 'shorter') {
      setText(scenarioResultTitle, 'Escenario: pagar en menos tiempo');
      setText(
        scenarioResultText,
        `Con un abono adicional de ${money(extraAmount)} desde la cuota ${extraStart}, la obligación podría finalizar aproximadamente en ${scenario.installments} cuotas. Esto representa ${installmentReduction} cuotas menos y un ahorro estimado de ${money(interestSavings)} en intereses.`
      );
    } else {
      setText(scenarioResultTitle, 'Escenario: pagar una cuota menor');
      setText(
        scenarioResultText,
        `Después de aplicar un abono de ${money(extraAmount)} en la cuota ${extraStart}, la cuota financiera teórica podría cambiar de ${money(basePayment)} a aproximadamente ${money(newPayment)}, manteniendo el plazo pendiente utilizado en la simulación.`
      );
    }

    if (scenarioSummary) {
      scenarioSummary.innerHTML = [
        renderMetric('Intereses sin abonos', money(base.totalInterest)),
        renderMetric('Intereses con el escenario', money(scenario.totalInterest)),
        renderMetric('Ahorro estimado de intereses', money(interestSavings)),
        renderMetric('Plazo sin abonos', base.installments + ' cuotas'),
        renderMetric('Plazo con el escenario', scenario.installments + ' cuotas'),
        renderMetric(
          selectedScenario === 'shorter' ? 'Cuotas reducidas' : 'Nueva cuota financiera',
          selectedScenario === 'shorter' ? String(installmentReduction) : money(newPayment)
        )
      ].join('');
    }

    renderRows(scenarioRepresentativeBody, representativeRows(activeScenarioSchedule), true, false);
    if (fullSchedule && !fullSchedule.hidden) {
      renderRows(fullScheduleBody, activeScenarioSchedule, true, true);
    }
    if (scenarioResults) scenarioResults.hidden = false;
  };

  const updateResults = () => {
    if (!selectedMode) {
      showEmptyResults();
      return;
    }

    const principal = getPrincipal();
    const months = getMonths();
    const annualRate = getFieldNumber(rateField);

    if (principal <= 0 || months <= 0) {
      showEmptyResults(
        'Completa el monto y el plazo para ver la estimación.',
        selectedMode === 'new'
          ? 'Ingresa el monto solicitado, la tasa anual y el plazo de la nueva obligación.'
          : 'Ingresa el saldo actual, la tasa anual y el plazo pendiente de la obligación.'
      );
      return;
    }

    const financialPayment = calculateFinancialPayment(principal, annualRate, months);
    if (!Number.isFinite(financialPayment) || financialPayment <= 0) {
      showEmptyResults('No fue posible realizar la estimación.', 'Revisa el monto, la tasa anual y el plazo ingresados.');
      return;
    }

    const insuranceConfig = getInsuranceConfiguration(principal);
    const otherCharges = getFieldNumber(otherChargesField);

    baseSchedule = generateSchedule({
      principal,
      annualRate,
      months,
      financialPayment,
      insuranceConfig,
      otherCharges,
      strategy: 'base'
    });

    const first = baseSchedule[0];
    if (!first) {
      showEmptyResults('No fue posible realizar la estimación.', 'Revisa los valores ingresados en el formulario.');
      return;
    }

    const totalPayment = first.totalPayment;
    const percentage = value => totalPayment > 0 ? value / totalPayment * 100 : 0;
    const capitalPercent = percentage(first.scheduledPrincipal);
    const interestPercent = percentage(first.interest);
    const insurancePercent = percentage(first.insurance);
    const otherPercent = percentage(first.otherCharges);

    setText(totalPaymentElement, money(totalPayment));
    setText(financialPaymentElement, money(first.financialPayment));
    setText(insurancePaymentElement, insuranceConfig.included ? money(first.insurance) : 'No incluido');
    setText(otherPaymentElement, money(first.otherCharges));
    setText(capitalValueElement, money(first.scheduledPrincipal));
    setText(interestValueElement, money(first.interest));
    setText(insuranceValueElement, insuranceConfig.included ? money(first.insurance) : 'No incluido');
    setText(otherValueElement, money(first.otherCharges));
    setText(capitalPercentElement, capitalPercent.toFixed(1) + '%');
    setText(interestPercentElement, interestPercent.toFixed(1) + '%');
    setText(insurancePercentElement, insuranceConfig.included ? insurancePercent.toFixed(1) + '%' : 'No calculado');
    setText(otherPercentElement, otherPercent.toFixed(1) + '%');
    setBarWidth(capitalBar, capitalPercent);
    setBarWidth(interestBar, interestPercent);
    setBarWidth(insuranceBar, insuranceConfig.included ? insurancePercent : 0);
    setBarWidth(otherBar, otherPercent);

    setText(capitalExplanation, `De tu cuota mensual estimada, aproximadamente ${money(first.scheduledPrincipal)} se aplicarían directamente a reducir el saldo de capital durante el primer período.`);
    setText(interestExplanation, `Aproximadamente ${money(first.interest)} corresponderían a intereses del primer período, calculados sobre un saldo de ${money(principal)}.`);

    if (insuranceConfig.note) {
      setText(costsExplanation, `${insuranceConfig.note} Los otros cargos informados tampoco reducen el capital de la obligación.`);
    } else if (first.insurance > 0 || first.otherCharges > 0) {
      setText(costsExplanation, `Aproximadamente ${money(first.insurance + first.otherCharges)} corresponderían al seguro y a otros cargos mensuales informados. Estos componentes forman parte del pago, pero no reducen el capital.`);
    } else {
      setText(costsExplanation, 'No se agregaron seguros ni otros cargos mensuales a esta estimación.');
    }

    renderBaseSummary(baseSchedule);
    renderRows(representativeBody, representativeRows(baseSchedule), false, false);

    if (selectedMode === 'existing' && getFieldNumber(currentPaymentField) > 0 && baseSummary) {
      const informed = getFieldNumber(currentPaymentField);
      const difference = informed - totalPayment;
      baseSummary.insertAdjacentHTML(
        'beforeend',
        renderMetric(
          'Cuota actual informada',
          money(informed),
          Math.abs(difference) < 0.01
            ? 'Coincide aproximadamente con la estimación.'
            : `Diferencia frente a la estimación: ${money(Math.abs(difference))}.`
        )
      );
    }

    showCalculatedResults();
    renderScenario();
  };

  const updateModeFields = () => {
    $$('[data-field-mode]').forEach(field => {
      field.hidden = field.dataset.fieldMode !== selectedMode;
    });
    updateInsuranceFields();
  };

  function updateInsuranceFields() {
    const type = insuranceType?.value || 'none';
    if (insuranceAmountField) insuranceAmountField.hidden = type !== 'fixed';
    if (insuranceRateField) insuranceRateField.hidden = type !== 'balance-rate' && type !== 'original-rate';
    if (originalAmountField) {
      originalAmountField.hidden = !(selectedMode === 'existing' && type === 'original-rate');
    }
  }

  const getCalculatorSimulation = () => {
    if (localStorage.getItem('frl-calculator-interacted') !== 'true') return null;
    const stored = localStorage.getItem('frl-calculator-simulation');
    if (!stored) return null;
    try {
      const simulation = JSON.parse(stored);
      const valid = Number(simulation.amount) > 0 && Number(simulation.months) > 0 && Number(simulation.rate) >= 0;
      return valid && simulation.product !== 'tdc' ? simulation : null;
    } catch (error) {
      return null;
    }
  };

  const mapCalculatorProduct = product => {
    if (['personal_privado', 'personal_publico', 'personal_jubilados'].includes(product)) return 'personal';
    if (['hipoteca_preferencial', 'hipoteca_no_preferencial'].includes(product)) return 'mortgage';
    if (product === 'auto') return 'auto';
    return 'other';
  };

  const updateCalculatorOption = () => {
    if (calculatorOption) calculatorOption.hidden = selectedMode !== 'new' || !getCalculatorSimulation();
  };

  const importCalculatorSimulation = () => {
    const simulation = getCalculatorSimulation();
    if (!simulation) return;
    amountField.value = Number(simulation.amount).toFixed(2);
    rateField.value = Number(simulation.rate).toFixed(2);
    monthsField.value = Math.floor(Number(simulation.months));
    productField.value = mapCalculatorProduct(simulation.product);
    updateResults();
    showUpdateStatus('La simulación de la Calculadora fue incorporada.');
  };

  const prepareManualEntry = () => {
    if (amountField) amountField.value = '';
    if (rateField) rateField.value = '';
    if (monthsField) monthsField.value = '';
    if (productField) productField.value = 'personal';
    updateResults();
    amountField?.focus();
    showUpdateStatus('Los campos están listos para ingresar otros datos manualmente.');
  };

  const selectScenario = scenario => {
    selectedScenario = scenario;
    scenarioButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.amortizationScenario === scenario));
    });
    if (scenarioForm) scenarioForm.hidden = false;
    if (extraFrequencyField) extraFrequencyField.hidden = scenario === 'lower';
    if (extraStartHelp) {
      extraStartHelp.textContent = scenario === 'lower'
        ? 'El abono se aplicará una sola vez en la cuota indicada y luego se recalculará la cuota financiera.'
        : 'El primer abono se aplicará en la cuota indicada y continuará según la frecuencia seleccionada.';
    }
    renderScenario();
  };

  const resetScenario = () => {
    selectedScenario = '';
    activeScenarioSchedule = [];
    scenarioButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
    if (scenarioForm) scenarioForm.hidden = true;
    if (scenarioResults) scenarioResults.hidden = true;
    if (extraAmountField) extraAmountField.value = '';
    if (extraStartField) extraStartField.value = selectedMode === 'new' ? '2' : '1';
    if (fullSchedule) fullSchedule.hidden = true;
    if (toggleFullScheduleButton) {
      toggleFullScheduleButton.textContent = 'Ver todas las cuotas';
      toggleFullScheduleButton.setAttribute('aria-expanded', 'false');
    }
  };

  const saveAmortizationState = () => {
    const state = {
      selectedMode,
      selectedScenario,
      fields: {}
    };

    $$(`#amortization-form input, #amortization-form select, #amortization-scenario-form input, #amortization-scenario-form select`).forEach(field => {
      if (field.id) state.fields[field.id] = field.value;
    });

    sessionStorage.setItem('frl-amortization-state', JSON.stringify(state));
  };

  const restoreAmortizationState = () => {
    const stored = sessionStorage.getItem('frl-amortization-state');
    if (!stored) return;

    try {
      const state = JSON.parse(stored);
      const modeButton = modeButtons.find(button => button.dataset.amortizationMode === state.selectedMode);
      modeButton?.click();

      Object.entries(state.fields || {}).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value;
      });

      updateInsuranceFields();
      updateResults();

      if (state.selectedScenario) {
        selectScenario(state.selectedScenario);
        renderScenario();
      }
    } catch (error) {
      sessionStorage.removeItem('frl-amortization-state');
    }
  };

  const openPrintPage = type => {
    if (!baseSchedule.length) return;

    if ((type === 'scenario' || type === 'full') &&
        (!selectedScenario || !activeScenarioSchedule.length || scenarioResults?.hidden)) {
      showUpdateStatus('Primero selecciona y completa un escenario de abono para imprimirlo.');
      return;
    }

    saveAmortizationState();

    const principal = getPrincipal();
    const params = new URLSearchParams({
      view: type,
      mode: selectedMode,
      principal: String(principal),
      originalPrincipal: String(getOriginalPrincipal(principal)),
      annualRate: String(getFieldNumber(rateField)),
      months: String(getMonths()),
      currentPayment: String(getFieldNumber(currentPaymentField)),
      currentInstallment: String(Math.floor(getFieldNumber(currentInstallmentField))),
      insuranceType: insuranceType?.value || 'none',
      insuranceAmount: String(getFieldNumber(insuranceAmountInput)),
      insuranceRate: String(getFieldNumber(insuranceRateInput)),
      otherCharges: String(getFieldNumber(otherChargesField)),
      scenario: selectedScenario,
      extraAmount: String(getFieldNumber(extraAmountField)),
      extraStart: String(Math.max(1, Math.floor(getFieldNumber(extraStartField) || 1))),
      extraFrequency: extraFrequency?.value || 'monthly'
    });

    window.location.href = 'amortizacion-imprimir.html?' + params.toString();
  };

  modeButtons.forEach(button => {
    button.addEventListener('click', () => {
      selectedMode = button.dataset.amortizationMode;
      const content = modeContent[selectedMode];
      if (!content) return;

      modeButtons.forEach(current => {
        const selected = current === button;
        current.setAttribute('aria-pressed', String(selected));
        current.textContent = selected ? 'Seleccionado' : 'Seleccionar';
      });

      setText(selectionTitle, content.title);
      setText(selectionText, content.text);
      setText(formTitle, content.formTitle);
      selectionPanel.hidden = false;
      formSection.hidden = false;
      updateModeFields();
      updateCalculatorOption();
      resetScenario();
      updateResults();
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  scenarioButtons.forEach(button => {
    button.addEventListener('click', () => selectScenario(button.dataset.amortizationScenario));
  });

  useCalculatorButton?.addEventListener('click', importCalculatorSimulation);
  useManualButton?.addEventListener('click', prepareManualEntry);
  resetScenarioButton?.addEventListener('click', resetScenario);

  insuranceType?.addEventListener('change', () => {
    updateInsuranceFields();
    updateResults();
    showUpdateStatus();
  });

  $$(`#amortization-form input, #amortization-form select`).forEach(field => {
    field.addEventListener('input', () => {
      updateResults();
      showUpdateStatus();
    });
    field.addEventListener('change', () => {
      updateResults();
      showUpdateStatus();
    });
  });

  [extraAmountField, extraStartField, extraFrequency].filter(Boolean).forEach(field => {
    field.addEventListener('input', renderScenario);
    field.addEventListener('change', renderScenario);
  });

  toggleFullScheduleButton?.addEventListener('click', () => {
    const willOpen = fullSchedule.hidden;
    fullSchedule.hidden = !willOpen;

    if (willOpen) {
      renderRows(fullScheduleBody, activeScenarioSchedule, true, true);
    } else if (fullScheduleBody) {
      fullScheduleBody.innerHTML = '';
    }

    toggleFullScheduleButton.textContent = willOpen ? 'Ocultar todas las cuotas' : 'Ver todas las cuotas';
    toggleFullScheduleButton.setAttribute('aria-expanded', String(willOpen));
  });

  printInsideButton?.addEventListener('click', () => openPrintPage('inside'));
  printEvolutionButton?.addEventListener('click', () => openPrintPage('evolution'));
  printScenarioButton?.addEventListener('click', () => openPrintPage('scenario'));
  printFullButton?.addEventListener('click', () => openPrintPage('full'));

  updateInsuranceFields();
  updateResults();
  restoreAmortizationState();
}


function initAmortizationPrint() {
  const page = document.querySelector('body[data-page="amortization-print"]');
  if (!page) return;

  const content = document.getElementById('amortization-print-content');
  const printButton = document.getElementById('amortization-print-now');
  const backButton = document.getElementById('amortization-print-back');
  if (!content) return;

  backButton?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'amortizacion.html';
    }
  });

  const params = new URLSearchParams(window.location.search);
  const number = (name, fallback = 0) => {
    const value = Number(params.get(name));
    return Number.isFinite(value) ? Math.max(0, value) : fallback;
  };

  const view = params.get('view') || 'evolution';
  const mode = params.get('mode') || 'new';
  const principal = number('principal');
  const originalPrincipal = number('originalPrincipal');
  const annualRate = number('annualRate');
  const months = Math.max(1, Math.floor(number('months', 1)));
  const currentPayment = number('currentPayment');
  const currentInstallment = Math.floor(number('currentInstallment'));
  const insuranceType = params.get('insuranceType') || 'none';
  const insuranceAmount = number('insuranceAmount');
  const insuranceRate = number('insuranceRate') / 100;
  const otherCharges = number('otherCharges');
  const scenario = params.get('scenario') || '';
  const extraAmount = number('extraAmount');
  const extraStart = Math.max(1, Math.floor(number('extraStart', 1)));
  const extraFrequency = params.get('extraFrequency') || 'monthly';

  const calculatePayment = (amount, rate, term) => {
    if (amount <= 0 || term <= 0) return 0;
    const monthlyRate = rate / 1200;
    if (monthlyRate === 0) return amount / term;
    const factor = Math.pow(1 + monthlyRate, term);
    return amount * monthlyRate * factor / (factor - 1);
  };

  const insuranceConfig = {
    type: insuranceType,
    included: insuranceType !== 'unknown' && !(insuranceType === 'original-rate' && originalPrincipal <= 0),
    fixedAmount: insuranceAmount,
    monthlyRate: insuranceRate,
    originalPrincipal
  };

  const insuranceFor = openingBalance => {
    if (!insuranceConfig.included) return 0;
    if (insuranceType === 'fixed') return insuranceAmount;
    if (insuranceType === 'balance-rate') return openingBalance * insuranceRate;
    if (insuranceType === 'original-rate') return originalPrincipal * insuranceRate;
    return 0;
  };

  const displayNumber = installment => mode === 'existing' && currentInstallment > 0
    ? currentInstallment + installment
    : installment;

  const installmentLabel = row => {
    if (mode === 'existing' && currentInstallment <= 0) {
      return row.installment === 1 ? 'Próxima cuota' : 'Proyectada ' + row.installment;
    }
    return 'Cuota ' + row.displayInstallment;
  };

  const generateSchedule = ({ strategy = 'base' } = {}) => {
    const schedule = [];
    const monthlyRate = annualRate / 1200;
    const initialPayment = calculatePayment(principal, annualRate, months);
    let financialPayment = initialPayment;
    let balance = principal;
    const maxPeriods = strategy === 'shorter' ? Math.max(months * 3, months + 1200) : months;
    const frequencies = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };

    for (let installment = 1; installment <= maxPeriods && balance > 0.005; installment += 1) {
      const openingBalance = balance;
      const interest = openingBalance * monthlyRate;
      let scheduledPrincipal = Math.min(openingBalance, Math.max(0, financialPayment - interest));
      const actualFinancialPayment = interest + scheduledPrincipal;
      let extraPrincipal = 0;
      const recurring = extraFrequency === 'once'
        ? installment === extraStart
        : installment >= extraStart && (installment - extraStart) % (frequencies[extraFrequency] || 1) === 0;

      if (strategy === 'shorter' && extraAmount > 0 && recurring) {
        extraPrincipal = Math.min(extraAmount, Math.max(0, openingBalance - scheduledPrincipal));
      }
      if (strategy === 'lower' && extraAmount > 0 && installment === extraStart) {
        extraPrincipal = Math.min(extraAmount, Math.max(0, openingBalance - scheduledPrincipal));
      }

      balance = Math.max(0, openingBalance - scheduledPrincipal - extraPrincipal);
      const insurance = insuranceFor(openingBalance);
      const totalPayment = actualFinancialPayment + extraPrincipal + insurance + otherCharges;

      schedule.push({
        installment,
        displayInstallment: displayNumber(installment),
        openingBalance,
        financialPayment: actualFinancialPayment,
        interest,
        scheduledPrincipal,
        extraPrincipal,
        insurance,
        otherCharges,
        totalPayment,
        closingBalance: balance
      });

      if (strategy === 'lower' && installment === extraStart && balance > 0.005) {
        const remaining = Math.max(0, months - installment);
        financialPayment = remaining > 0 ? calculatePayment(balance, annualRate, remaining) : 0;
      }

      if (strategy !== 'shorter' && installment >= months) break;
    }
    return schedule;
  };

  const summarize = schedule => schedule.reduce((result, row) => {
    result.interest += row.interest;
    result.insurance += row.insurance;
    result.otherCharges += row.otherCharges;
    result.extra += row.extraPrincipal;
    result.total += row.totalPayment;
    return result;
  }, { installments: schedule.length, interest: 0, insurance: 0, otherCharges: 0, extra: 0, total: 0 });

  const representatives = schedule => {
    const positions = [1, 2, 10, 20, Math.ceil(schedule.length / 2), schedule.length];
    return [...new Set(positions.filter(position => position >= 1 && position <= schedule.length))]
      .map(position => schedule[position - 1]);
  };

  const metric = (label, value, detail = '') => `
    <article class="print-metric">
      <span>${label}</span>
      <strong>${value}</strong>
      ${detail ? `<small>${detail}</small>` : ''}
    </article>`;

  const rows = (schedule, full = false) => schedule.map(row => full ? `
    <tr>
      <td>${installmentLabel(row)}</td>
      <td>${money(row.openingBalance)}</td>
      <td>${money(row.financialPayment)}</td>
      <td>${money(row.interest)}</td>
      <td>${money(row.scheduledPrincipal)}</td>
      <td>${money(row.extraPrincipal)}</td>
      <td>${money(row.insurance)}</td>
      <td>${money(row.otherCharges)}</td>
      <td>${money(row.totalPayment)}</td>
      <td>${money(row.closingBalance)}</td>
    </tr>` : `
    <tr>
      <td>${installmentLabel(row)}</td>
      <td>${money(row.openingBalance)}</td>
      <td>${money(row.interest)}</td>
      <td>${money(row.scheduledPrincipal)}</td>
      <td>${money(row.extraPrincipal)}</td>
      <td>${money(row.insurance)}</td>
      <td>${money(row.totalPayment)}</td>
      <td>${money(row.closingBalance)}</td>
    </tr>`).join('');

  const baseSchedule = generateSchedule();
  if (!baseSchedule.length) {
    content.innerHTML = '<div class="print-message"><h1>No fue posible generar la simulación.</h1><p>Regresa a Amortización inteligente y revisa los datos ingresados.</p></div>';
    return;
  }

  const base = summarize(baseSchedule);
  const first = baseSchedule[0];
  const scenarioSchedule = scenario ? generateSchedule({ strategy: scenario }) : [];
  const scenarioSummary = scenarioSchedule.length ? summarize(scenarioSchedule) : null;
  const heading = {
    inside: 'Tu cuota por dentro',
    evolution: 'Distribución y evolución de las cuotas',
    scenario: 'Resumen del escenario con abonos',
    full: 'Cronograma completo del escenario'
  }[view] || 'Amortización inteligente';

  let body = `
    <header class="print-header">
      <div class="print-brand">
        <img src="assets/brand/logo-symbol.svg" alt="" aria-hidden="true">
        <span>Finance & Risk Lab</span>
      </div>
      <span>Amortización inteligente</span>
      <h1>${heading}</h1>
      <p>Estimación educativa basada en los datos ingresados. No constituye asesoría financiera.</p>
    </header>`;

  if (view === 'inside') {
    const total = first.totalPayment;
    body += `
      <section class="print-highlight">
        <span>Cuota mensual estimada</span>
        <strong>${money(total)}</strong>
      </section>
      <section class="print-metrics">
        ${metric('Cuota financiera teórica', money(first.financialPayment))}
        ${metric('Capital del primer período', money(first.scheduledPrincipal))}
        ${metric('Intereses del primer período', money(first.interest))}
        ${metric('Seguro estimado', insuranceConfig.included ? money(first.insurance) : 'No incluido')}
        ${metric('Otros cargos', money(first.otherCharges))}
        ${currentPayment > 0 ? metric('Cuota actual informada', money(currentPayment)) : ''}
      </section>`;
  } else if (view === 'evolution') {
    body += `
      <section class="print-metrics">
        ${metric('Plazo estimado', base.installments + ' cuotas')}
        ${metric('Intereses estimados', money(base.interest))}
        ${metric('Cuota financiera inicial', money(first.financialPayment))}
        ${metric('Total estimado pagado', money(base.total), 'Incluye seguro y cargos informados.')}
      </section>
      <h2>Cuotas representativas</h2>
      <div class="print-table-wrap"><table><thead><tr><th>Cuota</th><th>Saldo inicial</th><th>Interés</th><th>Capital</th><th>Abono</th><th>Seguro</th><th>Pago total</th><th>Saldo final</th></tr></thead><tbody>${rows(representatives(baseSchedule))}</tbody></table></div>`;
  } else {
    if (!scenarioSchedule.length || !scenarioSummary) {
      body += '<div class="print-message"><h2>No hay un escenario completo.</h2><p>Regresa y completa el monto y el inicio del abono.</p></div>';
    } else {
      const savings = Math.max(0, base.interest - scenarioSummary.interest);
      const reduced = Math.max(0, base.installments - scenarioSummary.installments);
      const after = scenarioSchedule[Math.min(extraStart, scenarioSchedule.length - 1)];
      const newPayment = scenario === 'lower' ? (after?.financialPayment || 0) : first.financialPayment;
      body += `
        <section class="print-metrics">
          ${metric('Intereses sin abonos', money(base.interest))}
          ${metric('Intereses con el escenario', money(scenarioSummary.interest))}
          ${metric('Ahorro estimado', money(savings))}
          ${metric('Plazo sin abonos', base.installments + ' cuotas')}
          ${metric('Plazo con el escenario', scenarioSummary.installments + ' cuotas')}
          ${metric(scenario === 'shorter' ? 'Cuotas reducidas' : 'Nueva cuota financiera', scenario === 'shorter' ? String(reduced) : money(newPayment))}
        </section>
        <h2>${view === 'full' ? 'Todas las cuotas' : 'Cuotas representativas'}</h2>
        <div class="print-table-wrap"><table><thead><tr>${view === 'full'
          ? '<th>Cuota</th><th>Saldo inicial</th><th>Cuota financiera</th><th>Interés</th><th>Capital</th><th>Abono</th><th>Seguro</th><th>Otros cargos</th><th>Pago total</th><th>Saldo final</th>'
          : '<th>Cuota</th><th>Saldo inicial</th><th>Interés</th><th>Capital</th><th>Abono</th><th>Seguro</th><th>Pago total</th><th>Saldo final</th>'}</tr></thead><tbody>${rows(view === 'full' ? scenarioSchedule : representatives(scenarioSchedule), view === 'full')}</tbody></table></div>`;
    }
  }

  body += `
    <footer class="print-note">
      Los resultados son teóricos. La aplicación de abonos, el recálculo de la cuota y la reducción del plazo dependen de las condiciones contractuales de cada entidad financiera.
    </footer>`;

  content.innerHTML = body;

  const normalizePdfText = value => String(value || '')
    .replace(/B\/\./g, 'B/.')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/→/g, '->')
    .replace(/[^\x20-\xFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wrapPdfLine = (value, limit = 145) => {
    const text = normalizePdfText(value);
    if (!text) return [''];
    const words = text.split(' ');
    const lines = [];
    let current = '';
    words.forEach(word => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > limit && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) lines.push(current);
    return lines;
  };

  const pdfEscape = value => normalizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

  const latin1Bytes = value => {
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      bytes[index] = code <= 255 ? code : 32;
    }
    return bytes;
  };

  const collectPdfLines = () => {
    const lines = [];
    lines.push(heading);
    lines.push('Finance & Risk Lab - Estimacion educativa');
    lines.push('');

    content.querySelectorAll('.print-highlight').forEach(block => {
      const label = block.querySelector('span')?.textContent || '';
      const value = block.querySelector('strong')?.textContent || '';
      lines.push(`${label}: ${value}`);
      lines.push('');
    });

    content.querySelectorAll('.print-metric').forEach(metricElement => {
      const label = metricElement.querySelector('span')?.textContent || '';
      const value = metricElement.querySelector('strong')?.textContent || '';
      const detail = metricElement.querySelector('small')?.textContent || '';
      lines.push(`${label}: ${value}${detail ? ` - ${detail}` : ''}`);
    });

    const table = content.querySelector('table');
    if (table) {
      lines.push('');
      const headers = [...table.querySelectorAll('thead th')]
        .map(cell => normalizePdfText(cell.textContent));
      if (headers.length) lines.push(headers.join(' | '));
      lines.push('-'.repeat(145));
      table.querySelectorAll('tbody tr').forEach(row => {
        const cells = [...row.querySelectorAll('td')]
          .map(cell => normalizePdfText(cell.textContent));
        lines.push(cells.join(' | '));
      });
    }

    const note = content.querySelector('.print-note')?.textContent;
    if (note) {
      lines.push('');
      lines.push(note);
    }

    const expanded = [];
    lines.forEach((line, index) => {
      wrapPdfLine(line, index < 2 ? 100 : 145).forEach(part => expanded.push(part));
    });
    return expanded;
  };

  const bytesToBinaryString = bytes => {
    let result = '';
    const chunkSize = 8192;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      result += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return result;
  };

  const loadPdfBrandImage = () => new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 160;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 20, 20, 120, 120);
        context.fillStyle = '#0f172a';
        context.font = '700 58px Arial, Helvetica, sans-serif';
        context.textBaseline = 'middle';
        context.fillText('Finance & Risk Lab', 175, 82);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64 = dataUrl.split(',')[1] || '';
        const decoded = atob(base64);
        const bytes = new Uint8Array(decoded.length);
        for (let index = 0; index < decoded.length; index += 1) {
          bytes[index] = decoded.charCodeAt(index);
        }
        resolve({ bytes, width: canvas.width, height: canvas.height });
      } catch (error) {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = 'assets/brand/logo-symbol.svg';
  });

  const createPdfBlob = (lines, brandImage = null) => {
    const pageWidth = 842;
    const pageHeight = 595;
    const left = 32;
    const top = brandImage ? 512 : 558;
    const lineHeight = 10;
    const linesPerPage = brandImage ? 45 : 50;
    const pages = [];

    for (let start = 0; start < lines.length; start += linesPerPage) {
      pages.push(lines.slice(start, start + linesPerPage));
    }
    if (!pages.length) pages.push(['Finance & Risk Lab']);

    const objects = [];
    const addObject = value => {
      objects.push(value);
      return objects.length;
    };

    const catalogId = addObject('');
    const pagesId = addObject('');
    const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const brandImageId = brandImage
      ? addObject(
          `<< /Type /XObject /Subtype /Image /Width ${brandImage.width} /Height ${brandImage.height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${brandImage.bytes.length} >>
` +
          `stream
${bytesToBinaryString(brandImage.bytes)}
endstream`
        )
      : 0;
    const pageIds = [];

    pages.forEach((pageLines, pageIndex) => {
      const commands = [];
      if (pageIndex === 0 && brandImageId) {
        commands.push('q');
        commands.push('210 0 0 34 32 548 cm');
        commands.push('/Brand Do');
        commands.push('Q');
      }
      commands.push('BT');
      pageLines.forEach((line, lineIndex) => {
        const y = top - lineIndex * lineHeight;
        const size = pageIndex === 0 && lineIndex === 0 ? 15 :
          pageIndex === 0 && lineIndex === 1 ? 9 : 7.5;
        commands.push(`/F1 ${size} Tf`);
        commands.push(`1 0 0 1 ${left} ${y} Tm`);
        commands.push(`(${pdfEscape(line)}) Tj`);
      });
      commands.push('ET');
      const stream = commands.join('\n');
      const streamLength = latin1Bytes(stream).length;
      const contentId = addObject(`<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`);
      const xObjectResources = brandImageId ? ` /XObject << /Brand ${brandImageId} 0 R >>` : '';
      const pageId = addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /Font << /F1 ${fontId} 0 R >>${xObjectResources} >> /Contents ${contentId} 0 R >>`
      );
      pageIds.push(pageId);
    });

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [0];
    objects.forEach((objectValue, index) => {
      offsets.push(latin1Bytes(pdf).length);
      pdf += `${index + 1} 0 obj\n${objectValue}\nendobj\n`;
    });

    const xrefOffset = latin1Bytes(pdf).length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.slice(1).forEach(offset => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    return new Blob([latin1Bytes(pdf)], { type: 'application/pdf' });
  };

  const downloadPdf = async () => {
    if (printButton) {
      printButton.disabled = true;
      printButton.textContent = 'Preparando PDF…';
    }

    const lines = collectPdfLines();
    const brandImage = await loadPdfBrandImage();
    const blob = createPdfBlob(lines, brandImage);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeView = ['inside', 'evolution', 'scenario', 'full'].includes(view) ? view : 'amortizacion';
    anchor.href = url;
    anchor.download = `finance-risk-lab-${safeView}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);

    if (printButton) {
      printButton.disabled = false;
      printButton.textContent = 'Descargar PDF';
    }
  };

  if (printButton) {
    printButton.textContent = 'Descargar PDF';
    printButton.addEventListener('click', downloadPdf);
  }
}

function initComparator() {
  const amount =
    document.getElementById(
      "compareAmount"
    );

  if (!amount) return;

  const fieldIds = [
    "compareAmount",
    "compareNameA",
    "compareRateA",
    "compareMonthsA",
    "compareOpeningFeeA",
    "compareInsuranceA",
    "compareOtherMonthlyA",
    "compareNameB",
    "compareRateB",
    "compareMonthsB",
    "compareOpeningFeeB",
    "compareInsuranceB",
    "compareOtherMonthlyB"
  ];

  const fields =
    fieldIds
      .map(
        id =>
          document.getElementById(id)
      )
      .filter(Boolean);

  const getName = proposal => {
    const value =
      document
        .getElementById(
          `compareName${proposal}`
        )
        ?.value.trim();

    return (
      value ||
      `Propuesta ${proposal}`
    );
  };

  const calculatePayment = (
    principal,
    annualRate,
    months
  ) => {
    if (
      principal <= 0 ||
      months <= 0
    ) {
      return 0;
    }

    const monthlyRate =
      annualRate / 1200;

    if (monthlyRate === 0) {
      return principal / months;
    }

    const factor =
      Math.pow(
        1 + monthlyRate,
        months
      );

    return (
      principal *
      monthlyRate *
      factor /
      (factor - 1)
    );
  };

  const calculateProposal =
    proposal => {
      const principal =
        num("compareAmount");

      const annualRate =
        num(
          `compareRate${proposal}`
        );

      const months =
        Math.floor(
          num(
            `compareMonths${proposal}`
          )
        );

      const openingFee =
        num(
          `compareOpeningFee${proposal}`
        );

      const insurance =
        num(
          `compareInsurance${proposal}`
        );

      const otherMonthly =
        num(
          `compareOtherMonthly${proposal}`
        );

      const basePayment =
        calculatePayment(
          principal,
          annualRate,
          months
        );

      const monthlyPayment =
        basePayment +
        insurance +
        otherMonthly;

      const financedTotal =
        basePayment * months;

      const interest =
        months > 0
          ? Math.max(
              0,
              financedTotal -
              principal
            )
          : 0;

      const totalCost =
        financedTotal +
        openingFee +
        (
          insurance +
          otherMonthly
        ) * months;

      return {
        principal,
        annualRate,
        months,
        openingFee,
        insurance,
        otherMonthly,
        basePayment,
        monthlyPayment,
        interest,
        totalCost
      };
    };

  const setText = (
    id,
    value
  ) => {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  };

  const updateNames = (
    nameA,
    nameB
  ) => {
    [
      "compareResultNameA1",
      "compareResultNameA2",
      "compareResultNameA3"
    ].forEach(
      id => setText(id, nameA)
    );

    [
      "compareResultNameB1",
      "compareResultNameB2",
      "compareResultNameB3"
    ].forEach(
      id => setText(id, nameB)
    );
  };

  const updateInformationStatus = (
    proposalA,
    proposalB
  ) => {
    const requiredComplete =
      proposalA.principal > 0 &&
      proposalA.months > 0 &&
      proposalB.months > 0;

    const additionalCosts =
      proposalA.openingFee +
      proposalA.insurance +
      proposalA.otherMonthly +
      proposalB.openingFee +
      proposalB.insurance +
      proposalB.otherMonthly;

    if (!requiredComplete) {
      setText(
        "compareInformationStatusTitle",
        "Información pendiente"
      );

      setText(
        "compareInformationStatusText",
        "Completa el monto y el plazo de ambas propuestas."
      );

      return;
    }

    if (additionalCosts > 0) {
      setText(
        "compareInformationStatusTitle",
        "Comparación ampliada"
      );

      setText(
        "compareInformationStatusText",
        "La comparación incluye los costos adicionales registrados."
      );

      return;
    }

    setText(
      "compareInformationStatusTitle",
      "Comparación básica"
    );

    setText(
      "compareInformationStatusText",
      "El cálculo utiliza el monto, la tasa y el plazo. Agrega otros cargos cuando aparezcan en las propuestas."
    );
  };

  const updateObservations = (
    proposalA,
    proposalB,
    nameA,
    nameB
  ) => {
    if (
      proposalA.principal <= 0 ||
      proposalA.months <= 0 ||
      proposalB.months <= 0
    ) {
      setText(
        "compareObservationTitle1",
        "Completa los datos requeridos"
      );

      setText(
        "compareObservationText1",
        "Introduce el monto y el plazo de ambas propuestas para realizar la comparación."
      );

      setText(
        "compareObservationTitle2",
        "Agrega los costos que aparezcan en las propuestas"
      );

      setText(
        "compareObservationText2",
        "Los seguros, las comisiones y otros cargos pueden cambiar el resultado."
      );

      return;
    }

    const monthlyDifference =
      Math.abs(
        proposalA.monthlyPayment -
        proposalB.monthlyPayment
      );

    const totalDifference =
      Math.abs(
        proposalA.totalCost -
        proposalB.totalCost
      );

    if (
      monthlyDifference < 0.01
    ) {
      setText(
        "compareObservationTitle1",
        "Las cuotas mensuales son similares"
      );

      setText(
        "compareObservationText1",
        `La diferencia estimada entre ${nameA} y ${nameB} es menor de B/. 0.01 al mes.`
      );
    } else {
      const lowerMonthly =
        proposalA.monthlyPayment <
        proposalB.monthlyPayment
          ? nameA
          : nameB;

      setText(
        "compareObservationTitle1",
        `${lowerMonthly} tiene un menor pago mensual`
      );

      setText(
        "compareObservationText1",
        `La diferencia mensual estimada entre ambas propuestas es de ${money(
          monthlyDifference
        )}.`
      );
    }

    if (
      totalDifference < 0.01
    ) {
      setText(
        "compareObservationTitle2",
        "Los costos totales son similares"
      );

      setText(
        "compareObservationText2",
        "Con los datos introducidos, ambas propuestas presentan un costo total estimado similar."
      );
    } else {
      const lowerTotal =
        proposalA.totalCost <
        proposalB.totalCost
          ? nameA
          : nameB;

      setText(
        "compareObservationTitle2",
        `${lowerTotal} presenta un menor costo total`
      );

      setText(
        "compareObservationText2",
        `La diferencia estimada en el costo total es de ${money(
          totalDifference
        )}.`
      );
    }
  };

  const update = () => {
    const nameA =
      getName("A");

    const nameB =
      getName("B");

    const proposalA =
      calculateProposal("A");

    const proposalB =
      calculateProposal("B");

    updateNames(
      nameA,
      nameB
    );

    setText(
      "compareMonthlyA",
      money(
        proposalA.monthlyPayment
      )
    );

    setText(
      "compareMonthlyB",
      money(
        proposalB.monthlyPayment
      )
    );

    setText(
      "compareInterestA",
      money(
        proposalA.interest
      )
    );

    setText(
      "compareInterestB",
      money(
        proposalB.interest
      )
    );

    setText(
      "compareTotalCostA",
      money(
        proposalA.totalCost
      )
    );

    setText(
      "compareTotalCostB",
      money(
        proposalB.totalCost
      )
    );

    updateInformationStatus(
      proposalA,
      proposalB
    );

    updateObservations(
      proposalA,
      proposalB,
      nameA,
      nameB
    );
  };

  fields.forEach(
    field => {
      field.addEventListener(
        "input",
        update
      );

      field.addEventListener(
        "change",
        update
      );
    }
  );

  const exportButton =
    document.getElementById(
      "compareExportPdf"
    );

  const normalizePdfText = value =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/–|—/g, "-")
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const pdfEscape = value =>
    normalizePdfText(value)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const latin1Bytes = value => {
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
      bytes[index] = value.charCodeAt(index) & 255;
    }
    return bytes;
  };

  const wrapPdfLine = (value, maxLength = 92) => {
    const text = normalizePdfText(value);
    if (!text) return [""];
    const words = text.split(" ");
    const lines = [];
    let line = "";
    words.forEach(word => {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > maxLength && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    return lines;
  };

  const createComparatorPdf = lines => {
    const pageWidth = 612;
    const pageHeight = 792;
    const left = 48;
    const top = 742;
    const lineHeight = 14;
    const linesPerPage = 48;
    const pages = [];
    for (let start = 0; start < lines.length; start += linesPerPage) {
      pages.push(lines.slice(start, start + linesPerPage));
    }
    if (!pages.length) pages.push(["Finance & Risk Lab"]);

    const objects = [];
    const addObject = value => {
      objects.push(value);
      return objects.length;
    };
    const catalogId = addObject("");
    const pagesId = addObject("");
    const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const pageIds = [];

    pages.forEach((pageLines, pageIndex) => {
      const commands = ["BT"];
      pageLines.forEach((line, lineIndex) => {
        const y = top - lineIndex * lineHeight;
        const size = pageIndex === 0 && lineIndex === 0 ? 18 :
          pageIndex === 0 && lineIndex === 1 ? 11 : 9;
        commands.push(`/F1 ${size} Tf`);
        commands.push(`1 0 0 1 ${left} ${y} Tm`);
        commands.push(`(${pdfEscape(line)}) Tj`);
      });
      commands.push("ET");
      const stream = commands.join("\n");
      const contentId = addObject(`<< /Length ${latin1Bytes(stream).length} >>\nstream\n${stream}\nendstream`);
      const pageId = addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      pageIds.push(pageId);
    });

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets = [0];
    objects.forEach((objectValue, index) => {
      offsets.push(latin1Bytes(pdf).length);
      pdf += `${index + 1} 0 obj\n${objectValue}\nendobj\n`;
    });
    const xrefOffset = latin1Bytes(pdf).length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.slice(1).forEach(offset => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;
    return new Blob([latin1Bytes(pdf)], { type: "application/pdf" });
  };

  const downloadComparatorPdf = () => {
    const nameA = getName("A");
    const nameB = getName("B");
    const proposalA = calculateProposal("A");
    const proposalB = calculateProposal("B");
    const observation1 = document.getElementById("compareObservationText1")?.textContent || "";
    const observation2 = document.getElementById("compareObservationText2")?.textContent || "";

    const rawLines = [
      "Finance & Risk Lab",
      "Comparador de propuestas bancarias",
      "",
      `Monto solicitado: ${money(proposalA.principal)}`,
      "",
      `${nameA}`,
      `Pago mensual estimado: ${money(proposalA.monthlyPayment)}`,
      `Intereses estimados: ${money(proposalA.interest)}`,
      `Costo total estimado: ${money(proposalA.totalCost)}`,
      `Tasa anual: ${proposalA.annualRate.toFixed(2)}%`,
      `Plazo: ${proposalA.months} meses`,
      `Comision inicial: ${money(proposalA.openingFee)}`,
      `Seguro mensual: ${money(proposalA.insurance)}`,
      `Otros cargos mensuales: ${money(proposalA.otherMonthly)}`,
      "",
      `${nameB}`,
      `Pago mensual estimado: ${money(proposalB.monthlyPayment)}`,
      `Intereses estimados: ${money(proposalB.interest)}`,
      `Costo total estimado: ${money(proposalB.totalCost)}`,
      `Tasa anual: ${proposalB.annualRate.toFixed(2)}%`,
      `Plazo: ${proposalB.months} meses`,
      `Comision inicial: ${money(proposalB.openingFee)}`,
      `Seguro mensual: ${money(proposalB.insurance)}`,
      `Otros cargos mensuales: ${money(proposalB.otherMonthly)}`,
      "",
      "Explicacion de las diferencias",
      observation1,
      observation2,
      "",
      "Resultado educativo basado unicamente en los datos ingresados. Finance & Risk Lab no recomienda bancos, no selecciona una propuesta y no sustituye la revision de los documentos oficiales."
    ];

    const lines = [];
    rawLines.forEach((line, index) => {
      wrapPdfLine(line, index < 2 ? 70 : 92).forEach(part => lines.push(part));
    });

    if (exportButton) {
      exportButton.disabled = true;
      exportButton.textContent = "Preparando PDF…";
    }

    try {
      const blob = createComparatorPdf(lines);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "finance-risk-lab-comparador.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      if (exportButton) {
        exportButton.disabled = false;
        exportButton.textContent = "Exportar comparación en PDF";
      }
    }
  };

  exportButton?.addEventListener(
    "click",
    downloadComparatorPdf
  );

  update();
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initCalculator();
    initCapacity();
    initComparator();
    initAmortization();
    initAmortizationPrint();
  }
);