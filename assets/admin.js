(() => {
  'use strict';
  const $=id=>document.getElementById(id), core=window.LedgerEditor;
  let session=null, papers=[], selected=null, busy=false, dirty=false;
  const status=message=>{$('status').textContent=message;};
  function permissions(){ $('publish').disabled=!session||busy; $('save-bio').disabled=!session||busy; $('connect').disabled=busy; $('disconnect').disabled=busy; $('new').disabled=busy; $('papers').disabled=busy; $('delete-paper').disabled=!session||busy; $('delete-paper').hidden=!selected; }
  function setBusy(value){busy=value;permissions();}
  function fail(error){status(error.message || 'Unable to save. Please try again.');}
  async function api(path,options={}){
    if(!session) throw new Error('Connect your website first.');
    const response=await fetch('https://api.github.com'+path,{...options,redirect:'error',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+session.token,'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28',...(options.headers||{})}});
    if(!response.ok){if(response.status===401) throw new Error('The publishing token is invalid or expired. Disconnect and connect with a new token.');if(response.status===403)throw new Error('GitHub denied access. Check that your token has Contents: Read and write for this repository, and that your API quota is available.');if(response.status===404)throw new Error('Repository or file not found. Check the username, repository, and token access.');throw new Error(`GitHub could not complete the request (${response.status}). Your current public site has not been replaced. Reconnect to refresh before retrying.`);}
    return response.status===204?null:response.json();
  }
  const base=()=>'/repos/'+encodeURIComponent(session.owner)+'/'+encodeURIComponent(session.repo);
  const decode=content=>new TextDecoder().decode(Uint8Array.from(atob(content.replace(/\s/g,'')),x=>x.charCodeAt(0)));
  async function snapshot(){
    const ref=await api(base()+'/git/ref/heads/'+encodeURIComponent(session.branch));
    const commit=await api(base()+'/git/commits/'+ref.object.sha);
    const tree=await api(base()+'/git/trees/'+commit.tree.sha+'?recursive=1');
    if(tree.truncated)throw new Error('This repository is too large for this editor. No changes made.');
    return {head:ref.object.sha,tree:commit.tree.sha,entries:tree.tree};
  }
  async function read(path,snap){
    const entry=snap.entries.find(x=>x.path===path && x.type==='blob');
    if(!entry)throw new Error(`Cannot find ${path}. Make sure the editor and website are in the repository’s top-level folder.`);
    const blob=await api(base()+'/git/blobs/'+entry.sha);return decode(blob.content);
  }
  async function loadIndex(snap){return core.parseIndex(await read('assets/research-data.js',snap));}
  function list(){
    $('papers').replaceChildren(new Option('Select a published paper',''));
    papers.forEach(p=>$('papers').add(new Option(p.title,p.url)));
  }
  function loadPaper(paper){
    selected=paper?{...paper}:null;
    for(const id of ['title','date','summary','body'])$(id).value=paper?.[id]||'';
    if(!paper)$('date').value=new Date().toLocaleDateString('en-CA');
    $('topics').value=(paper?.topics||[]).join(', ');$('pdf').value='';
    $('pdf-note').textContent=paper?.pdf?'Existing PDF will be kept unless you attach a replacement.':'';
    $('papers').value=paper?.url||'';$('publish').textContent=paper?'Publish changes':'Publish paper';
    $('preview').hidden=true;$('paper-form').hidden=false;$('bio-panel').hidden=true;$('publish-result').replaceChildren();dirty=false;permissions();
  }
  function collect(){
    const p={title:$('title').value.trim(),date:$('date').value,summary:$('summary').value.trim(),body:$('body').value.trim(),topics:$('topics').value.split(',').map(x=>x.trim()).filter(Boolean)};
    if(!p.title||!p.date||!p.summary)throw new Error('Add a title, publication date, and summary.');
    if(!p.body&&!$('pdf').files[0]&&!selected?.pdf)throw new Error('Add article text or attach a PDF before publishing.');
    return {...selected,...p};
  }
  function showPreview(p){
    const box=$('preview-content');box.replaceChildren();
    const h=document.createElement('h2');h.textContent=p.title;
    const meta=document.createElement('p');meta.className='muted';meta.textContent='Yongjin (Jin) Hwang · '+p.date;
    const summary=document.createElement('p');summary.textContent=p.summary;
    box.append(h,meta,summary);
    for(const paragraph of p.body.split(/\n\s*\n/).filter(Boolean)){const e=document.createElement('p');e.textContent=paragraph;box.append(e);}
    if($('pdf').files[0]||p.pdf){const note=document.createElement('p');note.textContent='PDF attachment included.';box.append(note);}
    $('preview').hidden=false;
  }
  function result(message,path){
    const e=$('publish-result');e.replaceChildren();
    e.append(document.createTextNode(message+' '));
    const a=document.createElement('a');a.href=session.origin+'/'+path;a.textContent='Open published page ↗';a.target='_blank';a.rel='noopener noreferrer';e.append(a);
  }
  async function commit(files,snap,message){
    // Build every file first, then move the branch once. Never force-push.
    const entries=[];
    for(const file of files){
      if(file.remove){entries.push({path:file.path,mode:'100644',type:'blob',sha:null});}
      else if(file.base64){const blob=await api(base()+'/git/blobs',{method:'POST',body:JSON.stringify({content:file.base64,encoding:'base64'})});entries.push({path:file.path,mode:'100644',type:'blob',sha:blob.sha});}
      else entries.push({path:file.path,mode:'100644',type:'blob',content:file.text});
    }
    const tree=await api(base()+'/git/trees',{method:'POST',body:JSON.stringify({base_tree:snap.tree,tree:entries})});
    const created=await api(base()+'/git/commits',{method:'POST',body:JSON.stringify({message,tree:tree.sha,parents:[snap.head]})});
    const current=await api(base()+'/git/ref/heads/'+encodeURIComponent(session.branch));
    if(current.object.sha!==snap.head)throw new Error('The website changed while you were editing. Download your draft, reconnect, and load the latest version before publishing.');
    await api(base()+'/git/refs/heads/'+encodeURIComponent(session.branch),{method:'PATCH',body:JSON.stringify({sha:created.sha,force:false})});
    session.head=created.sha;
  }
  function fileBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Could not read PDF.'));reader.readAsDataURL(file);});}
  $('connect').addEventListener('click',async()=>{
    const owner=$('owner').value.trim(),repo=$('repository').value.trim(),token=$('token').value.trim();
    if(!/^[a-zA-Z0-9-]+$/.test(owner)||!/^[a-zA-Z0-9_.-]+$/.test(repo)||!token){status('Enter your GitHub username, repository name, and publishing token.');return;}
    $('token').value='';setBusy(true);status('Connecting to your website…');
    session={owner,repo,token};
    try{
      const info=await api(base());
      if(!info.permissions?.push)throw new Error('This account cannot publish to the selected repository.');
      if(!info.has_pages)throw new Error('Enable GitHub Pages for this repository before using the editor.');
      const pages=await api(base()+'/pages');
      const published=new URL(pages.html_url);
      if(published.protocol!=='https:')throw new Error('Enable HTTPS for your public website first.');
      if(published.pathname!=='/')throw new Error('This editor expects the website at the root address. Rename your repository to match your GitHub username followed by .github.io first.');
      if(!pages.source || pages.source.path!=='/')throw new Error('Set GitHub Pages to deploy from a branch with the /(root) folder before connecting.');
      session.branch=pages.source.branch||info.default_branch;session.origin=published.origin;
      const snap=await snapshot();papers=await loadIndex(snap);session.head=snap.head;list();
      $('connection').open=false;$('disconnect').hidden=false;status('Connected. Changes publish to '+session.origin+'.');
    }catch(error){session=null;papers=[];list();fail(error);}finally{setBusy(false);}
  });
  $('disconnect').addEventListener('click',()=>{session=null;papers=[];$('token').value='';$('disconnect').hidden=true;$('connection').open=true;list();permissions();status('Disconnected. Publishing credentials have been cleared. Your current draft remains in this tab.');});
  $('new').addEventListener('click',()=>{if(dirty&&!confirm('Start a new paper? Download your current draft first if you want to keep it.'))return;loadPaper(null);});
  $('papers').addEventListener('change',()=>{if(dirty&&!confirm('Load another paper and replace the current unsaved draft?')){$('papers').value=selected?.url||'';return;}loadPaper(papers.find(p=>p.url===$('papers').value));});
  $('paper-form').addEventListener('input',()=>{dirty=true;});
  $('preview-button').addEventListener('click',()=>{try{showPreview(collect());status('Preview only. Nothing has been published.');}catch(e){fail(e);}});
  $('download-draft').addEventListener('click',()=>{
    const draft={version:1,title:$('title').value,date:$('date').value,summary:$('summary').value,body:$('body').value,topics:$('topics').value.split(',').map(x=>x.trim()).filter(Boolean)};
    const blob=new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='research-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Draft downloaded. PDF attachments must be attached again when you reopen a draft.');
  });
  $('import-draft').addEventListener('change',async()=>{try{const f=$('import-draft').files[0];if(!f)return;if(f.size>2*1024*1024)throw new Error('Draft file is too large.');const d=JSON.parse(await f.text());for(const k of ['title','date','summary','body'])if(typeof d[k]!=='string')throw new Error('Invalid draft file.');if(!Array.isArray(d.topics)||!d.topics.every(x=>typeof x==='string'))throw new Error('Invalid draft topics.');loadPaper(null);for(const k of ['title','date','summary','body'])$(k).value=d[k];$('topics').value=d.topics.join(', ');dirty=true;status('Draft opened. Add a PDF again if needed.');}catch(e){fail(e);}finally{$('import-draft').value='';}});
  $('paper-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!session)return;
    try{
      const paper=collect(),file=$('pdf').files[0];
      if(file&&(file.size>10*1024*1024||!file.name.toLowerCase().endsWith('.pdf')))throw new Error('Choose a PDF file no larger than 10 MB.');
      if(file){const header=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());if(header!=='%PDF-')throw new Error('This attachment is not a valid PDF file.');}
      setBusy(true);status('Preparing your publication…');
      const snap=await snapshot();if(snap.head!==session.head)throw new Error('The website changed since you connected. Download your draft, reconnect, and try again.');
      const latest=await loadIndex(snap);
      const slug=selected?selected.url.replace(/^research\//,'').replace(/\.html$/,''):(paper.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'paper')+'-'+crypto.randomUUID().slice(0,8);
      if(!/^[a-z0-9-]+$/.test(slug))throw new Error('The paper address is not valid.');
      paper.url='research/'+slug+'.html';const files=[];
      if(file){paper.pdf='papers/'+slug+'.pdf';files.push({path:paper.pdf,base64:await fileBase64(file)});}
      const next=[paper,...latest.filter(p=>p.url!==paper.url)].sort((a,b)=>b.date.localeCompare(a.date));
      files.push({path:paper.url,text:core.article(paper,session.origin)},{path:'assets/research-data.js',text:'window.ledgerResearch = '+JSON.stringify(next,null,2)+';\n'},{path:'sitemap.xml',text:core.sitemap(next,session.origin)},{path:'robots.txt',text:'User-agent: *\nAllow: /\nDisallow: /admin.html\nSitemap: '+session.origin+'/sitemap.xml\n'});
      status('Publishing your paper…');await commit(files,snap,'Publish research: '+paper.title);papers=next;list();loadPaper(paper);status('Saved successfully. GitHub Pages is publishing the update; allow a few minutes for it to appear.');result('Your paper has been saved.',paper.url);
    }catch(e){fail(e);}finally{setBusy(false);}
  });

  $('delete-paper').addEventListener('click',async()=>{
    if(!session||busy||!selected)return;
    const deleting={...selected};
    if(!confirm(`Delete “${deleting.title}” from your website? Its page, library listing, and attached PDF will be removed. GitHub keeps earlier versions in repository history.`))return;
    setBusy(true);status('Removing the paper…');
    try{
      const snap=await snapshot();
      if(snap.head!==session.head)throw new Error('The website changed. Reconnect, select the paper again, and retry deleting.');
      const latest=await loadIndex(snap),paper=latest.find(p=>p.url===deleting.url);
      if(!paper)throw new Error('This paper is no longer in the library. Reconnect to refresh.');
      const next=latest.filter(p=>p.url!==paper.url),files=[];
      if(snap.entries.some(e=>e.path===paper.url&&e.type==='blob'))files.push({path:paper.url,remove:true});
      if(paper.pdf&&/^papers\/[a-z0-9-]+\.pdf$/.test(paper.pdf)&&!next.some(p=>p.pdf===paper.pdf)&&snap.entries.some(e=>e.path===paper.pdf&&e.type==='blob'))files.push({path:paper.pdf,remove:true});
      files.push({path:'assets/research-data.js',text:'window.ledgerResearch = '+JSON.stringify(next,null,2)+';\n'},{path:'sitemap.xml',text:core.sitemap(next,session.origin)});
      await commit(files,snap,'Remove research: '+paper.title);
      papers=next;list();loadPaper(null);
      status('Paper removed from the repository. GitHub Pages is publishing the removal; the old page may remain visible for a few minutes. Search engines and downloaded copies are not removed.');
    }catch(e){fail(e);}finally{setBusy(false);}
  });
  $('load-bio').addEventListener('click',async()=>{if(!session){status('Connect your website to edit your introduction.');return;}setBusy(true);try{const snap=await snapshot();if(snap.head!==session.head)throw new Error('Reconnect to load the latest website before editing.');const text=await read('about.html',snap),doc=new DOMParser().parseFromString(text,'text/html'),content=doc.querySelector('.about-grid > div');if(!content)throw new Error('Cannot find the biography section.');$('biography').value=[...content.children].filter(x=>x.tagName==='P').map(x=>x.textContent).join('\n\n');$('paper-form').hidden=true;$('bio-panel').hidden=false;$('preview').hidden=true;status('Edit your introduction, then publish when ready.');}catch(e){fail(e);}finally{setBusy(false);}});
  $('back-paper').addEventListener('click',()=>{$('bio-panel').hidden=true;$('paper-form').hidden=false;});
  $('save-bio').addEventListener('click',async()=>{if(!session||busy)return;const value=$('biography').value.trim();if(!value){status('Write an introduction before publishing.');return;}setBusy(true);try{const snap=await snapshot();if(snap.head!==session.head)throw new Error('The website changed. Copy your biography and reconnect before publishing.');const doc=new DOMParser().parseFromString(await read('about.html',snap),'text/html'),section=doc.querySelector('.about-grid > div');if(!section)throw new Error('Cannot find your introduction.');const old=[...section.children].filter(x=>x.tagName==='P');if(!old.length)throw new Error('Cannot find biography paragraphs.');const fragment=doc.createDocumentFragment();for(const text of value.split(/\n\s*\n/)){const e=doc.createElement('p');e.textContent=text;fragment.append(e);}section.insertBefore(fragment,old[0]);old.forEach(x=>x.remove());await commit([{path:'about.html',text:'<!doctype html>\n'+doc.documentElement.outerHTML}],snap,'Update author introduction');status('Introduction saved. GitHub Pages is publishing your update.');result('Your introduction has been saved.','about.html');}catch(e){fail(e);}finally{setBusy(false);}});
  window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
  loadPaper(null);permissions();
})();
