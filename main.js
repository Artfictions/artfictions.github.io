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
  let autocompleteData = {};

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

  /* Build autocomplete data */
  function buildAutocompleteData() {
    autocompleteData = {
      title: [...new Set(novels.map(n => n.Title).filter(Boolean))].sort(),
      author: [...new Set(novels.map(n => n.Author).filter(Boolean))].sort(),
      country: [...new Set(novels.map(n => n.Country).filter(Boolean))].sort(),
      language: [...new Set(novels.map(n => n.Language).filter(Boolean))].sort(),
      publisher: [...new Set(novels.map(n => n.Publisher).filter(Boolean))].sort(),
      year: [...new Set(novels.map(n => n['Year of Publication']).filter(Boolean))].sort((a,b) => b-a)
    };
  }

  /* Dropdown autocomplete functionality */
  function setupAutocomplete(inputId, dropdownId, dataKey) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    let highlightedIndex = -1;
    let filteredOptions = [];
    
    function showDropdown(options) {
      dropdown.innerHTML = '';
      filteredOptions = options;
      highlightedIndex = -1;
      
      if (options.length === 0) {
        dropdown.style.display = 'none';
        return;
      }
      
      options.slice(0, 10).forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-option';
        div.textContent = option;
        div.addEventListener('click', () => {
          input.value = option;
          dropdown.style.display = 'none';
          filterAndRender();
        });
        dropdown.appendChild(div);
      });
      
      dropdown.style.display = 'block';
    }
    
    function hideDropdown() {
      dropdown.style.display = 'none';
      highlightedIndex = -1;
    }
    
    function updateHighlight() {
      const options = dropdown.querySelectorAll('.autocomplete-option');
      options.forEach((option, index) => {
        option.classList.toggle('highlighted', index === highlightedIndex);
      });
    }
    
    function selectHighlighted() {
      const options = dropdown.querySelectorAll('.autocomplete-option');
      if (highlightedIndex >= 0 && highlightedIndex < options.length) {
        const selectedOption = options[highlightedIndex];
        input.value = selectedOption.textContent;
        hideDropdown();
        filterAndRender();
        return true;
      }
      return false;
    }
    
    input.addEventListener('input', () => {
      const value = input.value.trim();
      const data = autocompleteData[dataKey];
      
      if (value.length === 0) {
        hideDropdown();
        return;
      }
      
      const matches = data.filter(item => 
        item.toLowerCase().includes(value.toLowerCase())
      ).sort((a, b) => {
        // Prioritise matches that start with the input
        const aStarts = a.toLowerCase().startsWith(value.toLowerCase());
        const bStarts = b.toLowerCase().startsWith(value.toLowerCase());
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      });
      
      showDropdown(matches);
    });
    
    input.addEventListener('keydown', (e) => {
      const options = dropdown.querySelectorAll('.autocomplete-option');
      
      if (dropdown.style.display === 'none') return;
      
      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          highlightedIndex = Math.min(highlightedIndex + 1, options.length - 1);
          updateHighlight();
          break;
        case 'ArrowUp':
          e.preventDefault();
          highlightedIndex = Math.max(highlightedIndex - 1, -1);
          updateHighlight();
          break;
        case 'Enter':
          e.preventDefault();
          if (selectHighlighted()) {
            return;
          }
          break;
        case 'Escape':
          hideDropdown();
          break;
      }
    });
    
    input.addEventListener('blur', (e) => {
      // Delay hiding to allow click on options
      setTimeout(() => {
        if (!dropdown.contains(document.activeElement)) {
          hideDropdown();
        }
      }, 150);
    });
  }

  /* Build theme checkbox list */
  const themeBox=document.getElementById('themeCheckboxes');
  [...new Set(novels.flatMap(n=>n.__themes))].sort().forEach(theme=>{
    const label=document.createElement('label');
    label.innerHTML=`<input type="checkbox" value="${theme}" name="themeBox"><span>${theme}</span>`;
    themeBox.appendChild(label);
  });

  /* Setup autocomplete after data is loaded */
  buildAutocompleteData();
  setupAutocomplete('titleInput', 'titleDropdown', 'title');
  setupAutocomplete('authorInput', 'authorDropdown', 'author');
  setupAutocomplete('countryInput', 'countryDropdown', 'country');
  setupAutocomplete('languageInput', 'languageDropdown', 'language');
  setupAutocomplete('publisherInput', 'publisherDropdown', 'publisher');
  setupAutocomplete('yearInput', 'yearDropdown', 'year');

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
  document.getElementById('searchForm').addEventListener('reset',()=>{
    setTimeout(filterAndRender, 0);
  });

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
    // No visual indicators needed - sorting is indicated by cursor and hover states
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