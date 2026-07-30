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
  const page =
    document.querySelector(
      'body[data-page="amortization"]'
    );

  if (!page) return;

  const modeButtons = [
    ...page.querySelectorAll(
      "[data-amortization-mode]"
    )
  ];

  const selectionPanel =
    page.querySelector(
      "#amortization-selection"
    );

  const selectionTitle =
    page.querySelector(
      "#amortization-selection-title"
    );

  const selectionText =
    page.querySelector(
      "#amortization-selection-text"
    );

  const formSection =
    page.querySelector(
      "#amortization-form-section"
    );

  const formTitle =
    page.querySelector(
      "#amortization-form-title"
    );

  const calculatorOption =
    page.querySelector(
      "#amortization-calculator-option"
    );

  const useCalculatorButton =
    page.querySelector(
      "#amortization-use-calculator"
    );

  const useManualButton =
    page.querySelector(
      "#amortization-use-manual"
    );

  const insuranceType =
    page.querySelector(
      "#amortization-insurance-type"
    );

  const insuranceAmountField =
    page.querySelector(
      "#amortization-insurance-amount-field"
    );

  const insuranceRateField =
    page.querySelector(
      "#amortization-insurance-rate-field"
    );

  const updateStatus =
    page.querySelector(
      "#amortization-update-status"
    );

  const amountField =
    page.querySelector(
      "#amortization-amount"
    );

  const balanceField =
    page.querySelector(
      "#amortization-balance"
    );

  const rateField =
    page.querySelector(
      "#amortization-rate"
    );

  const monthsField =
    page.querySelector(
      "#amortization-months"
    );

  const remainingMonthsField =
    page.querySelector(
      "#amortization-remaining-months"
    );

  const productField =
    page.querySelector(
      "#amortization-product"
    );

  const insuranceAmountInput =
    page.querySelector(
      "#amortization-insurance-amount"
    );

  const insuranceRateInput =
    page.querySelector(
      "#amortization-insurance-rate"
    );

  const otherChargesField =
    page.querySelector(
      "#amortization-other-charges"
    );

  const resultsEmpty =
    page.querySelector(
      "#amortization-results-empty"
    );

  const resultsEmptyTitle =
    resultsEmpty?.querySelector(
      "strong"
    );

  const resultsEmptyText =
    resultsEmpty?.querySelector(
      "p"
    );

  const results =
    page.querySelector(
      "#amortization-results"
    );

  const totalPaymentElement =
    page.querySelector(
      "#amortization-total-payment"
    );

  const financialPaymentElement =
    page.querySelector(
      "#amortization-financial-payment"
    );

  const insurancePaymentElement =
    page.querySelector(
      "#amortization-insurance-payment"
    );

  const otherPaymentElement =
    page.querySelector(
      "#amortization-other-payment"
    );

  const capitalValueElement =
    page.querySelector(
      "#amortization-capital-value"
    );

  const interestValueElement =
    page.querySelector(
      "#amortization-interest-value"
    );

  const insuranceValueElement =
    page.querySelector(
      "#amortization-insurance-value"
    );

  const otherValueElement =
    page.querySelector(
      "#amortization-other-value"
    );

  const capitalPercentElement =
    page.querySelector(
      "#amortization-capital-percent"
    );

  const interestPercentElement =
    page.querySelector(
      "#amortization-interest-percent"
    );

  const insurancePercentElement =
    page.querySelector(
      "#amortization-insurance-percent"
    );

  const otherPercentElement =
    page.querySelector(
      "#amortization-other-percent"
    );

  const capitalBar =
    page.querySelector(
      "#amortization-capital-bar"
    );

  const interestBar =
    page.querySelector(
      "#amortization-interest-bar"
    );

  const insuranceBar =
    page.querySelector(
      "#amortization-insurance-bar"
    );

  const otherBar =
    page.querySelector(
      "#amortization-other-bar"
    );

  const capitalExplanation =
    page.querySelector(
      "#amortization-capital-explanation"
    );

  const interestExplanation =
    page.querySelector(
      "#amortization-interest-explanation"
    );

  const costsExplanation =
    page.querySelector(
      "#amortization-costs-explanation"
    );

  const formFields = [
    ...page.querySelectorAll(
      "#amortization-form input, " +
      "#amortization-form select"
    )
  ];

  if (
    !modeButtons.length ||
    !selectionPanel ||
    !selectionTitle ||
    !selectionText ||
    !formSection ||
    !formTitle
  ) {
    return;
  }

  let selectedMode = "";
  let statusTimer;

  const modeContent = {
    new: {
      title:
        "Obligación nueva",

      text:
        "Podrás ingresar los datos de una nueva obligación " +
        "o utilizar una simulación que hayas realizado previamente " +
        "en la Calculadora.",

      formTitle:
        "Datos de la nueva obligación"
    },

    existing: {
      title:
        "Obligación existente",

      text:
        "Trabajaremos con el saldo actual, la tasa y el plazo " +
        "pendiente de una obligación que ya tienes.",

      formTitle:
        "Datos actuales de la obligación"
    }
  };

  const getFieldNumber = field => {
    if (!field) return 0;

    const value =
      Number(field.value);

    return Number.isFinite(value)
      ? Math.max(0, value)
      : 0;
  };

  const setText = (
    element,
    value
  ) => {
    if (element) {
      element.textContent = value;
    }
  };

  const setBarWidth = (
    element,
    value
  ) => {
    if (!element) return;

    const safeValue =
      Math.max(
        0,
        Math.min(100, value)
      );

    element.style.width =
      `${safeValue}%`;
  };

  const showUpdateStatus = (
    message =
      "Resultados actualizados con la información más reciente."
  ) => {
    if (!updateStatus) return;

    updateStatus.textContent =
      message;

    updateStatus.hidden = false;

    clearTimeout(statusTimer);

    statusTimer = setTimeout(
      () => {
        updateStatus.hidden = true;
      },
      2200
    );
  };

  const showEmptyResults = (
    title =
      "Completa los datos de la obligación para ver la estimación.",

    text =
      "Los resultados se actualizarán automáticamente a medida que ingreses o modifiques la información."
  ) => {
    if (resultsEmpty) {
      resultsEmpty.hidden = false;
    }

    if (results) {
      results.hidden = true;
    }

    setText(
      resultsEmptyTitle,
      title
    );

    setText(
      resultsEmptyText,
      text
    );
  };

  const showCalculatedResults = () => {
    if (resultsEmpty) {
      resultsEmpty.hidden = true;
    }

    if (results) {
      results.hidden = false;
    }
  };

  const calculateFinancialPayment = (
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

    if (
      !Number.isFinite(factor) ||
      factor <= 1
    ) {
      return 0;
    }

    return (
      principal *
      monthlyRate *
      factor
    ) / (
      factor - 1
    );
  };

  const getPrincipal = () => {
    if (selectedMode === "new") {
      return getFieldNumber(
        amountField
      );
    }

    if (
      selectedMode === "existing"
    ) {
      return getFieldNumber(
        balanceField
      );
    }

    return 0;
  };

  const getMonths = () => {
    if (selectedMode === "new") {
      return Math.floor(
        getFieldNumber(
          monthsField
        )
      );
    }

    if (
      selectedMode === "existing"
    ) {
      return Math.floor(
        getFieldNumber(
          remainingMonthsField
        )
      );
    }

    return 0;
  };

  const calculateInsurance = (
    principal
  ) => {
    const type =
      insuranceType?.value ||
      "none";

    if (type === "fixed") {
      return {
        amount:
          getFieldNumber(
            insuranceAmountInput
          ),
        included: true,
        note: ""
      };
    }

    if (
      type === "balance-rate"
    ) {
      const monthlyInsuranceRate =
        getFieldNumber(
          insuranceRateInput
        ) / 100;

      return {
        amount:
          principal *
          monthlyInsuranceRate,
        included: true,
        note: ""
      };
    }

    if (
      type === "original-rate"
    ) {
      if (selectedMode === "new") {
        const monthlyInsuranceRate =
          getFieldNumber(
            insuranceRateInput
          ) / 100;

        return {
          amount:
            principal *
            monthlyInsuranceRate,
          included: true,
          note: ""
        };
      }

      return {
        amount: 0,
        included: false,
        note:
          "El seguro no se incluyó porque seleccionaste un porcentaje sobre el monto original, pero el formulario solo contiene el saldo actual de la obligación."
      };
    }

    if (type === "unknown") {
      return {
        amount: 0,
        included: false,
        note:
          "El seguro no se incluyó porque indicaste que no conoces su forma de cálculo."
      };
    }

    return {
      amount: 0,
      included: true,
      note: ""
    };
  };

  const updateResults = () => {
    if (!selectedMode) {
      showEmptyResults();
      return;
    }

    const principal =
      getPrincipal();

    const months =
      getMonths();

    const annualRate =
      getFieldNumber(
        rateField
      );

    if (
      principal <= 0 ||
      months <= 0
    ) {
      showEmptyResults(
        "Completa el monto y el plazo para ver la estimación.",
        selectedMode === "new"
          ? "Ingresa el monto solicitado, la tasa anual y el plazo de la nueva obligación."
          : "Ingresa el saldo actual, la tasa anual y el plazo pendiente de la obligación."
      );

      return;
    }

    const financialPayment =
      calculateFinancialPayment(
        principal,
        annualRate,
        months
      );

    if (
      !Number.isFinite(
        financialPayment
      ) ||
      financialPayment <= 0
    ) {
      showEmptyResults(
        "No fue posible realizar la estimación.",
        "Revisa el monto, la tasa anual y el plazo ingresados."
      );

      return;
    }

    const monthlyRate =
      annualRate / 1200;

    const firstInterest =
      principal *
      monthlyRate;

    const firstCapital =
      Math.max(
        0,
        financialPayment -
        firstInterest
      );

    const insuranceResult =
      calculateInsurance(
        principal
      );

    const insurancePayment =
      insuranceResult.amount;

    const otherCharges =
      getFieldNumber(
        otherChargesField
      );

    const totalPayment =
      financialPayment +
      insurancePayment +
      otherCharges;

    if (
      !Number.isFinite(totalPayment) ||
      totalPayment <= 0
    ) {
      showEmptyResults(
        "No fue posible realizar la estimación.",
        "Revisa los valores ingresados en el formulario."
      );

      return;
    }

    const getPercentage =
      value =>
        totalPayment > 0
          ? (
              value /
              totalPayment
            ) * 100
          : 0;

    const capitalPercent =
      getPercentage(
        firstCapital
      );

    const interestPercent =
      getPercentage(
        firstInterest
      );

    const insurancePercent =
      getPercentage(
        insurancePayment
      );

    const otherPercent =
      getPercentage(
        otherCharges
      );

    setText(
      totalPaymentElement,
      money(totalPayment)
    );

    setText(
      financialPaymentElement,
      money(financialPayment)
    );

    setText(
      insurancePaymentElement,
      insuranceResult.included
        ? money(insurancePayment)
        : "No incluido"
    );

    setText(
      otherPaymentElement,
      money(otherCharges)
    );

    setText(
      capitalValueElement,
      money(firstCapital)
    );

    setText(
      interestValueElement,
      money(firstInterest)
    );

    setText(
      insuranceValueElement,
      insuranceResult.included
        ? money(insurancePayment)
        : "No incluido"
    );

    setText(
      otherValueElement,
      money(otherCharges)
    );

    setText(
      capitalPercentElement,
      `${capitalPercent.toFixed(
        1
      )}%`
    );

    setText(
      interestPercentElement,
      `${interestPercent.toFixed(
        1
      )}%`
    );

    setText(
      insurancePercentElement,
      insuranceResult.included
        ? `${insurancePercent.toFixed(
            1
          )}%`
        : "No calculado"
    );

    setText(
      otherPercentElement,
      `${otherPercent.toFixed(
        1
      )}%`
    );

    setBarWidth(
      capitalBar,
      capitalPercent
    );

    setBarWidth(
      interestBar,
      interestPercent
    );

    setBarWidth(
      insuranceBar,
      insuranceResult.included
        ? insurancePercent
        : 0
    );

    setBarWidth(
      otherBar,
      otherPercent
    );

    setText(
      capitalExplanation,
      `De tu cuota mensual estimada, aproximadamente ${money(
        firstCapital
      )} se aplicarían directamente a reducir el saldo de capital durante el primer período.`
    );

    setText(
      interestExplanation,
      `Aproximadamente ${money(
        firstInterest
      )} corresponderían a intereses del primer período, calculados sobre un saldo de ${money(
        principal
      )}.`
    );

    if (
      insuranceResult.note
    ) {
      setText(
        costsExplanation,
        `${insuranceResult.note} Los otros cargos informados tampoco reducen el capital de la obligación.`
      );
    } else if (
      insurancePayment > 0 ||
      otherCharges > 0
    ) {
      setText(
        costsExplanation,
        `Aproximadamente ${money(
          insurancePayment +
          otherCharges
        )} corresponderían al seguro y a otros cargos mensuales informados. Estos componentes forman parte del pago, pero no reducen el capital.`
      );
    } else {
      setText(
        costsExplanation,
        "No se agregaron seguros ni otros cargos mensuales a esta estimación."
      );
    }

    showCalculatedResults();
  };

  const updateModeFields = () => {
    const conditionalFields = [
      ...page.querySelectorAll(
        "[data-field-mode]"
      )
    ];

    conditionalFields.forEach(
      field => {
        field.hidden =
          field.dataset.fieldMode !==
          selectedMode;
      }
    );
  };

  const updateInsuranceFields = () => {
    if (
      !insuranceType ||
      !insuranceAmountField ||
      !insuranceRateField
    ) {
      return;
    }

    const type =
      insuranceType.value;

    insuranceAmountField.hidden =
      type !== "fixed";

    insuranceRateField.hidden =
      type !== "balance-rate" &&
      type !== "original-rate";
  };

  const getCalculatorSimulation = () => {
    const interacted =
      localStorage.getItem(
        "frl-calculator-interacted"
      ) === "true";

    if (!interacted) return null;

    const storedSimulation =
      localStorage.getItem(
        "frl-calculator-simulation"
      );

    if (!storedSimulation) {
      return null;
    }

    try {
      const simulation =
        JSON.parse(
          storedSimulation
        );

      const validSimulation =
        Number(
          simulation.amount
        ) > 0 &&
        Number(
          simulation.months
        ) > 0 &&
        Number(
          simulation.rate
        ) >= 0;

      const isCreditCard =
        simulation.product ===
        "tdc";

      if (
        !validSimulation ||
        isCreditCard
      ) {
        return null;
      }

      return simulation;
    } catch (error) {
      return null;
    }
  };

  const mapCalculatorProduct =
    product => {
      if (
        product ===
          "personal_privado" ||
        product ===
          "personal_publico" ||
        product ===
          "personal_jubilados"
      ) {
        return "personal";
      }

      if (
        product ===
          "hipoteca_preferencial" ||
        product ===
          "hipoteca_no_preferencial"
      ) {
        return "mortgage";
      }

      if (
        product === "auto"
      ) {
        return "auto";
      }

      return "other";
    };

  const updateCalculatorOption = () => {
    if (!calculatorOption) return;

    const simulation =
      getCalculatorSimulation();

    calculatorOption.hidden =
      selectedMode !== "new" ||
      !simulation;
  };

  const importCalculatorSimulation = () => {
    const simulation =
      getCalculatorSimulation();

    if (
      !simulation ||
      !amountField ||
      !rateField ||
      !monthsField ||
      !productField
    ) {
      return;
    }

    amountField.value =
      Number(
        simulation.amount
      ).toFixed(2);

    rateField.value =
      Number(
        simulation.rate
      ).toFixed(2);

    monthsField.value =
      Math.floor(
        Number(
          simulation.months
        )
      );

    productField.value =
      mapCalculatorProduct(
        simulation.product
      );

    updateResults();

    showUpdateStatus(
      "La simulación de la Calculadora fue incorporada. Los resultados se actualizaron automáticamente."
    );
  };

  const prepareManualEntry = () => {
    if (amountField) {
      amountField.value = "";
    }

    if (rateField) {
      rateField.value = "";
    }

    if (monthsField) {
      monthsField.value = "";
    }

    if (productField) {
      productField.value =
        "personal";
    }

    updateResults();

    amountField?.focus();

    showUpdateStatus(
      "Los campos están listos para ingresar otros datos manualmente."
    );
  };

  modeButtons.forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          selectedMode =
            button.dataset
              .amortizationMode;

          const selectedContent =
            modeContent[
              selectedMode
            ];

          if (!selectedContent) {
            return;
          }

          modeButtons.forEach(
            currentButton => {
              const isSelected =
                currentButton ===
                button;

              currentButton.setAttribute(
                "aria-pressed",
                String(isSelected)
              );

              currentButton.textContent =
                isSelected
                  ? "Seleccionado"
                  : "Seleccionar";
            }
          );

          selectionTitle.textContent =
            selectedContent.title;

          selectionText.textContent =
            selectedContent.text;

          formTitle.textContent =
            selectedContent.formTitle;

          selectionPanel.hidden =
            false;

          formSection.hidden =
            false;

          updateModeFields();
          updateCalculatorOption();
          updateInsuranceFields();
          updateResults();

          formSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      );
    }
  );

  useCalculatorButton?.addEventListener(
    "click",
    importCalculatorSimulation
  );

  useManualButton?.addEventListener(
    "click",
    prepareManualEntry
  );

  insuranceType?.addEventListener(
    "change",
    () => {
      updateInsuranceFields();
      updateResults();
      showUpdateStatus();
    }
  );

  formFields.forEach(
    field => {
      field.addEventListener(
        "input",
        () => {
          updateResults();
          showUpdateStatus();
        }
      );

      field.addEventListener(
        "change",
        () => {
          updateResults();
          showUpdateStatus();
        }
      );
    }
  );

  updateInsuranceFields();
  updateResults();
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

  exportButton?.addEventListener(
    "click",
    () => {
      window.print();
    }
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
  }
);