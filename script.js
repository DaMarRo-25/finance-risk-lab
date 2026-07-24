const money = value => new Intl.NumberFormat('es-PA',{style:'currency',currency:'PAB',minimumFractionDigits:2}).format(Number.isFinite(value)?value:0).replace('PAB','B/.');
const num = id => Math.max(0, Number(document.getElementById(id)?.value || 0));

function initCalculator(){
  const amount=document.getElementById('amount'),rate=document.getElementById('rate'),months=document.getElementById('months');
  if(!amount||!rate||!months)return;
  const calculate=()=>{const p=num('amount'),n=Math.max(1,num('months')),r=num('rate')/1200;const payment=r===0?p/n:p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);const total=payment*n;document.getElementById('monthly').textContent=money(payment);document.getElementById('total').textContent=money(total);document.getElementById('interest').textContent=money(total-p);document.getElementById('to-capacity').dataset.payment=payment.toFixed(2)};
  [amount,rate,months].forEach(el=>el.addEventListener('input',calculate));calculate();
  document.getElementById('to-capacity').addEventListener('click',e=>{localStorage.setItem('frl-new-payment',e.currentTarget.dataset.payment||'0');location.href='capacidad-pago.html';});
}

function initCapacity(){
  const inputs=[...document.querySelectorAll('.capacity-input')]; if(!inputs.length)return;
  const saved=Number(localStorage.getItem('frl-new-payment')); if(saved>0)document.getElementById('newPayment').value=saved.toFixed(2);
  const radios=[...document.querySelectorAll('input[name="incomeMode"]')];
  const toggle=()=>{const gross=radios.find(r=>r.checked)?.value==='gross';document.getElementById('gross-income-fields').hidden=!gross;document.getElementById('net-income-fields').hidden=gross;update();};
  const setWidth=(id,value)=>document.getElementById(id).style.width=`${Math.max(0,Math.min(100,value))}%`;
  function update(){
    const grossMode=radios.find(r=>r.checked)?.value==='gross';
    const primary=grossMode?Math.max(0,num('grossIncome')-num('deductions')):num('netIncome');
    const income=primary+num('otherIncome');
    const family=num('housing')+num('food')+num('services')+num('transport')+num('educationHealth')+num('otherExpenses');
    const obligations=num('obligations'),payment=num('newPayment'),additional=num('additionalAmount')/Math.max(1,num('additionalFrequency'));
    const before=income-family-obligations-additional,after=before-payment;
    const pct=v=>income>0?v/income*100:0;
    document.getElementById('additionalMonthlyLabel').textContent=money(additional);
    document.getElementById('metricIncome').textContent=money(income);
    document.getElementById('metricAvailable').textContent=money(after);
    document.getElementById('availablePct').textContent=`${pct(after).toFixed(1)}% del ingreso`;
    document.getElementById('metricDebt').textContent=`${pct(obligations+payment).toFixed(1)}%`;
    document.getElementById('metricExpenses').textContent=`${pct(family).toFixed(1)}%`;
    const segments={expenses:pct(family),obligations:pct(obligations),payment:pct(payment),additional:pct(additional),available:Math.max(0,pct(after))};
    Object.entries(segments).forEach(([key,val])=>document.querySelector(`.seg.${key}`).style.width=`${val}%`);
    const max=Math.max(family,obligations+payment,1);setWidth('familyCompare',family/max*100);setWidth('debtCompare',(obligations+payment)/max*100);
    document.getElementById('familyCompareValue').textContent=money(family);document.getElementById('debtCompareValue').textContent=money(obligations+payment);
    const outflow=family+obligations+payment;if(outflow>0){document.getElementById('comparisonSentence').textContent=`De cada B/. 100 destinados a gastos familiares y obligaciones, aproximadamente B/. ${(family/outflow*100).toFixed(0)} corresponden al hogar y B/. ${((obligations+payment)/outflow*100).toFixed(0)} a deudas.`}else document.getElementById('comparisonSentence').textContent='Agrega gastos y obligaciones para visualizar la comparación.';
    document.getElementById('beforeAvailable').textContent=money(before);document.getElementById('afterAvailable').textContent=money(after);setWidth('beforeBar',pct(Math.max(0,before)));setWidth('afterBar',pct(Math.max(0,after)));
    document.getElementById('obsDistribution').textContent=family>=obligations+payment?'Los gastos familiares representan una porción mayor de tus salidas mensuales que las obligaciones financieras.':'Las obligaciones financieras representan una porción mayor de tus salidas mensuales que los gastos familiares.';
    document.getElementById('obsImpact').textContent=payment>0?`La nueva cuota reduciría tu margen mensual en ${money(payment)}, de ${money(before)} a ${money(after)}.`:'No se ha incorporado una nueva cuota al análisis.';
  }
  inputs.forEach(el=>el.addEventListener('input',update));radios.forEach(r=>r.addEventListener('change',toggle));toggle();
}

document.addEventListener('DOMContentLoaded',()=>{initCalculator();initCapacity();});
