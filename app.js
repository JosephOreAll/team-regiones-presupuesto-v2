(()=>{
const D=window.REDES_DASHBOARD_DATA;
if(!D){document.getElementById('app').innerHTML='<div class="panel empty">No se pudo cargar la base de datos.</div>';return;}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const app=document.getElementById('app');
const REDES=new Set(D.redesDepartments||[]);
let tab='budget';
let state={budget:{year:Math.max(...D.years),dept:'',prov:'',metric:'pim',search:''},canon:{year:Math.max(...D.years),resource:'',dept:'',prov:'',metric:'credited',search:''}};

const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>{n=Number(n)||0;const a=Math.abs(n);if(a>=1e9)return 'S/ '+(n/1e9).toLocaleString('es-PE',{maximumFractionDigits:2})+' mil mill.';if(a>=1e6)return 'S/ '+(n/1e6).toLocaleString('es-PE',{maximumFractionDigits:1})+' mill.';if(a>=1e3)return 'S/ '+(n/1e3).toLocaleString('es-PE',{maximumFractionDigits:1})+' mil';return 'S/ '+n.toLocaleString('es-PE',{maximumFractionDigits:0});};
const moneyExact=n=>'S/ '+(Number(n)||0).toLocaleString('es-PE',{maximumFractionDigits:2});
const pct=n=>(Number(n)||0).toLocaleString('es-PE',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
const nameDept=dc=>D.departments[dc]||dc;
const nameProv=pc=>D.provinces[pc]||pc;
const pretty=s=>String(s||'').toLowerCase().replace(/(^|\s)([a-záéíóúñ])/g,(m,a,b)=>a+b.toUpperCase());
const redesBadge=dc=>REDES.has(dc)?'<span class="redes-pill">REDES</span>':'';
function sum(rows,idx){return rows.reduce((a,r)=>a+(Number(r[idx])||0),0)}
function ratio(a,b){return b?100*a/b:0}
function csvDownload(headers,rows,filename){
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const text='\ufeff'+[headers,...rows].map(r=>r.map(q).join(';')).join('\r\n');
 const blob=new Blob([text],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function optionsYears(selected){return D.years.slice().reverse().map(y=>`<option value="${y}" ${y===+selected?'selected':''}>${y}</option>`).join('')}
function optionsDepts(selected,all='Todos los departamentos'){return `<option value="">${all}</option>`+Object.entries(D.departments).filter(([c])=>/^\d{2}$/.test(c)).sort((a,b)=>a[1].localeCompare(b[1],'es')).map(([c,n])=>`<option value="${c}" ${c===selected?'selected':''}>${escapeHtml(pretty(n))}${REDES.has(c)?' · REDES':''}</option>`).join('')}
function optionsProvs(dept,selected){if(!dept)return '<option value="">Selecciona un departamento</option>';const arr=Object.entries(D.provinces).filter(([c])=>c.startsWith(dept)).sort((a,b)=>a[1].localeCompare(b[1],'es'));return '<option value="">Todas las provincias</option>'+arr.map(([c,n])=>`<option value="${c}" ${c===selected?'selected':''}>${escapeHtml(pretty(n))}</option>`).join('')}
function isProvincialName(n){const u=String(n||'').toUpperCase();return u.startsWith('MUNICIPALIDAD PROVINCIAL')||u.startsWith('MUNICIPALIDAD METROPOLITANA')}
function districtRaw(year,prov){return D.budget.district.filter(r=>r[0]===+year&&r[1].startsWith(prov))}
function districtOnly(year,prov){return districtRaw(year,prov).filter(r=>!isProvincialName(r[3]))}
function provinceMunicipality(year,prov){return districtRaw(year,prov).find(r=>isProvincialName(r[3]))||null}
function optionsBudgetProvs(dept,selected,year){if(!dept)return '<option value="">Selecciona un departamento</option>';const arr=D.budget.province.filter(r=>r[0]===+year&&r[1].startsWith(dept)).map(r=>r[1]).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>nameProv(a).localeCompare(nameProv(b),'es'));return '<option value="">Todas las provincias</option>'+arr.map(c=>`<option value="${c}" ${c===selected?'selected':''}>${escapeHtml(pretty(nameProv(c)))}</option>`).join('')}
function resourceOptions(selected){const arr=Object.entries(D.canon.resources).sort((a,b)=>a[1].localeCompare(b[1],'es'));return '<option value="">Todos los tipos de recurso</option>'+arr.map(([c,n])=>`<option value="${c}" ${c===selected?'selected':''}>${escapeHtml(pretty(n))}</option>`).join('')}
function kpis(items){return `<div class="kpi-grid">${items.map((x,i)=>`<div class="kpi ${i===0?'highlight':''}"><span>${escapeHtml(x[0])}</span><strong title="${escapeHtml(x[1])}">${x[1]}</strong><small>${escapeHtml(x[2]||'')}</small></div>`).join('')}</div>`}
function barChart(rows,metricIndex,formatter=money,limit=15){
 const data=rows.slice().sort((a,b)=>(Number(b[metricIndex])||0)-(Number(a[metricIndex])||0)).slice(0,limit);if(!data.length)return '<div class="chart-empty">No hay datos para este filtro.</div>';
 const mx=Math.max(...data.map(r=>Number(r[metricIndex])||0),1);
 return `<div class="bar-list">${data.map(r=>`<div class="bar-row" title="${escapeHtml(r[0])}: ${escapeHtml(formatter(r[metricIndex]))}"><div class="bar-label">${escapeHtml(r[0])}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(1,(Number(r[metricIndex])||0)/mx*100)}%"></div></div><div class="bar-value">${formatter(r[metricIndex])}</div></div>`).join('')}</div>`;
}
function lineChart(points,formatter=money){
 if(!points.length)return '<div class="chart-empty">No hay serie histórica disponible.</div>';
 const W=760,H=280,L=58,R=24,T=24,B=42;const vals=points.map(p=>Number(p[1])||0);let mn=Math.min(...vals),mx=Math.max(...vals);if(mx===mn){mx=mn+1}mn=Math.min(0,mn);const x=i=>L+i*(W-L-R)/Math.max(1,points.length-1);const y=v=>T+(mx-v)*(H-T-B)/(mx-mn||1);
 let d=points.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(p[1]).toFixed(1)).join(' ');let area=d+` L ${x(points.length-1)},${H-B} L ${x(0)},${H-B} Z`;
 let grid='';for(let i=0;i<4;i++){let yy=T+i*(H-T-B)/3;grid+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" class="line-grid"/>`;}
 let dots=points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p[1])}" r="4" class="line-dot"><title>${p[0]} · ${formatter(p[1])}</title></circle><text x="${x(i)}" y="${H-17}" text-anchor="middle" class="line-label">${p[0]}</text>`).join('');
 return `<div class="line-chart"><svg class="line-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Serie 2016 a 2026">${grid}<path d="${area}" class="line-area"/><path d="${d}" class="line-path"/>${dots}</svg></div>`
}

function budgetRows(){
 const s=state.budget,y=+s.year;
 if(!s.dept){return {scope:'gore',title:'Gobiernos regionales',rows:D.budget.gore.filter(r=>r[0]===y).map(r=>[pretty(nameDept(r[1])),r[2],r[3],r[4],r[5],r[1]])};}
 if(!s.prov){return {scope:'province',title:'Municipalidades provinciales',rows:D.budget.province.filter(r=>r[0]===y&&r[1].startsWith(s.dept)).map(r=>[pretty(nameProv(r[1])),r[2],r[3],r[4],r[5],r[1]])};}
 let raw=districtOnly(y,s.prov);
 if(!raw.length){const p=provinceMunicipality(y,s.prov);raw=p?[p]:[];}
 return {scope:'district',title:raw.length&&raw.every(r=>isProvincialName(r[3]))?'Municipalidad provincial':'Municipalidades distritales',rows:raw.map(r=>[pretty(r[3]),r[4],r[5],r[6],r[7],r[2]])};
}
function budgetTrend(scope){
 const s=state.budget;return D.years.map(y=>{
  let rows,idx;if(scope==='gore'){rows=D.budget.gore.filter(r=>r[0]===y);idx=s.metric==='pim'?3:4;}
  else if(scope==='province'){rows=D.budget.province.filter(r=>r[0]===y&&r[1].startsWith(s.dept));idx=s.metric==='pim'?3:4;}
  else{rows=districtOnly(y,s.prov);if(!rows.length){const p=provinceMunicipality(y,s.prov);rows=p?[p]:[];}idx=s.metric==='pim'?5:6;}
  return [y,sum(rows,idx)];
 });
}
function renderBudget(){
 const s=state.budget,info=budgetRows();const metricIdx=s.metric==='pim'?2:3;let rows=info.rows.slice();const q=s.search.trim().toLowerCase();if(q)rows=rows.filter(r=>r[0].toLowerCase().includes(q));rows.sort((a,b)=>(b[metricIdx]||0)-(a[metricIdx]||0));
 const pia=sum(info.rows,1),pim=sum(info.rows,2),dev=sum(info.rows,3),advance=ratio(dev,pim);let crumb='Perú';if(s.dept)crumb+=' › '+pretty(nameDept(s.dept));if(s.prov)crumb+=' › '+pretty(nameProv(s.prov));
 const scopeLabel=info.scope==='gore'?'Comparación nacional':info.scope==='province'?'Nivel provincial':'Nivel distrital';
 return `<section class="panel"><div class="panel-head"><div><span class="section-no">PRESUPUESTO</span><h3>Explorador de PIM</h3><p>Consulta el PIM por gobierno regional, provincia y distrito para el periodo 2016–2026.</p></div><span class="scope-chip">${scopeLabel}</span></div>
 <div class="filters"><div class="field"><label>Año</label><select id="bYear">${optionsYears(s.year)}</select></div><div class="field"><label>Departamento</label><select id="bDept">${optionsDepts(s.dept)}</select></div><div class="field"><label>Provincia</label><select id="bProv" ${!s.dept?'disabled':''}>${optionsBudgetProvs(s.dept,s.prov,s.year)}</select></div><div class="field action-field"><label>&nbsp;</label><button class="reset-btn" id="bReset">Restablecer filtros</button></div></div></section>
 <div class="breadcrumb"><b>Vista:</b> ${escapeHtml(crumb)} · ${escapeHtml(info.title)}</div>
 ${kpis([['PIM total',money(pim),info.title],['PIA total',money(pia),'Presupuesto inicial'],['Devengado',money(dev),'Gasto devengado'],['Avance',pct(advance),'Devengado / PIM'],['Entidades',String(info.rows.length),'Registros en la vista']])}
 <div class="grid-2"><section class="panel"><div class="panel-head"><div><span class="section-no">RANKING</span><h3>${escapeHtml(info.title)} · ${s.year}</h3><p>Ordenado por ${s.metric==='pim'?'PIM':'devengado'}.</p></div><div class="metric-toolbar"><button class="metric-btn ${s.metric==='pim'?'active':''}" data-bmetric="pim">PIM</button><button class="metric-btn ${s.metric==='dev'?'active':''}" data-bmetric="dev">Devengado</button></div></div><div class="chart-box">${barChart(info.rows,metricIdx,money,15)}</div></section>
 <section class="panel"><div class="panel-head"><div><span class="section-no">EVOLUCIÓN</span><h3>Trayectoria 2016–2026</h3><p>Total de la vista territorial seleccionada.</p></div></div>${lineChart(budgetTrend(info.scope),money)}</section></div>
 <section class="panel"><div class="panel-head"><div><span class="section-no">DETALLE</span><h3>Tabla presupuestal</h3><p>Consulta PIA, PIM, devengado y avance por entidad.</p></div></div><div class="table-tools"><div class="field"><label>Buscar entidad</label><input id="bSearch" value="${escapeHtml(s.search)}" placeholder="Escribe un nombre…"></div><div class="table-actions"><span class="count">${rows.length} resultados</span><button class="download-btn" id="bCsv">Descargar CSV</button></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Entidad</th><th class="num">PIA</th><th class="num">PIM</th><th class="num">Devengado</th><th class="num">Avance</th></tr></thead><tbody>${rows.length?rows.map((r,i)=>`<tr><td class="rank">${i+1}</td><td class="entity-name">${escapeHtml(r[0])}${info.scope==='gore'?redesBadge(r[5]):''}</td><td class="num">${moneyExact(r[1])}</td><td class="num">${moneyExact(r[2])}</td><td class="num">${moneyExact(r[3])}</td><td class="num">${pct(r[4]||ratio(r[3],r[2]))}</td></tr>`).join(''):`<tr><td colspan="6" class="empty">No hay resultados.</td></tr>`}</tbody></table></div><div class="source-note">Fuente: Ministerio de Economía y Finanzas (MEF). PIM 2016–2026.</div></section>`;
}
function canonLocalFilteredRaw(year,resource,dept,prov){return D.canon.rows.filter(r=>r[0]===+year&&(!resource||r[1]===resource)&&(!dept||(D.canon.entities[r[2]]||[])[0]===dept)&&(!prov||(D.canon.entities[r[2]]||[])[1]===prov));}
function canonRegionalFilteredRaw(year,resource){return (D.canon.regionalRows||[]).filter(r=>r[0]===+year&&(!resource||r[1]===resource));}
function canonView(){
 const s=state.canon,m=new Map();
 if(!s.dept){
  const raw=canonRegionalFilteredRaw(s.year,s.resource);
  for(const r of raw){const key=r[2],name=pretty(r[4]),dc=r[3];if(!m.has(key))m.set(key,[name,0,0,1,dc,key]);const a=m.get(key);a[1]+=Number(r[5])||0;a[2]+=Number(r[6])||0;}
  return {kind:'regional',raw,rows:[...m.values()]};
 }
 const raw=canonLocalFilteredRaw(s.year,s.resource,s.dept,s.prov);
 const wanted=raw.filter(r=>{const meta=D.canon.entities[r[2]]||['','',''];const provName=isProvincialName(meta[2]);return s.prov?!provName:provName;});
 let filtered=wanted;
 if(s.prov&&!filtered.length){filtered=raw.filter(r=>isProvincialName((D.canon.entities[r[2]]||[])[2]));}
 for(const r of filtered){const meta=D.canon.entities[r[2]]||['','','Municipalidad '+r[2]];const key=r[2],name=pretty(meta[2]),dc=meta[0];if(!m.has(key))m.set(key,[name,0,0,1,dc,key]);const a=m.get(key);a[1]+=Number(r[3])||0;a[2]+=Number(r[4])||0;}
 return {kind:s.prov?'district':'province',raw:filtered,rows:[...m.values()]};
}
function canonTrend(){const s=state.canon;return D.years.map(y=>{if(!s.dept){const raw=canonRegionalFilteredRaw(y,s.resource),idx=s.metric==='credited'?6:5;return [y,sum(raw,idx)];}const raw=canonLocalFilteredRaw(y,s.resource,s.dept,s.prov).filter(r=>{const isProv=isProvincialName((D.canon.entities[r[2]]||[])[2]);return s.prov?!isProv:isProv;});const idx=s.metric==='credited'?4:3;return [y,sum(raw,idx)]})}
function renderCanon(){
 const s=state.canon,v=canonView();let rows=v.rows.slice(),q=s.search.trim().toLowerCase();if(q)rows=rows.filter(r=>r[0].toLowerCase().includes(q));const mi=s.metric==='credited'?2:1;rows.sort((a,b)=>(b[mi]||0)-(a[mi]||0));
 const regional=v.kind==='regional';const auth=sum(v.raw,regional?5:3),cred=sum(v.raw,regional?6:4),rate=ratio(cred,auth);const recipients=v.rows.length;
 let crumb='Perú';if(s.dept)crumb+=' › '+pretty(nameDept(s.dept));if(s.prov)crumb+=' › '+pretty(nameProv(s.prov));const title=regional?'Gobiernos regionales':v.kind==='province'?'Municipalidades provinciales':'Municipalidades distritales';
 return `<section class="panel"><div class="panel-head"><div><span class="section-no">CANON Y TRANSFERENCIAS</span><h3>Explorador de transferencias</h3><p>Consulta transferencias por tipo de recurso, gobierno regional, provincia y distrito.</p></div><span class="scope-chip">${regional?'Gobiernos regionales':'Gobiernos locales'}</span></div><div class="notice dark"><b>Fuente:</b> Portal de Transferencias del Ministerio de Economía y Finanzas (MEF). Montos autorizados y acreditados.</div>
 <div class="filters"><div class="field"><label>Año</label><select id="cYear">${optionsYears(s.year)}</select></div><div class="field"><label>Tipo de recurso</label><select id="cResource">${resourceOptions(s.resource)}</select></div><div class="field"><label>Departamento</label><select id="cDept">${optionsDepts(s.dept)}</select></div><div class="field"><label>Provincia</label><select id="cProv" ${!s.dept?'disabled':''}>${optionsProvs(s.dept,s.prov)}</select></div></div><div style="margin-top:12px"><button class="reset-btn" id="cReset">Restablecer filtros</button></div></section>
 <div class="breadcrumb"><b>Vista:</b> ${escapeHtml(crumb)} · ${escapeHtml(title)}${s.resource?' · '+escapeHtml(pretty(D.canon.resources[s.resource])):''}</div>
 ${kpis([['Monto acreditado',money(cred),'Transferencias acreditadas'],['Monto autorizado',money(auth),'Transferencias autorizadas'],['Acreditado / autorizado',pct(rate),'Relación entre ambos montos'],[regional?'Entidades':'Municipalidades',String(recipients),'Receptoras con registros'],['Tipo de recurso',s.resource?pretty(D.canon.resources[s.resource]):'Todos','Filtro seleccionado']])}
 <div class="grid-2"><section class="panel"><div class="panel-head"><div><span class="section-no">RANKING</span><h3>${escapeHtml(title)} · ${s.year}</h3><p>Comparación por ${s.metric==='credited'?'monto acreditado':'monto autorizado'}.</p></div><div class="metric-toolbar"><button class="metric-btn ${s.metric==='credited'?'active':''}" data-cmetric="credited">Acreditado</button><button class="metric-btn ${s.metric==='authorized'?'active':''}" data-cmetric="authorized">Autorizado</button></div></div><div class="chart-box">${barChart(v.rows,mi,money,15)}</div></section>
 <section class="panel"><div class="panel-head"><div><span class="section-no">EVOLUCIÓN</span><h3>Trayectoria 2016–2026</h3><p>Total transferido según los filtros activos.</p></div></div>${lineChart(canonTrend(),money)}</section></div>
 <section class="panel"><div class="panel-head"><div><span class="section-no">DETALLE</span><h3>Tabla de transferencias</h3><p>${escapeHtml(title)} ordenados por el indicador seleccionado.</p></div></div><div class="table-tools"><div class="field"><label>Buscar</label><input id="cSearch" value="${escapeHtml(s.search)}" placeholder="Escribe un nombre…"></div><div class="table-actions"><span class="count">${rows.length} resultados</span><button class="download-btn" id="cCsv">Descargar CSV</button></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Entidad</th><th class="num">Autorizado</th><th class="num">Acreditado</th><th class="num">% acreditado</th></tr></thead><tbody>${rows.length?rows.map((r,i)=>`<tr><td class="rank">${i+1}</td><td class="entity-name">${escapeHtml(r[0])}${regional?redesBadge(r[4]):''}</td><td class="num">${moneyExact(r[1])}</td><td class="num">${moneyExact(r[2])}</td><td class="num">${pct(ratio(r[2],r[1]))}</td></tr>`).join(''):`<tr><td colspan="5" class="empty">No hay transferencias para los filtros seleccionados.</td></tr>`}</tbody></table></div><div class="source-note">Fuente: Portal de Transferencias del Ministerio de Economía y Finanzas (MEF). Información actualizada al ${escapeHtml(D.canon.sourceDate)}.</div></section>`;
}

function bind(){
 $$('.main-tab').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.onclick=()=>{tab=b.dataset.tab;render()}});
 if(tab==='budget'){
  $('#bYear').onchange=e=>{state.budget.year=+e.target.value;render()};$('#bDept').onchange=e=>{state.budget.dept=e.target.value;state.budget.prov='';render()};$('#bProv').onchange=e=>{state.budget.prov=e.target.value;render()};$('#bReset').onclick=()=>{state.budget={year:Math.max(...D.years),dept:'',prov:'',metric:'pim',search:''};render()};
  $$('[data-bmetric]').forEach(b=>b.onclick=()=>{state.budget.metric=b.dataset.bmetric;render()});$('#bSearch').oninput=e=>{state.budget.search=e.target.value;const pos=e.target.selectionStart;render();setTimeout(()=>{const x=$('#bSearch');if(x){x.focus();x.setSelectionRange(pos,pos)}},0)};
  $('#bCsv').onclick=()=>{const info=budgetRows(),q=state.budget.search.trim().toLowerCase();let rows=info.rows.filter(r=>!q||r[0].toLowerCase().includes(q)).sort((a,b)=>b[2]-a[2]);csvDownload(['Entidad','PIA','PIM','Devengado','Avance (%)'],rows.map(r=>[r[0],r[1],r[2],r[3],r[4]]),`REDES_PIM_${state.budget.year}_${state.budget.dept||'PERU'}_${state.budget.prov||info.scope}.csv`)};
 } else {
  $('#cYear').onchange=e=>{state.canon.year=+e.target.value;render()};$('#cResource').onchange=e=>{state.canon.resource=e.target.value;render()};$('#cDept').onchange=e=>{state.canon.dept=e.target.value;state.canon.prov='';render()};$('#cProv').onchange=e=>{state.canon.prov=e.target.value;render()};$('#cReset').onclick=()=>{state.canon={year:Math.max(...D.years),resource:'',dept:'',prov:'',metric:'credited',search:''};render()};$$('[data-cmetric]').forEach(b=>b.onclick=()=>{state.canon.metric=b.dataset.cmetric;render()});
  $('#cSearch').oninput=e=>{state.canon.search=e.target.value;const pos=e.target.selectionStart;render();setTimeout(()=>{const x=$('#cSearch');if(x){x.focus();x.setSelectionRange(pos,pos)}},0)};
  $('#cCsv').onclick=()=>{const v=canonView(),q=state.canon.search.trim().toLowerCase();let rows=v.rows.filter(r=>!q||r[0].toLowerCase().includes(q));csvDownload(['Entidad','Monto autorizado','Monto acreditado','Porcentaje acreditado'],rows.map(r=>[r[0],r[1].toFixed(2),r[2].toFixed(2),ratio(r[2],r[1]).toFixed(2)]),`REDES_Canon_${state.canon.year}_${state.canon.resource||'TODOS'}_${state.canon.dept||'PERU'}_${state.canon.prov||v.kind}.csv`)};
 }
}
function render(){app.innerHTML=tab==='budget'?renderBudget():renderCanon();bind()}
document.getElementById('homeBtn').onclick=()=>{state={budget:{year:Math.max(...D.years),dept:'',prov:'',metric:'pim',search:''},canon:{year:Math.max(...D.years),resource:'',dept:'',prov:'',metric:'credited',search:''}};tab='budget';render()};
render();
})();