// Data Explorer visualisation module – **FULL FILE**
// -------------------------------------------------------
// Loads artfictions_novels.json, aggregates the data and renders:
//   • Four pie charts (countries, languages, publishers, themes)
//   • Two bar charts  (years, prolific authors)
//   • Temporal trend line (novels per year)
//   • Sankey diagram    (country → publisher)
//   • Chord diagram     (language ⇄ theme)
//   • Parallel‑coordinates plot (year, language‑count, theme‑count)
// Wrapped in an IIFE; the only global side‑effect is init().
// -------------------------------------------------------
(async function () {
  // -------------------- GLOBAL STATE --------------------
  let novels = [];
  let processedData = {};

  // Colour scales
  const colour = d3.scaleOrdinal(d3.schemeCategory10);
  const defaultMargin = { top: 20, right: 20, bottom: 40, left: 40 };
  const defaultHeight = 250;

  // -------------------------------------------------------
  // INITIALISATION
  // -------------------------------------------------------
  async function init() {
    try {
      const response = await fetch('artfictions_novels.json');
      const data = await response.json();

      // Accept either a bare array or the { Novels: […] } wrapper
      const raw = Array.isArray(data) ? data : data.Novels || [];
      novels = preprocessData(raw);
      processedData = aggregate(novels);

      drawStatisticalCharts();
      drawTemporalTrends();
      drawSankeyDiagram();
      drawChordDiagram();
      drawParallelCoordinates();
    } catch (err) {
      console.error('Error initialising explorer:', err);
    }
  }

  // -------------------------------------------------------
  // DATA HANDLING
  // -------------------------------------------------------
  function preprocessData(raw) {
    return raw.map(d => {
      // Collect up to five theme columns
      const themes = [];
      for (let i = 1; i <= 5; i++) {
        const k = `Theme ${i}`;
        if (d[k] && String(d[k]).trim()) themes.push(String(d[k]).trim());
      }

      // Split languages on common delimiters
      const languages = d.Language
        ? String(d.Language).split(/[;,/]/).map(s => s.trim()).filter(Boolean)
        : [];

      return {
        ...d,                                 // keep original keys
        /* normalised helpers (used everywhere else) --------------------- */
        author   : d.Author    ? String(d.Author).trim()    : 'Unknown',
        _year    : d['Year of Publication'] ? +d['Year of Publication'] || null : null,
        _country : d.Country   ? String(d.Country).trim()   : 'Unknown',
        _publisher: d.Publisher? String(d.Publisher).trim() : 'Unknown',
        _languages: languages,
        _themes   : themes
      };
    });
  }

  function aggregate(novels) {
    const agg = {
      countries : new Map(),
      languages : new Map(),
      publishers: new Map(),
      themes    : new Map(),
      years     : new Map(),
      authors   : new Map(),
      links     : {
        countryPublisher: new Map(),
        languageTheme   : new Map(),
        countryLanguage : new Map()
      }
    };

    novels.forEach(n => {
      inc(agg.countries , n._country);
      inc(agg.publishers, n._publisher);
      inc(agg.years     , n._year);
      inc(agg.authors   , n.author);
      n._languages.forEach(l => inc(agg.languages, l));
      n._themes.forEach   (t => inc(agg.themes   , t));

      addLink(agg.links.countryPublisher, n._country, n._publisher);
      n._languages.forEach(l => addLink(agg.links.countryLanguage, n._country, l));
      n._languages.forEach(l => n._themes.forEach(t => addLink(agg.links.languageTheme, l, t)));
    });
    return agg;
  }

  const inc = (map, key) => key != null && map.set(key, (map.get(key) || 0) + 1);
  const addLink = (map, a, b) => map.set(`${a}|||${b}`, (map.get(`${a}|||${b}`) || 0) + 1);

  // -------------------------------------------------------
  //  VISUALISATIONS
  // -------------------------------------------------------

  /* A. Statistical charts (pies + bars) */
  function drawStatisticalCharts() {
    createPie('country-chart' , processedData.countries , 'Countries');
    createPie('language-chart', processedData.languages , 'Languages');
    createPie('publisher-chart', processedData.publishers, 'Publishers');
    createPie('theme-chart'   , processedData.themes    , 'Themes');
    createBar('year-chart'    , processedData.years     , 'Publication Years');
    createBar('author-chart'  , processedData.authors   , 'Prolific Authors');
  }

  function createPie(id, map, title) {
    const el = document.getElementById(id); if (!el) return;
    const margin = { ...defaultMargin, left: 20 };
    const w = el.offsetWidth - margin.left - margin.right;
    const h = defaultHeight - margin.top - margin.bottom;
    const r = Math.min(w, h) / 2;

    const svg = d3.select(el).append('svg')
      .attr('width',  w + margin.left + margin.right)
      .attr('height', h + margin.top  + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left + w / 2},${margin.top + h / 2})`);

    svg.append('text')
      .attr('x', margin.left)
      .attr('y', margin.top - 6)
      .attr('font-weight', 600)
      .text(title);

    const pie = d3.pie().sort(null).value(d => d[1]);
    const arc = d3.arc().outerRadius(r - 10).innerRadius(r * 0.5);

    g.selectAll('path')
      .data(pie([...map]))
      .enter().append('path')
        .attr('d', arc)
        .attr('fill', (d, i) => colour(i))
        .append('title')
          .text(d => `${d.data[0]}: ${d.data[1]}`);
  }

  function createBar(id, map, title) {
    const el = document.getElementById(id); if (!el) return;
    const margin = { ...defaultMargin };
    const w = el.offsetWidth - margin.left - margin.right;
    const h = defaultHeight - margin.top - margin.bottom;

    const svg = d3.select(el).append('svg')
      .attr('width',  w + margin.left + margin.right)
      .attr('height', h + margin.top  + margin.bottom);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', margin.top - 6)
      .attr('font-weight', 600)
      .text(title);

    const data = [...map].sort((a, b) => b[1] - a[1]).slice(0, 15);
    const x = d3.scaleBand().domain(data.map(d => d[0])).range([0, w]).padding(0.1);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d[1])]).nice().range([h, 0]);

    g.selectAll('rect').data(data).enter().append('rect')
      .attr('x', d => x(d[0])).attr('y', d => y(d[1]))
      .attr('width', x.bandwidth()).attr('height', d => h - y(d[1]))
      .attr('fill', (d, i) => colour(i));

    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
        .attr('transform', 'rotate(-40)')
        .style('text-anchor', 'end');

    g.append('g').call(d3.axisLeft(y).ticks(5));
  }

  /* B. Temporal trend line */
  function drawTemporalTrends() {
    const el = document.getElementById('temporal-chart');  // ← ID fixed
    if (!el) return;

    const margin = { ...defaultMargin };
    const w = el.offsetWidth - margin.left - margin.right;
    const h = defaultHeight - margin.top - margin.bottom;

    const years = [...processedData.years]
      .filter(d => d[0])
      .sort((a, b) => a[0] - b[0]);

    const x = d3.scaleLinear()
      .domain(d3.extent(years, d => d[0]))
      .range([0, w]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(years, d => d[1])])
      .nice()
      .range([h, 0]);

    const line = d3.line().x(d => x(d[0])).y(d => y(d[1]));

    const svg = d3.select(el).append('svg')
      .attr('width',  w + margin.left + margin.right)
      .attr('height', h + margin.top  + margin.bottom);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', margin.top - 6)
      .attr('font-weight', 600)
      .text('Novels per Year');

    g.append('path')
      .datum(years)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2)
      .attr('d', line);

    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('d')));

    g.append('g').call(d3.axisLeft(y).ticks(5));
  }

  /* C. Sankey diagram (country → publisher) */
  function drawSankeyDiagram() {
    const el = document.getElementById('sankey-chart'); if (!el) return;
    const margin = { ...defaultMargin };
    const w = el.offsetWidth - margin.left - margin.right;
    const h = 300;

    const linksRaw = [...processedData.links.countryPublisher];
    const nodes = new Map();
    linksRaw.forEach(([k]) => {
      const [s, t] = k.split('|||');
      nodes.set(s, { name: s });
      nodes.set(t, { name: t });
    });
    const links = linksRaw.map(([k, v]) => {
      const [s, t] = k.split('|||');
      return { source: s, target: t, value: v };
    });

    const sankey = d3.sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [w - 1, h - 5]]);

    const graph = sankey({ nodes: [...nodes.values()], links });

    const svg = d3.select(el).append('svg')
      .attr('width',  w + margin.left + margin.right)
      .attr('height', h + margin.top  + margin.bottom);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g').selectAll('rect')
      .data(graph.nodes)
      .enter().append('rect')
        .attr('x', d => d.x0).attr('y', d => d.y0)
        .attr('width',  d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', 'steelblue')
        .append('title')
          .text(d => `${d.name}: ${d.value}`);

    g.append('g')
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('stroke-opacity', 0.2)
      .selectAll('path')
        .data(graph.links)
        .enter().append('path')
          .attr('d', d3.sankeyLinkHorizontal())
          .attr('stroke-width', d => Math.max(1, d.width));
  }

  /* D. Chord diagram (language ⇄ theme) */
  function drawChordDiagram() {
    const el = document.getElementById('chord-chart'); if (!el) return;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const size   = Math.min(el.offsetWidth, 300) - margin.left - margin.right;
    const innerR = size / 2 - 20;
    const outerR = innerR + 10;

    const langs  = [...processedData.languages].sort((a, b) => b[1] - a[1]).slice(0, 10).map(d => d[0]);
    const themes = [...processedData.themes   ].sort((a, b) => b[1] - a[1]).slice(0, 10).map(d => d[0]);

    const matrix = Array.from({ length: langs.length }, () => Array(themes.length).fill(0));
    [...processedData.links.languageTheme].forEach(([k, v]) => {
      const [l, t] = k.split('|||');
      const i = langs.indexOf(l);
      const j = themes.indexOf(t);
      if (i >= 0 && j >= 0) matrix[i][j] = v;
    });

    const chord  = d3.chord().padAngle(0.05)(matrix);
    const arc    = d3.arc().innerRadius(innerR).outerRadius(outerR);
    const ribbon = d3.ribbon().radius(innerR);

    const svg = d3.select(el).append('svg')
      .attr('width',  size + margin.left + margin.right)
      .attr('height', size + margin.top  + margin.bottom)
      .append('g')
        .attr('transform', `translate(${(size + margin.left + margin.right) / 2},
                                       ${(size + margin.top  + margin.bottom) / 2})`);

    svg.append('g').selectAll('g')
      .data(chord.groups)
      .enter().append('g')
        .append('path')
          .attr('d', arc)
          .attr('fill', d => colour(d.index))
          .append('title')
            .text(d => `${langs[d.index]}: ${d.value}`);

    svg.append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.6)
      .selectAll('path')
        .data(chord)
        .enter().append('path')
          .attr('d', ribbon)
          .attr('stroke', d => colour(d.source.index))
          .attr('fill',  d => colour(d.source.index))
          .append('title')
            .text(d => `${langs[d.source.index]} → ${themes[d.target.index]}: ${d.source.value}`);
  }

  /* E. Parallel‑coordinates plot */
  function drawParallelCoordinates() {
    const el = document.getElementById('parallel-chart'); if (!el) return;
    const margin = { ...defaultMargin };
    const w = el.offsetWidth - margin.left - margin.right;
    const h = 300 - margin.top - margin.bottom;

    // Flat table [{year, langCount, themeCount}]
    const data = novels.map(n => ({
      year : n._year || 0,
      lang : n._languages.length,
      theme: n._themes.length
    })).filter(d => d.year);

    const dims = ['year', 'lang', 'theme'];
    const yScales = {
      year : d3.scaleLinear().domain(d3.extent(data, d => d.year )).range([h, 0]),
      lang : d3.scaleLinear().domain([0, d3.max(data, d => d.lang )]).range([h, 0]),
      theme: d3.scaleLinear().domain([0, d3.max(data, d => d.theme)]).range([h, 0])
    };
    const x = d3.scalePoint().domain(dims).range([0, w]);

    const line = d3.line();
    const path = d => line(dims.map(p => [x(p), yScales[p](d[p])]));

    const svg = d3.select(el).append('svg')
      .attr('width',  w + margin.left + margin.right)
      .attr('height', h + margin.top  + margin.bottom);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Background lines
    g.append('g')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1)
      .selectAll('path')
      .data(data)
      .enter().append('path')
        .attr('d', path)
        .attr('fill', 'none');

    // Axes
    dims.forEach(dim => {
      g.append('g')
        .attr('transform', `translate(${x(dim)},0)`)
        .call(d3.axisLeft(yScales[dim]))
        .append('text')
          .attr('y', -9)
          .attr('text-anchor', 'middle')
          .attr('font-weight', 600)
          .text(dim.toUpperCase());
    });
  }

  // -------------------------------------------------------
  // KICK OFF
  // -------------------------------------------------------
  init();
})();
