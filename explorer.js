/* explorer.js – interactive charts for Artfictions corpus
   Requires Chart.js 4 (loaded in explorer.html) */
   (async function () {
    const DATA_URL = 'artfictions_novels.json';
  
    /* ---------- DOM shorthand ---------- */
    const $ = id => document.getElementById(id);
  
    /* Snapshot chart controls */
    const dimSelect   = $('dimension');
    const maxInput    = $('maxItems');
    const typeSelect  = $('chartType');
    const dlBtn       = $('downloadBtn');
  
    /* Trend chart controls */
    const trendDim    = $('trendDimension');
    const trendMax    = $('trendMax');
  
    /* Containers */
    const statsBox    = $('stats');
    const ctx         = $('chartCanvas').getContext('2d');
    const trendCtx    = $('trendCanvas').getContext('2d');
  
    let novels = [];
    let chart;       // snapshot chart
    let trendChart;  // temporal trend chart
  
    /* ---------- Helpers ---------- */
    const colour = i => `hsl(${(i * 37) % 360} 65% 55%)`;   // deterministic palette
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
  
    /* ---------- Summary cards ---------- */
    function updateStats(totalNovels, distinctAuthors) {
      statsBox.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${totalNovels}</div>
          <div class="stat-label">Total novels</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${distinctAuthors}</div>
          <div class="stat-label">Distinct authors</div>
        </div>`;
    }
  
    /* ---------- Snapshot (categorical) chart ---------- */
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
      const limit = Math.max(3, Math.min(+maxInput.value || 15, 30));
      maxInput.value = limit;
  
      const info = summarise(dimSelect.value, limit);
  
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
            tooltip: { callbacks: {
              label(ctx) {
                if (typeSelect.value === 'bar') return `${ctx.raw}`;
                const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                return `${ctx.raw} (${((ctx.raw / sum) * 100).toFixed(1)} %)`;
              }
            }}
          },
          scales: typeSelect.value === 'bar'
            ? { y: { beginAtZero: true, ticks: { precision:0 } } }
            : {}
        }
      });
    }
  
    /* ---------- Trend chart ---------- */
    function buildSeries(dim, topK) {
      /* 1. pick the overall top‑K categories */
      const freq = new Map();
      novels.forEach(n => getItems(n, dim).forEach(it => {
        freq.set(it, (freq.get(it) || 0) + 1);
      }));
      const top = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0, topK).map(e=>e[0]);
  
      /* 2. build year → category → count matrix */
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
      return {years, datasets};
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
  
    /* ---------- Event listeners ---------- */
    [dimSelect, maxInput, typeSelect].forEach(el => el.addEventListener('input', renderChart));
    [trendDim, trendMax].forEach(el => el.addEventListener('input', renderTrend));
  
    dlBtn.addEventListener('click', () => {
      if (!chart) return;
      const link = document.createElement('a');
      link.href = chart.toBase64Image('image/png', 1);
      link.download = `artfictions_${dimSelect.value}.png`;
      link.click();
    });
  
    /* ---------- Data load ---------- */
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
  
      const distinctAuthors = new Set(novels.map(n => n.Author)).size;
      updateStats(novels.length, distinctAuthors);
  
      /* initial renders */
      renderChart();
      renderTrend();
  
    } catch (err) {
      ctx.canvas.parentNode.innerHTML =
        `<p style="color:#b00;font-weight:600">Error: ${err.message}</p>`;
      console.error(err);
    }
  })();
  