(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const val = id => { const v = $(id)?.value; return v === '' || v == null ? null : Number(v); };
  const text = id => { const v = $(id)?.value?.trim(); return v || null; };
  const money = n => n == null || !Number.isFinite(Number(n)) ? '—' : new Intl.NumberFormat('es-PA',{style:'currency',currency:'PAB',minimumFractionDigits:2}).format(Number(n)).replace('PAB','B/.');
  const pct = n => n == null || !Number.isFinite(Number(n)) ? '—' : `${Number(n).toFixed(2)}%`;
  const KEY = 'frl-card-comparator-state';
  const comparable = ['limit','rate','annualFee','minimum'];
  const labels = {limit:'Límite de crédito',rate:'Tasa de interés anual',annualFee:'Anualidad',minimum:'Pago mínimo indicado'};

  function getName(side){ return text(`cardProposalName${side}`) || `Propuesta ${side}`; }
  function getSide(side){
    const fee=val(`cardAnnualFee${side}`);
    return {
      proposal: side,
      name:getName(side),
      limit:val(`cardLimit${side}`), rate:val(`cardRate${side}`), annualFee:fee,
      annualFeeFrequency:$(`cardAnnualFeeFreq${side}`)?.value||'annual',
      annualFeeAnnualized:fee==null?null:(($(`cardAnnualFeeFreq${side}`)?.value==='monthly')?fee*12:fee),
      minimum:val(`cardMinimum${side}`), cashback:val(`cardCashback${side}`),
      points:text(`cardPoints${side}`), miles:text(`cardMiles${side}`), other:text(`cardOther${side}`)
    };
  }
  const data=()=>({A:getSide('A'),B:getSide('B')});
  const set=(id,v)=>{if($(id))$(id).textContent=v;};
  const fmt=(key,v)=>key==='rate'?pct(v):money(v);
  const esc=v=>String(v??'').replace(/[&<>\'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function saveState(){
    const state={};
    document.querySelectorAll('input,select').forEach(el=>{
      if(!el.id)return;
      if(el.type==='checkbox')state[el.id]={type:'checkbox',value:el.checked};
      else state[el.id]={type:el.type||'text',value:el.value};
    });
    try{sessionStorage.setItem(KEY,JSON.stringify(state));}catch{}
  }
  function restoreState(){
    try{
      const state=JSON.parse(sessionStorage.getItem(KEY)||'null');
      if(!state)return false;
      Object.entries(state).forEach(([id,item])=>{
        const el=$(id); if(!el)return;
        if(item.type==='checkbox')el.checked=Boolean(item.value); else el.value=item.value??'';
      });
      document.querySelectorAll('[data-opt]').forEach(cb=>{
        const slot=$(`slot-${cb.dataset.opt}-${cb.dataset.side}`); if(slot)slot.hidden=!cb.checked;
      });
      return true;
    }catch{return false;}
  }

  function differenceExplanation(key,a,b,nA,nB){
    if(a==null||b==null)return{title:'Falta información para comparar esta condición',text:`Agrega ${labels[key].toLowerCase()} de ambas propuestas si aparece en tus documentos. No suponemos un valor que no hayas indicado.`};
    const diff=Math.abs(a-b);
    if(diff<0.005)return{title:'Esta condición es igual en ambas propuestas',text:'Al no cambiar este dato, no explica una diferencia entre las propuestas. Podemos concentrarnos en las condiciones que sí cambian.'};
    const higher=a>b?nA:nB, lower=a>b?nB:nA;
    if(key==='limit')return{title:`${higher} ofrece ${money(diff)} más de límite`,text:'Un límite mayor aumenta la capacidad de crédito disponible, pero no significa tener más dinero propio. Si se utiliza, también puede permitir asumir una obligación mayor.'};
    if(key==='rate')return{title:`${lower} tiene una tasa ${pct(diff)} menor`,text:'Si mantuvieras un saldo sujeto a intereses y las demás condiciones fueran comparables, una tasa menor normalmente reduce el costo financiero de mantener ese saldo.'};
    if(key==='annualFee')return{title:`${higher} cuesta ${money(diff)} más al año en anualidad`,text:'La anualidad es un costo por mantener la tarjeta según sus condiciones. Puede existir aunque no financies compras, por lo que conviene separarla de la tasa de interés.'};
    if(key==='minimum')return{title:`${higher} indica un pago mínimo ${money(diff)} ${a>b?'mayor':'menor'}`,text:a>b?'Un mínimo mayor exige más dinero en ese periodo. Eso no significa automáticamente que la tarjeta sea más cara: el pago mínimo depende de las condiciones y del saldo que se esté evaluando.':'Un mínimo menor puede exigir menos dinero en ese periodo, pero también puede dejar más saldo pendiente si no pagas una cantidad mayor. El mínimo no representa el costo total de la deuda.'};
    return{title:`${higher} muestra una diferencia en ${labels[key].toLowerCase()}`,text:'Revisa la condición junto con el resto de la propuesta. Una sola cifra no determina cuál alternativa se ajusta mejor a tu situación.'};
  }
  function benefitText(d,key,nA,nB){
    const a=d.A[key],b=d.B[key]; if(a==null&&b==null)return null;
    const label={cashback:'cashback',points:'puntos',miles:'millas',other:'otra condición'}[key];
    if(a!=null&&b!=null&&String(a)===String(b))return{title:`El ${label} es igual en ambas propuestas`,text:'Como no cambia, no diferencia las propuestas. Podemos concentrarnos en las condiciones que sí son distintas.'};
    if(a!=null&&b==null)return{title:`Solo ${nA} informa ${label}`,text:`La ausencia del dato en ${nB} no significa que el beneficio no exista. Solo indica que no tenemos información comparable en ambas propuestas.`};
    if(b!=null&&a==null)return{title:`Solo ${nB} informa ${label}`,text:`La ausencia del dato en ${nA} no significa que el beneficio no exista. Solo indica que no tenemos información comparable en ambas propuestas.`};
    return{title:`Las propuestas informan ${label} diferentes`,text:'El valor de una recompensa depende de cómo realmente utilizarías la tarjeta, sus topes, categorías, condiciones y la forma de canjearla. Por eso la herramienta la muestra, pero no la convierte automáticamente en una ventaja.'};
  }

  function update(){
    const d=data(), nA=d.A.name, nB=d.B.name;
    ['resultLimitNameA','resultRateNameA','resultFeeNameA','resultMinNameA'].forEach(id=>set(id,nA));
    ['resultLimitNameB','resultRateNameB','resultFeeNameB','resultMinNameB'].forEach(id=>set(id,nB));
    set('cardTitleA',nA); set('cardTitleB',nB);
    set('resultLimitA',money(d.A.limit));set('resultLimitB',money(d.B.limit));set('resultRateA',pct(d.A.rate));set('resultRateB',pct(d.B.rate));
    set('resultFeeA',d.A.annualFee==null?'—':`${money(d.A.annualFee)} ${d.A.annualFeeFrequency==='monthly'?'al mes':'al año'}`);
    set('resultFeeB',d.B.annualFee==null?'—':`${money(d.B.annualFee)} ${d.B.annualFeeFrequency==='monthly'?'al mes':'al año'}`);
    set('resultMinA',money(d.A.minimum));set('resultMinB',money(d.B.minimum));
    set('analyzeCardA',`Analizar ${nA}`);set('analyzeCardB',`Analizar ${nB}`);

    const shared=[],different=[];
    comparable.forEach(k=>{
      const av=k==='annualFee'?d.A.annualFeeAnnualized:d.A[k], bv=k==='annualFee'?d.B.annualFeeAnnualized:d.B[k];
      if(av!=null&&bv!=null&&Math.abs(av-bv)<0.005)shared.push({k,av});
      else if(av!=null||bv!=null)different.push({k,av,bv});
    });
    const sharedBox=$('cardSharedValues');
    if(sharedBox){sharedBox.innerHTML=shared.map(x=>`<article class="frl-detail-card"><span>${labels[x.k]}</span><strong>${fmt(x.k,x.av)}</strong><small>Igual en ambas propuestas; no explica una diferencia.</small></article>`).join('');$('cardSharedConditions').hidden=shared.length===0;}
    const diffBox=$('cardDifferenceCards');
    if(diffBox){
      diffBox.innerHTML=different.map(x=>{const ex=differenceExplanation(x.k,x.av,x.bv,nA,nB);return `<article class="frl-difference-card"><span>${labels[x.k]}</span><div class="frl-difference-values"><p><small>${esc(nA)}</small><strong>${x.av==null?'—':fmt(x.k,x.av)}</strong></p><p><small>${esc(nB)}</small><strong>${x.bv==null?'—':fmt(x.k,x.bv)}</strong></p></div><p class="frl-difference-amount">${esc(ex.title)}</p><small class="frl-difference-explanation">${esc(ex.text)}</small></article>`;}).join('');
    }
    const benefitDiff=['cashback','points','miles','other'].map(k=>({key:k,info:benefitText(d,k,nA,nB)})).filter(x=>x.info);
    if(diffBox&&benefitDiff.length){
      diffBox.insertAdjacentHTML('beforeend',benefitDiff.map(x=>{const a=d.A[x.key],b=d.B[x.key],title={cashback:'Cashback',points:'Puntos',miles:'Millas',other:'Otra condición'}[x.key];return `<article class="frl-difference-card benefit-difference-card"><span>${title}</span><div class="frl-difference-values"><p><small>${esc(nA)}</small><strong>${a==null?'No indicado':esc(a)}</strong></p><p><small>${esc(nB)}</small><strong>${b==null?'No indicado':esc(b)}</strong></p></div><p class="frl-difference-amount">${esc(x.info.title)}</p><small class="frl-difference-explanation">${esc(x.info.text)}</small></article>`;}).join(''));
    }
    if($('cardDifferentConditions')) $('cardDifferentConditions').hidden=different.length===0&&benefitDiff.length===0;

    const count=[...comparable,'cashback','points','miles','other'].reduce((n,k)=>n+(d.A[k]!=null?1:0)+(d.B[k]!=null?1:0),0);
    const level=count>=10?'Comparación completa':count>=6?'Comparación intermedia':'Comparación básica';
    set('cardCompareStatusTitle',level);
    set('cardCompareStatusText',level==='Comparación básica'?'Tienes una base para comenzar. La comparación gana precisión cuando agregas los datos principales que aparecen en tus documentos.':level==='Comparación intermedia'?'Ya podemos explicar varias diferencias. Los datos adicionales pueden aportar contexto sobre beneficios y otras condiciones.':'Tenemos información suficiente para una lectura amplia. Aun así, las condiciones reales del producto y tu forma de usarlo siguen importando.');
    const mainDiff=different.map(x=>differenceExplanation(x.k,x.av,x.bv,nA,nB));
    if(mainDiff.length){set('cardObservationTitle1',mainDiff[0].title);set('cardObservationText1',mainDiff[0].text);}else if(benefitDiff.length){set('cardObservationTitle1',benefitDiff[0].info.title);set('cardObservationText1',benefitDiff[0].info.text);}else{set('cardObservationTitle1','No hay una diferencia que interpretar todavía');set('cardObservationText1','Cuando dos valores cambien, la herramienta explicará qué significa la diferencia y qué no significa.');}
    if(mainDiff.length>1){set('cardObservationTitle2',mainDiff[1].title);set('cardObservationText2',mainDiff[1].text);}else if(benefitDiff.length){set('cardObservationTitle2',benefitDiff[0].info.title);set('cardObservationText2',benefitDiff[0].info.text);}else{set('cardObservationTitle2','Una condición no cuenta toda la historia');set('cardObservationText2','Una tarjeta puede destacar en una condición y ser menos útil en otra. Mira las cifras según la forma en que realmente utilizarías y pagarías la tarjeta.');}
    saveState();
  }

  function transfer(side){
    const d=getSide(side);
    const payload={limit:d.limit,annualRate:d.rate,annualFee:d.annualFee,annualFeeFrequency:d.annualFeeFrequency,minimum:d.minimum,cashback:d.cashback,points:d.points,miles:d.miles,other:d.other,proposal:side,proposalLabel:d.name};
    window.FRLScenario?.write?.({type:'credit-card',source:'card-comparator',sourceLabel:'Comparador de tarjetas',data:payload});
    sessionStorage.setItem('frl-card-comparator-transfer',JSON.stringify(payload));
    location.href='tarjetas.html';
  }

  document.querySelectorAll('[data-opt]').forEach(cb=>cb.addEventListener('change',()=>{const slot=$(`slot-${cb.dataset.opt}-${cb.dataset.side}`);if(slot)slot.hidden=!cb.checked;update();}));
  document.querySelectorAll('input,select').forEach(el=>{el.addEventListener('input',update);el.addEventListener('change',update);});
  $('analyzeCardA')?.addEventListener('click',()=>transfer('A')); $('analyzeCardB')?.addEventListener('click',()=>transfer('B'));

  const normalizePdfText = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').replace(/\s+/g, ' ').trim();
  const pdfEscape = value => normalizePdfText(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const latin1Bytes = value => { const bytes=new Uint8Array(value.length); for(let i=0;i<value.length;i++) bytes[i]=value.charCodeAt(i)&255; return bytes; };
  const wrapPdfLine = (value,max=92) => { const t=normalizePdfText(value); if(!t)return ['']; const words=t.split(' '),lines=[]; let line=''; words.forEach(w=>{const c=line?`${line} ${w}`:w;if(c.length>max&&line){lines.push(line);line=w;}else line=c;});if(line)lines.push(line);return lines; };
  const createPdf = lines => {
    const pageWidth=612,pageHeight=792,left=48,top=742,lineHeight=14,perPage=47,pages=[];
    for(let i=0;i<lines.length;i+=perPage)pages.push(lines.slice(i,i+perPage)); if(!pages.length)pages.push(['Finance & Risk Lab']);
    const objects=[],add=v=>{objects.push(v);return objects.length;},catalogId=add(''),pagesId=add(''),fontId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),pageIds=[];
    pages.forEach((page,pageIndex)=>{const commands=['BT'];page.forEach((line,lineIndex)=>{const y=top-lineIndex*lineHeight,size=pageIndex===0&&lineIndex===0?17:pageIndex===0&&lineIndex===1?11:9;commands.push(`/F1 ${size} Tf`,`1 0 0 1 ${left} ${y} Tm`,`(${pdfEscape(line)}) Tj`);});commands.push('ET');const stream=commands.join('\n');const contentId=add(`<< /Length ${latin1Bytes(stream).length} >>\nstream\n${stream}\nendstream`);pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`));});
    objects[catalogId-1]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;objects[pagesId-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    let pdf='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n',offsets=[0];objects.forEach((obj,i)=>{offsets.push(latin1Bytes(pdf).length);pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;});const xref=latin1Bytes(pdf).length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;offsets.slice(1).forEach(o=>pdf+=`${String(o).padStart(10,'0')} 00000 n \n`);pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;return new Blob([latin1Bytes(pdf)],{type:'application/pdf'});
  };
  function downloadPdf(){
    const d=data(), button=$('cardComparePdf');
    const different=comparable.map(k=>({k,a:k==='annualFee'?d.A.annualFeeAnnualized:d.A[k],b:k==='annualFee'?d.B.annualFeeAnnualized:d.B[k]})).filter(x=>x.a!=null&&x.b!=null&&Math.abs(x.a-x.b)>=0.005);
    const raw=['Finance & Risk Lab','Comparador de tarjetas de crédito','',`${d.A.name}`,`Límite: ${money(d.A.limit)}`,`Tasa anual: ${pct(d.A.rate)}`,`Anualidad: ${d.A.annualFee==null?'—':money(d.A.annualFee)+' '+(d.A.annualFeeFrequency==='monthly'?'al mes':'al año')}`,`Pago mínimo indicado: ${money(d.A.minimum)}`,'',`${d.B.name}`,`Límite: ${money(d.B.limit)}`,`Tasa anual: ${pct(d.B.rate)}`,`Anualidad: ${d.B.annualFee==null?'—':money(d.B.annualFee)+' '+(d.B.annualFeeFrequency==='monthly'?'al mes':'al año')}`,`Pago mínimo indicado: ${money(d.B.minimum)}`,'','Condiciones que cambian entre las propuestas'];
    if(different.length){different.forEach(x=>{const label=labels[x.k];const diff=Math.abs(x.a-x.b);raw.push(`${label}: ${d.A.name} = ${fmt(x.k,x.a)} | ${d.B.name} = ${fmt(x.k,x.b)}`);raw.push(`Diferencia: ${x.k==='rate'?pct(diff):money(diff)}`);});}else raw.push('No hay diferencias cuantificables con los datos principales ingresados.');
    raw.push('','Lectura educativa','La comparación organiza las condiciones que cambian y ayuda a entender su significado. No declara una propuesta como mejor ni sustituye la revisión de los documentos oficiales.');
    const lines=[];raw.forEach(line=>wrapPdfLine(line).forEach(part=>lines.push(part)));
    if(button){button.disabled=true;button.textContent='Preparando PDF…';}
    try{const blob=createPdf(lines),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='finance-risk-lab-comparador-tarjetas.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}finally{if(button){button.disabled=false;button.textContent='Exportar comparación en PDF';}}
  }

  $('cardComparePdf')?.addEventListener('click',downloadPdf);
  restoreState(); update();
})();
