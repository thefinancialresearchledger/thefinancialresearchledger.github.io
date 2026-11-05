/* Formatting controls for the existing editor. No network or credential access. */
(() => {
  'use strict';
  const core=window.LedgerEditor,box=document.getElementById('rich-body'),plain=document.getElementById('body'),toolbar=document.getElementById('format-toolbar');
  let savedRange=null;
  function remember(){
    const selection=window.getSelection();
    if(selection.rangeCount&&box.contains(selection.getRangeAt(0).commonAncestorContainer))savedRange=selection.getRangeAt(0).cloneRange();
  }
  function restore(){
    box.focus();const selection=window.getSelection();selection.removeAllRanges();
    if(savedRange&&box.contains(savedRange.commonAncestorContainer))selection.addRange(savedRange);
    else{const r=document.createRange();r.selectNodeContents(box);r.collapse(false);selection.addRange(r);}
  }
  function sync(){plain.value=core.richText(box.innerHTML);}
  function changed(){sync();remember();box.dispatchEvent(new Event('input',{bubbles:true}));}
  function load(paper){
    box.innerHTML=paper?.bodyHtml!=null?core.sanitizeRich(paper.bodyHtml):core.paragraphs(paper?.body||'');savedRange=null;sync();
  }
  function html(){return core.sanitizeRich(box.innerHTML);}
  function command(name,value){restore();document.execCommand(name,false,value);changed();updateState();}
  function updateState(){
    const sel=window.getSelection();if(!sel.rangeCount||!box.contains(sel.anchorNode))return;
    for(const b of toolbar.querySelectorAll('[data-toggle]'))b.setAttribute('aria-pressed',String(document.queryCommandState(b.dataset.command)));
  }
  box.addEventListener('input',()=>{sync();remember();});
  document.addEventListener('selectionchange',()=>{remember();updateState();});
  toolbar.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault();else remember();});
  for(const button of toolbar.querySelectorAll('[data-command]'))button.addEventListener('click',()=>command(button.dataset.command));
  document.getElementById('font-family').addEventListener('change',e=>command('fontName',e.target.value));
  document.getElementById('font-size').addEventListener('change',e=>{
    restore();document.execCommand('fontSize',false,'7');
    for(const font of box.querySelectorAll('font[size="7"]')){font.removeAttribute('size');font.style.fontSize=e.target.value+'px';}
    changed();
  });
  const colorInput=document.getElementById('font-color');
  const palette=[
    ['Espresso','#35291F'],['Dark Walnut','#594739'],['Cocoa','#745D4A'],
    ['Warm Taupe','#927B67'],['Muted Bronze','#AA8967'],['Camel','#C5A27E'],
    ['Sandstone','#D5BFA5'],['Linen','#E9DDCC'],['Ivory','#F7F2E9'],
    ['Soft White','#FFFDF9']
  ];
  const applyColor=document.getElementById('apply-color');
  applyColor.addEventListener('click',()=>command('foreColor',colorInput.value));
  // The palette uses the existing color control, so the editor's publishing format is unchanged.
  const paletteWrap=document.createElement('div');
  paletteWrap.className='ledger-palette';
  paletteWrap.setAttribute('role','group');
  paletteWrap.setAttribute('aria-label','Article text colors');
  const paletteHeading=document.createElement('span');
  paletteHeading.className='ledger-palette-title';
  paletteHeading.textContent='Text color';
  paletteWrap.append(paletteHeading);
  palette.forEach(([name,hex])=>{
    const swatch=document.createElement('button');
    swatch.type='button';
    swatch.className='ledger-swatch';
    swatch.style.setProperty('--swatch-color',hex);
    swatch.title=name+' ('+hex+')';
    swatch.setAttribute('aria-label','Apply '+name+' text color');
    swatch.setAttribute('aria-pressed',String(hex.toLowerCase()==='#35291f'));
    swatch.dataset.hex=hex;
    swatch.addEventListener('mousedown',event=>event.preventDefault());
    swatch.addEventListener('click',()=>{
      colorInput.value=hex;
      for(const item of paletteWrap.querySelectorAll('.ledger-swatch'))item.setAttribute('aria-pressed',String(item===swatch));
      command('foreColor',hex);
    });
    paletteWrap.append(swatch);
  });
  toolbar.append(paletteWrap);
  // Support legacy admin.html layouts where the bold/underline controls are absent.
  for(const [name,label,caption] of [['bold','B','Bold'],['underline','U','Underline']]){
    if(!toolbar.querySelector('[data-command="'+name+'"]')){
      const button=document.createElement('button');button.type='button';
      button.dataset.command=name;button.dataset.toggle='true';
      button.className='ledger-format-'+name;
      button.setAttribute('aria-label',caption);
      button.setAttribute('aria-pressed','false');
      button.textContent=label;
      button.addEventListener('mousedown',event=>event.preventDefault());
      button.addEventListener('click',()=>command(name));
      toolbar.insertBefore(button,paletteWrap);
    }
  }

  box.addEventListener('paste',e=>{
    e.preventDefault();remember();const clipboard=e.clipboardData;if(!clipboard)return;
    const formatted=clipboard.getData('text/html');
    command('insertHTML',formatted?core.sanitizeRich(formatted):core.paragraphs(clipboard.getData('text/plain')));
  });
  // Images are deliberately added through the validated graph uploader.
  box.addEventListener('drop',e=>{e.preventDefault();});
  function removeMarker(id){
    const marker='[[figure:'+id+']]',walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT),nodes=[],ranges=[];let text='';
    while(walker.nextNode()){nodes.push({node:walker.currentNode,start:text.length});text+=walker.currentNode.data;}
    for(let at=text.indexOf(marker);at!==-1;at=text.indexOf(marker,at+marker.length)){
      const first=nodes.find(x=>x.start+x.node.length>at),last=nodes.find(x=>x.start+x.node.length>=at+marker.length),range=document.createRange();
      range.setStart(first.node,at-first.start);range.setEnd(last.node,at+marker.length-last.start);ranges.push(range);
    }
    for(const range of ranges.reverse())range.deleteContents();
  }
  function addMarker(id,atCursor){
    if(atCursor)restore();
    else{box.focus();const range=document.createRange();range.selectNodeContents(box);range.collapse(false);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);}
    // Keep a live range while removing the previous occurrence, preserving formatting elsewhere.
    const selection=window.getSelection(),range=selection.getRangeAt(0);range.collapse(true);removeMarker(id);
    selection.removeAllRanges();selection.addRange(range);
    document.execCommand('insertText',false,'\n\n[[figure:'+id+']]\n\n');changed();
  }
  function remove(id){removeMarker(id);changed();}
  window.LedgerRich={load,html,sync,addMarker,remove};
})();
