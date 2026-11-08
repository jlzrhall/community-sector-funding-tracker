(function () {
  'use strict';
  const COLORS = ['#0f5257', '#c98a1b', '#6b3e5e', '#4a8c8f', '#a63d2f'];
  const CATS = ['Salaries', 'On-costs', 'Operating', 'Admin and overheads', 'Client costs'];
  const aud = n => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
  const state = { programs: [], lines: [], rates: [], charts: {} };

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    const head = rows.shift();
    return rows.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
  }

  async function load(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Could not load ' + path + ' (' + res.status + ')');
    return res.text();
  }

  function calc(fy) {
    const warnings = [];
    const progs = state.programs.filter(p => p.fy === fy).map(p => {
      const lines = state.lines.filter(l => l.program_id === p.program_id && l.fy === fy);
      const by = c => lines.filter(l => l.category === c).reduce((s, l) => s + +l.amount, 0);
      const total = +p.total_funding, fte = +p.fte_funded;
      const sum = lines.reduce((s, l) => s + +l.amount, 0);
      if (Math.abs(sum - total) > 1) warnings.push(p.program_id + ': funding lines (' + aud(sum) + ') do not match total funding (' + aud(total) + ').');
      const rate = state.rates.find(r => r.classification === p.staff_level && r.fy === fy);
      let benchmark = null;
      if (rate) benchmark = +rate.annual_salary_ft * (1 + +rate.oncost_rate);
      else warnings.push(p.program_id + ': no SCHADS rate for ' + p.staff_level + ' in ' + fy + '.');
      const funded = fte > 0 ? (by('Salaries') + by('On-costs')) / fte : 0;
      return {
        ...p, total, fte, funded, benchmark,
        coverage: benchmark ? funded / benchmark : null,
        gap: benchmark ? benchmark - funded : null,
        comp: Object.fromEntries(CATS.map(c => [c, by(c)]))
      };
    });
    return { progs, warnings };
  }

  function chart(id, config) {
    if (state.charts[id]) state.charts[id].destroy();
    state.charts[id] = new Chart(document.getElementById(id), config);
  }

  function table(id, heads, rows) {
    document.getElementById(id).innerHTML =
      '<thead><tr>' + heads.map(h => '<th class="' + (h.num ? 'num' : '') + '">' + h.t + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map((c, i) => '<td class="' + (heads[i].num ? 'num' : '') + (c.cls ? ' ' + c.cls : '') + '">' + (c.v !== undefined ? c.v : c) + '</td>').join('') + '</tr>').join('') +
      '</tbody>';
  }

  function render() {
    const fy = document.getElementById('fy').value;
    const { progs, warnings } = calc(fy);
    document.getElementById('warnings').innerHTML = warnings.map(w => '<div class="warn">' + w + '</div>').join('');
    const label = p => p.program_id + ' ' + p.provider;

    const total = progs.reduce((s, p) => s + p.total, 0);
    const fte = progs.reduce((s, p) => s + p.fte, 0);
    const withCov = progs.filter(p => p.coverage !== null);
    const avgCov = withCov.length ? withCov.reduce((s, p) => s + p.coverage, 0) / withCov.length : null;
    document.getElementById('stats').innerHTML = [
      [aud(total), 'Total funding'], [progs.length, 'Programs'], [fte.toFixed(1), 'FTE funded'],
      [avgCov === null ? 'n/a' : (avgCov * 100).toFixed(0) + '%', 'Average SCHADS coverage']
    ].map(s => '<div class="stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>').join('');
    chart('chartOverview', {
      type: 'bar',
      data: { labels: progs.map(label), datasets: [{ label: 'Total funding (AUD)', data: progs.map(p => p.total), backgroundColor: COLORS[0] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Total funding by program, ' + fy } }, scales: { y: { ticks: { callback: v => aud(v) } } } }
    });
    table('tblOverview',
      [{ t: 'Program' }, { t: 'Provider' }, { t: 'State' }, { t: 'Type' }, { t: 'FTE', num: 1 }, { t: 'Funding', num: 1 }],
      progs.map(p => [p.program_name, p.provider, p.state, p.program_type, p.fte.toFixed(1), aud(p.total)]));

    chart('chartSchads', {
      type: 'bar',
      data: {
        labels: progs.map(label),
        datasets: [
          { label: 'Funded labour cost per FTE', data: progs.map(p => p.funded), backgroundColor: COLORS[0] },
          { label: 'SCHADS benchmark per FTE', data: progs.map(p => p.benchmark), backgroundColor: COLORS[1] }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => aud(v) } } } }
    });
    table('tblSchads',
      [{ t: 'Program' }, { t: 'Level' }, { t: 'Funded / FTE', num: 1 }, { t: 'Benchmark / FTE', num: 1 }, { t: 'Coverage', num: 1 }, { t: 'Gap / FTE', num: 1 }],
      progs.map(p => [p.program_name, p.staff_level, aud(p.funded),
        p.benchmark ? aud(p.benchmark) : 'n/a',
        p.coverage === null ? 'n/a' : { v: (p.coverage * 100).toFixed(0) + '%', cls: p.coverage < 1 ? 'neg' : '' },
        p.gap === null ? 'n/a' : { v: aud(p.gap), cls: p.gap > 0 ? 'neg' : '' }]));

    chart('chartComp', {
      type: 'bar',
      data: {
        labels: progs.map(label),
        datasets: CATS.map((c, i) => ({ label: c, backgroundColor: COLORS[i], data: progs.map(p => p.total ? p.comp[c] / p.total * 100 : 0) }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true, max: 100, ticks: { callback: v => v + '%' } } },
        plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + '%' } } }
      }
    });
  }

  function md(src) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
    let out = '', list = false;
    src.split('\n').forEach(l => {
      const li = l.match(/^- (.*)/);
      if (li) { if (!list) { out += '<ul>'; list = true; } out += '<li>' + inline(li[1]) + '</li>'; return; }
      if (list) { out += '</ul>'; list = false; }
      const h = l.match(/^(#{1,3}) (.*)/);
      if (h) out += '<h' + (h[1].length + 1) + '>' + inline(h[2]) + '</h' + (h[1].length + 1) + '>';
      else if (l.trim()) out += '<p>' + inline(l) + '</p>';
    });
    return out + (list ? '</ul>' : '');
  }

  function route() {
    const page = (location.hash || '#overview').slice(1);
    const valid = ['overview', 'schads', 'composition', 'methodology'].includes(page) ? page : 'overview';
    document.querySelectorAll('.page').forEach(s => s.classList.toggle('active', s.id === valid));
    document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.dataset.page === valid));
    document.querySelector('.controls').style.display = valid === 'methodology' ? 'none' : 'flex';
  }

  async function init() {
    try {
      const [p, l, r, m] = await Promise.all([
        load('data/programs.csv'), load('data/funding_lines.csv'), load('data/schads_rates.csv'), load('methodology.md')
      ]);
      state.programs = parseCSV(p); state.lines = parseCSV(l); state.rates = parseCSV(r);
      document.getElementById('mdBody').innerHTML = md(m);
      const years = [...new Set(state.programs.map(x => x.fy))].sort().reverse();
      const sel = document.getElementById('fy');
      sel.innerHTML = years.map(y => '<option>' + y + '</option>').join('');
      sel.addEventListener('change', render);
      window.addEventListener('hashchange', route);
      route(); render();
    } catch (e) {
      document.getElementById('warnings').innerHTML = '<div class="warn">' + e.message + '. If you opened this file directly, serve the folder with a local web server (see README).</div>';
    }
  }
  init();
})();
