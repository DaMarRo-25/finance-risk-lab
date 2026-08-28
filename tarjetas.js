(() => {
  const $ = id => document.getElementById(id);
  const money = value => value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'PAB', minimumFractionDigits: 2 }).format(Number(value)).replace('PAB', 'B/.');
  const num = id => {
    const value = $(id)?.value;
    return value === '' || value === undefined ? NaN : Number(value);
  };
  let updateTimer;
  let dataSource = 'independent';
  let scenarioReceived = false;
  let loadedProposalLabel = '';
  const USER_STATE_KEY = 'frl-card-user-state';
  const PRE_EXAMPLE_KEY = 'frl-card-pre-example-state';
  const LOADED_META_KEY = 'frl-card-loaded-meta';

  const EXAMPLE = {
    cardLimit: 3000,
    cardBalance: 1200, cardRate: 20, cardCutDay: 15, cardDueDay: 5,
    cardMinimum: 60, cardNewSpend: 0, cardPayment: 150, cardMonths: 24
  };

  function getScenario() {
    // Tarjetas solo acepta una transferencia explícita desde su comparador.
    // No lee el escenario global porque este puede pertenecer a otro módulo
    // (por ejemplo, Calculadora o Capacidad de Pago). Así evitamos que una
    // visita directa a Tarjetas muestre datos que el usuario no introdujo allí.
    try {
      const raw = sessionStorage.getItem('frl-card-comparator-transfer');
      if (!raw) return null;
      const d = JSON.parse(raw);
      sessionStorage.removeItem('frl-card-comparator-transfer');
      return {
        type: 'credit-card',
        source: 'comparator',
        sourceLabel: 'Comparador de tarjetas',
        data: {
          limit: d.limit ?? null,
          annualRate: d.annualRate ?? null,
          annualFee: d.annualFee ?? null,
          minimum: d.minimum ?? null,
          proposal: d.proposal ?? null,
          proposalLabel: d.proposalLabel ?? null
        }
      };
    } catch (_) { return null; }
  }

  function setField(id, value) { if ($(id) && value !== undefined && value !== null) $(id).value = value; }

  function applyScenario(scenario) {
    if (!scenario?.data) return false;
    const d = scenario.data;
    const map = { cardLimit: d.limit, cardBalance: d.balance, cardRate: d.annualRate, cardMinimum: d.minimum, cardCutDay: d.cutDay, cardDueDay: d.dueDay, cardPayment: d.payment, cardNewSpend: d.newSpend, cardMonths: d.months };
    // Datos que pertenecen al comparador de tarjetas pero que no son necesarios para iniciar la simulación.
    if (d.annualFee !== undefined && d.annualFee !== null && $('cardAnnualFee')) setField('cardAnnualFee', d.annualFee);
    let applied = false;
    Object.entries(map).forEach(([id, value]) => { if (value !== undefined && value !== null && $(id)) { setField(id, value); applied = true; } });
    if (applied) {
      dataSource = 'imported'; scenarioReceived = true; loadedProposalLabel = d.proposalLabel || 'propuesta seleccionada'; saveCurrentState(); saveLoadedState();
      $('cardScenarioContext').hidden = false;
      $('cardScenarioContext').innerHTML = `<strong>Información cargada desde otra herramienta</strong><p>Trajimos los datos disponibles de <b>${d.proposalLabel || 'la propuesta seleccionada'}</b>. Revísalos antes de continuar; los campos que no llegaron quedan disponibles para que los completes si los conoces.</p><div class="scenario-actions"><button type="button" class="text-button" id="reviewCardData">Revisar datos</button><button type="button" class="scenario-clear" id="clearCardScenario">Usar esta herramienta por separado</button></div>`;
      $('clearCardScenario')?.addEventListener('click', () => { window.FRLScenario?.clear?.(); $('cardScenarioContext').hidden = true; dataSource = 'user'; scenarioReceived = false; loadedProposalLabel = ''; renderModeNotice(); run('quitaste la información importada'); });
      $('reviewCardData')?.addEventListener('click', () => $('cardDataStatus')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
    return applied;
  }

  function getInput() {
    return { limit: num('cardLimit'), balance: num('cardBalance'), annualRate: num('cardRate'), minimum: num('cardMinimum'), minimumPercent: num('minimumPercent'), minimumFees: num('minimumFees'), useMinimumFormula: Boolean($('useMinimumFormula')?.checked), newSpend: num('cardNewSpend'), payment: num('cardPayment'), months: num('cardMonths'), cutDay: num('cardCutDay'), dueDay: num('cardDueDay') };
  }
  function simulate() { return window.FRLCardEngine.simulate(getInput()); }

  function sourceLabel() { return dataSource === 'imported' ? 'información cargada desde otra herramienta' : 'datos que proporcionaste'; }

  function updateDataStatus(model) {
    const missing = [];
    if (!model.hasBalance) missing.push('saldo');
    if (!model.hasRate) missing.push('tasa');
    if (!model.hasPayment) missing.push('pago o pago mínimo');
    if (!model.hasMonths) missing.push('número de meses para ver la evolución completa');
    if (!model.hasSpend) missing.push('compras nuevas');
    const el = $('cardDataStatus');
    if (!el) return;
    const input = getInput();
    const known = [
      model.hasBalance, model.hasRate, model.hasPayment, model.hasMonths,
      Number.isFinite(input.limit), Number.isFinite(input.minimum),
      Number.isFinite(input.cutDay), Number.isFinite(input.dueDay)
    ].filter(Boolean).length;
    const level = known >= 8 ? 'Información completa' : known >= 5 ? 'Información intermedia' : 'Información básica';
    const missingText = missing.length ? `Todavía no tenemos ${missing.join(', ')}.` : 'Tenemos todos los datos que esta simulación utiliza para este escenario.';
    const warning = missing.length ? `${missingText} Puedes continuar con lo que conoces. ${missing.length === 1 ? 'Ese dato puede cambiar el resultado.' : 'Esos datos pueden cambiar el resultado.'}` : missingText;
    el.innerHTML = `<span class="data-level-label">${scenarioReceived ? 'Información recibida + tus datos' : 'Tus datos'} · ${level}</span><p>${warning}</p>`;
  }

  function render(model, reason = 'cambiaste un dato') {
    updateDataStatus(model);
    const canShowSnapshot = model.hasBalance && model.hasPayment;
    const canShowFull = canShowSnapshot && model.hasMonths;
    $('cardEndingBalance').textContent = canShowSnapshot ? money(model.ending) : '—';
    $('cardInterestTotal').textContent = canShowSnapshot && model.hasRate ? money(model.totalInterest) : '—';
    $('cardPaidTotal').textContent = canShowSnapshot ? money(model.totalPaid) : '—';
    $('cardSpendTotal').textContent = canShowSnapshot && model.hasSpend ? money(model.totalSpend) : '—';
    $('cardMeterValue').textContent = canShowSnapshot ? money(model.ending) : '—';
    const max = Math.max(model.initial || 0, model.limit || 0, 1);
    $('cardBalanceMeter').style.width = canShowSnapshot ? `${Math.min(100, Math.max(0, model.ending / max * 100))}%` : '0%';

    const tbody = $('cardSchedule');
    tbody.innerHTML = model.rows.length
      ? model.rows.map(r => `<tr><td>${r.period}</td><td>${money(r.start)}</td><td>${model.hasRate ? money(r.interest) : '—'}</td><td>${money(r.purchase)}</td><td>${money(r.payment)}</td><td>${money(r.ending)}</td></tr>`).join('')
      : '<tr><td colspan="6" class="empty-table">Ya podemos mostrar el efecto del próximo periodo. Agrega el número de meses si quieres ver la evolución completa de la deuda.</td></tr>';

    const insight = $('cardInsight');
    let title = 'Empieza con lo que conoces';
    let text = 'No necesitas completar todos los campos. Agrega un saldo y un pago para comenzar a explorar; la herramienta te indicará qué información falta.';
    if (canShowSnapshot && !model.hasRate) { title = 'Ya podemos ver el efecto del pago'; text = model.hasMonths ? 'Podemos mostrar cómo se mueve la deuda con el saldo y el pago que indicaste. Sin una tasa no calculamos un costo financiero: no inventamos ese dato.' : 'Podemos mostrar qué ocurriría en el próximo periodo con el saldo y el pago que indicaste. Agrega meses si quieres explorar la evolución completa.'; }
    else if (canShowSnapshot && model.hasRate && model.ending < model.initial) { title = 'El saldo está bajando'; text = model.hasMonths ? `Con este escenario, el saldo termina ${money(model.initial - model.ending)} por debajo del saldo inicial. Prueba otro pago o agrega compras para ver cómo cambia.` : `Con este primer periodo estimado, el saldo baja ${money(model.initial - model.ending)}. Agrega meses para observar cómo evoluciona.`; }
    else if (canShowSnapshot && model.hasRate && model.ending >= model.initial) { title = 'El pago, las compras y el costo financiero importan'; text = 'Si el pago no supera lo que se suma al saldo, la deuda puede mantenerse o crecer. Cambia una sola variable y observa qué ocurre.'; }
    if (model.hasSpend && model.newSpend > 0) text += ' Las compras nuevas forman parte del escenario de tarjeta; no se agregan automáticamente como gasto en tu presupuesto.';
    insight.innerHTML = `<strong>${title}</strong><p>${text}</p>`;

    const status = $('cardStatus');
    const detail = model.hasRate ? 'con la información disponible y una estimación del costo financiero' : 'sin estimar intereses porque falta la tasa';
    status.innerHTML = `<strong>Simulación aproximada</strong><p>Se actualizó porque ${reason}. Trabajamos ${detail}. Al comparar con tu banco pueden aparecer diferencias por fechas, cargos, movimientos o condiciones específicas de tu tarjeta.</p>`;
    $('liveUpdateText').textContent = `actualizado: ${new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}`;
    const cycle = $('cardCycleSummary');
    if (cycle) cycle.innerHTML = `<span><strong>Corte</strong> ${$('cardCutDay')?.value ? `día ${$('cardCutDay').value}` : 'no indicado'}</span><span><strong>Fecha límite</strong> ${$('cardDueDay')?.value ? `día ${$('cardDueDay').value}` : 'no indicada'}</span><span><strong>Pago probado</strong> ${model.hasPayment ? money(model.plannedPayment) : 'no indicado'}</span>`;
  }

  function run(reason) { render(simulate(), reason); }

  const CARD_FIELD_IDS = ['cardLimit','cardBalance','cardRate','cardCutDay','cardDueDay','cardMinimum','minimumPercent','minimumFees','cardNewSpend','cardPayment','cardMonths','useMinimumFormula'];
  function snapshot(){
    const state={};
    CARD_FIELD_IDS.forEach(id=>{const el=$(id);if(!el)return;state[id]=el.type==='checkbox'?el.checked:el.value;});
    return state;
  }
  function restoreSnapshot(state){
    if(!state)return false;
    Object.entries(state).forEach(([id,value])=>{const el=$(id);if(!el)return;if(el.type==='checkbox')el.checked=Boolean(value);else el.value=value??'';});
    if($('minimumFormulaPanel'))$('minimumFormulaPanel').hidden=!$('useMinimumFormula').checked;
    return true;
  }
  function saveCurrentState(){try{sessionStorage.setItem(USER_STATE_KEY,JSON.stringify(snapshot()));}catch{}}
  function saveLoadedState(){try{sessionStorage.setItem(PRE_EXAMPLE_KEY,JSON.stringify(snapshot()));if(loadedProposalLabel)sessionStorage.setItem(LOADED_META_KEY,loadedProposalLabel);}catch{}}
  function readSaved(key){try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch{return null;}}
  function renderModeNotice(){
    const notice=$('cardDataModeNotice'); if(!notice)return;
    if(dataSource==='example'){
      notice.innerHTML='<strong>Estás viendo un ejemplo</strong><p>Estos valores son solo para experimentar. Tu información anterior queda guardada mientras pruebas el ejemplo.</p><div class="card-data-actions"><button type="button" class="button secondary small-button" id="cardExampleButton">Repetir ejemplo</button><button type="button" class="text-button" id="cardClearData">Volver a mis datos</button></div>';
    } else if(scenarioReceived){
      notice.innerHTML=`<strong>Propuesta cargada: ${loadedProposalLabel || 'propuesta seleccionada'}</strong><p>La información llegó desde el Comparador. Puedes completar aquí los datos que falten para profundizar en el análisis, sin perder los datos transferidos.</p><div class="card-data-actions"><button type="button" class="button secondary small-button" id="cardExampleButton">Probar un ejemplo</button></div>`;
    } else {
      notice.innerHTML='<strong>Trabaja con tus datos</strong><p>No necesitas completar todo. Puedes empezar con el saldo, el pago o cualquier dato que conozcas.</p><div class="card-data-actions"><button type="button" class="button secondary small-button" id="cardExampleButton">Ver un ejemplo</button></div>';
    }
    bindDataModeButtons();
  }
  function loadExample(){
    if(dataSource!=='example') saveLoadedState();
    Object.entries(EXAMPLE).forEach(([id,value])=>setField(id,value));
    dataSource='example';
    renderModeNotice(); run('cargaste un ejemplo');
  }
  function restoreUserData(){
    const saved=readSaved(PRE_EXAMPLE_KEY) || readSaved(USER_STATE_KEY);
    const restored=restoreSnapshot(saved);
    dataSource=scenarioReceived?'imported':'user';
    if(restored){
      if(dataSource==='imported') loadedProposalLabel=readSaved(LOADED_META_KEY)||loadedProposalLabel;
      renderModeNotice(); run('volviste a tus datos');
    } else {
      dataSource='user'; scenarioReceived=false; loadedProposalLabel='';
      renderModeNotice(); run('empezaste con tus datos');
    }
  }
  function bindDataModeButtons(){
    $('cardExampleButton')?.addEventListener('click',loadExample);
    $('cardClearData')?.addEventListener('click',restoreUserData);
  }
  bindDataModeButtons();

  document.querySelectorAll('.section-disclosure').forEach(parent => parent.addEventListener('toggle', () => {
    if (!parent.open) return;
    const groups = [...parent.querySelectorAll('.knowledge-group')];
    groups.forEach((group, index) => { group.open = index === 0; });
    parent.querySelectorAll('.learn-more, .example-disclosure').forEach(detail => { detail.open = false; });
  }));

  $('useMinimumFormula')?.addEventListener('change', () => { $('minimumFormulaPanel').hidden = !$('useMinimumFormula').checked; run('cambiaste la forma de estimar el mínimo'); });
  document.querySelectorAll('[data-payment]').forEach(button => button.addEventListener('click', () => { const mode = button.dataset.payment; const model = simulate(); if (mode === 'minimum') $('cardPayment').value = model.minimum ?? ''; else if (mode === 'full') $('cardPayment').value = model.initial || ''; else $('cardPayment').value = mode; run('elegiste un pago rápido'); }));
  ['cardLimit','cardBalance','cardRate','cardMinimum','minimumPercent','minimumFees','cardNewSpend','cardPayment','cardMonths','cardCutDay','cardDueDay'].forEach(id => $(id)?.addEventListener('input', () => { clearTimeout(updateTimer); updateTimer = setTimeout(() => { if(dataSource !== 'example') { saveCurrentState(); if(scenarioReceived) saveLoadedState(); } run('cambiaste un dato'); }, 80); }));

  $('cardToCapacity')?.addEventListener('click', () => {
    const model = simulate();
    if (!model.hasPayment) { $('cardPayment')?.focus(); return; }
    const cardScenario = { type: 'credit-card', source: 'credit-card', sourceLabel: 'Tarjetas de crédito', data: { proposalLabel: loadedProposalLabel || null, limit: model.limit, balance: model.initial, annualRate: model.annualRate, minimum: model.minimum, payment: model.plannedPayment, newSpend: model.hasSpend ? model.newSpend : null, months: model.hasMonths ? model.months : null, cutDay: num('cardCutDay'), dueDay: num('cardDueDay'), impact: { paymentRole: 'financial-obligation', newSpendRole: 'budget-expense-candidate' } } };
    window.FRLScenario?.write?.(cardScenario);
    sessionStorage.setItem('frl-capacity-handoff-v1', JSON.stringify({ version: 1, source: 'credit-card', sourceLabel: cardScenario.sourceLabel, data: cardScenario.data }));
    sessionStorage.setItem('frl-card-capacity-context', JSON.stringify({ source: 'credit-card', payment: model.plannedPayment, newSpend: model.hasSpend ? model.newSpend : null, newSpendTreatment: 'ask-if-already-budgeted' }));
    window.location.href = 'capacidad-pago.html';
  });

  const scenario = getScenario();
  applyScenario(scenario);
  renderModeNotice();
  run(scenario ? 'cargaste información de otra herramienta' : 'abriste el simulador');
})();
