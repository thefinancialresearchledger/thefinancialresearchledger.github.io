/* The Financial Research Ledger rich-text extension.
 * No third-party libraries, trackers, credentials, or network requests.
 */
(() => {
  'use strict';
  const source = document.getElementById('body');
  if (!source || !window.LedgerEditor) return;
  const core = window.LedgerEditor;
  const colors = [
    ['Espresso','#35291F'],['Dark Walnut','#594739'],['Cocoa','#745D4A'],
    ['Warm Taupe','#927B67'],['Muted Bronze','#AA8967'],['Camel','#C5A27E'],
    ['Sandstone','#D5BFA5'],['Linen','#E9DDCC'],['Ivory','#F7F2E9'],['Soft White','#FFFDF9']
  ];
  const shell = document.createElement('div'); shell.className = 'ledger-rich-shell';
  const toolbar = document.createElement('div');toolbar.className='ledger-rich-toolbar';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Article formatting');
  const area = document.createElement('div');area.className='ledger-rich-content';area.contentEditable='true';area.setAttribute('role','textbox');area.setAttribute('aria-label','Article text');area.setAttribute('aria-multiline','true');area.spellcheck=true;
  const hint=document.createElement('div');hint.className='ledger-rich-notice';hint.textContent='Highlight text to format it. Figure markers such as [[figure:image-id]] are preserved.';
  shell.append(toolbar,area,hint);source.insertAdjacentElement('beforebegin',shell);
  source.hidden=true;source.setAttribute('aria-hidden','true');source.tabIndex=-1;
  let lastRange=null;
  function remember(){const selection=window.getSelection();if(selection && selection.rangeCount && area.contains(selection.anchorNode))lastRange=selection.getRangeAt(0).cloneRange();}
  function focusSelection(){area.focus();const selection=window.getSelection();if(lastRange){try{selection.removeAllRanges();selection.addRange(lastRange);}catch(e){lastRange=null;}}}
  function cmd(name,value){focusSelection();document.execCommand(name,false,value);normalizeFonts();sync();remember();}
  const size=document.createElement('select');size.setAttribute('aria-label','Font size');
  for(const px of [12,14,16,18,20,24,28,32,40])size.add(new Option(px+' px',String(px)));
  size.value='16';toolbar.append(size);
  const strong=document.createElement('button');strong.type='button';strong.innerHTML='<strong>B</strong>';strong.title='Bold (⌘B)';strong.setAttribute('aria-label','Bold');toolbar.append(strong);
  const under=document.createElement('button');under.type='button';under.innerHTML='<u>U</u>';under.title='Underline (⌘U)';under.setAttribute('aria-label','Underline');toolbar.append(under);
  const palette=document.createElement('div');palette.className='ledger-palette';palette.setAttribute('role','group');palette.setAttribute('aria-label','Text color');
  colors.forEach(([name,hex],i)=>{const b=document.createElement('button');b.type='button';b.title=name+' '+hex;b.setAttribute('aria-label','Text color: '+name);b.setAttribute('aria-pressed',i===0?'true':'false');b.style.backgroundColor=hex;
    b.addEventListener('click',()=>{cmd('foreColor',hex);palette.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});palette.append(b);});
  toolbar.append(palette);
  /* Keep selection when clicking a toolbar item. */
  toolbar.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault();});
  strong.addEventListener('click',()=>cmd('bold'));
  under.addEventListener('click',()=>cmd('underline'));
  size.addEventListener('change',()=>{focusSelection();document.execCommand('fontSize',false,'7');normalizeFonts(Number(size.value));sync();remember();});
  function normalizeFonts(selectedSize){
    area.querySelectorAll('font').forEach(font=>{const span=document.createElement('span');const old=font.getAttribute('color');const s=font.getAttribute('size');
      if(old && /^#[0-9a-f]{6}$/i.test(old))span.style.color=old;
      if(s)span.style.fontSize=(s==='7' && selectedSize? selectedSize:16)+'px';
      while(font.firstChild)span.append(font.firstChild);font.replaceWith(span);
    });
  }
  function escapeHTML(text){return core.escape(text);}
  function plainToHtml(text){return String(text||'').split(/\n\s*\n/).map(s=>'<p>'+escapeHTML(s).replace(/\n/g,'<br>')+'</p>').join('');}
  function normalizeSelection(){remember();}
  document.addEventListener('selectionchange',()=>{const s=window.getSelection();if(s && area.contains(s.anchorNode))normalizeSelection();});
  area.addEventListener('keyup',remember);area.addEventListener('mouseup',remember);
  area.addEventListener('paste',event=>{event.preventDefault();const text=event.clipboardData.getData('text/plain');document.execCommand('insertText',false,text);sync();});
  function sync(){normalizeFonts();const value='<div data-ledger-rich="1">'+core.sanitizeRichHtml(area.innerHTML)+'</div>';source.value=value;source.dispatchEvent(new Event('input',{bubbles:true}));}
  function load(value){const input=String(value||'');if(/^<div data-ledger-rich="1">/.test(input)){
      const doc=new DOMParser().parseFromString(input,'text/html');const root=doc.querySelector('[data-ledger-rich]');area.innerHTML=core.sanitizeRichHtml(root?root.innerHTML:'');
    } else area.innerHTML=plainToHtml(input);
    lastRange=null;source.value=input;}
  function insertFigure(marker){area.focus();const p=document.createElement('p');p.textContent=marker;
    if(lastRange&&area.contains(lastRange.commonAncestorContainer)){
      try{const range=lastRange.cloneRange();range.collapse(false);range.insertNode(p);}catch(e){area.append(p);}
    }else area.append(p);
    sync();}
  function removeFigure(marker){const walker=document.createTreeWalker(area,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes)if(node.nodeValue.includes(marker)){node.nodeValue=node.nodeValue.split(marker).join('');if(node.parentElement?.tagName==='P'&&!node.parentElement.textContent.trim())node.parentElement.remove();}
    sync();}
  area.addEventListener('input',sync);
  window.LedgerRichEditor={load,sync,insertFigure,removeFigure};
  load(source.value);
})();
