/* explorer.js – interactive charts for Artfictions data explorer
   Relies on Chart.js 4 (loaded in explorer.html) */
(async function () {
  const DATA_URL = 'artfictions_novels.json';
  const dimSelect = document.getElementById('dimension');
  const maxInput  = document.getElementById('maxItems');
  const typeSelect= document.getElementById('chartType');
  const dlBtn     = document.getElementById('downloadBtn');
  const statsBox  = document.getElementById('stats');
  const ctx       = document.getElementById('chartCanvas').getContext('2d');

  let novels = [];
  let chart;   // Chart.js instance

  /* ---------- Helpers ---------- */
  const colour = i => `hsl(${(i * 37) % 360} 65% 55%)`;           // deterministic palette
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

  function summarise(dim, limit) {
    const counts = new Map();
    novels.forEach(novel => {
      getItems(novel, dim).forEach(item => {
        counts.set(item, (counts.get(item) || 0) + 1);
      });
    });

    // Convert to sorted arrays
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return {
      labels: sorted.map(d => d[0]),
      data:   sorted.map(d => d[1]),
      totalDistinct: counts.size
    };
  }

  function updateStats(info, totalNovels) {
    statsBox.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${totalNovels}</div>
        <div class="stat-label">Total novels</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${info.totalDistinct}</div>
        <div class="stat-label">Distinct ${dimSelect.value}</div>
      </div>`;
  }

  function renderChart(info) {
    // destroy old chart instance to avoid leaks
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
          tooltip: { callbacks: { percentage(ctx) {
              const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const value = ctx.raw;
              return `${((value / sum) * 100).toFixed(1)} %`;
            }}}
        },
        scales: typeSelect.value === 'bar'
          ? { y: { beginAtZero: true, ticks: { precision:0 } } }
          : {}
      }
    });
  }

  function refresh() {
    const limit = Math.max(3, Math.min(+maxInput.value || 15, 30));
    maxInput.value = limit;
    const info = summarise(dimSelect.value, limit);
    renderChart(info);
    updateStats(info, novels.length);
  }

  /* ---------- Event listeners ---------- */
  [dimSelect, maxInput, typeSelect].forEach(el => el.addEventListener('input', refresh));

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

    // Normalise once for quick access later
    novels.forEach(n => {
      n.Author    = tidy(n.Author);
      n.Country   = tidy(n.Country);
      n.Language  = tidy(n.Language);
      n.Publisher = tidy(n.Publisher);
      n['Year of Publication'] = tidy(n['Year of Publication']);
    });

    refresh(); // initial render
  } catch (err) {
    ctx.canvas.parentNode.innerHTML =
      `<p style="color:#b00;font-weight:600">Error: ${err.message}</p>`;
    console.error(err);
  }
})();
