(function () {
  'use strict';
  const C = { baseline: '#23325a', indexation: '#1f7a74', supplementation: '#c98a1b', oneoff: '#7a3e68', schads: '#b23a3a' };
  const aud = n => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
  const yAud = { ticks: { callback: v => aud(v) } };
  const S = { rows: [], schads: {}, charts: {} };

  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = [];
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    const head = rows.shift();
    return rows.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
  }
  async function load(p) { const r = await fetch(p); if (!r.ok) throw new Error('Could not load ' + p + ' (' + r.status + ')'); return r.text(); }

  function compute(progId, incOneOff) {
    const warnings = [];
    const ids = progId === 'all' ? [...new Set(S.rows.map(r => r.program_id))] : [progId];
    const years = [...new Set(S.rows.filter(r => ids.includes(r.program_id)).map(r => r.year))].sort();
    const agg = Object.fromEntries(years.map(y => [y, { year: y, baseline: 0, indexation: 0, supplementation: 0, oneoff: 0, actual: 0, indexed: 0 }]));
    const events = [];
    ids.forEach(id => {
      const rows = S.rows.filter(r => r.program_id === id).sort((a, b) => a.year.localeCompare(b.year));
      let prev = null, idx = 0;
      rows.forEach((r, i) => {
        const v = { b: +r.baseline_funding, i: +r.indexation_funding, s: +r.supplementation_funding, o: +r.one_off_funding };
        if (Object.values(v).some(x => isNaN(x) || x < 0)) warnings.push(id + ' ' + r.year + ': funding values must be numbers of zero or more.');
        const pct = S.schads[r.year];
        if (pct === undefined) { warnings.push('No SCHADS increase for ' + r.year + '; treated as 0%.'); }
        idx = i === 0 ? v.b : idx * (1 + (pct || 0) / 100);
        const a = agg[r.year];
        a.baseline += v.b; a.indexation += v.i; a.supplementation += v.s; a.oneoff += v.o;
        a.actual += v.b + v.i + v.s + (incOneOff ? v.o : 0);
        a.indexed += idx;
        const add = (type, amount, note) => events.push({ year: r.year, program: r.program_name, type, amount, note });
        if (prev !== null && v.b !== prev) add('Baseline adjustment', v.b - prev, 'Baseline changed from ' + aud(prev) + ' to ' + aud(v.b));
        if (v.i) add('Indexation', v.i, r.note);
        if (v.s) add('Supplementation', v.s, r.note);
        if (v.o) add('One-off', v.o, r.note);
        prev = v.b;
      });
    });
    let cum = 0;
    const list = years.map(y => {
      const a = agg[y]; a.gap = a.indexed - a.actual; cum += a.gap; a.cum = cum; a.total = a.baseline + a.indexation + a.supplementation + a.oneoff; return a;
    });
    events.sort((x, y) => y.year.localeCompare(x.year) || x.program.localeCompare(y.program));
    return { list, events, warnings: [...new Set(warnings)] };
  }

  function chart(id, cfg) {
    if (S.charts[id]) S.charts[id].destroy();
    cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false }, cfg.options);
    S.charts[id] = new Chart(document.getElementById(id), cfg);
  }
  function table(id, heads, rows) {
    document.getElementById(id).innerHTML = '<thead><tr>' + heads.map(h => '<th class="' + (h.num ? 'num' : '') + '">' + h.t + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map((c, i) => '<td class="' + (heads[i].num ? 'num' : '') + (c && c.cls ? ' ' + c.cls : '') + '">' + (c && c.v !== undefined ? c.v : c) + '</td>').join('') + '</tr>').join('') + '</tbody>';
  }
  const line = (label, data, color, extra) => Object.assign({ label, data, borderColor: color, backgroundColor: color, tension: 0.2 }, extra);
  const pct = (a, b) => b ? ((a - b) / b * 100).toFixed(1) + '%' : 'n/a';

  function render() {
    const incOne = document.getElementById('oneoff').checked;
    const { list, events, warnings } = compute(document.getElementById('prog').value, incOne);
    document.getElementById('warnings').innerHTML = warnings.map(w => '<div class="warn">' + w + '</div>').join('');
    if (!list.length) return;
    const years = list.map(r => r.year), first = list[0], last = list[list.length - 1];
    const sum = k => list.reduce((s, r) => s + r[k], 0);
    const totalAll = sum('total');

    // Overview: answers to the six questions
    const A = [
      ['1. Baseline funding over time', aud(last.baseline), 'From ' + aud(first.baseline) + ' in ' + first.year + ' (' + pct(last.baseline, first.baseline) + ' change)'],
      ['2. Funding through indexation', aud(sum('indexation')), (totalAll ? (sum('indexation') / totalAll * 100).toFixed(1) : 0) + '% of all funding, ' + first.year + ' to ' + last.year],
      ['3. Funding through supplementation', aud(sum('supplementation')), (totalAll ? (sum('supplementation') / totalAll * 100).toFixed(1) : 0) + '% of all funding'],
      ['4. SCHADS-indexed funding, ' + last.year, aud(last.indexed), 'Actual funding was ' + aud(last.actual)],
      ['5. Annual funding gap, ' + last.year, aud(last.gap), last.gap > 0 ? 'Shortfall against SCHADS-indexed funding' : 'Funding ahead of SCHADS-indexed funding'],
      ['6. Cumulative funding gap', aud(last.cum), 'Total from ' + first.year + ' to ' + last.year]
    ];
    document.getElementById('answers').innerHTML = A.map((a, i) => '<div class="answer' + (i > 3 && parseFloat(a[1].replace(/[^0-9.-]/g, '')) > 0 ? ' alert' : '') + '"><small>' + a[0] + '</small><b>' + a[1] + '</b><span>' + a[2] + '</span></div>').join('');
    chart('cOverview', { type: 'line', data: { labels: years, datasets: [line('Actual funding', list.map(r => r.actual), C.baseline), line('SCHADS-indexed funding', list.map(r => r.indexed), C.schads, { borderDash: [6, 4] })] }, options: { scales: { y: yAud } } });

    // History
    chart('cHistory', { type: 'line', data: { labels: years, datasets: [line('Baseline funding', list.map(r => r.baseline), C.baseline), line('Total funding', list.map(r => r.total), C.indexation)] }, options: { scales: { y: yAud } } });
    table('tHistory', [{ t: 'Year' }, { t: 'Baseline', num: 1 }, { t: 'Baseline change', num: 1 }, { t: 'Total funding', num: 1 }],
      list.map((r, i) => [r.year, aud(r.baseline), i ? aud(r.baseline - list[i - 1].baseline) : '-', aud(r.total)]));

    // Composition
    chart('cComp', { type: 'bar', data: { labels: years, datasets: [
      { label: 'Baseline', data: list.map(r => r.baseline), backgroundColor: C.baseline },
      { label: 'Indexation', data: list.map(r => r.indexation), backgroundColor: C.indexation },
      { label: 'Supplementation', data: list.map(r => r.supplementation), backgroundColor: C.supplementation },
      { label: 'One-off', data: list.map(r => r.oneoff), backgroundColor: C.oneoff }] },
      options: { scales: { x: { stacked: true }, y: Object.assign({ stacked: true }, yAud) } } });

    // vs SCHADS
    chart('cVs', { type: 'line', data: { labels: years, datasets: [line('Actual funding', list.map(r => r.actual), C.baseline), line('SCHADS-indexed funding', list.map(r => r.indexed), C.schads, { borderDash: [6, 4] })] }, options: { scales: { y: yAud } } });
    chart('cGap', { type: 'bar', data: { labels: years, datasets: [{ label: 'Annual gap (positive = shortfall)', data: list.map(r => r.gap), backgroundColor: list.map(r => r.gap > 0 ? C.schads : C.indexation) }] }, options: { scales: { y: yAud } } });
    chart('cCum', { type: 'line', data: { labels: years, datasets: [line('Cumulative gap', list.map(r => r.cum), C.schads, { fill: true, backgroundColor: 'rgba(178,58,58,.15)' })] }, options: { scales: { y: yAud } } });
    table('tVs', [{ t: 'Year' }, { t: 'Actual', num: 1 }, { t: 'SCHADS-indexed', num: 1 }, { t: 'Annual gap', num: 1 }, { t: 'Cumulative gap', num: 1 }],
      list.map(r => [r.year, aud(r.actual), aud(r.indexed), { v: aud(r.gap), cls: r.gap > 0 ? 'neg' : '' }, { v: aud(r.cum), cls: r.cum > 0 ? 'neg' : '' }]));

    // Register
    const type = document.getElementById('evtype').value;
    table('tRegister', [{ t: 'Year' }, { t: 'Program' }, { t: 'Event' }, { t: 'Amount', num: 1 }, { t: 'Note' }],
      events.filter(e => type === 'all' || e.type === type).map(e => [e.year, e.program, e.type, aud(e.amount), e.note || '']));
  }

  function md(src) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
    let out = '', list = false;
    src.split('\n').forEach(l => {
      const li = l.match(/^- (.*)/);
      if (li) { if (!list) { out += '<ul>'; list = true; } out += '<li>' + inl(li[1]) + '</li>'; return; }
      if (list) { out += '</ul>'; list = false; }
      const h = l.match(/^(#{1,3}) (.*)/);
      if (h) out += '<h' + (h[1].length + 1) + '>' + inl(h[2]) + '</h' + (h[1].length + 1) + '>';
      else if (l.trim()) out += '<p>' + inl(l) + '</p>';
    });
    return out + (list ? '</ul>' : '');
  }

  function route() {
    const pages = ['overview', 'history', 'composition', 'schads', 'register', 'methodology'];
    const h = (location.hash || '#overview').slice(1);
    const p = pages.includes(h) ? h : 'overview';
    document.querySelectorAll('.page').forEach(s => s.classList.toggle('active', s.id === p));
    document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.dataset.page === p));
    document.getElementById('controls').style.display = p === 'methodology' ? 'none' : 'flex';
    window.dispatchEvent(new Event('resize'));
  }

  async function init() {
    try {
      const [f, s, m] = await Promise.all([load('data/funding.csv'), load('data/schads_index.csv'), load('methodology.md')]);
      S.rows = parseCSV(f);
      parseCSV(s).forEach(r => { S.schads[r.year] = +r.schads_increase_pct; });
      document.getElementById('mdBody').innerHTML = md(m);
      const progs = [...new Map(S.rows.map(r => [r.program_id, r.program_name])).entries()];
      document.getElementById('prog').innerHTML = '<option value="all">All programs</option>' + progs.map(p => '<option value="' + p[0] + '">' + p[1] + '</option>').join('');
      document.getElementById('evtype').innerHTML = ['all', 'Baseline adjustment', 'Indexation', 'Supplementation', 'One-off'].map(t => '<option value="' + t + '">' + (t === 'all' ? 'All events' : t) + '</option>').join('');
      ['prog', 'oneoff', 'evtype'].forEach(id => document.getElementById(id).addEventListener('change', render));
      window.addEventListener('hashchange', route);
      route(); render();
    } catch (e) {
      document.getElementById('warnings').innerHTML = '<div class="warn">' + e.message + '. If you opened this file directly, serve the folder with a local web server (see README).</div>';
    }
  }
  init();
})();
