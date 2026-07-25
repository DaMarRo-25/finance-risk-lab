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
document.addEventListener('DOMContentLoaded',()=>{initCalculator();initCapacity()});
