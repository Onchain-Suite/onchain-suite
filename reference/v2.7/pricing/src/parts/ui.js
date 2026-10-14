
/* ============================================================
   4 - Rendering
   ============================================================ */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = t => String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const sgn  = v => v < 0 ? 'neg' : (v > 0 ? 'pos' : '');

function render(){
  const D = derive(S);
  window.__D = D;

  for(const b of $$('#ccySegs button')) b.classList.toggle('on', b.dataset.ccy === (S.ccy||'usd'));
  for(const el of $$('[data-d]')){
    const k = el.dataset.d;
    let v = (k in D) ? D[k] : getPath(D,k);
    if(v === undefined) v = getPath(S,k);
    el.textContent = fmt(v, el.dataset.f);
  }
  for(const el of $$('input.ed[data-k]')){
    const v = getPath(S, el.dataset.k);
    if(document.activeElement !== el) el.value = fmtInput(v, el.dataset.f);
    el.classList.toggle('mod', v !== getPath(DEFAULTS, el.dataset.k));
  }
  const vs = $('#vSel'); if(vs) vs.value = S.vPlan;
  const cm2 = $('#capMode'); if(cm2) cm2.value = S.infraCapacity.mode;

  buildActuals(D); buildAcv(D); buildSend(D); buildTiers(D); buildMarket(D); buildSes(D); buildFloors(D); buildFive(D); buildYearEnd(D); buildScenarios(D); buildInfra(D); buildBench(D); buildSens(D); buildServe(D); buildScale(D); buildStep(D); buildAllIn(D);
  buildEco(D); buildOver(D); buildEnrich(D); buildV(D); buildChart(D);
  buildSheet(D); buildPL(D); buildLtv(D); buildCohort(D); buildPayback(D);
  buildBE(D); buildWorst(D); buildGr(D); buildBizSens(D); buildAssum(D); buildRules(D); buildNarrative(D);

  const w = $('#mixWarn');
  if(Math.abs(D.mixSum - 1) > 0.005){
    w.hidden = false;
    w.textContent = 'The tier mix adds up to ' + fmt(D.mixSum,'p0') + ', not 100%. Every blended figure is still computed from the shares exactly as entered, so the projection will be wrong until this is fixed.';
  } else w.hidden = true;

  const changed = countChanges();
  $('#topbar').classList.toggle('dirty', changed > 0);
  $('#stateTxt').textContent = changed === 0
    ? (S.scenario === 'base' ? 'Baseline' : S.scenario + ' scenario')
    : changed + (changed === 1 ? ' edit' : ' edits') + ' from baseline';
  $('#btnReset').disabled = changed === 0;
  for(const b of $$('#scenSegs button')) b.classList.toggle('on', b.dataset.scen === S.scenario);

  persist();
}

function countChanges(){
  let n = 0;
  (function walk(a,b){
    for(const k of Object.keys(b)){
      if(k === 'name' || k === 'vPlan' || k === 'scenario') continue;
      if(b[k] && typeof b[k] === 'object') walk(a[k] || {}, b[k]);
      else if(a[k] !== b[k]) n++;
    }
  })(S, DEFAULTS);
  return n;
}

/* ---------- page 03 ---------- */
function buildInfra(D){
  const sp = S.infraSpec;
  const lines = [
    ['DigitalOcean droplet &middot; 8 GiB / 4 vCPU / 160 GiB SSD', fmt(sp.droplets,'n0')+' running app, worker, Postgres and Redis', fmt(sp.dropletRate,'m0')+' each', D.infra.droplets, 'q'],
    ['DigitalOcean &middot; backups',              fmt(sp.backupPct,'p0')+' of droplet spend', 'weekly',       D.infra.backups, 'q'],
    ['Domains &amp; misc',                         'flat', '&mdash;',                                          D.infra.domains, 'q'],
    ['Not yet attributed',                         '&mdash;', '&mdash;',                                       D.infra.unallocated, 'x']
  ];
  let html = '';
  for(const [label, qty, rate, val, kind] of lines){
    const share = D.infraTotal > 0 ? val/D.infraTotal : 0;
    const open = kind === 'x';
    html += '<tr' + (open ? ' class="tot"' : '') + '><td class="k">' + label + '</td>'
      + '<td class="n dim">' + qty + '</td><td class="n dim">' + rate + '</td>'
      + '<td class="n">' + fmt(val,'m2') + '</td><td class="n">' + fmt(share,'p0') + '</td>'
      + '<td>' + (open ? '<span class="chip a">Unexplained</span>' : '<span class="chip e">Check quantity</span>') + '</td></tr>';
  }
  html += '<tr class="tot"><td class="k">Total hosting</td><td class="n dim">&mdash;</td><td class="n dim">&mdash;</td>'
       + '<td class="n">' + fmt(D.infraTotal,'m2') + '</td><td class="n">100%</td>'
       + '<td><span class="chip m">' + fmt(D.dq.infraItemised,'p0') + ' explained</span></td></tr>';
  $('#tbInfra').innerHTML = html;
}

function buildActuals(D){
  $('#tbActuals').innerHTML = D.act.rows.map(function(r){
    return '<tr><td class="k">' + r.m + '</td><td class="n">' + fmt(r.customers,'n0') + '</td>'
      + '<td class="n">' + fmt(r.revenue,'m2') + '</td><td class="n">' + fmt(r.cost,'m2') + '</td>'
      + '<td class="n ' + sgn(r.net) + '">' + fmt(r.net,'m2') + '</td>'
      + '<td class="n">' + fmt(r.cum,'m2') + '</td></tr>'
      + '<tr><td class="wrap dim" colspan="6" style="font-size:12px">' + r.note + '</td></tr>';
  }).join('')
  + '<tr class="tot"><td class="k">To date</td><td class="n">' + fmt(D.act.last.customers,'n0') + '</td>'
  + '<td class="n">' + fmt(D.act.revenue,'m2') + '</td><td class="n">' + fmt(D.act.cost,'m2') + '</td>'
  + '<td class="n ' + sgn(D.act.net) + '">' + fmt(D.act.net,'m2') + '</td>'
  + '<td class="n">' + fmt(D.act.net,'m2') + '</td></tr>';

  var box = $('#actBox');
  if(box) box.className = 'status ' + (D.act.onNewStack >= 0 ? 'ok' : 'warn');
  $('#actTxt').textContent =
    'Infrastructure grew 2.7x between the two months while revenue grew 1.2x. That is what the '
    + 'move to DigitalOcean stops. The same ' + fmt(D.act.last.customers,'n0') + ' customers and the same '
    + fmt(D.act.last.revenue,'m0') + ' on the new hosting cost ' + fmt(D.infraTotal + D.act.last.customers*D.serve.launch.total,'m2')
    + ' instead of ' + fmt(D.act.last.cost,'m2') + ', turning ' + fmt(D.act.last.revenue-D.act.last.cost,'m2')
    + ' a month into ' + fmt(D.act.onNewStack,'m2') + '. Current ARPU is ' + fmt(D.act.arpuNow,'m0')
    + ' against the opening book; the projection below assumes the target mix at '
    + fmt(D.arpu,'m0') + ', so early months are optimistic.';
}

function buildAcv(D){
  const mix = {launch:S.mixL, growth:S.mixG, pro:S.mixP};
  $('#tbAcv').innerHTML = PLAN_IDS.map(id =>
    '<tr><td class="k">' + D.eco[id].name + '</td>'
    + '<td class="n">' + fmt(S.plans[id].price,'m0') + '</td>'
    + '<td class="n">' + fmt(S.plans[id].price*12,'m0') + '</td>'
    + '<td class="n dim">' + fmt(mix[id],'p0') + '</td></tr>').join('')
  + '<tr class="tot"><td class="k">Blended</td><td class="n">' + fmt(D.arpu,'m0') + '</td>'
  + '<td class="n">' + fmt(D.arpu*12,'m0') + '</td><td class="n dim">100%</td></tr>';
}

/* ---------- page 02, market research ---------- */
function buildMarket(D){
  if(!$('#tbH2H')) return;
  const money = v => v === null ? '<span class="dim">&mdash;</span>' : fmt(v,'m0');
  const delta = d => d === null ? '<td class="n dim">&mdash;</td>'
    : '<td class="n ' + (d <= 0 ? 'pos' : 'neg') + '">' + fmt(d,'pd0') + '</td>';

  /* --- head to head --- */
  $('#tbH2H').innerHTML = D.h2h.map(h =>
      '<tr><td class="k">' + h.name + '</td>'
    + '<td class="wrap dim">' + h.who + '</td>'
    + '<td class="n">' + money(h.theirs) + '</td>'
    + delta(h.vsSuite) + delta(h.vsSend)
    + '<td class="n">' + fmt(h.score,'n1') + '</td>'
    + '<td class="wrap dim">' + (h.theyWin.length ? h.theyWin.join(', ') : '<span class="pos">nothing</span>') + '</td></tr>').join('');

  /* --- capability matrix, us pinned to the top --- */
  const labels = S.capLabels || [];
  $('#thCaps').innerHTML = '<tr><th>Company</th><th class="n">Score</th>'
    + labels.map(l => '<th class="n">' + l[1] + '</th>').join('') + '</tr>';
  const mark = v => v >= 1 ? '&#9679;' : v > 0 ? '<span class="dim">&#9680;</span>' : '<span class="dim">&ndash;</span>';
  const row = (name, caps, score, us) =>
      '<tr' + (us ? ' class="us"' : '') + '><td class="k">' + name + '</td>'
    + '<td class="n">' + fmt(score,'n1') + '</td>'
    + labels.map(l => '<td class="n">' + mark((caps && caps[l[0]]) || 0) + '</td>').join('') + '</tr>';
  $('#tbCaps').innerHTML =
      row('OnchainSuite Suite', S.suiteCaps, D.suiteScore, 1)
    + D.marketProducts.slice()
        .sort((a,b) => b.threat - a.threat || a.n.localeCompare(b.n))
        .map(c => {
          const sc = D.h2h.find(h => h.name === c.n);
          return row(c.n, c.caps, sc ? sc.score : 0, 0);
        }).join('');

  const g = $('#gapTxt');
  if(g) g.innerHTML = D.h2hGaps.length
    ? 'Counted across the field rather than asserted: '
      + D.h2hGaps.map(x => '<b>' + fmt(x.n,'n0') + '</b> ship ' + x.label).join(', ')
      + '. SMS is the only one we do not sell at all &mdash; ecommerce we ship shallowly rather than not at all. '
      + 'It is also the most common thing a buyer will ask for that we cannot answer.'
    : 'No product in the field ships anything we do not.';

  /* --- price by size, both lines --- */
  $('#tbMktSize').innerHTML = D.suiteBySize.map((r,i) => {
    const send = D.marketBySize[i];
    return '<tr class="us"><td class="k">' + fmt(r.n,'n0') + '</td>'
      + '<td class="n">' + fmt(r.ours,'m0') + '</td>'
      + '<td class="n">' + fmt(send.ours,'m0') + '</td>'
      + '<td class="n dim">' + money(r.median) + '</td>'
      + (r.vsMedian === null ? '<td class="n dim">&mdash;</td>'
         : '<td class="n ' + (r.vsMedian <= 0 ? 'pos' : 'neg') + '">' + fmt(r.vsMedian,'pd0') + '</td>')
      + '<td class="wrap dim">' + (r.cheapest ? r.cheapest.name + ' ' + fmt(r.cheapest.price,'m0') : '&mdash;') + '</td>'
      + '<td class="n dim">' + fmt(r.dearerThanUs,'n0') + ' of ' + fmt(r.priced,'n0') + '</td></tr>';
  }).join('');

  /* --- segments --- */
  const chip = t => t === 3 ? '<span class="chip a">direct</span>'
                  : t === 2 ? '<span class="chip e">adjacent</span>'
                            : '<span class="chip m">distant</span>';
  $('#tbMktSeg').innerHTML = D.marketSegments.map(seg =>
      '<tr><td class="k">' + seg.seg + '</td>'
    + '<td class="wrap dim">' + seg.who + '</td>'
    + '<td class="n">' + fmt(seg.n,'n0') + '</td>'
    + '<td class="n">' + money(seg.cheapest) + '</td>'
    + '<td class="wrap dim">' + (seg.cheapestName || '&mdash;') + '</td>'
    + '<td class="n">' + chip(seg.threat) + '</td></tr>').join('');
}

function buildFloors(D){
  const host = $('#tbFloors');
  if(!host) return;
  /* The rule is the source's: price must exceed the cost of a full allowance.
     Margin is shown because it is useful, not because it is a threshold. */
  const row = (name, price, cost, profit, gm) =>
      '<tr'+(profit>0?'':' class="us"')+'><td class="k">'+name+'</td>'
    + '<td class="n">'+price+'</td><td class="n dim">'+fmt(cost,'m2')+'</td>'
    + '<td class="n '+(profit>0?'pos':'neg')+'">'+fmt(profit,'m2')+'</td>'
    + '<td class="n dim">'+fmt(gm,'p1')+'</td>'
    + '<td class="n">'+(profit>0?'<span class="chip m">holds</span>':'<span class="chip a">fails</span>')+'</td></tr>';
  let out = '';
  for(const id of ['launch','growth','pro'])
    out += row(D.eco[id].name, fmt(S.plans[id].price,'m0'), D.eco[id].ceiling, D.eco[id].floor, D.eco[id].floorGM);
  out += row('Send, average customer',
    fmt(S.send.fixed,'m0')+' + '+fmt(S.send.rate,'m2')+'/1k',
    D.sendEco.metered + D.sendEco.stripe, D.sendEco.floor, D.sendEco.floorGM);
  host.innerHTML = out;
}

function buildSes(D){
  const host = $('#tbSes');
  if(!host) return;
  host.innerHTML = D.sesPlanRows.map(r =>
      '<tr'+(r.current?' class="us"':'')+'><td class="k">'+r.plan+(r.current?' <span class="chip a">ours</span>':'')+'</td>'
    + '<td class="n">'+fmt(r.rate,'m2')+'</td>'
    + '<td class="n dim">'+(r.fee?fmt(r.fee,'m0'):'&mdash;')+'</td>'
    + '<td class="n '+(r.deltaPer1k<0?'pos':r.deltaPer1k>0?'neg':'dim')+'">'
      + (r.current?'&mdash;':(r.deltaPer1k>0?'+':'')+fmt(r.deltaPer1k,'m2'))+'</td>'
    + '<td class="wrap dim">'+r.note+'</td></tr>').join('');
}

function buildTiers(D){
  const host = $('#tbTiers');
  if(!host) return;
  host.innerHTML = D.infraTierRows.map((t,i) =>
      '<tr'+(i===0?' class="us"':'')+'><td class="k">'+(i===0?'Today':'Tier '+(i+1))+'</td>'
    + '<td class="n">up to ' + fmt(t.maxUsers,'n0') + ' customers</td>'
    + '<td class="n dim">' + fmt(t.rate,'m0') + '</td>'
    + '<td class="n">' + fmt(t.total,'m2') + '</td>'
    + '<td class="n">' + fmt(t.perUser,'m2') + '</td></tr>').join('');
}

function buildSend(D){
  const host = $('#tbSend');
  if(!host) return;
  /* Output only. The rate and ratio inputs live in the markup above this
     table; rebuilding an input here would steal focus mid-keystroke. */
  host.innerHTML = D.sendRows.map(r => {
    const cheaper = r.delta !== null && r.delta <= 0;
    return '<tr' + (cheaper ? ' class="us"' : '') + '>'
      + '<td class="k">' + fmt(r.n,'n0') + '</td>'
      + '<td class="n dim">' + fmt(r.emails,'n0') + '</td>'
      + '<td class="n">' + fmt(r.price,'m2') + '</td>'
      + '<td class="n dim">' + fmt(r.cost,'m2') + '</td>'
      + '<td class="n dim">' + fmt(r.stripe,'m2') + '</td>'
      + '<td class="n">' + fmt(r.gross,'m2') + '</td>'
      + '<td class="n">' + fmt(r.margin,'p1') + '</td>'
      + '<td class="n dim">' + (r.eo === null ? '&mdash;' : fmt(r.eo,'m2')) + '</td>'
      + '<td class="n ' + (r.delta === null ? 'dim' : r.delta <= 0 ? 'pos' : 'neg') + '">'
        + (r.delta === null ? '&mdash;' : fmt(r.delta,'pd0')) + '</td></tr>';
  }).join('');
}

function buildBench(D){
  const row = (k,what,v,cls) => '<tr'+(cls?' class="'+cls+'"':'')+'><td class="k">'+k+'</td>'
    + '<td class="wrap dim">'+what+'</td><td class="n">'+fmt(v,'m2')+'</td></tr>';
  $('#tbBench').innerHTML =
      row('Hosting', 'Servers, database, queues, domains. Paid whether or not anyone signs up.', D.infraTotal)
    + row('What ' + fmt(D.bmUsers,'n0') + ' customers consume',
          'Email sends, wallet-data credits, verification, dedicated IPs and card fees, at '
          + fmt(S.util,'p0') + ' utilisation.', D.bmConsumed)
    + row('Model total', 'The two added together.', D.bmModel, 'tot')
    + row('Figure being tested', 'The all-in monthly cost of ' + fmt(D.bmUsers,'n0') + ' customers.', D.bmTarget)
    + '<tr class="tot"><td class="k">Difference</td><td class="wrap dim">'
      + (D.bmOk ? 'Within tolerance. The model reproduces the figure.'
                : 'Outside tolerance. One of the inputs has drifted.')
      + '</td><td class="n ' + (D.bmOk ? 'pos' : 'neg') + '">' + fmt(D.bmDelta,'m2') + '</td></tr>';
}

function buildSens(D){
  $('#tbSens').innerHTML = D.sens.map(t =>
    '<tr><td class="k">' + t.n + '</td><td class="n">' + t.cur + '</td><td class="n">' + t.to + '</td>'
    + '<td class="n">' + fmt(t.gp,'m0') + '</td>'
    + '<td class="n ' + sgn(t.delta) + '">' + (t.delta > 0 ? '+' : '') + fmt(t.delta,'m2') + '</td>'
    + '<td>' + t.own + '</td></tr>').join('');
}

/* ---------- page 04: cost per user ---------- */
function buildServe(D){
  let html = '';
  for(const id of PLAN_IDS){
    const v = D.serve[id];
    html += '<tr><td class="k">' + D.eco[id].name + '</td>'
      + '<td class="n">' + fmt(v.metered,'m2') + '</td><td class="n">' + fmt(v.ip,'m2z') + '</td>'
      + '<td class="n">' + fmt(v.conc,'m2z') + '</td><td class="n">' + fmt(v.stripe,'m2') + '</td>'
      + '<td class="n">' + fmt(v.total,'m2') + '</td><td class="n dim">' + fmt(v.pct,'p1') + '</td></tr>';
  }
  html += '<tr class="tot"><td class="k">Blended, at the current mix</td>'
    + '<td class="n" colspan="4"></td><td class="n">' + fmt(D.serveBlend,'m2') + '</td>'
    + '<td class="n dim">' + fmt(D.arpu > 0 ? D.serveBlend/D.arpu : 0,'p1') + '</td></tr>'
    + '<tr><td class="k">Support, ' + fmt(S.fin.supportMin,'n0') + ' min at ' + fmt(S.fin.loadedHourly,'m0') + '/hr</td>'
    + '<td class="n dim" colspan="4">our own time, not a vendor bill</td>'
    + '<td class="n">' + fmt(D.supportCost,'m2') + '</td><td class="n dim">'
    + fmt(D.arpu > 0 ? D.supportCost/D.arpu : 0,'p1') + '</td></tr>'
    + '<tr class="tot"><td class="k">Total variable cost per customer</td>'
    + '<td class="n" colspan="4"></td><td class="n">' + fmt(D.varPerCustomer,'m2') + '</td>'
    + '<td class="n hi">' + fmt(D.varPctArpu,'p1') + '</td></tr>';
  $('#tbServe').innerHTML = html;
}

const SCALE_POINTS = [3,10,25,50,100,250,500];
function scaleRows(D){
  const pts = [...new Set(SCALE_POINTS.concat([Math.round(D.fin.endCustomers)]))].sort((a,b)=>a-b);
  return pts.filter(n=>n>0);
}
function buildScale(D){
  $('#tbScale').innerHTML = scaleRows(D).map(n => {
    const inf = D.infraPerUser(n), tot = inf + D.varPerCustomer;
    const marg = D.arpu > 0 ? 1 - tot/D.arpu : 0;
    const here = n === Math.round(D.fin.endCustomers);
    return '<tr' + (here ? ' class="tot"' : '') + '><td class="k">' + fmt(n,'n0')
      + (here ? ' &middot; month ' + D.fin.months : '') + '</td>'
      + '<td class="n">' + fmt(inf,'m2') + '</td><td class="n">' + fmt(D.varPerCustomer,'m2') + '</td>'
      + '<td class="n">' + fmt(tot,'m2') + '</td><td class="n dim">' + fmt(D.arpu,'m0') + '</td>'
      + '<td class="n ' + sgn(marg) + '">' + fmt(marg,'p1') + '</td></tr>';
  }).join('');
  $('#scaleTxt').textContent =
    'Hosting per user falls from ' + fmt(D.infraPerUser(3),'m2') + ' at 3 users to '
    + fmt(D.infraPerUser(500),'m2') + ' at 500. The ' + fmt(D.varPerCustomer,'m2')
    + ' variable cost does not move, so margin flattens at ' + fmt(D.marginCeiling,'p0')
    + ' rather than climbing. Measured spend today is ' + fmt(S.spend.actual/S.spend.users,'m2')
    + ' per user across ' + fmt(S.spend.users,'n0') + '.';
}
function buildStep(D){
  $('#tbStep').innerHTML = scaleRows(D).filter(n=>n>=10).map(n => {
    const b = D.infraBlocks(n), bill = b*D.infraTotal, pu = bill/n, tot = pu + D.varPerCustomer;
    const marg = D.arpu > 0 ? 1 - tot/D.arpu : 0;
    return '<tr><td class="k">' + fmt(n,'n0') + '</td><td class="n">' + fmt(b,'n0') + '</td>'
      + '<td class="n neg">' + fmt(bill,'m0') + '</td><td class="n">' + fmt(pu,'m2') + '</td>'
      + '<td class="n">' + fmt(tot,'m2') + '</td><td class="n ' + sgn(marg) + '">' + fmt(marg,'p1') + '</td></tr>';
  }).join('');
  const flatEnd = D.infraPerUser(D.fin.endCustomers) + D.varPerCustomer;
  const stepEnd = D.infraSteppedPU(D.fin.endCustomers) + D.varPerCustomer;
  $('#stepTxt').textContent =
    fmt(flatEnd,'m2') + ' per user if hosting amortises, ' + fmt(stepEnd,'m2')
    + ' if it is bought in blocks. Margin ' + fmt(D.arpu > 0 ? 1-flatEnd/D.arpu : 0,'p0')
    + ' versus ' + fmt(D.arpu > 0 ? 1-stepEnd/D.arpu : 0,'p0')
    + '. The tiers themselves were measured on 21 August; this compares them with a flat charge.';
}
function buildAllIn(D){
  const rows = D.fin.rows;
  const marks = [1,6,12,18,24].filter(m=>m<=rows.length);
  let cross = null;
  for(const r of rows){ if(cross===null && (r.cogs+r.opex) < r.revenue) cross = r.m; }
  $('#tbAllIn').innerHTML = marks.map(m => {
    const r = rows[m-1], n = r.customers, pu = x => n > 0 ? x/n : 0;
    const all = pu(r.cogs + r.opex), rev = pu(r.revenue);
    return '<tr' + (all < rev ? ' class="tot"' : '') + '><td class="k">Month ' + m + '</td>'
      + '<td class="n">' + fmt(n,'n0') + '</td><td class="n">' + fmt(pu(r.oInf),'m2') + '</td>'
      + '<td class="n">' + fmt(pu(r.cogs) + pu(r.oSup),'m2') + '</td>'
      + '<td class="n">' + fmt(pu(r.oSal),'m2') + '</td><td class="n">' + fmt(pu(r.oCac),'m2') + '</td>'
      + '<td class="n ' + (all < rev ? 'pos' : 'neg') + '">' + fmt(all,'m2') + '</td>'
      + '<td class="n dim">' + fmt(rev,'m2') + '</td></tr>';
  }).join('');
  $('#allInTxt').textContent =
    cross
    ? 'All-in cost per customer falls below revenue per customer in month ' + cross
      + '. Salaries are ' + fmt(D.fin.rows[0].customers > 0 ? D.fin.rows[0].oSal/D.fin.rows[0].customers : 0,'m0')
      + ' per customer in month 1 and ' + fmt(rows[rows.length-1].customers > 0 ? rows[rows.length-1].oSal/rows[rows.length-1].customers : 0,'m2')
      + ' by month ' + rows.length + '.'
    : 'All-in cost per customer never falls below revenue within ' + rows.length
      + ' months. Acquisition volume fixes that, not unit cost.';
}

/* ---------- page 05 ---------- */
function buildEco(D){
  $('#tbEco').innerHTML = PLAN_IDS.map(id => {
    const e = D.eco[id];
    return '<tr><td class="k">' + e.name + '</td><td class="n">' + fmt(e.price,'m0') + '</td>'
      + '<td class="n">' + fmt(e.metered,'m2') + '</td><td class="n">' + fmt(e.ip,'m2z') + '</td>'
      + '<td class="n">' + fmt(e.conc,'m2z') + '</td><td class="n">' + fmt(e.stripe,'m2') + '</td>'
      + '<td class="n">' + fmt(e.ceiling,'m2') + '</td>'
      + '<td class="n ' + sgn(e.floor) + '">' + fmt(e.floor,'m2') + '</td>'
      + '<td class="n hi">' + fmt(e.floorGM,'p1') + '</td></tr>';
  }).join('');
}
function buildOver(D){
  $('#tbOver').innerHTML = PLAN_IDS.map(id => {
    const e = D.eco[id], weak = e.overMult < 1.25;
    return '<tr><td class="k">' + e.name + '</td><td class="n">' + fmt(e.list,'m0') + '</td>'
      + '<td class="n">' + fmt(e.price,'m0') + '</td>'
      + '<td class="n ' + (weak ? '' : 'pos') + '">' + fmt(e.save,'p1') + '</td>'
      + '<td class="n ' + (weak ? 'dim' : 'hi') + '">' + fmt(e.overMult,'x2') + '</td></tr>';
  }).join('');
}
function buildEnrich(D){
  $('#tbEnrich').innerHTML = PLAN_IDS.map(id => {
    const e = D.enrich[id], thin = e.coverage < 0.5;
    return '<tr><td class="k">' + D.eco[id].name + '</td>'
      + '<td class="n">' + fmt(S.plans[id].contacts,'n0') + '</td>'
      + '<td class="n">' + fmt(e.needed,'n0') + '</td>'
      + '<td class="n">' + fmt(e.bundled,'n0') + '</td>'
      + '<td class="n ' + (thin ? 'neg' : 'pos') + '">' + fmt(e.coverage,'p0') + '</td>'
      + '<td class="n">' + fmt(e.overageCost,'m0') + '</td></tr>';
  }).join('');
  const g = D.enrich.growth;
  $('#enrichTxt').textContent =
    'At ' + fmt(S.creditsPerWallet,'n1') + ' credit per wallet a ' + D.eco.growth.name
    + ' customer needs ' + fmt(g.needed,'n0') + ' credits for one full pass and the plan bundles '
    + fmt(g.bundled,'n0') + ' — ' + fmt(g.coverage,'p0') + '. The rest costs them '
    + fmt(g.overageCost,'m0') + ' at list. '
    + 'Credits per wallet was measured on 11 September. What is still unmeasured is '
    + fmt(S.walletsPerContact,'n0') + ' wallets per contact, and this table is linear in it: '
    + 'at one wallet each the same pass costs them '
    + fmt(g.overageCost/Math.max(1,S.walletsPerContact),'m0')
    + '. That number decides how much of this revenue line is real.';
}

function buildV(D){
  const labels = ['Quiet month, sent nothing','Used half the allowance','Used every last email','Went 50% over'];
  $('#tbV').innerHTML = D.v.rows.map((r,i) => {
    const floor = r.u === 1;
    const collect = r.overRev > 0
      ? fmt(D.v.price,'m0') + ' + ' + fmt(r.overRev,'m0') + ' overage'
      : fmt(r.revenue,'m0');
    return '<tr' + (floor ? ' class="tot"' : '') + '><td class="k">' + labels[i] + '</td>'
      + '<td class="n">' + fmt(r.emails,'n0') + '</td><td class="n">' + collect + '</td>'
      + '<td class="n">' + fmt(r.cost,'m0') + '</td>'
      + (floor ? '<td class="n">' + fmt(r.profit,'m0') + ' · the worst it gets</td>'
               : '<td class="n ' + sgn(r.profit) + '">' + fmt(r.profit,'m0') + '</td>') + '</tr>';
  }).join('');
}

function buildChart(D){
  const W=820,H=360,L=70,R=790,T=40,B=320;
  const US=[0,0.25,0.5,0.75,1,1.25,1.5];
  const colors={launch:'var(--amber)',growth:'var(--blue)',pro:'var(--teal)'};
  const vals=PLAN_IDS.flatMap(id=>US.map(u=>D.eco[id].gpPct(u)));
  const step=0.2;
  let lo=Math.floor(Math.min(...vals,1)/step)*step, hi=Math.ceil(Math.max(...vals,1)/step)*step;
  if(hi-lo<step) hi=lo+step;
  const x=u=>L+(u/1.5)*(R-L), y=v=>B-((v-lo)/(hi-lo))*(B-T);
  let g='';
  for(let v=lo; v<=hi+1e-9; v+=step){
    const yy=y(v);
    g+='<line x1="'+L+'" y1="'+yy.toFixed(1)+'" x2="'+R+'" y2="'+yy.toFixed(1)+'" stroke="var(--rule)" stroke-width="1"/>'
     + '<text x="'+(L-10)+'" y="'+(yy+3.5).toFixed(1)+'" text-anchor="end" font-family="'+MONO+'" font-size="10.5" fill="var(--ink-3)">'+Math.round(v*100)+'%</text>';
  }
  if(1>=lo&&1<=hi){
    g+='<line x1="'+L+'" y1="'+y(1).toFixed(1)+'" x2="'+R+'" y2="'+y(1).toFixed(1)+'" stroke="var(--rule-2)" stroke-width="1.5" stroke-dasharray="4 3"/>'
     + '<text x="'+(R-6)+'" y="'+(y(1)+15).toFixed(1)+'" text-anchor="end" font-family="'+MONO+'" font-size="10" fill="var(--ink-3)">break-even vs plan price</text>';
  }
  g+='<line x1="'+x(1)+'" y1="'+T+'" x2="'+x(1)+'" y2="'+B+'" stroke="var(--blue)" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/>'
   + '<text x="'+x(1)+'" y="'+(T-8)+'" text-anchor="middle" font-family="'+MONO+'" font-size="10" font-weight="600" fill="var(--blue)">ALLOWANCE EXHAUSTED</text>';
  for(const u of US) g+='<text x="'+x(u).toFixed(1)+'" y="'+(B+21)+'" text-anchor="middle" font-family="'+MONO+'" font-size="10.5" fill="var(--ink-3)">'+Math.round(u*100)+'%</text>';
  g+='<text x="'+((L+R)/2)+'" y="'+(B+37)+'" text-anchor="middle" font-family="'+MONO+'" font-size="10" fill="var(--ink-3)" letter-spacing="1">ALLOWANCE UTILISATION</text>';
  for(const id of PLAN_IDS)
    g+='<polyline fill="none" stroke="'+colors[id]+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="'
      +US.map(u=>x(u).toFixed(1)+','+y(D.eco[id].gpPct(u)).toFixed(1)).join(' ')+'"/>';
  for(const id of PLAN_IDS)
    g+='<circle cx="'+x(1).toFixed(1)+'" cy="'+y(D.eco[id].gpPct(1)).toFixed(1)+'" r="4" fill="var(--panel)" stroke="'+colors[id]+'" stroke-width="2.5"/>';
  g+='<line x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'" stroke="var(--ink)" stroke-width="1.5"/>';
  $('#chartHost').innerHTML='<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Gross profit as a percentage of plan price against allowance utilisation for all four tiers. Every line falls to a minimum at full allowance and rises steeply beyond it.">'+g+'</svg>';
}

/* ---------- page 05: the sheet ---------- */
const SHEET = [
  {sub:'Customers'},
  {l:'Launch',                 v:r=>r.byTier.launch, f:'n0', stock:1},
  {l:'Growth',                 v:r=>r.byTier.growth, f:'n0', stock:1},
  {l:'Pro',                    v:r=>r.byTier.pro,    f:'n0', stock:1},
  {l:'Total customers',        v:r=>r.customers,     f:'n0', stock:1, tot:1},
  {l:'New in month',           v:r=>r.gained,        f:'n1'},
  {l:'Churned',                v:r=>r.churned,       f:'n1'},
  {sub:'Revenue'},
  {l:'Subscription MRR',       v:r=>r.subs,     f:'mk'},
  {l:'Overage',                v:r=>r.overage,  f:'mk'},
  {l:'Total revenue',          v:r=>r.revenue,  f:'mk', tot:1},
  {sub:'Cost of revenue'},
  {l:'Metered usage',          v:r=>r.cMet,     f:'mk'},
  {l:'Dedicated IPs',          v:r=>r.cIp,      f:'mk'},
  {l:'Concierge delivery',     v:r=>r.cConc,    f:'mk'},
  {l:'Stripe fees',            v:r=>r.cStripe,  f:'mk'},
  {l:'Total cost of revenue',  v:r=>r.cogs,     f:'mk', tot:1},
  {l:'Gross profit',           v:r=>r.gp,       f:'mk', tot:1, sign:1},
  {l:'Gross margin',           v:r=>r.gm,       f:'p0', ratio:['gp','revenue']},
  {sub:'Operating expenses'},
  {l:'Founder pay',            v:r=>r.oFnd,     f:'mk'},
  {l:'Engineering pay',        v:r=>r.oEng,     f:'mk'},
  {l:'Support',                v:r=>r.oSup,     f:'mk'},
  {l:'Acquisition',            v:r=>r.oCac,     f:'mk'},
  {l:'Infrastructure',         v:r=>r.oInf,     f:'mk'},
  {l:'Total operating expenses',v:r=>r.opex,    f:'mk', tot:1},
  {sub:'Result'},
  {l:'EBITDA',                 v:r=>r.ebitda,   f:'mk', tot:1, sign:1},
  {l:'Cash balance',           v:r=>r.cash,     f:'mk', tot:1, sign:1, stock:1}
];

function yearVal(row, rows){
  if(!rows.length) return 0;
  if(row.ratio){
    const a = rows.reduce((t,r)=>t+r[row.ratio[0]],0), b = rows.reduce((t,r)=>t+r[row.ratio[1]],0);
    return b > 0 ? a/b : 0;
  }
  if(row.stock) return row.v(rows[rows.length-1]);
  return rows.reduce((t,r)=>t+row.v(r),0);
}

function buildSheet(D){
  const rows = D.fin.rows, n = rows.length;
  const years = [];
  for(let y=0; y*12 < n; y++) years.push({label:'Y'+(y+1), slice:rows.slice(y*12,(y+1)*12)});

  let head = '<tr><th>Line</th>';
  /* Month numbers alone invite the reader to assume month 1 is today. The
     calendar label and the pre-launch marker are what tie this to the launch. */
  for(const r of rows) head += '<th class="n'+(r.preLaunch?' dim':'')+'" title="'
    + D.monthLabel(r.m) + (r.preLaunch ? ' - private beta' : '')
    + (r.m === D.launchMonth ? ' - public beta launch' : '') + '">M'+r.m
    + (r.m === D.launchMonth ? '<span class="pos">&#9679;</span>' : '') + '</th>';
  for(const y of years) head += '<th class="n yr">'+y.label+'</th>';
  head += '</tr>';

  let body = '';
  for(const row of SHEET){
    if(row.sub){
      body += '<tr class="sub"><td colspan="'+(n+years.length+1)+'">'+row.sub+'</td></tr>';
      continue;
    }
    body += '<tr'+(row.tot?' class="tot"':'')+'><td>'+row.l+'</td>';
    for(const r of rows){
      const v = row.v(r);
      body += '<td class="n'+(row.sign?' '+sgn(v):'')+'">'+fmt(v,row.f)+'</td>';
    }
    for(const y of years){
      const v = yearVal(row, y.slice);
      body += '<td class="n yr'+(row.sign?' '+sgn(v):'')+'">'+fmt(v,row.f)+'</td>';
    }
    body += '</tr>';
  }
  $('#sheetHost').innerHTML = '<table><thead>'+head+'</thead><tbody>'+body+'</tbody></table>';
}

function buildYearEnd(D){
  const f = D.fin, ys = f.years || [];
  if(!$('#tbYE') || !ys.length) return;
  const head = (id, first) => { const el = $(id); if(el) el.innerHTML =
    '<tr><th>' + first + '</th>' + ys.map(y => '<th class="n">' + y.label + '</th>').join('') + '</tr>'; };
  const lastOf = y => { const rs = f.rows.filter(r => f.fyOf(r.m) === y.fy); return rs[rs.length-1] || {}; };
  const sumOf  = (y,k) => f.rows.filter(r => f.fyOf(r.m) === y.fy).reduce((a,r)=>a + (r[k]||0), 0);

  head('#thYE', 'At 31 July');
  const row = (label, get, fmtk, tot) =>
      '<tr' + (tot?' class="tot"':'') + '><td class="k">' + label + '</td>'
    + ys.map(y => '<td class="n">' + fmt(get(y), fmtk) + '</td>').join('') + '</tr>';
  $('#tbYE').innerHTML =
      row('Suite customers',  y => lastOf(y).customers, 'n0')
    + row('Send customers',   y => lastOf(y).sendCust,  'n0')
    + row('Total customers',  y => lastOf(y).allCust,   'n0', 1)
    + row('Suite MRR',        y => lastOf(y).subsSuite, 'm0')
    + row('Send MRR',         y => lastOf(y).subsSend,  'm0')
    + row('Total MRR',        y => lastOf(y).subs,      'm0', 1);

  head('#thLine', 'Revenue line');
  $('#tbLine').innerHTML =
      row('Suite subscriptions', y => sumOf(y,'subsSuite'), 'm0')
    + row('Send subscriptions',  y => sumOf(y,'subsSend'),  'm0')
    + row('On-chain overage',    y => sumOf(y,'overage'),   'm0')
    + row('Total revenue',       y => y.rev,                'm0', 1);

  /* --- cash flow --- */
  const cf = f.cashflow || [];
  if($('#tbCF') && cf.length){
    const ch = $('#thCF');
    if(ch) ch.innerHTML = '<tr><th>Line</th>' + cf.map(c => '<th class="n">' + c.label + '</th>').join('') + '</tr>';
    const crow = (label, get, tot, sub) =>
        '<tr' + (tot?' class="tot"':'') + '><td class="' + (sub?'dim':'k') + '">'
      + (sub?'&nbsp;&nbsp;':'') + label + '</td>'
      + cf.map(c => '<td class="n">' + fmt(get(c),'m0') + '</td>').join('') + '</tr>';
    $('#tbCF').innerHTML =
        crow('Opening cash',              c => c.open, 1)
      + crow('EBITDA',                    c => c.ebitda, 0, 1)
      + crow('Corporation tax paid',      c => -c.taxPaid, 0, 1)
      + crow('Working capital movement',  c => c.prepaidMove + c.payrollMove, 0, 1)
      + crow('Cash from operations',      c => c.operating, 1)
      + crow('Equipment',                 c => c.investing, 0, 1)
      + crow('Founder investment and raise', c => c.financing, 0, 1)
      + crow('Net movement',              c => c.net, 1)
      + crow('Closing cash',              c => c.close, 1);
    const off = cf.reduce((a,c)=>Math.max(a, Math.abs(c.close - c.actualClose)), 0);
    const box = $('#cfBox'), txt = $('#cfTxt');
    if(box && txt){
      box.className = 'status ' + (off < 1 ? 'ok' : 'bad');
      txt.innerHTML = off < 1
        ? 'Closing cash ties to the balance sheet in every year, so the two statements are consistent and neither needs deriving from the other.'
        : '<b>Out by ' + fmt(off,'m2') + '.</b> The cash flow does not tie to the balance sheet.';
    }
  }
}

function buildScenarios(D){
  if(!$('#tbScen') || typeof SCENARIOS === 'undefined') return;
  const names = ['bear','base','bull'];
  const runs = names.map(n => {
    const t = JSON.parse(JSON.stringify(S));
    const sc = SCENARIOS[n];
    Object.assign(t, sc);
    if(sc.churn !== undefined)       t.fin.churn = sc.churn;
    if(sc.newPerMonth !== undefined) t.fin.newPerMonth = sc.newPerMonth;
    if(sc.newGrowth !== undefined)   t.fin.newGrowth = sc.newGrowth;
    const d = derive(t);
    const last = d.fin.rows[d.fin.rows.length-1] || {};
    return {name:n, s:t, d, last, lo: Math.min(...d.fin.rows.map(r=>r.cash))};
  });
  const row = (label, get, fmtk, tot) =>
      '<tr' + (tot?' class="tot"':'') + '><td class="k">' + label + '</td>'
    + runs.map(r => '<td class="n">' + (typeof get(r) === 'string' ? get(r) : fmt(get(r), fmtk)) + '</td>').join('') + '</tr>';
  $('#tbScen').innerHTML =
      row('Monthly churn',        r => r.s.fin.churn, 'p0')
    + row('Signups per month',    r => r.s.fin.newPerMonth, 'n0')
    + row('Acquisition growth',   r => r.s.fin.newGrowth, 'p0')
    + row('Mix, Launch/Growth/Pro', r => [r.s.mixL,r.s.mixG,r.s.mixP].map(x=>Math.round(x*100)).join(' / '))
    + row('Enrichment passes',    r => r.s.chainPassesPerMonth, 'n1')
    + row('FY2027 revenue',       r => r.d.fin.years[0].rev, 'm0', 1)
    + row('FY2031 revenue',       r => r.d.fin.years[4].rev, 'm0', 1)
    + row('FY2031 EBITDA',        r => r.d.fin.years[4].ebitda, 'm0')
    + row('Customers at month 59', r => r.last.allCust, 'n0')
    + row('MRR at month 59',      r => r.last.subs, 'm0')
    + row('Lowest cash',          r => r.lo, 'm0')
    + row('Closing cash',         r => r.last.cash, 'm0', 1);
  const bear = runs[0];
  const box = $('#scenBox'), txt = $('#scenTxt');
  if(box && txt){
    box.className = 'status ' + (bear.lo < 0 ? 'warn' : 'ok');
    txt.innerHTML = bear.lo < 0
      ? '<b>Bear runs out of money.</b> It needs <b>' + fmt(-bear.lo,'m0') + '</b> beyond the raise, first going negative in month '
        + (bear.d.fin.rows.find(r=>r.cash < -1)||{}).m + '. The hiring plan is what breaks it: payroll reaches '
        + fmt(D.hireTrueCost,'m0') + ' a year against bear revenue of ' + fmt(bear.d.fin.years[4].rev,'m0')
        + '. <b>In a bear case the hires do not happen</b> &mdash; but the model runs them anyway, so the number above is the cost of hiring into a downturn rather than a forecast.'
      : 'All three scenarios stay funded.';
  }
}

function buildFive(D){
  const f = D.fin, ys = f.years || [];
  if(!$('#tbPL5') || !ys.length) return;
  const head = (id, first) => { const el = $(id); if(el) el.innerHTML =
    '<tr><th>' + first + '</th>' + ys.map(y =>
      '<th class="n">' + y.label + (y.months < 12 ? ' <span class="dim">(' + y.months + 'mo)</span>' : '') + '</th>').join('') + '</tr>'; };
  head('#thPL5', 'Line');

  const line = (label, get, tot, sign) =>
      '<tr' + (tot ? ' class="tot"' : '') + '><td class="k">' + label + '</td>'
    + ys.map(y => { const v = get(y);
        return '<td class="n' + (sign ? ' ' + sgn(v) : '') + '">' + fmt(v,'m0') + '</td>'; }).join('') + '</tr>';
  $('#tbPL5').innerHTML =
      line('Revenue',            y => y.rev, 1)
    + line('Cost of revenue',    y => -y.cogs)
    + line('Gross profit',       y => y.gp, 1, 1)
    + line('Operating expenses', y => -y.opex)
    + line('EBITDA',             y => y.ebitda, 1, 1)
    + line('Depreciation',       y => -y.deprec)
    + line('Operating profit',   y => y.ebit, 1, 1)
    + line('Corporation tax',    y => -y.tax)
    + line('Profit after tax',   y => y.ebit - y.tax, 1, 1);

  /* --- statement of financial position --- */
  head('#thBS', 'As at 31 July');
  const bs = f.balanceSheet || [];
  const brow = (label, get, tot, sub) =>
      '<tr' + (tot ? ' class="tot"' : '') + '><td class="' + (sub ? 'dim' : 'k') + '">'
    + (sub ? '&nbsp;&nbsp;' : '') + label + '</td>'
    + bs.map(b => '<td class="n">' + fmt(get(b),'m0') + '</td>').join('') + '</tr>';
  $('#tbBS').innerHTML =
      '<tr class="sub"><td colspan="' + (bs.length+1) + '">Assets</td></tr>'
    + brow('Cash',                b => b.assets.cash, 0, 1)
    + brow('Prepayments',         b => b.assets.prepaid, 0, 1)
    + brow('Equipment, net',      b => b.assets.equipment, 0, 1)
    + brow('Total assets',        b => b.totalAssets, 1)
    + '<tr class="sub"><td colspan="' + (bs.length+1) + '">Liabilities</td></tr>'
    + brow('Payroll taxes payable', b => b.liabilities.payroll, 0, 1)
    + brow('Corporation tax payable', b => b.liabilities.tax, 0, 1)
    + brow('Total liabilities',   b => b.totalLiab, 1)
    + '<tr class="sub"><td colspan="' + (bs.length+1) + '">Equity</td></tr>'
    + brow('Share capital',       b => b.equity.shareCapital, 0, 1)
    + brow('Founder investment',  b => b.equity.founderInvestment, 0, 1)
    + brow('Capital raised',      b => b.equity.capitalRaised, 0, 1)
    + brow('Retained earnings',   b => b.equity.retained, 0, 1)
    + brow('Total equity',        b => b.totalEquity, 1)
    + brow('Assets less liabilities and equity', b => b.check, 1);

  const worst = bs.reduce((a,b)=>Math.max(a, Math.abs(b.check)), 0);
  const box = $('#bsBox'), txt = $('#bsTxt');
  if(box && txt){
    box.className = 'status ' + (worst < 0.01 ? 'ok' : 'bad');
    txt.innerHTML = worst < 0.01
      ? 'The sheet balances in every year. The opening position carries a retained deficit of '
        + fmt(S.fin.startCash - (S.balance.shareCapitalGbp*S.fx.gbpUsd),'m2')
        + ' &mdash; share capital was issued and spent before this model starts, and without it every year would be out by exactly that.'
      : '<b>Out by ' + fmt(worst,'m2') + '.</b> The sheet does not balance and nothing built on it can be trusted.';
  }

  /* --- hires --- */
  const th = $('#tbHires');
  if(th) th.innerHTML = (S.fin.hires||[]).map(h => {
    const usd = h.gbp*S.fx.gbpUsd;
    return '<tr><td class="k">' + h.role + '</td>'
      + '<td class="n">GBP ' + fmt(h.gbp,'n0') + '</td>'
      + '<td class="n">' + fmt(usd*(1+S.fin.employerOncost),'m0') + '</td>'
      + '<td class="n">' + D.monthLabel(h.start) + '</td>'
      /* The benchmark has to match the role, not just the seniority word. */
      + '<td class="wrap dim">' + fmt(usd,'m0') + ' base &mdash; '
        + (/data/i.test(h.role)
            ? 'junior data engineers average GBP 33,817 (London GBP 34,645, graduates GBP 28-38k)'
            : /product manager/i.test(h.role)
              ? 'UK product managers average GBP 60-68k, GBP 55-70k outside London'
            : /customer success/i.test(h.role)
              ? 'UK customer success managers run GBP 42-68k base'
            : /market/i.test(h.role)
              ? 'UK content marketing roles average GBP 39,561 (Payscale GBP 43,884, typical range GBP 36-52k)'
            : /junior|entry|grad/i.test(h.role)
              ? 'junior backend developers average GBP 31,061 (London GBP 31,461, range GBP 24-38k)'
              : 'mid-market for a UK company outside prime London, against a GBP 80-100k London band')
      + '</td></tr>';
  }).join('');

  /* --- overheads --- */
  const to = $('#tbOvh');
  if(to){
    const names = {legal:'Legal', accounting:'Accounting', insurance:'Insurance',
      software:'Software', office:'Office', marketing:'Marketing and events',
      bank:'Bank charges', ico:'ICO data protection fee', operations:'Operations and filings'};
    let rows = '', tot = 0;
    for(const [k,v] of Object.entries(S.overheads)){
      tot += v;
      rows += '<tr><td class="k">' + (names[k]||k) + '</td><td class="n">' + fmt(v,'n2') + '</td>'
            + '<td class="n">' + fmt(v*S.fx.gbpUsd,'m2') + '</td>'
            + '<td class="n dim">' + fmt(v*S.fx.gbpUsd*12,'m0') + '</td></tr>';
    }
    rows += '<tr class="tot"><td class="k">Total</td><td class="n">' + fmt(tot,'n2') + '</td>'
          + '<td class="n">' + fmt(tot*S.fx.gbpUsd,'m2') + '</td>'
          + '<td class="n">' + fmt(tot*S.fx.gbpUsd*12,'m0') + '</td></tr>';
    to.innerHTML = rows;
  }
}

function buildPL(D){
  const f = D.fin;
  /* Three years. Year 3 only exists if the projection actually runs that far. */
  const revs = [f.y1Rev, f.y2Rev, f.y3Rev];
  const hasY3 = f.months >= 36 && f.y3Rev > 0;
  const line = (l, vals, tot, sign) => {
    let tds = '';
    vals.forEach((v,i) => {
      if(i === 2 && !hasY3) return;
      /* Cost lines are passed negative but represent a positive share of
         revenue, so those show unsigned. On profit lines the sign is the whole
         point - a loss must not read as "73% of revenue". */
      const pct = revs[i] > 0 ? (sign ? v : Math.abs(v))/revs[i] : 0;
      tds += '<td class="n'+(sign?' '+sgn(v):'')+'">'+fmt(v,'m0')+'</td>'
           + '<td class="n dim">'+fmt(pct,'p0')+'</td>';
    });
    return '<tr'+(tot?' class="tot"':'')+'><td class="k">'+l+'</td>'+tds+'</tr>';
  };
  const th = $('#thPL');
  if(th) th.innerHTML = '<tr><th>Line</th><th class="n">Year 1</th><th class="n">% rev</th>'
    + '<th class="n">Year 2</th><th class="n">% rev</th>'
    + (hasY3 ? '<th class="n">Year 3</th><th class="n">% rev</th>' : '') + '</tr>';
  $('#tbPL').innerHTML =
      line('Revenue',            [f.y1Rev, f.y2Rev, f.y3Rev], 1)
    + line('Cost of revenue',    [-f.y1Cogs, -f.y2Cogs, -f.y3Cogs])
    + line('Gross profit',       [f.y1Gp, f.y2Gp, f.y3Gp], 1, 1)
    + line('Operating expenses', [-f.y1Opex, -f.y2Opex, -f.y3Opex])
    + line('EBITDA, founders unpaid', [f.y1Ebitda, f.y2Ebitda, f.y3Ebitda], 1, 1)
    /* Not a flat pool: once the gate opens, founder pay is already inside opex,
       so only the untaken part is still to charge. Y1 the whole pool, Y3 none. */
    + line('Founder pay still to charge', [f.y1EbitdaPaid - f.y1Ebitda,
                                           f.y2EbitdaPaid - f.y2Ebitda,
                                           f.y3EbitdaPaid - f.y3Ebitda])
    + line('EBITDA, founders paid',     [f.y1EbitdaPaid, f.y2EbitdaPaid, f.y3EbitdaPaid], 1, 1);
}

/* ---------- page 06 ---------- */
function buildLtv(D){
  const churns = [...new Set([0.02,0.03,0.05,0.08,0.12,S.planChurn])].sort((a,b)=>a-b);
  $('#tbLtv').innerHTML = churns.map(c => {
    const life = c > 0 ? 1/c : Infinity, plan = Math.abs(c - S.planChurn) < 1e-9;
    return '<tr'+(plan?' class="tot"':'')+'><td class="k">'+fmt(c,'p0')+(plan?' · planning at this':'')+'</td>'
      + '<td class="n">'+(isFinite(life)?life.toFixed(1)+' mo':'∞')+'</td>'
      + PLAN_IDS.map(id=>'<td class="n">'+fmt(D.gpUtil[id]*life,'m0')+'</td>').join('')
      + '<td class="n hi">'+fmt(D.blendGP*life,'m0')+'</td>'
      + '<td class="n">'+fmt(D.blendGP*life/S.ltvCacTarget,'m0')+'</td></tr>';
  }).join('');
}
function buildCohort(D){
  const marks = [1,3,6,12,18,24,36];
  let html = '';
  for(const m of marks){
    const alive = 100*Math.pow(1-S.planChurn, m-1);
    let cum = 0;
    for(let i=1;i<=m;i++) cum += 100*Math.pow(1-S.planChurn,i-1)*D.blendGP;
    const net = cum - 100*S.cac;
    html += '<tr><td class="k">Month '+m+'</td><td class="n">'+fmt(alive,'n0')+'</td>'
      + '<td class="n">'+fmt(alive*D.blendGP,'m0')+'</td><td class="n">'+fmt(cum,'m0')+'</td>'
      + '<td class="n '+sgn(net)+'">'+fmt(net,'m0')+'</td></tr>';
  }
  $('#tbCohort').innerHTML = html;
}
function buildPayback(D){
  const costs = [...new Set([250,500,1000,2000,4000,S.cac])].sort((a,b)=>a-b);
  $('#tbPayback').innerHTML = costs.map(c => {
    const mo = D.blendGP > 0 ? c/D.blendGP : Infinity;
    const ratio = c > 0 ? D.ltvBlend/c : Infinity;
    let verdict='Excellent', cls='pos';
    if(mo > 12){verdict='Too slow'; cls='neg';} else if(mo > 5){verdict='Healthy'; cls='';}
    const plan = Math.abs(c - S.cac) < 1e-9;
    return '<tr'+(plan?' class="tot"':'')+'><td class="k">'+fmt(c,'m0')+(plan?' · planning at this':'')+'</td>'
      + '<td class="n">'+(isFinite(mo)?mo.toFixed(1):'∞')+'</td>'
      + '<td class="n">'+fmt(ratio,'x1')+'</td>'
      + '<td style="text-align:left" class="'+cls+'">'+verdict+'</td></tr>';
  }).join('');
}

/* ---------- page 07 ---------- */
function buildBE(D){
  const pool = S.raise.founderTotalYear/12;
  /* Built from the real hire list, so the ladder cannot drift from the plan.
     A hardcoded "plus 3 engineers" rung used to sit here and read as headcount
     the company had, which it never did. */
  const oncost = 1 + (S.fin.employerOncost||0);
  const hires = S.fin.hires || [];
  const monthly = h => (h.gbp*S.fx.gbpUsd/12)*oncost;
  const rows = [[0,'Nobody paid, as today'],
                [pool,'Founder pool only, ' + fmt(S.raise.founderTotalYear,'m0') + '/yr across ' + fmt(S.fin.founders,'n0')]];
  let run = pool;
  hires.forEach(h => { run += monthly(h);
    rows.push([run, 'Founder pool plus ' + h.role.toLowerCase()]); });

  $('#tbBE').innerHTML = rows.map(([opex,what]) => {
    const need = D.blendGP > 0 ? Math.max(1, Math.ceil((D.infraTotal+opex)/D.blendGP)) : Infinity;
    const hit = D.fin.rows.find(r=>r.customers >= need);
    return '<tr><td class="k">'+fmt(opex,'m0')+'</td><td style="text-align:left">'+what+'</td>'
      + '<td class="n hi">'+fmt(need,'n0')+'</td><td class="n">'+fmt(need*D.arpu,'m0')+'</td>'
      + '<td class="n '+(hit?'':'dim')+'">'+(hit ? 'M'+hit.m : 'beyond M'+D.fin.months)+'</td></tr>';
  }).join('');
}
function buildWorst(D){
  var w = D.worstCase;
  var row = function(k, what, v, cls){
    return '<tr' + (cls ? ' class="'+cls+'"' : '') + '><td class="k">' + k + '</td>'
      + '<td class="wrap dim">' + what + '</td><td class="n">' + fmt(v,'m0') + '</td></tr>';
  };
  $('#tbWorst').innerHTML =
      row('Hosting', fmt(S.worst.droplets,'n0') + ' droplets provisioned, backups and domains', w.hosting)
    + row('Vendor bills', 'Email, wallet data, verification, card fees for a decaying customer base', w.vendor)
    + row('Support', 'Founder time, no cash cost', w.support)
    + row('Acquisition', 'No paid acquisition', w.acquisition)
    + row('Company overheads', D.overheadTotal > 0 ? 'Insurance, accounting, domains, ICO and bank charges, billed in pounds' : 'Nothing entered yet', w.overheads)
    + row('Known operating cost', fmt(w.months,'n0') + ' months', w.cost, 'tot')
    + row('Miscellaneous and contingency', fmt(S.worst.contingency,'p0') + ' on the above, the same buffer rule used on spend', w.contingency)
    + row('Total to fund', fmt(w.months,'n0') + ' months, everything in', w.costPlus, 'tot')
    + row('Revenue', 'Base decays from ' + fmt(D.startCustomers,'n0') + ' to ' + fmt(w.endCustomers,'n1') + ' customers', w.revenue)
    + row('Funding required', 'What has to be in the bank', w.shortfall, 'tot');

  var box = $('#worstBox');
  if(box) box.className = 'status ' + (D.overheadTotal > 0 ? 'ok' : 'warn');
  $('#worstTxt').textContent =
    fmt(w.costPlus,'m0') + ' to fund, ' + fmt(w.shortfall,'m0') + ' after the revenue a decaying base still brings, over '
    + fmt(w.months,'n0') + ' months. An average burn of '
    + fmt(w.monthly,'m0') + ' a month, on the assumption that no new customer ever arrives and the '
    + 'existing base churns at ' + fmt(S.worst.churn,'p0') + '. '
    + (D.overheadTotal > 0
        ? 'Includes ' + fmt(D.overheadTotal,'m0') + ' a month of company overheads.'
        : 'It excludes every company overhead, because none has been entered.');

  $('#ovhTxt').textContent = D.overheadGbp > 0
    ? '\u00a3' + fmt(D.overheadGbp,'n0') + ' a month, \u00a3' + fmt(D.overheadGbp*12,'n0')
      + ' a year, converted at ' + fmt(S.fx.gbpUsd,'m3') + ' to ' + fmt(D.overheadTotal,'m2')
      + ' a month and ' + fmt(D.overheadTotal*12,'m0') + ' over twelve months. '
      + 'Accounting runs on Tide with an accountant bought by the hour at year end. '
      + 'Every line here is what the founders confirmed they pay, not an estimate.'
    : 'No legal, accounting or operating cost is entered. Treat the runway figure as a floor.';
}

function buildGr(D){
  $('#tbGr').innerHTML = PLAN_IDS.map(id => {
    const g = D.gr[id];
    return '<tr><td class="k">'+D.eco[id].name+' × '+fmt(S.grCustomers,'n0')+'</td>'
      + '<td class="n">'+fmt(S.plans[id].chain,'n0')+'</td><td class="n">'+fmt(g.credits,'n0')+'</td>'
      + '<td class="n">'+fmt(g.blocks,'n0')+'</td><td class="n '+(g.cash>0?'neg':'dim')+'">'+fmt(g.cash,'m0')+'</td></tr>';
  }).join('')
  + '<tr class="tot"><td class="k">Total committed in advance</td><td class="n dim">—</td>'
  + '<td class="n">'+fmt(PLAN_IDS.reduce((a,id)=>a+D.gr[id].credits,0),'n0')+'</td>'
  + '<td class="n">'+fmt(PLAN_IDS.reduce((a,id)=>a+D.gr[id].blocks,0),'n0')+'</td>'
  + '<td class="n">'+fmt(D.grTotal,'m0')+'</td></tr>';
}
function buildBizSens(D){
  $('#tbBizSens').innerHTML = D.bizSens.map(t =>
    '<tr><td class="k">'+t.n+'</td><td class="n">'+t.base+'</td><td class="n">'+t.tested+'</td>'
    + '<td class="n '+sgn(t.cash)+'">'+fmt(t.cash,'m0')+'</td>'
    + '<td class="n '+sgn(t.delta)+'">'+(t.delta>0?'+':'')+fmt(t.delta,'m0')+'</td></tr>').join('');
}

/* ---------- page 08 ---------- */
function buildAssum(D){
  const chip = {m:'<span class="chip m">Measured</span>', e:'<span class="chip e">Estimated</span>', a:'<span class="chip a">Assumed</span>'};
  const order = {a:0, e:1, m:2};
  $('#tbAssum').innerHTML = ASSUMPTIONS.slice().sort((x,y)=>order[x.basis]-order[y.basis]).map(a => {
    let why = a.why;
    if(a.n === 'Dedicated / managed send split') why += fmt(D.splitSens,'m3') + ' per 1,000.';
    if(a.n === 'Stripe rate') why += fmt(S.stripeFx,'p2') + ' if we settle cross-currency.';
    return '<tr'+(a.basis==='a'?' class="tot"':'')+'><td class="k">'+a.n+'</td>'
      + '<td class="n">'+a.val(S,D)+'</td><td>'+chip[a.basis]+'</td><td>'+a.own+'</td>'
      + '<td class="wrap">'+why+'</td></tr>';
  }).join('');
}

/* ---------- page 09 ---------- */
const RULES = [
  {r:'Never price a meter below its loaded cost.', w:'Checked across every meter, not just the one that broke it last time. On-chain is tested against its uncached cost, so a cache that stops working cannot put us underwater.',
   t:(s,D)=>D.underwater.length === 0,
   f:(s,D)=>D.underwater.map(function(u){ return u.name+' sells at '+fmt(u.price,'m2')+' against a cost of '+fmt(u.cost,'m2')+' ('+fmt(u.margin,'p1')+')'; }).join('; ')},
  {r:'A plan’s price must exceed the cost of its own full allowance.', w:'This is what makes floor profit a guarantee.',
   t:(s,D)=>PLAN_IDS.every(id=>D.eco[id].floor > 0), f:(s,D)=>PLAN_IDS.filter(id=>D.eco[id].floor<=0).map(id=>D.eco[id].name).join(', ')+' loses money at full allowance'},
  {r:'Overage always bills at full list price.', w:'This is what makes heavy usage profitable rather than expensive.', t:()=>true},
  {r:'Allowances must cover normal usage.', w:'If overage prices ordinary behaviour, the allowance is wrong. An overage multiple near 1.0× means the plan is not a plan.',
   t:(s,D)=>PLAN_IDS.every(id=>D.eco[id].overMult >= 1.25), f:(s,D)=>PLAN_IDS.filter(id=>D.eco[id].overMult<1.25).map(id=>D.eco[id].name+' at '+fmt(D.eco[id].overMult,'x2')).join(', ')},
  {r:'Any per-customer fixed cost must be gated on the usage that justifies it.', w:'Dedicated IPs are the current example.', t:()=>true},
  {r:'Hours we sell are scoped and priced, never bundled into a plan we depend on.', w:'Concierge is an optional add-on at list rate. It is upside, so no plan price and no forecast leans on it.',
   t:(s)=>s.pConcierge > 0, f:()=>'concierge has no list rate, so any hours delivered would be unpriced'},
  {r:'The buffer is contingency, not profit.', w:'It absorbs payment failures, vendor price rises and support spikes. It does not get spent.',
   t:(s)=>s.buffer > 0, f:()=>'the buffer is set to zero'}
];
function buildRules(D){
  const fails = [];
  $('#tbRules').innerHTML = RULES.map((rl,i) => {
    const ok = rl.t(S,D);
    if(!ok) fails.push(rl.f ? rl.f(S,D) : 'rule '+(i+1));
    return '<tr><td class="n k">'+(i+1)+'</td><td class="wrap"><b>'+rl.r+'</b></td>'
      + '<td class="wrap dim">'+rl.w+'</td>'
      + '<td class="n">'+(ok ? '<span class="chip m">Holds</span>' : '<span class="chip a">Broken</span>')+'</td></tr>';
  }).join('');
  const box = $('#ruleBox'), txt = $('#ruleTxt');
  box.className = 'status ' + (fails.length ? 'bad' : 'ok');
  txt.textContent = fails.length
    ? 'Broken: ' + fails.join('; ') + '.'
    : 'All seven hold. Floor margin ' + fmt(D.minFloorGM,'p1') + ' to ' + fmt(D.maxFloorGM,'p1') + '.';
}

/* ---------- narrative blocks that depend on the numbers ---------- */
function buildNarrative(D){
  const f = D.fin;

  $('#infraTxt').textContent =
    'Hosting ' + fmt(D.infraTotal,'m2') + ' a month. ' + fmt(D.dq.infraItemised,'p0')
    + ' is reconstructed from contracted rates, ' + fmt(D.infra.unallocated,'m2') + ' is unattributed. '
    + 'Last month we invoiced ' + fmt(S.spend.actual,'m2') + ' across all providers at '
    + fmt(S.spend.users,'n0') + ' users.';

  const bmBox = $('#bmBox');
  if(bmBox) bmBox.className = 'status ' + (D.bmOk ? 'ok' : 'warn');
  const bmMax = D.infraTotal + D.bmUsers*PLAN_IDS.reduce((a,id)=>
    a + ({launch:S.mixL,growth:S.mixG,pro:S.mixP})[id]
      * (D.eco[id].metered + D.eco[id].ip + D.eco[id].stripe), 0);
  $('#bmTxt').textContent =
    'Hosting ' + fmt(D.infraTotal,'m2') + ' plus ' + fmt(D.bmUsers,'n0') + ' customers at '
    + fmt(S.util,'p0') + ' usage (' + fmt(D.bmConsumed,'m2') + ') = ' + fmt(D.bmModel,'m2')
    + ' against the ' + fmt(D.bmTarget,'m0') + ' benchmark. '
    + (D.bmOk ? 'Within tolerance.' : 'Out by ' + fmt(Math.abs(D.bmDelta),'m2') + ', needs re-confirming.');

  const cm = D.fin.capacityMonth, alt = D.altFin;
  const stepped = S.infraCapacity.mode === 'stepped';
  $('#capTxt').textContent =
    'Hosting steps on the measured tiers - one droplet to ' + fmt(D.topTierUsers,'n0')
    + ' customers - and the projection crosses the first step in month ' + fmt(cm||0,'n0') + '. '
    + 'The alternative below charges a tier per ' + fmt(D.capUsers,'n0')
    + ' customers instead, which moves end cash from '
    + fmt(stepped ? alt.endCash : D.fin.endCash,'m0') + ' to ' + fmt(stepped ? D.fin.endCash : alt.endCash,'m0') + '.';

  $('#dqTxt').textContent =
    D.dq.assumed + ' of ' + D.dq.total + ' inputs are assumed. '
    + 'Unit economics rest on contracted vendor rates. The projection rests on churn, utilisation '
    + 'and acquisition volume, none of which we have measured.';

  const beTxt = typeof f.breakevenMonth === 'number' ? 'month ' + f.breakevenMonth : 'not within ' + f.months + ' months';
  const f2 = D.fin;
  $('#payTxt').textContent =
    (f2.raiseAmount > 0
      ? fmt(f2.raiseAmount,'m0') + ' raise modelled in month ' + f2.raiseMonth + '. '
      : 'No raise modelled, so no founder pay in this projection. ')
    + (f2.firstPaidMonth
      ? 'Both conditions met in month ' + f2.firstPaidMonth + ': ' + fmt(D.founderMonthly,'m0')
        + '/month across ' + fmt(S.fin.founders,'n0') + ' founders, ' + fmt(D.founderEachYr,'m0') + ' each a year. '
      : 'Conditions never both met inside ' + f2.months + ' months. ')
    + 'Cash needed before the raise: ' + fmt(f2.gapBeforeRaise,'m0') + '.';

  $('#partnerTxt').textContent =
    D.partnerRate > 0
    ? fmt(S.partner.coverage,'p0') + ' of customers at a ' + fmt(S.partner.cut,'p0') + ' cut = '
      + fmt(D.partnerRate,'p0') + ' of revenue: ' + fmt(D.fin.y1Rev*D.partnerRate,'m0') + ' in year one, '
      + fmt(D.fin.y2Rev*D.partnerRate,'m0') + ' in year two. Gross margin ' + fmt(D.fin.y1GM,'p0') + '.'
    : 'No partner share modelled. Gross margin ' + fmt(D.fin.y1GM,'p0')
      + '. Every point of effective share comes straight off it.';

  $('#finTxt').textContent =
    fmt(f.endCustomers,'n0') + ' customers and ' + fmt(f.endMrr,'m0') + ' MRR by month ' + f.months
    + '. EBITDA positive in ' + (typeof f.breakevenMonth === 'number' ? 'month ' + f.breakevenMonth : 'no month modelled')
    + '. Lowest cash ' + fmt(f.peakBurn,'m0')
    + (f.raiseNeeded > 0 ? ', so ' + fmt(f.raiseNeeded,'m0') + ' of funding is required.' : ', so the plan never runs out.')
    + ' Year one gross margin ' + fmt(f.y1GM,'p0') + '.';

  $('#runwayTxt').textContent =
    (f.raiseNeeded > 0 ? fmt(f.raiseNeeded,'m0') + ' needed to bridge to profitability. ' : 'The plan funds itself. ')
    + (typeof f.runway === 'number' ? 'Cash goes negative in month ' + f.runway + '. ' : 'Cash never goes negative. ')
    + 'Margin is not the risk at ' + fmt(D.minFloorGM,'p0') + ' worst case. Customer count is.';

  $('#assumTxt').textContent =
    fmt(D.dq.pctMeasured,'p0') + ' of the register is measured. Vendor rates are contracted; '
    + 'churn, utilisation, acquisition cost and volume are not. Use the growth figures to frame '
    + 'decisions, not to justify spend against.';
}

/* ============================================================
   4b - Tooltips. One element, positioned against the viewport, so a
        tooltip inside a horizontally scrolling table never clips.
   ============================================================ */
let tipEl;
function initTips(){
  tipEl = document.createElement('div');
  tipEl.id = 'tip'; tipEl.setAttribute('role','tooltip');
  document.body.appendChild(tipEl);

  const show = el => {
    const text = el.getAttribute('data-tip');
    if(!text) return;
    tipEl.innerHTML = '<span class="h">' + esc(el.textContent.trim()) + '</span>' + text;
    tipEl.classList.add('on');
    place(el);
  };
  const hide = () => tipEl.classList.remove('on');

  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('.tt[data-tip]');
    if(el) show(el);
  });
  document.addEventListener('mouseout', e => {
    if(e.target.closest && e.target.closest('.tt[data-tip]')) hide();
  });
  document.addEventListener('focusin', e => {
    const el = e.target.closest && e.target.closest('.tt[data-tip]');
    if(el) show(el);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', e => { if(e.key === 'Escape') hide(); });
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}
function place(el){
  const r = el.getBoundingClientRect();
  const t = tipEl.getBoundingClientRect();
  const pad = 10;
  let left = r.left + r.width/2 - t.width/2;
  left = Math.max(pad, Math.min(left, window.innerWidth - t.width - pad));
  let top = r.top - t.height - 9;
  if(top < pad) top = r.bottom + 9;                     // flip under when tight above
  tipEl.style.left = Math.round(left) + 'px';
  tipEl.style.top  = Math.round(top) + 'px';
}
/* Anything with data-tip should be reachable by keyboard. */
function armTips(){
  for(const el of $$('.tt[data-tip]')){
    if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
    if(!el.hasAttribute('role')) el.setAttribute('role','note');
  }
}

/* ============================================================
   5 - Routing
   ============================================================ */
const PAGES = [];
function initRouting(){
  for(const a of $$('#nav a')) PAGES.push({id:a.dataset.p, label:a.querySelector('span:last-child').textContent, ix:a.querySelector('.ix').textContent});
  for(const p of PAGES){
    const host = document.querySelector('#p-'+p.id+' [data-pager]');
    if(!host) continue;
    const i = PAGES.indexOf(p);
    const prev = PAGES[i-1], next = PAGES[i+1];
    host.innerHTML =
      (prev ? '<a href="#/'+prev.id+'"><span>← '+prev.ix+'</span><b>'+esc(prev.label)+'</b></a>' : '<span></span>')
    + (next ? '<a class="nx" href="#/'+next.id+'"><span>'+next.ix+' →</span><b>'+esc(next.label)+'</b></a>' : '');
  }
  window.addEventListener('hashchange', route);
  route();
}
function route(){
  const want = (location.hash || '').replace(/^#\//,'') || 'overview';
  const id = PAGES.some(p=>p.id === want) ? want : 'overview';
  for(const p of PAGES){
    document.querySelector('#p-'+p.id).classList.toggle('on', p.id === id);
    document.querySelector('#nav a[data-p="'+p.id+'"]').classList.toggle('on', p.id === id);
  }
  $('#nav').classList.remove('open');
  $('#navToggle').setAttribute('aria-expanded','false');
  window.scrollTo({top:0, behavior:'instant'});
}

/* ============================================================
   6 - Wiring
   ============================================================ */
function wire(){
  for(const el of $$('input.ed[data-k]')){
    el.setAttribute('inputmode','decimal');
    el.setAttribute('autocomplete','off');
    el.addEventListener('focus', ()=>{ el.value = String(rawFor(el)); el.select(); });
    el.addEventListener('input', ()=>{
      const v = parseInput(el.value, el.dataset.f);
      if(v === null) return;
      setPath(S, el.dataset.k, v);
      render();
    });
    el.addEventListener('blur', ()=>{ el.value = fmtInput(getPath(S, el.dataset.k), el.dataset.f); });
    el.addEventListener('keydown', e=>{
      if(e.key === 'Enter'){ e.preventDefault(); el.blur(); }
      if(e.key === 'Escape'){ setPath(S, el.dataset.k, getPath(DEFAULTS, el.dataset.k)); render(); el.blur(); }
    });
  }
  const vs = $('#vSel');
  if(vs) vs.addEventListener('change', e=>{ S.vPlan = e.target.value; render(); });
  const cmSel = $('#capMode');
  if(cmSel) cmSel.addEventListener('change', e=>{ S.infraCapacity.mode = e.target.value; render(); });

  for(const b of $$('#ccySegs button')){
    b.addEventListener('click', ()=>{
      S.ccy = b.dataset.ccy;
      for(const o of $$('#ccySegs button')) o.classList.toggle('on', o === b);
      render();
    });
  }

  for(const b of $$('#scenSegs button')){
    b.addEventListener('click', ()=>{
      const sc = SCENARIOS[b.dataset.scen];
      S.scenario = b.dataset.scen;
      /* Every lever the scenario defines, and nothing it does not. This used to
         assign sc.util and sc.overageRate, which SCENARIOS stopped carrying on
         19 Sep - so clicking any of the three buttons set util to undefined and
         zeroed the whole document. */
      S.mixL = sc.mixL; S.mixG = sc.mixG; S.mixP = sc.mixP;
      S.chainPassesPerMonth = sc.chainPassesPerMonth;
      S.fin.churn = sc.churn; S.fin.newPerMonth = sc.newPerMonth;
      S.fin.newGrowth = sc.newGrowth;
      S.planChurn = sc.churn;
      render();
      toast(b.dataset.scen[0].toUpperCase()+b.dataset.scen.slice(1)+' case applied');
    });
  }

  $('#btnReset').addEventListener('click', ()=>{ S = structuredClone(DEFAULTS); render(); toast('Reset to the agreed baseline'); });
  $('#btnPrint').addEventListener('click', ()=>window.print());
  $('#btnExport').addEventListener('click', exportScenario);
  $('#btnImport').addEventListener('click', ()=>$('#fileIn').click());
  $('#fileIn').addEventListener('change', importScenario);
  $('#navToggle').addEventListener('click', ()=>{
    const open = $('#nav').classList.toggle('open');
    $('#navToggle').setAttribute('aria-expanded', String(open));
  });
  $('#btnTheme').addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme');
    const dark = cur ? cur === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try{ localStorage.setItem(STORE_KEY+'-theme', next); }catch(e){}
    toast(next === 'dark' ? 'Dark' : 'Light');
  });
}
function rawFor(el){
  const v = getPath(S, el.dataset.k), f = el.dataset.f;
  return (f === 'p0'||f === 'p1'||f === 'p2'||f === 'p3') ? +(v*100).toFixed(4) : v;
}

/* ---------- persistence ---------- */
function persist(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify({baseline:BASELINE, inputs:S})); }catch(e){}
}
let staleScenario = false;
function restore(){
  try{
    const t = localStorage.getItem(STORE_KEY+'-theme');
    if(t) document.documentElement.setAttribute('data-theme', t);

    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return;
    const saved = JSON.parse(raw);
    if(!saved || saved.baseline !== BASELINE){
      /* Older baseline, or the pre-versioning format. Drop it so nobody reads
         last week's agreed numbers thinking they are this week's. */
      localStorage.removeItem(STORE_KEY);
      staleScenario = true;
      return;
    }
    merge(S, saved.inputs);
  }catch(e){}
}
function merge(target, src){
  for(const k of Object.keys(target)){
    if(!(k in src)) continue;
    if(target[k] && typeof target[k] === 'object' && src[k] && typeof src[k] === 'object') merge(target[k], src[k]);
    else if(typeof target[k] === typeof src[k]) target[k] = src[k];
  }
}

/* ---------- scenario files ---------- */
async function exportScenario(){
  const payload = JSON.stringify({
    document:'OnchainSuite finance SSOT', revision:'v4.1', baseline:BASELINE,
    savedAt:new Date().toISOString(), inputs:S
  }, null, 2);
  const name = 'onchainsuite-finance-scenario.json';
  if(window.claude && window.claude.downloads){
    try{ await window.claude.downloads.save({filename:name, data:payload}); toast('Scenario saved'); }
    catch(err){
      const c = err && err.code;
      if(c === 'declined') return;
      toast(c === 'rate_limited' ? 'Try that again in a moment' : 'Could not save the scenario');
    }
    return;
  }
  try{
    const url = URL.createObjectURL(new Blob([payload],{type:'application/json'}));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    toast('Scenario saved');
  }catch(e){ toast('Could not save the scenario'); }
}
function importScenario(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(String(reader.result));
      S = structuredClone(DEFAULTS);
      merge(S, parsed && parsed.inputs ? parsed.inputs : parsed);
      render();
      toast(parsed && parsed.baseline && parsed.baseline !== BASELINE
        ? 'Loaded ' + file.name + ' \u2014 saved against an older baseline'
        : 'Loaded ' + file.name);
    }catch(err){ toast('That file is not a saved scenario'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

let toastTimer;
function toast(msg){
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('on'), 2600);
}

/* ============================================================ */
restore();
wire();
initTips();
initRouting();
render();
armTips();
if(staleScenario) toast('Baseline has changed \u2014 your saved edits were cleared');
