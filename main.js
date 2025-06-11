/*  stats.js  ──  Statistical dashboard only (June 2025)
   ------------------------------------------------------
   ▸ Loads artfictions_novels.json
   ▸ Builds six interactive charts inside the #stat-charts grid:
        • Countries         donut‑pie  (#country-chart)
        • Languages         donut‑pie  (#language-chart)
        • Publishers (Top20)h‑bar      (#publisher-chart)
        • Themes (Top20)    h‑bar      (#theme-chart)
        • Years             v‑bar      (#year-chart)
        • Authors (Top20)   v‑bar      (#author-chart)
   ▸ No global pollution except the kick‑off call at the end.
   ------------------------------------------------------ */
   (async function () {

    /* ──── CONFIG ─────────────────────────────────────── */
    const FILE = 'artfictions_novels.json';
    const COLOUR = d3.scaleOrdinal(d3.schemeTableau10);
    const MARGIN = { top: 20, right: 24, bottom: 40, left: 60 };
  
    /* ──── TOOLTIP (one node reused everywhere) ───────── */
    const tip = document.createElement('div');
    Object.assign(tip.style, {
      position:'absolute',pointerEvents:'none',
      background:'rgba(0,0,0,.85)',color:'#fff',
      padding:'6px 10px',borderRadius:'4px',fontSize:'12px',
      opacity:0,transition:'opacity .15s',zIndex:1000
    });
    tip.show = (e,html)=>{ tip.innerHTML=html; tip.style.opacity=1; tip.move(e); };
    tip.move = e=>{ tip.style.left=e.pageX+14+'px'; tip.style.top=e.pageY+14+'px'; };
    tip.hide = ()=> tip.style.opacity=0;
    document.body.appendChild(tip);
  
    /* ──── LOAD & PRE‑PROCESS ─────────────────────────── */
    const raw = await fetch(FILE).then(r=>r.json());
    const novels = Array.isArray(raw) ? raw : raw.Novels || [];
  
    novels.forEach(n => {
      /* collect themes */
      const t=[]; for(let i=1;i<=5;i++){ const k=`Theme ${i}`; if(n[k] && String(n[k]).trim()) t.push(String(n[k]).trim()); }
      n.__themes    = t;
      n.__author    = n.Author     ? String(n.Author).trim()          : 'Unknown';
      n.__country   = n.Country    ? String(n.Country).trim()         : 'Unknown';
      n.__language  = n.Language   ? String(n.Language).trim()        : 'Unknown';
      n.__publisher = n.Publisher  ? String(n.Publisher).trim()       : 'Unknown';
      n.__year      = n['Year of Publication'] ? +n['Year of Publication'] || null : null;
    });
  
    /* helper to build simple frequency maps */
    const freq = (arr, accessor) => {
      const m=new Map();
      arr.forEach(d=>{ const k=accessor(d); if(!k) return; m.set(k,(m.get(k)||0)+1);});
      return m;
    };
  
    const counts = {
      countries  : freq(novels,d=>d.__country),
      languages  : freq(novels,d=>d.__language),
      publishers : freq(novels,d=>d.__publisher),
      themes     : freq(novels.flatMap(d=>d.__themes),d=>d),
      years      : freq(novels.filter(d=>d.__year),d=>d.__year),
      authors    : freq(novels,d=>d.__author)
    };
  
    /* ──── CHART BUILDERS ─────────────────────────────── */
    function pieChart(container, map){
      const host=document.getElementById(container); if(!host) return;
      host.innerHTML='';
      const W=host.clientWidth, H=host.clientHeight||300;
      const r=Math.min(W,H)/2 - 10;
      const data=[...map].sort((a,b)=>b[1]-a[1]).slice(0,15);
      const pie=d3.pie().value(d=>d[1]);
      const arc=d3.arc().innerRadius(r*0.45).outerRadius(r);
  
      const svg=d3.select(host).append('svg')
        .attr('width',W).attr('height',H)
        .append('g').attr('transform',`translate(${W/2},${H/2})`);
  
      svg.selectAll('path').data(pie(data)).enter().append('path')
        .attr('d',arc).attr('fill',(d,i)=>COLOUR(i))
        .on('mouseover',(e,d)=>tip.show(e,`${d.data[0]}: ${d.data[1]}`))
        .on('mousemove',tip.move)
        .on('mouseout',tip.hide);
  
      /* legend */
      const lg = svg.append('g').attr('transform',`translate(${r+24},${-r})`);
      lg.selectAll('rect').data(data).enter().append('rect')
        .attr('x',0).attr('y',(d,i)=>i*16).attr('width',12).attr('height',12).attr('fill',(d,i)=>COLOUR(i));
      lg.selectAll('text').data(data).enter().append('text')
        .attr('x',18).attr('y',(d,i)=>i*16+10).text(d=>`${d[0]} (${d[1]})`).style('font-size','11px');
    }
  
    function barChartV(container, map, topN=20){
      const host=document.getElementById(container); if(!host) return;
      host.innerHTML='';
      const W=host.clientWidth, H=host.clientHeight||300;
      const data=[...map].filter(d=>d[0]).sort((a,b)=>b[1]-a[1]).slice(0,topN);
      const x=d3.scaleBand().domain(data.map(d=>d[0])).range([0,W-MARGIN.left-MARGIN.right]).padding(0.15);
      const y=d3.scaleLinear().domain([0,d3.max(data,d=>d[1])]).nice().range([H-MARGIN.top-MARGIN.bottom,0]);
  
      const svg=d3.select(host).append('svg')
        .attr('width',W).attr('height',H)
        .append('g').attr('transform',`translate(${MARGIN.left},${MARGIN.top})`);
  
      svg.selectAll('rect').data(data).enter().append('rect')
        .attr('x',d=>x(d[0])).attr('y',d=>y(d[1]))
        .attr('width',x.bandwidth()).attr('height',d=>y(0)-y(d[1]))
        .attr('fill',(d,i)=>COLOUR(i))
        .on('mouseover',(e,d)=>tip.show(e,`${d[0]}: ${d[1]}`))
        .on('mousemove',tip.move)
        .on('mouseout',tip.hide);
  
      svg.append('g').attr('transform',`translate(0,${y(0)})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll('text').attr('transform','rotate(-45)').style('text-anchor','end');
      svg.append('g').call(d3.axisLeft(y).ticks(4));
    }
  
    function barChartH(container, map, topN=20){
      const host=document.getElementById(container); if(!host) return;
      host.innerHTML='';
      const W=host.clientWidth, H=host.clientHeight||300;
      const data=[...map].filter(d=>d[0]).sort((a,b)=>b[1]-a[1]).slice(0,topN).reverse(); // smallest on top
      const y=d3.scaleBand().domain(data.map(d=>d[0])).range([H-MARGIN.top-MARGIN.bottom,0]).padding(0.1);
      const x=d3.scaleLinear().domain([0,d3.max(data,d=>d[1])]).nice().range([0,W-MARGIN.left-MARGIN.right]);
  
      const svg=d3.select(host).append('svg')
        .attr('width',W).attr('height',H)
        .append('g').attr('transform',`translate(${MARGIN.left},${MARGIN.top})`);
  
      svg.selectAll('rect').data(data).enter().append('rect')
        .attr('y',d=>y(d[0])).attr('x',0)
        .attr('height',y.bandwidth()).attr('width',d=>x(d[1]))
        .attr('fill',(d,i)=>COLOUR(i))
        .on('mouseover',(e,d)=>tip.show(e,`${d[0]}: ${d[1]}`))
        .on('mousemove',tip.move)
        .on('mouseout',tip.hide);
  
      svg.append('g').attr('class','y‑axis').call(d3.axisLeft(y));
      svg.append('g').attr('transform',`translate(0,${y.range()[0]+y.bandwidth()})`).call(d3.axisBottom(x).ticks(4));
    }
  
    /* ──── DRAW ALL CHARTS ────────────────────────────── */
    pieChart ('country-chart' , counts.countries );
    pieChart ('language-chart', counts.languages );
    barChartH('publisher-chart', counts.publishers , 20);
    barChartH('theme-chart'   , counts.themes     , 20);
    barChartV('year-chart'    , counts.years      , 999);   // show all years
    barChartV('author-chart'  , counts.authors    , 20);
  
    /* ──── RESPONSIVE: redraw on resize ───────────────── */
    let resizeTimeout=null;
    window.addEventListener('resize', ()=> {
      clearTimeout(resizeTimeout);
      resizeTimeout=setTimeout(()=> {
        pieChart ('country-chart' , counts.countries );
        pieChart ('language-chart', counts.languages );
        barChartH('publisher-chart', counts.publishers , 20);
        barChartH('theme-chart'   , counts.themes     , 20);
        barChartV('year-chart'    , counts.years      , 999);
        barChartV('author-chart'  , counts.authors    , 20);
      }, 200);
    });
  
  })();
  