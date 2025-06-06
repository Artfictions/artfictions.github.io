/* main.js – drives catalogue table, filters & CSV download */
(async function(){
  const DATA_URL='artfictions_novels.json';
  const tbody=document.querySelector('#resultsTable tbody');
  const countEl=document.getElementById('results-count');
  const downloadLink=document.getElementById('downloadLink');
  const errEl=document.getElementById('error');

  let downloadUrl=null;
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

  /* Build theme checkbox list */
  const themeBox=document.getElementById('themeCheckboxes');
  [...new Set(novels.flatMap(n=>n.__themes))].sort().forEach(theme=>{
    const label=document.createElement('label');
    label.innerHTML=`<input type="checkbox" value="${theme}" name="themeBox"><span>${theme}</span>`;
    themeBox.appendChild(label);
  });

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
    tbody.innerHTML='';
    rows.forEach(n=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${n.Title||''}</td><td>${n.Author||''}</td><td>${n.Country||''}</td><td>${n.Language||''}</td><td>${n.Publisher||''}</td><td>${n['Year of Publication']||''}</td><td>${n.__themes.join(', ')}</td>`;
      tbody.appendChild(tr);
    });
    countEl.textContent=`Showing ${rows.length} of ${novels.length}`;
    updateDownload(rows);
  }

  function filterAndRender(){ render(filterRows()); }

  /* initial render */
  filterAndRender();
})();
