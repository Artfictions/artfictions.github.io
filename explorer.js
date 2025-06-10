// Data Explorer visualization module
(async function() {
  // Global data storage
  let novels = [];
  let processedData = {};
  
  // Color scales
  const colorScales = {
    categorical: d3.scaleOrdinal(d3.schemeCategory10),
    sequential: d3.scaleSequential(d3.interpolateBlues),
    diverging: d3.scaleSequential(d3.interpolateRdBu)
  };
  
  // Initialize
  async function init() {
    try {
      // Load data
      const response = await fetch('artfictions_novels.json');
      const data = await response.json();
      novels = Array.isArray(data) ? data : data.Novels || [];
      
      // Process novels
      novels.forEach(novel => {
        // Extract themes
        const themes = [];
        for (let i = 1; i <= 5; i++) {
          const theme = novel[`Theme ${i}`];
          if (theme && String(theme).trim() !== '') {
            themes.push(String(theme).trim());
          }
        }
        novel._themes = themes;
        
        // Clean other fields
        novel._year = novel['Year of Publication'] ? parseInt(novel['Year of Publication']) : null;
        novel._country = novel.Country?.trim() || 'Unknown';
        novel._language = novel.Language?.trim() || 'Unknown';
        novel._publisher = novel.Publisher?.trim() || 'Unknown';
        novel._author = novel.Author?.trim() || 'Unknown';
      });
      
      // Filter out novels without years for temporal charts
      processedData.novelsWithYears = novels.filter(n => n._year && n._year > 1900 && n._year < 2030);
      
      // Create all visualizations
      createStatisticalCharts();
      createTemporalChart();
      createSankeyDiagram();
      createParallelCoordinates();
      createChordDiagram();
      
      // Set up event listeners
      setupEventListeners();
      
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }
  
  // 1. Statistical Charts (Pie/Donut)
  function createStatisticalCharts() {
    // Country distribution
    createPieChart('country-chart', 
      d3.rollup(novels, v => v.length, d => d._country),
      'Countries');
    
    // Language distribution
    createPieChart('language-chart',
      d3.rollup(novels, v => v.length, d => d._language),
      'Languages');
    
    // Publisher distribution (top 20)
    const publisherCounts = d3.rollup(novels, v => v.length, d => d._publisher);
    const topPublishers = Array.from(publisherCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    createPieChart('publisher-chart', new Map(topPublishers), 'Top Publishers');
    
    // Theme distribution
    const themeCounts = d3.rollup(
      novels.flatMap(n => n._themes),
      v => v.length,
      d => d
    );
    createPieChart('theme-chart', themeCounts, 'Themes');
    
    // Year distribution (by decade)
    const yearCounts = d3.rollup(
      processedData.novelsWithYears,
      v => v.length,
      d => Math.floor(d._year / 10) * 10
    );
    createBarChart('year-chart', yearCounts, 'Decades');
    
    // Author distribution (top 20)
    const authorCounts = d3.rollup(novels, v => v.length, d => d._author);
    const topAuthors = Array.from(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    createPieChart('author-chart', new Map(topAuthors), 'Top Authors');
  }
  
  // Helper: Create pie chart
  function createPieChart(containerId, data, title) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.offsetWidth;
    const height = 250;
    const radius = Math.min(width, height) / 2 - 10;
    
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    const g = svg.append('g')
      .attr('transform', `translate(${width/2},${height/2})`);
    
    // Create pie generator
    const pie = d3.pie()
      .value(d => d[1])
      .sort((a, b) => b[1] - a[1]);
    
    const arc = d3.arc()
      .innerRadius(radius * 0.4) // Donut chart
      .outerRadius(radius);
    
    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
    
    // Draw arcs
    const arcs = g.selectAll('.arc')
      .data(pie(Array.from(data)))
      .enter().append('g')
      .attr('class', 'arc');
    
    arcs.append('path')
      .attr('d', arc)
      .style('fill', (d, i) => colorScales.categorical(i))
      .on('mouseover', function(event, d) {
        tooltip.transition().duration(200).style('opacity', .9);
        tooltip.html(`<strong>${d.data[0]}</strong><br/>Count: ${d.data[1]}<br/>${(d.data[1] / novels.length * 100).toFixed(1)}%`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        tooltip.transition().duration(500).style('opacity', 0);
      });
    
    // Add center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .text(`Total: ${Array.from(data.values()).reduce((a, b) => a + b, 0)}`);
  }
  
  // Helper: Create bar chart
  function createBarChart(containerId, data, title) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const margin = {top: 20, right: 20, bottom: 40, left: 40};
    const width = container.offsetWidth - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Prepare data
    const dataArray = Array.from(data).sort((a, b) => a[0] - b[0]);
    
    // Scales
    const x = d3.scaleBand()
      .domain(dataArray.map(d => d[0]))
      .range([0, width])
      .padding(0.1);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(dataArray, d => d[1])])
      .nice()
      .range([height, 0]);
    
    // Bars
    g.selectAll('.bar')
      .data(dataArray)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d[0]))
      .attr('width', x.bandwidth())
      .attr('y', d => y(d[1]))
      .attr('height', d => height - y(d[1]))
      .style('fill', colorScales.categorical(0));
    
    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');
    
    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5));
  }
  
  // 2. Temporal Chart
  function createTemporalChart() {
    const container = document.getElementById('temporal-chart');
    if (!container) return;
    
    const margin = {top: 20, right: 150, bottom: 50, left: 50};
    const width = container.offsetWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Store reference for updates
    processedData.temporalChart = { svg, g, width, height, margin };
    
    updateTemporalChart();
  }
  
  function updateTemporalChart() {
    const viewType = document.getElementById('temporal-view').value;
    const smoothing = parseInt(document.getElementById('temporal-smoothing').value);
    const { g, width, height } = processedData.temporalChart;
    
    // Clear previous content
    g.selectAll('*').remove();
    
    // Get year range
    const yearExtent = d3.extent(processedData.novelsWithYears, d => d._year);
    const years = d3.range(yearExtent[0], yearExtent[1] + 1);
    
    // Prepare data based on view type
    let categories, getCategory;
    if (viewType === 'themes') {
      categories = Array.from(new Set(novels.flatMap(n => n._themes)));
      getCategory = (novel) => novel._themes;
    } else if (viewType === 'countries') {
      categories = Array.from(new Set(novels.map(n => n._country)));
      getCategory = (novel) => [novel._country];
    } else {
      categories = Array.from(new Set(novels.map(n => n._language)));
      getCategory = (novel) => [novel._language];
    }
    
    // Count occurrences by year and category
    const counts = new Map();
    categories.forEach(cat => {
      counts.set(cat, new Map(years.map(y => [y, 0])));
    });
    
    processedData.novelsWithYears.forEach(novel => {
      const cats = getCategory(novel);
      cats.forEach(cat => {
        if (counts.has(cat)) {
          counts.get(cat).set(novel._year, (counts.get(cat).get(novel._year) || 0) + 1);
        }
      });
    });
    
    // Apply moving average
    const smoothedData = new Map();
    categories.forEach(cat => {
      const values = Array.from(counts.get(cat).entries()).sort((a, b) => a[0] - b[0]);
      const smoothed = [];
      
      for (let i = 0; i < values.length; i++) {
        let sum = 0, count = 0;
        for (let j = Math.max(0, i - Math.floor(smoothing/2)); 
             j <= Math.min(values.length - 1, i + Math.floor(smoothing/2)); j++) {
          sum += values[j][1];
          count++;
        }
        smoothed.push([values[i][0], sum / count]);
      }
      smoothedData.set(cat, smoothed);
    });
    
    // Get top categories by total count
    const totals = categories.map(cat => ({
      cat,
      total: Array.from(counts.get(cat).values()).reduce((a, b) => a + b, 0)
    })).sort((a, b) => b.total - a.total).slice(0, 10);
    
    const topCategories = totals.map(d => d.cat);
    
    // Scales
    const x = d3.scaleLinear()
      .domain(yearExtent)
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(topCategories.flatMap(cat => 
        smoothedData.get(cat).map(d => d[1])))])
      .nice()
      .range([height, 0]);
    
    const color = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(topCategories);
    
    // Line generator
    const line = d3.line()
      .x(d => x(d[0]))
      .y(d => y(d[1]))
      .curve(d3.curveMonotoneX);
    
    // Draw lines
    topCategories.forEach(cat => {
      g.append('path')
        .datum(smoothedData.get(cat))
        .attr('fill', 'none')
        .attr('stroke', color(cat))
        .attr('stroke-width', 2)
        .attr('d', line);
    });
    
    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('d')));
    
    g.append('g')
      .call(d3.axisLeft(y));
    
    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(${width + 10}, 20)`);
    
    topCategories.forEach((cat, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendRow.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', color(cat));
      
      legendRow.append('text')
        .attr('x', 15)
        .attr('y', 9)
        .style('font-size', '12px')
        .text(cat.substring(0, 20) + (cat.length > 20 ? '...' : ''));
    });
  }
  
  // 3. Sankey Diagram
  function createSankeyDiagram() {
    const container = document.getElementById('sankey-chart');
    if (!container) return;
    
    const margin = {top: 10, right: 10, bottom: 10, left: 10};
    const width = container.offsetWidth - margin.left - margin.right;
    const height = 550 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    processedData.sankeyChart = { svg, g, width, height };
    
    updateSankeyDiagram();
  }
  
  function updateSankeyDiagram() {
    const sankeyType = document.getElementById('sankey-type').value;
    const { g, width, height } = processedData.sankeyChart;
    
    // Clear previous
    g.selectAll('*').remove();
    
    // Prepare data based on type
    const links = [];
    const nodeSet = new Set();
    
    if (sankeyType === 'theme-country') {
      novels.forEach(novel => {
        novel._themes.forEach(theme => {
          links.push({
            source: theme,
            target: novel._country,
            value: 1
          });
          nodeSet.add(theme);
          nodeSet.add(novel._country);
        });
      });
    } else if (sankeyType === 'theme-author') {
      // Get top authors
      const authorCounts = d3.rollup(novels, v => v.length, d => d._author);
      const topAuthors = Array.from(authorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(d => d[0]);
      
      novels.filter(n => topAuthors.includes(n._author)).forEach(novel => {
        novel._themes.forEach(theme => {
          links.push({
            source: theme,
            target: novel._author,
            value: 1
          });
          nodeSet.add(theme);
          nodeSet.add(novel._author);
        });
      });
    } else if (sankeyType === 'country-publisher') {
      novels.forEach(novel => {
        if (novel._publisher !== 'Unknown') {
          links.push({
            source: novel._country,
            target: novel._publisher,
            value: 1
          });
          nodeSet.add(novel._country);
          nodeSet.add(novel._publisher);
        }
      });
    } else if (sankeyType === 'language-theme') {
      novels.forEach(novel => {
        novel._themes.forEach(theme => {
          links.push({
            source: novel._language,
            target: theme,
            value: 1
          });
          nodeSet.add(novel._language);
          nodeSet.add(theme);
        });
      });
    }
    
    // Aggregate links
    const linkMap = new Map();
    links.forEach(link => {
      const key = `${link.source}|||${link.target}`;
      if (linkMap.has(key)) {
        linkMap.get(key).value += link.value;
      } else {
        linkMap.set(key, { ...link });
      }
    });
    
    const aggregatedLinks = Array.from(linkMap.values());
    const nodes = Array.from(nodeSet).map(name => ({ name }));
    
    // Create node index map
    const nodeIndexMap = new Map(nodes.map((node, i) => [node.name, i]));
    
    // Update links with indices
    aggregatedLinks.forEach(link => {
      link.source = nodeIndexMap.get(link.source);
      link.target = nodeIndexMap.get(link.target);
    });
    
    // Create sankey generator
    const sankey = d3.sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[0, 0], [width, height]]);
    
    // Generate layout
    const graph = sankey({
      nodes: nodes.map(d => Object.assign({}, d)),
      links: aggregatedLinks.map(d => Object.assign({}, d))
    });
    
    // Draw links
    g.append('g')
      .selectAll('.sankey-link')
      .data(graph.links)
      .join('path')
      .attr('class', 'sankey-link')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke', d => colorScales.categorical(d.source.index))
      .attr('stroke-width', d => Math.max(1, d.width));
    
    // Draw nodes
    const node = g.append('g')
      .selectAll('.sankey-node')
      .data(graph.nodes)
      .join('g')
      .attr('class', 'sankey-node');
    
    node.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => d.y1 - d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => colorScales.categorical(d.index));
    
    node.append('text')
      .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr('y', d => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
      .text(d => d.name.substring(0, 20) + (d.name.length > 20 ? '...' : ''));
  }
  
  // 4. Parallel Coordinates
  function createParallelCoordinates() {
    const container = document.getElementById('parallel-chart');
    if (!container) return;
    
    const margin = {top: 30, right: 10, bottom: 10, left: 10};
    const width = container.offsetWidth - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    processedData.parallelChart = { svg, g, width, height };
    
    updateParallelCoordinates();
  }
  
  function updateParallelCoordinates() {
    const sampleSize = document.getElementById('parallel-sample').value;
    const { g, width, height } = processedData.parallelChart;
    
    // Clear previous
    g.selectAll('*').remove();
    
    // Sample data
    let sampleNovels = novels;
    if (sampleSize !== 'all') {
      const n = parseInt(sampleSize);
      sampleNovels = novels.sort(() => 0.5 - Math.random()).slice(0, n);
    }
    
    // Define dimensions
    const dimensions = ['Country', 'Language', 'Year', 'Theme', 'Publisher'];
    
    // Create scales for each dimension
    const y = {};
    const x = d3.scalePoint()
      .domain(dimensions)
      .range([0, width]);
    
    dimensions.forEach(dim => {
      if (dim === 'Year') {
        y[dim] = d3.scaleLinear()
          .domain(d3.extent(sampleNovels.filter(n => n._year), d => d._year))
          .range([height, 0]);
      } else if (dim === 'Theme') {
        const themes = Array.from(new Set(novels.flatMap(n => n._themes))).sort();
        y[dim] = d3.scalePoint()
          .domain(themes)
          .range([height, 0]);
      } else {
        const values = Array.from(new Set(sampleNovels.map(n => {
          switch(dim) {
            case 'Country': return n._country;
            case 'Language': return n._language;
            case 'Publisher': return n._publisher;
          }
        }))).sort();
        y[dim] = d3.scalePoint()
          .domain(values)
          .range([height, 0]);
      }
    });
    
    // Prepare line data
    const lineData = [];
    sampleNovels.forEach(novel => {
      if (!novel._year) return;
      
      // For novels with multiple themes, create a line for each theme
      if (novel._themes.length > 0) {
        novel._themes.forEach(theme => {
          lineData.push({
            novel: novel,
            values: {
              'Country': novel._country,
              'Language': novel._language,
              'Year': novel._year,
              'Theme': theme,
              'Publisher': novel._publisher
            }
          });
        });
      }
    });
    
    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(Array.from(new Set(novels.map(n => n._country))));
    
    // Draw lines
    const foreground = g.append('g');
    
    foreground.selectAll('path')
      .data(lineData)
      .enter().append('path')
      .attr('class', 'parallel-line')
      .attr('d', d => d3.line()(dimensions.map(p => [x(p), y[p](d.values[p])])))
      .style('stroke', d => color(d.novel._country));
    
    // Draw axes
    const axes = g.selectAll('.dimension')
      .data(dimensions)
      .enter().append('g')
      .attr('class', 'dimension')
      .attr('transform', d => `translate(${x(d)})`);
    
    axes.append('g')
      .attr('class', 'axis')
      .each(function(d) {
        const axis = d === 'Year' ? d3.axisLeft(y[d]).tickFormat(d3.format('d')) : d3.axisLeft(y[d]);
        d3.select(this).call(axis);
      });
    
    axes.append('text')
      .style('text-anchor', 'middle')
      .attr('y', -9)
      .text(d => d)
      .style('font-weight', '600');
  }
  
  // 5. Chord Diagram
  function createChordDiagram() {
    const container = document.getElementById('chord-chart');
    if (!container) return;
    
    const width = container.offsetWidth;
    const height = 550;
    const innerRadius = Math.min(width, height) * 0.3;
    const outerRadius = innerRadius + 20;
    
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    const g = svg.append('g')
      .attr('transform', `translate(${width/2},${height/2})`);
    
    processedData.chordChart = { svg, g, innerRadius, outerRadius };
    
    updateChordDiagram();
  }
  
  function updateChordDiagram() {
    const chordType = document.getElementById('chord-type').value;
    const { g, innerRadius, outerRadius } = processedData.chordChart;
    
    // Clear previous
    g.selectAll('*').remove();
    
    // Prepare data based on type
    let groups = [];
    let matrix = [];
    
    if (chordType === 'country-publisher') {
      // Get top countries and publishers
      const countryCounts = d3.rollup(novels, v => v.length, d => d._country);
      const publisherCounts = d3.rollup(novels, v => v.length, d => d._publisher);
      
      const topCountries = Array.from(countryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(d => d[0]);
      
      const topPublishers = Array.from(publisherCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(d => d[0]);
      
      groups = [...topCountries, ...topPublishers];
      const indexMap = new Map(groups.map((g, i) => [g, i]));
      
      // Initialize matrix
      matrix = Array(groups.length).fill(null).map(() => Array(groups.length).fill(0));
      
      // Fill matrix
      novels.forEach(novel => {
        if (indexMap.has(novel._country) && indexMap.has(novel._publisher)) {
          const i = indexMap.get(novel._country);
          const j = indexMap.get(novel._publisher);
          matrix[i][j]++;
          matrix[j][i]++;
        }
      });
    } else if (chordType === 'language-theme') {
      const languages = Array.from(new Set(novels.map(n => n._language)));
      const themes = Array.from(new Set(novels.flatMap(n => n._themes)));
      
      groups = [...languages, ...themes];
      const indexMap = new Map(groups.map((g, i) => [g, i]));
      
      matrix = Array(groups.length).fill(null).map(() => Array(groups.length).fill(0));
      
      novels.forEach(novel => {
        if (indexMap.has(novel._language)) {
          const langIndex = indexMap.get(novel._language);
          novel._themes.forEach(theme => {
            if (indexMap.has(theme)) {
              const themeIndex = indexMap.get(theme);
              matrix[langIndex][themeIndex]++;
              matrix[themeIndex][langIndex]++;
            }
          });
        }
      });
    } else if (chordType === 'country-language') {
      const countries = Array.from(new Set(novels.map(n => n._country)));
      const languages = Array.from(new Set(novels.map(n => n._language)));
      
      groups = [...countries, ...languages];
      const indexMap = new Map(groups.map((g, i) => [g, i]));
      
      matrix = Array(groups.length).fill(null).map(() => Array(groups.length).fill(0));
      
      novels.forEach(novel => {
        if (indexMap.has(novel._country) && indexMap.has(novel._language)) {
          const i = indexMap.get(novel._country);
          const j = indexMap.get(novel._language);
          matrix[i][j]++;
          matrix[j][i]++;
        }
      });
    } else if (chordType === 'theme-theme') {
      // Theme co-occurrence
      const themes = Array.from(new Set(novels.flatMap(n => n._themes)));
      groups = themes;
      const indexMap = new Map(groups.map((g, i) => [g, i]));
      
      matrix = Array(groups.length).fill(null).map(() => Array(groups.length).fill(0));
      
      novels.forEach(novel => {
        for (let i = 0; i < novel._themes.length; i++) {
          for (let j = i + 1; j < novel._themes.length; j++) {
            const idx1 = indexMap.get(novel._themes[i]);
            const idx2 = indexMap.get(novel._themes[j]);
            if (idx1 !== undefined && idx2 !== undefined) {
              matrix[idx1][idx2]++;
              matrix[idx2][idx1]++;
            }
          }
        }
      });
    }
    
    // Create chord layout
    const chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending);
    
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);
    
    const ribbon = d3.ribbon()
      .radius(innerRadius);
    
    const chords = chord(matrix);
    
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Draw groups
    const group = g.append('g')
      .selectAll('g')
      .data(chords.groups)
      .join('g');
    
    group.append('path')
      .style('fill', d => color(d.index))
      .style('stroke', d => d3.rgb(color(d.index)).darker())
      .attr('d', arc);
    
    // Labels
    group.append('text')
      .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr('dy', '.35em')
      .attr('transform', d => `
        rotate(${(d.angle * 180 / Math.PI - 90)})
        translate(${outerRadius + 10})
        ${d.angle > Math.PI ? 'rotate(180)' : ''}
      `)
      .style('text-anchor', d => d.angle > Math.PI ? 'end' : null)
      .style('font-size', '10px')
      .text(d => groups[d.index].substring(0, 15) + (groups[d.index].length > 15 ? '...' : ''));
    
    // Draw ribbons
    g.append('g')
      .attr('fill-opacity', 0.67)
      .selectAll('path')
      .data(chords)
      .join('path')
      .attr('class', 'chord')
      .attr('d', ribbon)
      .style('fill', d => color(d.target.index))
      .style('stroke', d => d3.rgb(color(d.target.index)).darker());
  }
  
  // Event listeners
  function setupEventListeners() {
    document.getElementById('temporal-view').addEventListener('change', updateTemporalChart);
    document.getElementById('temporal-smoothing').addEventListener('change', updateTemporalChart);
    document.getElementById('sankey-type').addEventListener('change', updateSankeyDiagram);
    document.getElementById('parallel-sample').addEventListener('change', updateParallelCoordinates);
    document.getElementById('chord-type').addEventListener('change', updateChordDiagram);
  }
  
  // Initialize on load
  init();
})();