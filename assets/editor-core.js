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

  const imagePath = /^assets\/research-images\/[a-z0-9-]+\/[a-z0-9-]+\.(png|jpg|webp)$/;
  const imageData = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
  function imageInfo(src){
    const match=typeof src==='string' && src.match(imageData);
    if(!match)throw new Error('Choose a PNG, JPEG, or WebP image.');
    if(match[2].length>Math.ceil(5*1024*1024/3)*4)throw new Error('Each image must be no larger than 5 MB.');
    let bytes;try{bytes=atob(match[2]);}catch(e){throw new Error('This image could not be read.');}
    const valid=match[1]==='png'?bytes.startsWith('\x89PNG\r\n\x1a\n'):
      match[1]==='jpeg'?bytes.startsWith('\xff\xd8\xff'):
      bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';
    if(!valid)throw new Error('The image contents do not match its file type.');
    return {base64:match[2],bytes:bytes.length,extension:match[1]==='jpeg'?'jpg':match[1]};
  }
  function validateFigures(figures=[]){
    if(!Array.isArray(figures)||figures.length>10)throw new Error('Use no more than 10 images per article.');
    const ids=new Set();let total=0;
    for(const f of figures){
      if(!f||typeof f.id!=='string'||!/^[a-z0-9-]{1,80}$/.test(f.id)||ids.has(f.id))throw new Error('The draft has an invalid or repeated figure ID.');
      ids.add(f.id);
      if(typeof f.caption!=='string'||f.caption.length>4000||typeof f.alt!=='string'||f.alt.length>2000)throw new Error('Each figure needs a valid caption and image description.');
      if(!imagePath.test(f.src))total+=imageInfo(f.src).bytes;
    }
    if(total>20*1024*1024)throw new Error('The images together must be no larger than 20 MB.');
    return figures.map(({id,src,caption,alt})=>({id,src,caption,alt}));
  }
  function validatePlacement(paper){
    const figures=validateFigures(paper.figures),ids=new Set(figures.map(f=>f.id));
    for(const m of String(paper.body||'').matchAll(/\[\[figure:([^\]\r\n]*)\]\]/g)){
      if(!ids.has(m[1]))throw new Error('A figure marker has no matching image. Remove the marker or add its image again.');
    }
    for(const f of figures)if(!String(paper.body||'').includes('[[figure:'+f.id+']]'))throw new Error('An image has not been placed. Use its “Place at cursor” button or remove it.');
    return figures;
  }
  function figureSource(src,prefix){return imagePath.test(src)?prefix+src:src;}
  function renderBody(paper,prefix='../'){
    const figures=validatePlacement(paper),map=new Map(figures.map(f=>[f.id,f]));
    return String(paper.body||'').split(/(\[\[figure:[a-z0-9-]+\]\])/g).map(part=>{
      const m=part.match(/^\[\[figure:([a-z0-9-]+)\]\]$/);
      if(!m)return paragraphs(part);
      const f=map.get(m[1]);
      return `<figure class="article-figure"><img src="${escape(figureSource(f.src,prefix))}" alt="${escape(f.alt)}" loading="lazy" decoding="async">${f.caption?`<figcaption>${escape(f.caption)}</figcaption>`:''}</figure>`;
    }).join('\n');
  }

  function article(paper,origin){
    const title=escape(paper.title), summary=escape(paper.summary), date=escape(paper.date);
    const pdf=paper.pdf && /^papers\/[a-z0-9-]+\.pdf$/.test(paper.pdf) ? `<p><a class="button" href="../${escape(paper.pdf)}">Read / download the paper (PDF) ↗</a></p>`:'';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | The Financial Research Ledger</title><meta name="description" content="${summary}"><link rel="canonical" href="${escape(origin+'/'+paper.url)}"><link rel="stylesheet" href="../assets/style.css"><link rel="stylesheet" href="../assets/admin.css?v=figures-20261101"></head><body><header><div class="wrap top"><a class="brand" href="../index.html">The Financial<br>Research Ledger</a><nav aria-label="Main navigation"><a href="../index.html">Home</a><a href="../research.html">Research</a><a href="../about.html">About</a></nav></div></header><main class="wrap"><article class="article-page"><p class="eyebrow">${escape((paper.topics||[]).join(' · '))}</p><h1>${title}</h1><p class="muted">Yongjin (Jin) Hwang · <time datetime="${date}">${date}</time></p><p class="article-summary">${summary}</p>${pdf}<div class="article-body">${renderBody(paper)}</div><p><a href="../research.html">← Back to the research library</a></p></article></main><footer class="wrap footer"><p>The Financial Research Ledger · Yongjin (Jin) Hwang</p></footer></body></html>`;
  }
  function sitemap(papers,origin){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['','about.html','research.html',...papers.map(x=>x.url)].map(url=>`<url><loc>${escape(origin+'/'+url)}</loc></url>`).join('')+'</urlset>\n';}
  root.LedgerEditor={escape,parseIndex,paragraphs,article,sitemap,imageInfo,imagePath,validateFigures,validatePlacement,renderBody,figureSource};
})(typeof window==='undefined'?globalThis:window);
