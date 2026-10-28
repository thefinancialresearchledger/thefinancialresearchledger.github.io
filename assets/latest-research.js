(() => {
 const papers=Array.isArray(window.ledgerResearch)?window.ledgerResearch:[];
 const box=document.getElementById('latest-research');if(!box||!papers.length)return;
 box.className='';box.replaceChildren();
 for(const p of papers.slice(0,3)){
  if(!/^research\/[a-z0-9-]+\.html$/.test(p.url))continue;
  const row=document.createElement('article');row.className='result-row';
  const meta=document.createElement('p');meta.className='eyebrow';meta.textContent=p.date+' · '+(p.topics||[]).join(' · ');
  const h=document.createElement('h3'),a=document.createElement('a');a.href=p.url;a.textContent=p.title;h.append(a);
  const summary=document.createElement('p');summary.textContent=p.summary;row.append(meta,h,summary);box.append(row);
 }
})();
