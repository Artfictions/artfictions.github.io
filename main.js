// explorer.js — drop‑in replacement (June 2025)
//
// Renders six D3 visualisations over the Artfictions dataset.
// - 4 pies  + 2 bars      (statistical overview)
// - trend line            (temporal section)
// - Sankey diagram        (flows)
// - parallel coordinates  (multi‑dimensional section)
// - chord diagram         (relationship networks)
//
// The code is wrapped in an IIFE so it does not leak globals
// except for the single `init()` kick‑off call at the end.
(async function () {
  /* ------------------------------------------------------------------
   *  GLOBAL STATE & HELPER UTILS
   * ------------------------------------------------------------------ */
  let novels = [];
  let agg    = {};
  const colour   = d3.scaleOrdinal(d3.schemeTableau10);
  const margin   = { top: 20, right: 20, bottom: 40, left: 50 };
  const defaultH = 250;

  const inc     = (map, k)         => k != null && map.set(k, (map.get(k) || 0) + 1);
  const addLink = (map, a, b)      => map.set(`${a}|||${b}`, (map.get(`${a}|||${b}`) || 0) + 1);
  const split   = (s)              => String(s).split(/[;,/]/).map(d => d.trim()).filter(Boolean);

  /* ------------------------------------------------------------------
   *  LOAD + PRE‑PROCESS
   * ------------------------------------------------------------------ */
  async function init () {
    try {
      const res  = await fetch('artfictions_novels.json');
      const raw  = await res.json();
      const base = Array.isArray(raw) ? raw : raw.Novels || [];

      novels = preprocess(base);
      agg    = aggregate(novels);

      drawStatisticalOverview();
      drawTemporalTrend();
      drawSankey();
      drawChord();
      drawParallel();
    } catch (err) {
      console.error('Data‑explorer init error:', err);
    }
  }

  function preprocess (rows) {
    return rows.map(r => {
      /* themes ----------------------------------------------------------------- */
      const themes = [];
      for (let i = 1; i <= 5; i++) {
        const t = r[`Theme ${i}`];
        if (t && String(t).trim()) themes.push(String(t).trim());
      }
      return {
        ...r,
        author     : r.Author      ? String(r.Author).trim()      : 'Unknown',
        _year      : r['Year of Publication'] ? +r['Year of Publication'] || null : null,
        _country   : r.Country     ? String(r.Country).trim()     : 'Unknown',
        _publisher : r.Publisher   ? String(r.Publisher).trim()   : 'Unknown',
        _languages : r.Language    ? split(r.Language)           : [],
        _themes    : themes
      };
    });
  }

  function aggregate (data) {
    const out = {
      countries : new Map(),  languages : new Map(), publishers : new Map(),
      themes    : new Map(),  years     : new Map(), authors    : new Map(),
      links     : { countryPublisher : new Map(), languageTheme : new Map(), countryLanguage : new Map() }
    };

    data.forEach(n => {
      inc(out.countries , n._country);
      inc(out.publishers, n._publisher);
      inc(out.years     , n._year);
      inc(out.authors   , n.author);
      n._languages.forEach(l => inc(out.languages, l));
      n._themes   .forEach(t => inc(out.themes   , t));

      addLink(out.links.countryPublisher, n._country, n._publisher);
      n._languages.forEach(l => addLink(out.links.countryLanguage, n._country, l));
      n._languages.forEach(l => n._themes.forEach(t => addLink(out.links.languageTheme, l, t)));
    });
    return out;
  }

  /* ------------------------------------------------------------------
   *  1. STATISTICAL OVERVIEW (Pies + Bars)
   * ------------------------------------------------------------------ */
  function drawStatisticalOverview () {
    createPie ('country-chart' , agg.countries , 'Countries');
    createPie ('language-chart', agg.languages , 'Languages');
    createPie ('publisher-chart', agg.publishers, 'Publishers');
    createPie ('theme-chart'   , agg.themes    , 'Themes');
    createBar ('year-chart'    , agg.years     , 'Publication years');
    createBar ('author-chart'  , agg.authors   , 'Prolific authors (top 15)');
  }

  function createPie (id, map, title) {
    const host   = document.getElementById(id); if (!host) return;
    const w      = host.offsetWidth  - margin.left - margin.right;
    const h      = defaultH          - margin.top  - margin.bottom;
    const r      = Math.min(w, h) / 2;
    const data   = [...map].sort((a,b) => b[1] - a[1]);
    const arc    = d3.arc().outerRadius(r-5).innerRadius(r*0.45);
    const pieGen = d3.pie().sort(null).value(d => d[1]);

    /* svg */
    const svg = d3.select(host).append('svg')
      .attr('width',  w + margin.left + margin.right + 140)    // room for legend
      .attr('height', h + margin.top  + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left + r},${margin.top + r})`);

    svg.append('text')
      .attr('x', margin.left).attr('y', margin.top - 6)
      .attr('font-weight', 600).text(title);

    /* slices + tooltip */
    const tooltip = ensureTooltip();
    g.selectAll('path')
      .data(pieGen(data)).enter().append('path')
        .attr('d', arc).attr('fill', (d,i) => colour(i)).attr('stroke', '#fff').attr('stroke-width', 1.5)
        .on('mouseover', (e,d) => tooltip.show(e, `${d.data[0]}: ${d.data[1]}`))
        .on('mousemove', tooltip.move)
        .on('mouseout',  tooltip.hide);

    /* legend */
    const lg = svg.append('g').attr('transform', `translate(${margin.left + r*2 + 20},${margin.top})`);
    lg.selectAll('rect').data(data.slice(0, 12)).enter()
      .append('rect')
        .attr('x', 0).attr('y', (d,i) => i*18).attr('width', 14).attr('height', 14)
        .attr('fill', (d,i) => colour(i));
    lg.selectAll('text').data(data.slice(0, 12)).enter()
      .append('text')
        .attr('x', 20).attr('y', (d,i) => i*18 + 12).text(d => `${d[0]} (${d[1]})`)
        .attr('font-size', 11);
    if (data.length > 12) lg.append('text')
      .attr('x',0).attr('y', 12*18)
      .text(`…+${data.length-12} more`)
      .attr('font-size',11).attr('fill','#666');
  }

  function createBar (id, map, title) {
    const host = document.getElementById(id); if (!host) return;
    const w    = host.offsetWidth - margin.left - margin.right;
    const h    = defaultH         - margin.top  - margin.bottom;
    const data = [...map].filter(d => d[0]).sort((a,b) => b[1]-a[1]).slice(0, 15);

    const x = d3.scaleBand().domain(data.map(d=>d[0])).range([0,w]).padding(0.15);
    const y = d3.scaleLinear().domain([0, d3.max(data,d=>d[1])]).nice().range([h,0]);

    const svg = d3.select(host).append('svg')
      .attr('width',  w + margin.left + margin.right)
      .attr('height', h + margin.top  + margin.bottom);

    const g   = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    svg.append('text').attr('x', margin.left).attr('y', margin.top-6).attr('font-weight',600).text(title);

    /* bars + tooltip */
    const tooltip = ensureTooltip();
    g.selectAll('rect').data(data).enter().append('rect')
      .attr('x', d=>x(d[0])).attr('y', d=>y(d[1]))
      .attr('width', x.bandwidth()).attr('height', d=>h-y(d[1]))
      .attr('fill', (d,i) => colour(i))
      .on('mouseover', (e,d)=>tooltip.show(e, `${d[0]}: ${d[1]}`))
      .on('mousemove', tooltip.move)
      .on('mouseout',  tooltip.hide);

    /* axes */
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .selectAll('text').attr('transform','rotate(-35)').style('text-anchor','end');
    g.append('g').call(d3.axisLeft(y).ticks(5));
  }

  /* ------------------------------------------------------------------
   *  2. TEMPORAL TREND
   * ------------------------------------------------------------------ */
  function drawTemporalTrend () {
    const host = document.getElementById('temporal-chart'); if (!host) return;
    const w    = host.offsetWidth - margin.left - margin.right;
    const h    = 300              - margin.top  - margin.bottom;
    const yrs  = [...agg.years].filter(d=>d[0]).sort((a,b)=>a[0]-b[0]);

    const x = d3.scaleLinear().domain(d3.extent(yrs,d=>d[0])).range([0,w]);
    const y = d3.scaleLinear().domain([0,d3.max(yrs,d=>d[1])]).nice().range([h,0]);

    const line = d3.line().x(d=>x(d[0])).y(d=>y(d[1]));

    const svg = d3.select(host).append('svg')
      .attr('width',  w + margin.left + margin.right)
      .attr('height', h + margin.top  + margin.bottom);

    const g   = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    svg.append('text').attr('x',margin.left).attr('y',margin.top-6).attr('font-weight',600).text('Novels per year');

    /* path + tooltip */
    const tooltip = ensureTooltip();
    g.append('path')
      .datum(yrs)
      .attr('fill','none').attr('stroke','#2a5599').attr('stroke-width',2).attr('d',line);

    g.selectAll('circle').data(yrs).enter().append('circle')
      .attr('cx',d=>x(d[0])).attr('cy',d=>y(d[1])).attr('r',3).attr('fill','#2a5599')
      .on('mouseover',(e,d)=>tooltip.show(e, `${d[0]}: ${d[1]}`))
      .on('mousemove',tooltip.move)
      .on('mouseout', tooltip.hide);

    g.append('g').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).tickFormat(d3.format('d')));
    g.append('g').call(d3.axisLeft(y).ticks(5));
  }

  /* ------------------------------------------------------------------
   *  3. SANKEY (country → publisher)
   * ------------------------------------------------------------------ */
  function drawSankey () {
    const host  = document.getElementById('sankey-chart'); if (!host) return;
    const w     = host.offsetWidth - margin.left - margin.right;
    const h     = 350;

    /* build nodes + links */
    const linksRaw = [...agg.links.countryPublisher];
    const nodes    = new Map();
    linksRaw.forEach(([k]) => {
      const [c,p] = k.split('|||');
      nodes.set(c,{name:c}); nodes.set(p,{name:p});
    });
    const links = linksRaw.map(([k,v]) => {
      const [c,p] = k.split('|||'); return { source:c, target:p, value:v };
    });

    /* sankey layout */
    const sankey = d3.sankey().nodePadding(10).nodeWidth(16)
      .extent([[1,1],[w-1,h-6]]);
    const {nodes:n,links:l} = sankey({nodes:[...nodes.values()],links});

    /* svg */
    const svg = d3.select(host).append('svg')
      .attr('width',  w + margin.left + margin.right)
      .attr('height', h + margin.top  + margin.bottom)
      .append('g').attr('transform',`translate(${margin.left},${margin.top})`);

    const tooltip = ensureTooltip();

    svg.append('g').selectAll('path').data(l).enter()
      .append('path')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke', d=>colour(d.index))
        .attr('stroke-width', d=>Math.max(1,d.width))
        .attr('fill','none')
        .attr('stroke-opacity',0.4)
        .on('mouseover',(e,d)=>{ d3.select(e.currentTarget).attr('stroke-opacity',0.8); tooltip.show(e,`${d.source.name} → ${d.target.name}: ${d.value}`); })
        .on('mousemove',tooltip.move)
        .on('mouseout' ,(e)=>{ d3.select(e.currentTarget).attr('stroke-opacity',0.4); tooltip.hide(); });

    const nodeG = svg.append('g').selectAll('g').data(n).enter().append('g');
    nodeG.append('rect')
      .attr('x',d=>d.x0).attr('y',d=>d.y0)
      .attr('width',d=>d.x1-d.x0).attr('height',d=>d.y1-d.y0)
      .attr('fill',d=>colour(d.index)).attr('stroke','#555')
      .on('mouseover',(e,d)=>tooltip.show(e,`${d.name}: ${d.value}`))
      .on('mousemove',tooltip.move)
      .on('mouseout', tooltip.hide);
    nodeG.append('text')
      .attr('x',d=>d.x0< w/2 ? d.x1+6 : d.x0-6)
      .attr('y',d=> (d.y0+d.y1)/2 ).attr('dy','0.35em')
      .attr('text-anchor',d=>d.x0< w/2 ? 'start':'end')
      .style('font-size','11px')
      .text(d=>d.name);
  }

  /* ------------------------------------------------------------------
   *  4. CHORD (language ↔ theme)
   * ------------------------------------------------------------------ */
  function drawChord () {
    const host = document.getElementById('chord-chart'); if (!host) return;
    const box  = Math.min(host.offsetWidth, 340);
    const innerR = box/2 - 20, outerR = innerR + 10;

    /* pick most common langs & themes */
    const langs  = [...agg.languages].sort((a,b)=>b[1]-a[1]).slice(0, 10).map(d=>d[0]);
    const themes = [...agg.themes   ].sort((a,b)=>b[1]-a[1]).slice(0, 10).map(d=>d[0]);

    /* build 10×10 matrix */
    const m = Array.from({length:langs.length}, ()=>Array(themes.length).fill(0));
    [...agg.links.languageTheme].forEach(([k,v])=>{
      const [l,t] = k.split('|||');
      const i = langs.indexOf(l); const j = themes.indexOf(t);
      if (i>-1 && j>-1) m[i][j] = v;
    });

    const chord  = d3.chord().padAngle(0.04)(m);
    const arc    = d3.arc().innerRadius(innerR).outerRadius(outerR);
    const ribbon = d3.ribbon().radius(innerR);

    const svg = d3.select(host).append('svg').attr('width',box).attr('height',box)
      .append('g').attr('transform',`translate(${box/2},${box/2})`);

    const tooltip = ensureTooltip();

    /* arcs */
    svg.append('g').selectAll('path').data(chord.groups).enter().append('path')
      .attr('d',arc).attr('fill',d=>colour(d.index)).attr('stroke','#fff')
      .on('mouseover',(e,d)=>tooltip.show(e,`${langs[d.index]}: ${d.value}`))
      .on('mousemove',tooltip.move)
      .on('mouseout', tooltip.hide);

    /* ribbons */
    svg.append('g').selectAll('path').data(chord).enter().append('path')
      .attr('d',ribbon)
      .attr('fill',d=>colour(d.source.index))
      .attr('stroke','#000').attr('stroke-width',0.5).attr('stroke-opacity',0.2)
      .on('mouseover',(e,d)=>tooltip.show(e,`${langs[d.source.index]} → ${themes[d.target.index]}: ${d.source.value}`))
      .on('mousemove',tooltip.move)
      .on('mouseout', tooltip.hide);
  }

  /* ------------------------------------------------------------------
   *  5. PARALLEL CO‑ORDINATES (year / lang‑count / theme‑count)
   * ------------------------------------------------------------------ */
  function drawParallel () {
    const host = document.getElementById('parallel-chart'); if (!host) return;
    const w    = host.offsetWidth - margin.left - margin.right;
    const h    = 320             - margin.top  - margin.bottom;

    const rows = novels.filter(n=>n._year).map(n=>({
      year : n._year,
      langs: n._languages.length,
      themes: n._themes.length
    }));

    const dims = ['year','langs','themes'];
    const y = {
      year  : d3.scaleLinear().domain(d3.extent(rows,d=>d.year )).range([h,0]),
      langs : d3.scaleLinear().domain([0,d3.max(rows,d=>d.langs )]).range([h,0]),
      themes: d3.scaleLinear().domain([0,d3.max(rows,d=>d.themes)]).range([h,0])
    };
    const x = d3.scalePoint().domain(dims).range([0,w]);

    const line = d3.line();
    const path = d => line(dims.map(p => [x(p), y[p](d[p])]));

    const svg  = d3.select(host).append('svg')
      .attr('width', w+margin.left+margin.right)
      .attr('height',h+margin.top +margin.bottom);
    const g = svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);

    const tooltip = ensureTooltip();

    g.append('g').selectAll('path').data(rows).enter().append('path')
      .attr('d',path).attr('fill','none').attr('stroke','#999').attr('stroke-width',1.2).attr('stroke-opacity',0.4)
      .on('mouseover',(e,d)=>tooltip.show(e,`Year ${d.year} | Langs ${d.langs} | Themes ${d.themes}`))
      .on('mousemove',tooltip.move)
      .on('mouseout', tooltip.hide);

    dims.forEach(p=>{
      g.append('g').attr('transform',`translate(${x(p)},0)`).call(d3.axisLeft(y[p]))
       .append('text').attr('y',-9).attr('text-anchor','middle').attr('font-weight',600).text(p.toUpperCase());
    });
  }

  /* ------------------------------------------------------------------
   *  Tiny tooltip helper (one DOM node reused everywhere)
   * ------------------------------------------------------------------ */
  function ensureTooltip () {
    let tip = document.getElementById('viz‑tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'viz‑tooltip';
      Object.assign(tip.style, {
        position:'absolute',pointerEvents:'none',background:'rgba(0,0,0,0.85)',
        color:'#fff',padding:'6px 10px',borderRadius:'4px',fontSize:'12px',
        opacity:0,transition:'opacity .2s',zIndex:1000
      });
      document.body.appendChild(tip);
      tip.show = (e,html)=>{ tip.innerHTML = html; tip.style.opacity=1; tip.move(e); };
      tip.move = e => { tip.style.left = (e.pageX + 14)+'px'; tip.style.top = (e.pageY + 14)+'px'; };
      tip.hide = ()=>{ tip.style.opacity=0; };
    }
    return tip;
  }

  /* ------------------------------------------------------------------ */
  init();   //  ⬅️  kick‑off
})();
