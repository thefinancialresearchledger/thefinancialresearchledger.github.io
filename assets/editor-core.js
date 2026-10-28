/* Shared pure helpers; no credentials or network access. */
(function(root){
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function parseIndex(text){
    const match = text.match(/window\.ledgerResearch\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
    if(!match) throw new Error('The research index format is not supported. No files have been changed.');
    const data=JSON.parse(match[1]);
    if(!Array.isArray(data)) throw new Error('Invalid research index.');
    for(const item of data) if(!item || typeof item.title!=='string' || !/^research\/[a-z0-9-]+\.html$/.test(item.url)) throw new Error('The index contains an unsupported paper URL.');
    return data;
  }
  function paragraphs(text){return String(text||'').trim().split(/\n\s*\n/).filter(Boolean).map(x=>`<p>${escape(x)}</p>`).join('\n');}
  function article(paper,origin){
    const title=escape(paper.title), summary=escape(paper.summary), date=escape(paper.date);
    const pdf=paper.pdf && /^papers\/[a-z0-9-]+\.pdf$/.test(paper.pdf) ? `<p><a class="button" href="../${escape(paper.pdf)}">Read / download the paper (PDF) ↗</a></p>`:'';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | The Financial Research Ledger</title><meta name="description" content="${summary}"><link rel="canonical" href="${escape(origin+'/'+paper.url)}"><link rel="stylesheet" href="../assets/style.css"><link rel="stylesheet" href="../assets/admin.css"></head><body><header><div class="wrap top"><a class="brand" href="../index.html">The Financial<br>Research Ledger</a><nav aria-label="Main navigation"><a href="../index.html">Home</a><a href="../research.html">Research</a><a href="../about.html">About</a></nav></div></header><main class="wrap"><article class="article-page"><p class="eyebrow">${escape((paper.topics||[]).join(' · '))}</p><h1>${title}</h1><p class="muted">Yongjin (Jin) Hwang · <time datetime="${date}">${date}</time></p><p class="article-summary">${summary}</p>${pdf}<div class="article-body">${paragraphs(paper.body)}</div><p><a href="../research.html">← Back to the research library</a></p></article></main><footer class="wrap footer"><p>The Financial Research Ledger · Yongjin (Jin) Hwang</p></footer></body></html>`;
  }
  function sitemap(papers,origin){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['','about.html','research.html',...papers.map(x=>x.url)].map(url=>`<url><loc>${escape(origin+'/'+url)}</loc></url>`).join('')+'</urlset>\n';}
  root.LedgerEditor={escape,parseIndex,paragraphs,article,sitemap};
})(typeof window==='undefined'?globalThis:window);
