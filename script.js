const referenceRates = {
  personal_privado:{group:'Préstamos personales',name:'Personal privado',rate:10.79,min:8.50,max:18.50,banks:6,note:'Referencia exclusiva para trabajadores del sector privado.'},
  personal_publico:{group:'Préstamos personales',name:'Personal público o gobierno',rate:9.52,min:7.00,max:15.00,banks:7,note:'Referencia para empleados públicos o de gobierno.'},
  personal_jubilados:{group:'Préstamos personales',name:'Jubilados / CSS',rate:7.60,min:6.00,max:12.75,banks:6,note:'Referencia para jubilados y pensionados de la CSS.'},
  hipoteca_preferencial:{group:'Hipotecas',name:'Primera vivienda · interés preferencial',rate:2.84,min:1.00,max:6.25,banks:7,note:'Referencia separada para primera vivienda bajo condiciones preferenciales.'},
  hipoteca_no_preferencial:{group:'Hipotecas',name:'Hipoteca regular · no preferencial',rate:7.66,min:6.00,max:9.25,banks:7,note:'Referencia para operaciones hipotecarias regulares.'},
  auto:{group:'Otros productos',name:'Préstamo de auto',rate:7.88,min:6.75,max:11.00,banks:6,note:'Promedio de la tasa representativa de cada banco.'},
  tdc:{group:'Otros productos',name:'Tarjeta de crédito',rate:20.08,min:7.99,max:37.77,banks:7,note:'Referencia general. La tasa puede variar según el segmento y las condiciones de la tarjeta.'}
};
const money=value=>new Intl.NumberFormat('es-PA',{style:'currency',currency:'PAB',minimumFractionDigits:2}).format(Number.isFinite(value)?value:0).replace('PAB','B/.');
const num=id=>Math.max(0,Number(document.getElementById(id)?.value||0));
function initCalculator(){
  const product=document.getElementById('product'),amount=document.getElementById('amount'),rate=document.getElementById('rate'),months=document.getElementById('months');
  if(!amount||!rate||!months)return;
  const calculate=()=>{const p=num('amount'),n=Math.max(1,num('months')),r=num('rate')/1200;const payment=r===0?p/n:p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);const total=payment*n;document.getElementById('monthly').textContent=money(payment);document.getElementById('total').textContent=money(total);document.getElementById('interest').textContent=money(total-p);const item=referenceRates[product?.value||'personal_privado'];const diff=num('rate')-item.rate;document.getElementById('comparison-text').textContent=Math.abs(diff)<0.005?'Tu tasa coincide con la referencia seleccionada.':`Tu tasa está ${Math.abs(diff).toFixed(2)} puntos porcentuales ${diff>0?'por encima':'por debajo'} de la referencia histórica.`;const button=document.getElementById('to-capacity');if(button)button.dataset.payment=payment.toFixed(2)};
  const updateReference=()=>{const item=referenceRates[product.value];document.getElementById('reference-button-rate').textContent=`${item.rate.toFixed(2)}%`;const context=document.getElementById('product-context');if(product.value==='tdc'){context.innerHTML='<strong>Nota sobre tarjetas:</strong> la tasa puede variar por segmento. Esta simulación supone un saldo financiado a plazo fijo y no representa el pago mínimo contractual.';context.hidden=false}else context.hidden=true;calculate()};
  [amount,rate,months].forEach(el=>el.addEventListener('input',calculate));
  product?.addEventListener('change',updateReference);
  document.getElementById('use-reference')?.addEventListener('click',()=>{rate.value=referenceRates[product.value].rate.toFixed(2);calculate()});
  document.getElementById('to-capacity')?.addEventListener('click',e=>{localStorage.setItem('frl-new-payment',e.currentTarget.dataset.payment||'0');location.href='capacidad-pago.html'});
  updateReference();
}
function initCapacity(){
  const inputs=[...document.querySelectorAll('.capacity-input')];if(!inputs.length)return;
  const saved=Number(localStorage.getItem('frl-new-payment'));if(saved>0)document.getElementById('newPayment').value=saved.toFixed(2);
  const radios=[...document.querySelectorAll('input[name="incomeMode"]')];
  const setWidth=(id,value)=>document.getElementById(id).style.width=`${Math.max(0,Math.min(100,value))}%`;
  
  function update(){
  const grossMode =
    radios.find(radio => radio.checked)?.value === 'gross';

  const primaryIncome = grossMode
    ? Math.max(0, num('grossIncome') - num('deductions'))
    : num('netIncome');

  const income = primaryIncome + num('otherIncome');

  const family =
    num('housing') +
    num('food') +
    num('services') +
    num('transport') +
    num('educationHealth') +
    num('otherExpenses');

  const obligations = num('obligations');
  const payment = num('newPayment');

  const additional =
    num('additionalAmount') /
    Math.max(1, num('additionalFrequency'));

  const before =
    income -
    family -
    obligations -
    additional;

  const after = before - payment;

  const pct = value =>
    income > 0 ? (value / income) * 100 : 0;

  const availablePct = pct(Math.max(0, after));
  const debtBeforePct = pct(obligations);
  const debtAfterPct = pct(obligations + payment);

  document.getElementById('additionalMonthlyLabel').textContent =
    money(additional);

  document.getElementById('metricIncome').textContent =
    money(income);

  document.getElementById('metricAvailable').textContent =
    money(after);

  document.getElementById('availablePct').textContent =
    `${availablePct.toFixed(1)}% disponible del ingreso`;

  document.getElementById('debtBefore').textContent =
    `${debtBeforePct.toFixed(1)}%`;

  document.getElementById('metricDebt').textContent =
    `${debtAfterPct.toFixed(1)}%`;

  document.getElementById('metricExpenses').textContent =
    `${pct(family).toFixed(1)}%`;

  const segments = {
    expenses: pct(family),
    obligations: pct(obligations),
    payment: pct(payment),
    additional: pct(additional),
    available: Math.max(0, pct(after))
  };

  Object.entries(segments).forEach(([key, value]) => {
    const segment = document.querySelector(`.seg.${key}`);

    if (segment) {
      segment.style.width =
        `${Math.max(0, Math.min(100, value))}%`;
    }
  });

  document.getElementById('beforeAvailable').textContent =
    money(before);

  document.getElementById('afterAvailable').textContent =
    money(after);

  setWidth(
    'beforeBar',
    pct(Math.max(0, before))
  );

  setWidth(
    'afterBar',
    pct(Math.max(0, after))
  );

  document.getElementById('obsDistribution').textContent =
    income > 0
      ? `De cada B/. 100 que ingresan al hogar, aproximadamente B/. ${pct(family).toFixed(0)} se destinan a gastos familiares, B/. ${pct(obligations).toFixed(0)} a obligaciones actuales, B/. ${pct(payment).toFixed(0)} a la nueva cuota y B/. ${availablePct.toFixed(0)} quedan disponibles.`
      : 'Agrega tus ingresos para visualizar cómo se distribuye tu presupuesto.';

  document.getElementById('obsImpact').textContent =
    payment > 0
      ? `La nueva cuota hará que tu dinero disponible al mes se reduzca a ${money(after)}.`
      : `Sin una nueva cuota, tu dinero disponible al mes es de ${money(before)}.`;}
 
  const toggle=()=>{const gross=radios.find(r=>r.checked)?.value==='gross';document.getElementById('gross-income-fields').hidden=!gross;document.getElementById('net-income-fields').hidden=gross;update()};
  inputs.forEach(el=>el.addEventListener('input',update));radios.forEach(r=>r.addEventListener('change',toggle));toggle();
}
function initComparator() {
  const amount = document.getElementById("compareAmount");

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

  const fields = fieldIds
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const getName = proposal => {
    const value = document
      .getElementById(`compareName${proposal}`)
      ?.value.trim();

    return value || `Propuesta ${proposal}`;
  };

  const calculatePayment = (principal, annualRate, months) => {
    if (principal <= 0 || months <= 0) return 0;

    const monthlyRate = annualRate / 1200;

    if (monthlyRate === 0) {
      return principal / months;
    }

    const factor = Math.pow(1 + monthlyRate, months);

    return (
      principal *
      monthlyRate *
      factor /
      (factor - 1)
    );
  };

  const calculateProposal = proposal => {
    const principal = num("compareAmount");
    const annualRate = num(`compareRate${proposal}`);
    const months = Math.floor(num(`compareMonths${proposal}`));

    const openingFee = num(`compareOpeningFee${proposal}`);
    const insurance = num(`compareInsurance${proposal}`);
    const otherMonthly = num(`compareOtherMonthly${proposal}`);

    const basePayment = calculatePayment(
      principal,
      annualRate,
      months
    );

    const monthlyPayment =
      basePayment +
      insurance +
      otherMonthly;

    const financedTotal = basePayment * months;

    const interest =
      months > 0
        ? Math.max(0, financedTotal - principal)
        : 0;

    const totalCost =
      financedTotal +
      openingFee +
      (insurance + otherMonthly) * months;

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

  const setText = (id, value) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  };

  const updateNames = (nameA, nameB) => {
    [
      "compareResultNameA1",
      "compareResultNameA2",
      "compareResultNameA3"
    ].forEach(id => setText(id, nameA));

    [
      "compareResultNameB1",
      "compareResultNameB2",
      "compareResultNameB3"
    ].forEach(id => setText(id, nameB));
  };

  const updateInformationStatus = (proposalA, proposalB) => {
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

    const monthlyDifference = Math.abs(
      proposalA.monthlyPayment -
      proposalB.monthlyPayment
    );

    const totalDifference = Math.abs(
      proposalA.totalCost -
      proposalB.totalCost
    );

    if (monthlyDifference < 0.01) {
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
        `La diferencia mensual estimada entre ambas propuestas es de ${money(monthlyDifference)}.`
      );
    }

    if (totalDifference < 0.01) {
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
        `La diferencia estimada en el costo total es de ${money(totalDifference)}.`
      );
    }
  };

  const update = () => {
    const nameA = getName("A");
    const nameB = getName("B");

    const proposalA = calculateProposal("A");
    const proposalB = calculateProposal("B");

    updateNames(nameA, nameB);

    setText(
      "compareMonthlyA",
      money(proposalA.monthlyPayment)
    );

    setText(
      "compareMonthlyB",
      money(proposalB.monthlyPayment)
    );

    setText(
      "compareInterestA",
      money(proposalA.interest)
    );

    setText(
      "compareInterestB",
      money(proposalB.interest)
    );

    setText(
      "compareTotalCostA",
      money(proposalA.totalCost)
    );

    setText(
      "compareTotalCostB",
      money(proposalB.totalCost)
    );

    updateInformationStatus(proposalA, proposalB);

    updateObservations(
      proposalA,
      proposalB,
      nameA,
      nameB
    );
  };

  fields.forEach(field => {
    field.addEventListener("input", update);
    field.addEventListener("change", update);
  });

  update();
}
document.addEventListener("DOMContentLoaded", () => {
  initCalculator();
  initCapacity();
  initComparator();
});
