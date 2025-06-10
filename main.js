/* main.js – drives catalogue table, filters, sorting & CSV download */
(async function(){
  const DATA_URL='artfictions_novels.json';
  const tbody=document.querySelector('#resultsTable tbody');
  const countEl=document.getElementById('results-count');
  const downloadLink=document.getElementById('downloadLink');
  const errEl=document.getElementById('error');

  let downloadUrl=null;
  let currentSort = { column: null, direction: 'asc' };
  let filteredResults = [];

  function toCSV(rows){
    const headers=['Title','Author','Country','Language','Publisher','Year','Themes'];
    const esc=s=>`"${String(s).replace(/"/g,'""')}"`;
    const lines=rows.map(r=>[
      r.Title,r.Author,r.Country,r.Language,r.Publisher,r['Year of Publication'],r.__themes.join('; ')
    ].map(esc).join(','));
    return [headers.join(','),...lines].join('\n');
  }
  
  function updateDownload(rows){
    if(downloadUrl) URL.revokeObjectURL(downloadUrl);
    const blob=new Blob([toCSV(rows)],{type:'text/csv'});
    downloadUrl=URL.createObjectURL(blob);
    downloadLink.href=downloadUrl;
    downloadLink.download=`filtered_novels_${rows.length}.csv`;
  }
  
  const showError=msg=>{errEl.textContent=msg;errEl.hidden=false;};

  /* Load dataset */
  let novels;
  try{
    const res=await fetch(DATA_URL);
    if(!res.ok) throw new Error(res.status);
    novels=await res.json();
  }catch(e){console.error(e);showError('Dataset load failed');return;}
  if(!Array.isArray(novels)){
    const key=Object.keys(novels).find(k=>Array.isArray(novels[k]));
    novels=key?novels[key]:[];
  }
  novels.forEach(n=>{const t=[];for(let i=1;i<=5;i++){const k=`Theme ${i}`;if(n[k])t.push(n[k].trim());}n.__themes=t;});

  /* Build autocomplete lists */
  function populateAutocomplete() {
    const titles = [...new Set(novels.map(n => n.Title).filter(Boolean))].sort();
    const authors = [...new Set(novels.map(n => n.Author).filter(Boolean))].sort();
    const countries = [...new Set(novels.map(n => n.Country).filter(Boolean))].sort();
    const languages = [...new Set(novels.map(n => n.Language).filter(Boolean))].sort();
    const publishers = [...new Set(novels.map(n => n.Publisher).filter(Boolean))].sort();
    const years = [...new Set(novels.map(n => n['Year of Publication']).filter(Boolean))].sort((a,b) => b-a);

    function populateDatalist(id, items) {
      const datalist = document.getElementById(id);
      datalist.innerHTML = '';
      items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        datalist.appendChild(option);
      });
    }

    populateDatalist('titleList', titles);
    populateDatalist('authorList', authors);
    populateDatalist('countryList', countries);
    populateDatalist('languageList', languages);
    populateDatalist('publisherList', publishers);
    populateDatalist('yearList', years);
  }

  /* Build theme checkbox list */
  const themeBox=document.getElementById('themeCheckboxes');
  [...new Set(novels.flatMap(n=>n.__themes))].sort().forEach(theme=>{
    const label=document.createElement('label');
    label.innerHTML=`<input type="checkbox" value="${theme}" name="themeBox"><span>${theme}</span>`;
    themeBox.appendChild(label);
  });

  /* Populate autocomplete after data is loaded */
  populateAutocomplete();

  /* Inputs */
  const inputs={
    title:document.getElementById('titleInput'),
    author:document.getElementById('authorInput'),
    country:document.getElementById('countryInput'),
    language:document.getElementById('languageInput'),
    publisher:document.getElementById('publisherInput'),
    year:document.getElementById('yearInput')
  };
  const themeInputs=[...document.querySelectorAll('input[name="themeBox"]')];
  [...Object.values(inputs),...themeInputs].forEach(el=>el.addEventListener('input',filterAndRender));
  document.getElementById('searchForm').addEventListener('reset',()=>setTimeout(filterAndRender,0));

  /* Sorting functions */
  function sortRows(rows, column, direction) {
    if (!column) return rows;

    return [...rows].sort((a, b) => {
      let valA, valB;
      
      if (column === 'Year of Publication') {
        valA = parseInt(a[column]) || 0;
        valB = parseInt(b[column]) || 0;
      } else {
        valA = (a[column] || '').toString().toLowerCase();
        valB = (b[column] || '').toString().toLowerCase();
      }

      let comparison = 0;
      if (column === 'Year of Publication') {
        comparison = valA - valB;
      } else {
        comparison = valA.localeCompare(valB);
      }

      return direction === 'desc' ? -comparison : comparison;
    });
  }

  function updateSortIndicators() {
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
      indicator.className = 'sort-indicator';
    });
    
    if (currentSort.column) {
      const header = document.querySelector(`th[data-sort="${currentSort.column}"] .sort-indicator`);
      if (header) {
        header.className = `sort-indicator ${currentSort.direction}`;
      }
    }
  }

  /* Table header click handlers */
  document.querySelectorAll('th[data-sort]').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort');
      
      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
      }
      
      updateSortIndicators();
      render(filteredResults);
    });
  });

  /* helpers */
  const fMatch=(v,q)=>!q||v&&v.toLowerCase().includes(q);
  const yMatch=(y,q)=>{
    if(!q) return true;
    const m=q.match(/^(\d{4})(?:\s*[\u2013\-]\s*(\d{4}))?$/);
    if(!m) return false;
    const s=parseInt(m[1],10), e=m[2]?parseInt(m[2],10):s, n=parseInt(y,10);
    return n>=s && n<=e;
  };
  const tMatch=(arr,sel)=>sel.length===0||sel.every(t=>arr.includes(t));

  function filterRows(){
    const q={
      title:inputs.title.value.trim().toLowerCase(),
      author:inputs.author.value.trim().toLowerCase(),
      country:inputs.country.value.trim().toLowerCase(),
      language:inputs.language.value.trim().toLowerCase(),
      publisher:inputs.publisher.value.trim().toLowerCase(),
      year:inputs.year.value.trim(),
      themes:themeInputs.filter(b=>b.checked).map(b=>b.value)
    };
    return novels.filter(n=>fMatch(n.Title,q.title)&&fMatch(n.Author,q.author)&&fMatch(n.Country,q.country)&&fMatch(n.Language,q.language)&&fMatch(n.Publisher,q.publisher)&&yMatch(n['Year of Publication'],q.year)&&tMatch(n.__themes,q.themes));
  }

  function render(rows){
    // Apply sorting
    const sortedRows = sortRows(rows, currentSort.column, currentSort.direction);
    
    tbody.innerHTML='';
    sortedRows.forEach(n=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${n.Title||''}</td><td>${n.Author||''}</td><td>${n.Country||''}</td><td>${n.Language||''}</td><td>${n.Publisher||''}</td><td>${n['Year of Publication']||''}</td><td>${n.__themes.join(', ')}</td>`;
      tbody.appendChild(tr);
    });
    countEl.textContent=`Showing ${rows.length} of ${novels.length}`;
    updateDownload(sortedRows);
  }

  function filterAndRender(){ 
    filteredResults = filterRows();
    render(filteredResults); 
  }

  /* initial render */
  filterAndRender();
})();