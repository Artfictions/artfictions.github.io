/* explorer.js – interactive charts for Artfictions corpus
   Requires Chart.js 4 + matrix plugin (loaded in explorer.html) */
   (async function () {
    const DATA_URL = 'artfictions_novels.json';
  
    /* DOM shorthand */
    const $ = id => document.getElementById(id);
  
    /* Snapshot controls */
    const dimSelect   = $('dimension');
    const maxInput    = $('maxItems');
    const typeSelect  = $('chartType');
    const dlBtn       = $('downloadBtn');
  
    /* Trend controls */
    const trendDim    = $('trendDimension');
    const trendMax    = $('trendMax');
  
    /* Heatmap controls */
    const dimX        = $('dimX');
    const dimY        = $('dimY');
    const heatmapK    = $('heatmapK');
  
    /* Containers */
    const statsBox    = $('stats');
    const ctx         = $('chartCanvas').getContext('2d');
    const trendCtx    = $('trendCanvas').getContext('2d');
    const heatCtx     = $('heatmapCanvas').getContext('2d');
  
    let novels = [], chart, trendChart, heatChart;
  
    /* Helpers */
    const colour = i => `hsl(${(i * 37) % 360} 65% 55%)`;
    const tidy   = s => (s && String(s).trim()) || 'Unknown';
  
    function extractThemes(novel) {
      const out = [];
      for (let i = 1; i <= 5; i++) {
        const t = tidy(novel[`Theme ${i}`]);
        if (t !== 'Unknown') out.push(t);
      }
      return out;
    }
  
    function getItems(novel, dim) {
      switch (dim) {
        case 'themes':    return extractThemes(novel);
        case 'authors':   return [tidy(novel.Author)];
        case 'countries': return [tidy(novel.Country)];
        case 'languages': return [tidy(novel.Language)];
        case 'publishers':return [tidy(novel.Publisher)];
        case 'years':     return [tidy(novel['Year of Publication'])];
        default:          return [];
      }
    }
  
    /* Update summary cards */
    function updateStats(counts) {
      statsBox.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${counts.totalNovels}</div>
          <div class="stat-label">Total novels</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${counts.authors}</div>
          <div class="stat-label">Distinct authors</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${counts.publishers}</div>
          <div class="stat-label">Distinct publishers</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${counts.countries}</div>
          <div class="stat-label">Distinct countries</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${counts.languages}</div>
          <div class="stat-label">Distinct languages</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${counts.themes}</div>
          <div class="stat-label">Distinct themes</div>
        </div>`;
    }
  
    /* Categorical snapshot */
    function summarise(dim, limit) {
      const counts = new Map();
      novels.forEach(novel => {
        getItems(novel, dim).forEach(item => {
          counts.set(item, (counts.get(item) || 0) + 1);
        });
      });
      const sorted = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
      return {
        labels: sorted.map(d => d[0]),
        data:   sorted.map(d => d[1])
      };
    }
  
    function renderChart() {
      const lim = Math.max(3, Math.min(+maxInput.value || 15, 30));
      maxInput.value = lim;
      const info = summarise(dimSelect.value, lim);
      if (chart) chart.destroy();
      chart = new Chart(ctx, {
        type: typeSelect.value,
        data: {
          labels: info.labels,
          datasets: [{
            label: `Count of ${dimSelect.value}`,
            data: info.data,
            backgroundColor: info.labels.map((_, i) => colour(i)),
            borderColor: 'rgba(0,0,0,.1)'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: typeSelect.value !== 'bar' },
            tooltip: {
              callbacks: {
                label(ctx) {
                  if (typeSelect.value === 'bar') return `${ctx.raw}`;
                  const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  return `${ctx.raw} (${((ctx.raw / sum) * 100).toFixed(1)} %)`;
                }
              }
            }
          },
          scales: typeSelect.value === 'bar'
            ? { y: { beginAtZero: true, ticks: { precision:0 } } }
            : {}
        }
      });
    }
  
    /* Temporal trends */
    function buildSeries(dim, topK) {
      const freq = new Map();
      novels.forEach(n => getItems(n, dim).forEach(it => {
        freq.set(it, (freq.get(it) || 0) + 1);
      }));
      const top = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0, topK).map(e=>e[0]);
  
      const matrix = {};
      novels.forEach(n => {
        const y = parseInt(n['Year of Publication']);
        if (!y) return;
        if (!matrix[y]) matrix[y] = Object.fromEntries(top.map(t=>[t,0]));
        getItems(n, dim).forEach(it => { if (top.includes(it)) matrix[y][it]++; });
      });
  
      const years = Object.keys(matrix).map(Number).sort((a,b)=>a-b);
      const datasets = top.map((cat,i)=>({
        label: cat,
        data: years.map(y=>matrix[y][cat]),
        borderColor: colour(i),
        tension: .15,
        fill: false
      }));
      return { years, datasets };
    }
  
    function renderTrend() {
      const k = Math.min(Math.max(+trendMax.value || 5, 1), 10);
      trendMax.value = k;
      const { years, datasets } = buildSeries(trendDim.value, k);
      if (trendChart) trendChart.destroy();
      trendChart = new Chart(trendCtx, {
        type: 'line',
        data: { labels: years, datasets },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } },
          scales: { y: { beginAtZero: true, ticks: { precision:0 } } }
        }
      });
    }
  
    /* Intersection heatmap */
    function buildIntersection(dim1, dim2, K) {
      const freq1 = new Map(), freq2 = new Map();
      novels.forEach(n => {
        getItems(n, dim1).forEach(a => freq1.set(a, (freq1.get(a)||0)+1));
        getItems(n, dim2).forEach(b => freq2.set(b, (freq2.get(b)||0)+1));
      });
      const top1 = [...freq1.entries()].sort((a,b)=>b[1]-a[1]).slice(0,K).map(e=>e[0]);
      const top2 = [...freq2.entries()].sort((a,b)=>b[1]-a[1]).slice(0,K).map(e=>e[0]);
  
      const matrix = {};
      novels.forEach(n => {
        const v1s = getItems(n, dim1), v2s = getItems(n, dim2);
        v1s.forEach(v1 => {
          if (!top1.includes(v1)) return;
          v2s.forEach(v2 => {
            if (!top2.includes(v2)) return;
            matrix[v1] = matrix[v1] || {};
            matrix[v1][v2] = (matrix[v1][v2] || 0) + 1;
          });
        });
      });
  
      const data = [];
      let maxCount = 0;
      top1.forEach((r) => {
        top2.forEach((c) => {
          const v = matrix[r]?.[c] || 0;
          maxCount = Math.max(maxCount, v);
          data.push({ x: c, y: r, v });
        });
      });
  
      return { top1, top2, data, maxCount };
    }
  
    function renderHeatmap() {
      const K = Math.max(3, Math.min(+heatmapK.value||10, 20));
      heatmapK.value = K;
      const { top1, top2, data, maxCount } = buildIntersection(dimX.value, dimY.value, K);
  
      if (heatChart) heatChart.destroy();
      heatChart = new Chart(heatCtx, {
        type: 'matrix',
        data: {
          datasets: [{
            label: `${dimX.value} × ${dimY.value}`,
            data,
            backgroundColor(ctx) {
              const v = ctx.dataset.data[ctx.dataIndex].v;
              const lum = 90 - (v / maxCount) * 60;
              return `hsl(210,60%,${lum}%)`;
            },
            width: ({chart}) => (chart.chartArea?.width  / top2.length) - 1,
            height:({chart}) => (chart.chartArea?.height / top1.length) - 1,
            borderWidth: 1,
            borderColor: 'white'
          }]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'category',
              labels: top2,
              offset: true,
              grid: { display: false },
              title: { display: true, text: dimY.value }
            },
            y: {
              type: 'category',
              labels: top1,
              offset: true,
              grid: { display: false },
              title: { display: true, text: dimX.value }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                title() { return ''; },
                label(ctx) {
                  const { x, y, v } = ctx.raw;
                  return `${y} × ${x}: ${v} novels`;
                }
              }
            },
            legend: { display: false }
          }
        }
      });
    }
  
    /* Event listeners */
    [dimSelect, maxInput, typeSelect].forEach(el => el.addEventListener('input', renderChart));
    [trendDim, trendMax].forEach(el => el.addEventListener('input', renderTrend));
    [dimX, dimY, heatmapK].forEach(el => el.addEventListener('input', renderHeatmap));
    dlBtn.addEventListener('click', () => {
      if (!chart) return;
      const link = document.createElement('a');
      link.href = chart.toBase64Image('image/png', 1);
      link.download = `artfictions_${dimSelect.value}.png`;
      link.click();
    });
  
    /* Load data & initialise */
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`Dataset load failed (${res.status})`);
      const raw = await res.json();
      novels = Array.isArray(raw) ? raw : raw.Novels || [];
      if (!Array.isArray(novels)) throw new Error('Could not locate novels array');
  
      novels.forEach(n => {
        n.Author    = tidy(n.Author);
        n.Country   = tidy(n.Country);
        n.Language  = tidy(n.Language);
        n.Publisher = tidy(n.Publisher);
        n['Year of Publication'] = tidy(n['Year of Publication']);
      });
  
      const allAuthors    = new Set(novels.map(n => n.Author));
      const allPublishers = new Set(novels.map(n => n.Publisher));
      const allCountries  = new Set(novels.map(n => n.Country));
      const allLanguages  = new Set(novels.map(n => n.Language));
      const allThemes     = new Set(novels.flatMap(n => extractThemes(n)));
  
      updateStats({
        totalNovels: novels.length,
        authors:    allAuthors.size,
        publishers: allPublishers.size,
        countries:  allCountries.size,
        languages:  allLanguages.size,
        themes:     allThemes.size
      });
  
      renderChart();
      renderTrend();
      renderHeatmap();
  
    } catch (err) {
      ctx.canvas.parentNode.innerHTML =
        `<p style="color:#b00;font-weight:600">Error: ${err.message}</p>`;
      console.error(err);
    }
  })();
  