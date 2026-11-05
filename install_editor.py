#!/usr/bin/env python3
"""Install Ledger rich text editor into the existing website checkout.
Usage: python3 install_editor.py /path/to/thefinancialresearchledger.github.io
Does NOT commit, push, delete, or modify other website files.
"""
from pathlib import Path
import shutil, sys, datetime
ROOT = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv)>1 else Path.cwd()
PACKAGE = Path(__file__).resolve().parent


def replace_once(text, old, new, filename):
    count=text.count(old)
    if count!=1: raise RuntimeError(f'{filename}: expected exactly one matching insertion point, found {count}. No files modified.')
    return text.replace(old,new,1)

files={}
for name in ['admin.html','assets/admin.js','assets/editor-core.js','assets/admin.css']:
    p=ROOT/name
    if not p.is_file(): raise SystemExit(f'Missing {p}. Run against the website repository root.')
    files[name]=p.read_text(encoding='utf-8')
if 'LedgerRichEditor' in files['assets/admin.js'] or 'rich-editor.js' in files['admin.html']:
    raise SystemExit('Rich editor may already be installed; no changes made.')

html=files['admin.html']
html=replace_once(html,'</head>','<link rel="stylesheet" href="assets/rich-editor.css?v=1"></head>','admin.html')
html=replace_once(html,'</body>','<script src="assets/rich-editor.js?v=1"></script></body>','admin.html')
files['admin.html']=html

js=files['assets/admin.js']
js=replace_once(js,"for(const id of ['title','date','summary','body'])$(id).value=paper?.[id]||'';", "for(const id of ['title','date','summary','body'])$(id).value=paper?.[id]||'';\n    window.LedgerRichEditor?.load($('body').value);",'assets/admin.js')
js=replace_once(js,'  function collect(){','  function collect(){\n    window.LedgerRichEditor?.sync();','assets/admin.js')
js=replace_once(js,"    const draft={version:2,", "    window.LedgerRichEditor?.sync();\n    const draft={version:2,",'assets/admin.js')
js=replace_once(js,"loadPaper(null);for(const k of ['title','date','summary','body'])$(k).value=d[k];", "loadPaper(null);for(const k of ['title','date','summary','body'])$(k).value=d[k];window.LedgerRichEditor?.load($('body').value);",'assets/admin.js')
js=replace_once(js,"        const body=$('body'),marker='[[figure:'+f.id+']]';", "        const marker='[[figure:'+f.id+']]';if(window.LedgerRichEditor){window.LedgerRichEditor.insertFigure(marker);dirty=true;$('preview').hidden=true;return;}\n        const body=$('body');",'assets/admin.js')
js=replace_once(js,"$('body').value=$('body').value.split('[[figure:'+f.id+']]').join('');dirty=true;", "if(window.LedgerRichEditor)window.LedgerRichEditor.removeFigure('[[figure:'+f.id+']]');else $('body').value=$('body').value.split('[[figure:'+f.id+']]').join('');dirty=true;",'assets/admin.js')
js=replace_once(js,"$('body').value+='\\n\\n'+added.map(f=>'[[figure:'+f.id+']]').join('\\n\\n');", "if(window.LedgerRichEditor)added.forEach(f=>window.LedgerRichEditor.insertFigure('[[figure:'+f.id+']]'));else $('body').value+='\\n\\n'+added.map(f=>'[[figure:'+f.id+']]').join('\\n\\n');",'assets/admin.js')
files['assets/admin.js']=js

core=files['assets/editor-core.js']
rich=r'''  /* Sanitize rich article text: only harmless inline formatting and paragraphs. */
  function sanitizeRichHtml(markup){
    const doc=new DOMParser().parseFromString('<div id="ledger-sanitize-root">'+String(markup||'')+'</div>','text/html');
    const root=doc.getElementById('ledger-sanitize-root');
    const allowedColors=new Set(['#35291f','#594739','#745d4a','#927b67','#aa8967','#c5a27e','#d5bfa5','#e9ddcc','#f7f2e9','#fffdf9']);
    const allowedSizes=new Set(['12px','14px','16px','18px','20px','24px','28px','32px','40px']);
    function clean(node){
      if(node.nodeType===3)return doc.createTextNode(node.nodeValue);
      if(node.nodeType!==1)return doc.createDocumentFragment();
      const tag=node.tagName.toLowerCase();
      if(['script','style','iframe','svg','math','object','template','form'].includes(tag))return doc.createDocumentFragment();
      const valid=['p','div','span','strong','b','u','br','em','i'].includes(tag);
      const output=valid?doc.createElement(tag):doc.createDocumentFragment();
      if(tag==='span'){
        const color=node.style.color;
        const rgb=color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
        const hex=rgb?'#'+[rgb[1],rgb[2],rgb[3]].map(v=>Number(v).toString(16).padStart(2,'0')).join(''):color.toLowerCase();
        if(allowedColors.has(hex))output.style.color=hex;
        if(allowedSizes.has(node.style.fontSize))output.style.fontSize=node.style.fontSize;
      }
      for(const child of [...node.childNodes])output.append(clean(child));
      return output;
    }
    const output=doc.createElement('div');
    for(const node of [...root.childNodes])output.append(clean(node));
    return output.innerHTML;
  }
'''
core=replace_once(core,'  function renderBody(paper,prefix=\'../\'){',rich+r'''  function renderBody(paper,prefix='../'){
    if(/^<div data-ledger-rich="1">/.test(String(paper.body||''))){
      const figures=validatePlacement(paper), map=new Map(figures.map(f=>[f.id,f]));
      const doc=new DOMParser().parseFromString(String(paper.body),'text/html');
      const root=doc.querySelector('[data-ledger-rich]');
      let html=sanitizeRichHtml(root?root.innerHTML:'');
      html=html.replace(/<p>\s*\[\[figure:([a-z0-9-]+)\]\]\s*<\/p>/g,(_,id)=>{
        const f=map.get(id);if(!f)return '';
        return `<figure class="article-figure"><img src="${escape(figureSource(f.src,prefix))}" alt="${escape(f.alt)}" loading="lazy" decoding="async">${f.caption?`<figcaption>${escape(f.caption)}</figcaption>`:''}</figure>`;
      });
      return html;
    }
''','assets/editor-core.js')
core=replace_once(core,'renderBody,figureSource};','renderBody,figureSource,sanitizeRichHtml};','assets/editor-core.js')
files['assets/editor-core.js']=core

# Make sure every transformation completed before modifying the local website.
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
backup=ROOT.parent/(ROOT.name+'-rich-editor-backup-'+stamp)
backup.mkdir()
for name,content in files.items():
    src=ROOT/name
    dst=backup/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
for name,content in files.items(): (ROOT/name).write_text(content,encoding='utf-8')
for name in ['rich-editor.js','rich-editor.css']:
    shutil.copy2(PACKAGE/'assets'/name,ROOT/'assets'/name)
print('Installed the rich-text editor. Backup:',backup)
print('Review the changes locally. The installer did NOT commit or push anything.')
