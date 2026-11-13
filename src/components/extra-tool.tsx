'use client';
import { countLabel } from '@/lib/counts';
import { ToolIntro, ToolSections } from './tool-sections';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ImagePlus, LockKeyhole, Plus, Trash2 } from 'lucide-react';
import { SiteHeader, SiteFooter, AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import type { ExtraTool as Config } from '@/lib/extra-tools';
import { canvasBlob, cropPhoto, imageDimensions, imageToTarget, photoPixels, readImage, renderImage, type ImageFormat } from '@/lib/image-processing';
import { compressPdfToTarget, pdfToJpg, zipImages } from '@/lib/conversions';
import { formatBytes, inspectPdf } from '@/lib/pdf';
import { tools } from '@/lib/tool-catalog';

type Entry={file:File;url:string;width?:number;height?:number};
type Output={url:string;name:string;size:number;note:string;preview?:string};
const imageInputs = {
  'image/jpeg': { label: 'JPG', accept: '.jpg,.jpeg,image/jpeg' },
  'image/png': { label: 'PNG', accept: '.png,image/png' },
  'image/webp': { label: 'WebP', accept: '.webp,image/webp' },
};
export default function ExtraTool({config}:{config:Config}) {
  const {mode}=config, pdf=mode==='target-pdf'||mode==='pdf-png', single=pdf||mode==='passport'||mode==='resize';
  const inputFormat = config.inputFormat ? imageInputs[config.inputFormat] : undefined;
  const webpConverter = config.slug === 'webp-to-jpg';
  const [entries,setEntries]=useState<Entry[]>([]),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState(0),[result,setResult]=useState<Output|null>(null);
  const [quality,setQuality]=useState(80),[format,setFormat]=useState<ImageFormat>(config.format||'image/jpeg'),[width,setWidth]=useState<number|''>(1200),[height,setHeight]=useState<number|''>(800),[lock,setLock]=useState(true),[target,setTarget]=useState(config.target||100),[raster,setRaster]=useState(true),[scale,setScale]=useState(2);
  const [text,setText]=useState(''),[qrFormat,setQrFormat]=useState('png'),[qrSize,setQrSize]=useState(512),[correction,setCorrection]=useState<'L'|'M'|'Q'|'H'>('M');
  const [size,setSize]=useState('35x45'),[mmWidth,setMmWidth]=useState(35),[mmHeight,setMmHeight]=useState(45),[zoom,setZoom]=useState(1),[x,setX]=useState(0),[y,setY]=useState(0),[sheet,setSheet]=useState(false);
  const input=useRef<HTMLInputElement>(null),urls=useRef(new Set<string>()),locked=useRef(false),alive=useRef(true),heading=useRef<HTMLHeadingElement>(null);
  const originalPortrait=useRef<Entry|null>(null);
  const [backgroundDone,setBackgroundDone]=useState(false);
  function url(blob:Blob){const value=URL.createObjectURL(blob);urls.current.add(value);return value;}
  function release(value?:string){if(value){URL.revokeObjectURL(value);urls.current.delete(value);}}
  function clearResult(){setResult(current=>{release(current?.url);if(current?.preview!==current?.url)release(current?.preview);return null;});}
  useEffect(()=>{alive.current=true;setReady(true);return()=>{alive.current=false;urls.current.forEach(value=>URL.revokeObjectURL(value));urls.current.clear();};},[]);
  useEffect(()=>{if(result)heading.current?.focus();},[result]);
  async function addFiles(files:File[]){
    if(locked.current||!files.length)return;locked.current=true;setBusy(true);setError('');clearResult();
    const added:Entry[]=[];
    try {
      const selected=single?files.slice(0,1):files;
      if(selected.length+(single?0:entries.length)>20)throw new Error('Choose up to 20 images per batch.');
      if(selected.reduce((n,f)=>n+f.size,0)+(single?0:entries.reduce((n,e)=>n+e.file.size,0))>(pdf?200:100)*1024*1024)throw new Error(`Choose files up to ${pdf?200:100} MB combined.`);
      for(const file of selected){
        if(pdf){await inspectPdf(file);added.push({file,url:''});}
        else {
          const decoded=await readImage(file);
          try {
            if(inputFormat && decoded.format!==config.inputFormat)throw new Error(`Choose a ${inputFormat.label} image for this converter.`);
            if(webpConverter)imageDimensions(decoded.image.width,decoded.image.height);
            added.push({file,url:url(file),width:decoded.image.width,height:decoded.image.height});
          }finally{decoded.image.close();}
        }
      }
      if(!alive.current){added.forEach(e=>release(e.url));return;}
      if(single){entries.forEach(e=>release(e.url));release(originalPortrait.current?.url);originalPortrait.current=null;setBackgroundDone(false);setEntries(added);setZoom(1);setX(0);setY(0);if(added[0]?.width){setWidth(added[0].width!);setHeight(added[0].height!);}}
      else setEntries(current=>[...current,...added]);
    }catch(cause){added.forEach(e=>release(e.url));if(alive.current)setError(cause instanceof Error?cause.message:'Could not read these files.');}
    finally{locked.current=false;if(alive.current)setBusy(false);}
  }
  function changeDimension(raw:string,isWidth:boolean){const value=raw===''?'':Number(raw);clearResult();if(isWidth){setWidth(value);if(value!==''&&lock&&entries[0]?.width)setHeight(Math.max(1,Math.round(value*entries[0].height!/entries[0].width)));}else{setHeight(value);if(value!==''&&lock&&entries[0]?.height)setWidth(Math.max(1,Math.round(value*entries[0].width!/entries[0].height)));}}
  async function replaceBackground(){
    if(locked.current||!entries[0])return;locked.current=true;setBusy(true);setError('');clearResult();
    try {
      const {image}=await readImage(entries[0].file);
      let blob:Blob;
      try{const {whitePortraitBackground}=await import('@/lib/portrait-background');blob=await whitePortraitBackground(image);}finally{image.close();}
      const file=new File([blob],'portrait-white.png',{type:'image/png'}),decoded=await readImage(file);
      try{if(alive.current){originalPortrait.current=entries[0];setEntries([{file,url:url(blob),width:decoded.image.width,height:decoded.image.height}]);setBackgroundDone(true);}}finally{decoded.image.close();}
    }catch(cause){if(alive.current)setError(cause instanceof Error?cause.message:'Background replacement failed. Try a smaller portrait.');}
    finally{locked.current=false;if(alive.current)setBusy(false);}
  }
  async function run(){
    if(locked.current)return;locked.current=true;setBusy(true);setError('');setProgress(0);clearResult();
    try {
      let outputs:{blob:Blob;name:string}[]=[],note='',preview:Blob|undefined;
      const update=(value:number)=>{if(alive.current)setProgress(value);};
      if(mode==='qr'){
        if(!text.trim())throw new Error('Enter text or a URL first.');
        if(text.length>2000)throw new Error('Use 2000 characters or fewer.');
        const QR=await import('qrcode');
        const options={width:qrSize,margin:4,errorCorrectionLevel:correction,color:{dark:'#000000',light:'#ffffff'}};
        const canvas=document.createElement('canvas');await QR.toCanvas(canvas,text,options);preview=await canvasBlob(canvas,'image/png');canvas.width=canvas.height=0;
        const blob=qrFormat==='svg'?new Blob([await QR.toString(text,{...options,type:'svg'})],{type:'image/svg+xml'}):preview;
        outputs=[{blob,name:`zipora-qr.${qrFormat}`}];note=`${qrSize} × ${qrSize} px · scan the preview before sharing`;
      }else {
        if(!entries.length)throw new Error('Choose a file first.');
        if(mode==='pdf-png'){
          const images=await pdfToJpg(entries[0].file,{scale,quality:1,format:'image/png'},update);outputs=images;preview=images[0].blob;note=`${images.length} PNG ${images.length===1?'page':'pages'} · ${images[0].width} × ${images[0].height} px on page 1`;
        }else if(mode==='target-pdf'){
          if(!Number.isFinite(target)||target<1||target>10000)throw new Error('Set a target from 1 to 10000 KB.');
          const result=await compressPdfToTarget(entries[0].file,target*1024,raster,update);
          outputs=[{blob:new Blob([new Uint8Array(result.bytes)],{type:'application/pdf'}),name:'zipora-compressed.pdf'}];
          const sizeKB = `${(result.bytes.length/1024).toFixed(2)} KB`;
          const outcome = result.targetMet ? 'Target reached.' : !raster
            ? 'Target not reached. Tick Allow image-based compression to try to reach this size, or try a larger target.'
            : result.strategy === 'image'
              ? `Target not reached at readable quality. Best readable result is ${sizeKB} at 150 DPI.`
              : `Target not reached at readable quality. Best readable result is ${sizeKB} (text-preserving). A 150 DPI image copy could not provide a smaller readable result. Try a larger target.`;
          note=`${outcome} ${countLabel(result.pages,'page')} · original ${formatBytes(result.originalSize)}. ${result.strategy==='image'?'Image-based output at 150 DPI: text is not selectable; links, forms, attachments, and signatures are lost.':result.strategy==='original'?'Original file retained unchanged, with selectable text preserved.':'Text-preserving result retained.'}`;
        }else{
          for(let index=0;index<entries.length;index++){
            const entry=entries[index],{image}=await readImage(entry.file);
            try{
              let blob:Blob,w=image.width,h=image.height;
              if(mode==='target-image'){
                const converted=await imageToTarget(image,target*1024);blob=converted.blob;w=converted.width;h=converted.height;
              }else if(mode==='passport'){
                const dims=photoPixels(mmWidth,mmHeight),photo=await cropPhoto(image,dims.width,dims.height,zoom,x,y,sheet);blob=photo.blob;w=photo.width;h=photo.height;
              }else{
                if(mode==='resize'){imageDimensions(Number(width),Number(height));w=Number(width);h=Number(height);}
                else if(!webpConverter) {const factor=Math.min(1,Math.sqrt(16_000_000/(w*h)),8192/Math.max(w,h));w=Math.max(1,Math.floor(w*factor));h=Math.max(1,Math.floor(h*factor));}
                blob=await renderImage(image,w,h,config.format||format,quality/100);
                if(config.slug==='image-compressor'&&blob.size>entry.file.size)throw new Error('This quality makes the file bigger than the original. Try 80% or lower.');
              }
              const extension=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';
              const stem=entry.file.name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,70)||'image';
              if(outputs.reduce((sum,item)=>sum+item.blob.size,0)+blob.size>200*1024*1024)throw new Error('Output exceeds 200 MB. Use a smaller batch.');
              outputs.push({blob,name:`${String(index+1).padStart(2,'0')}-${stem}.${extension}`});
              if(!preview)preview=blob;
              note=entries.length===1?`${w} × ${h} px · original ${formatBytes(entry.file.size)}${mode==='target-image'?` · within ${target} KB`:''}${mode==='passport'?' · 300 DPI':''}`:`${entries.length} converted images · numbered in selection order`;
              update(Math.round((index+1)/entries.length*90));
            }finally{image.close();}
          }
        }
      }
      if(outputs.reduce((total,out)=>total+out.blob.size,0)>200*1024*1024)throw new Error('Output exceeds 200 MB. Use a smaller batch or dimensions.');
      const blob=outputs.length===1?outputs[0].blob:await zipImages(outputs);
      if(!alive.current)return;
      const outputUrl=url(blob);setResult({url:outputUrl,name:outputs.length===1?outputs[0].name:'zipora-images.zip',size:blob.size,note,preview:preview?blob===preview?outputUrl:url(preview):undefined});update(100);
    }catch(cause){if(alive.current)setError(cause instanceof Error?cause.message:'Processing failed. Try a smaller file.');}
    finally{locked.current=false;if(alive.current)setBusy(false);}
  }
  const accept=pdf?'.pdf,application/pdf':inputFormat?.accept ?? '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
  const action=mode==='qr'?'Generate QR code':mode==='passport'?'Create photo':mode==='resize'?'Resize image':mode==='pdf-png'?'Convert to PNG':mode==='convert'?'Convert images':'Compress';
  return <><a className="skip-link" href="#main">Skip to tool</a><SiteHeader active={config.title}/><main id="main" className="main-shell"><ToolIntro slug={config.slug}/><div className="workspace"><section className="tool-panel" aria-label={`${config.title} workspace`} aria-busy={busy}>
  <div className="panel-heading"><h2>{mode==='qr'?'Your content':pdf?'Your document':'Your images'}</h2><span>01 / Choose & prepare</span></div>
  {mode==='qr'?<label className="qr-input">Text or URL<textarea maxLength={2000} value={text} onChange={e=>{clearResult();setText(e.target.value);}} placeholder="https://example.com" disabled={busy}/><span>{text.length} / 2000 characters</span></label>:<><div className={`drop-zone ${entries.length?'is-compact':''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void addFiles(Array.from(e.dataTransfer.files));}}><ImagePlus/><h3>{entries.length?'Choose another file':pdf?'Drop a PDF here':'Drop your image here'}</h3><p>{pdf?'Unlocked PDFs, processed privately':inputFormat ? inputFormat.label + ' images, processed on your device' : 'JPG, PNG and WebP · processed on your device'}</p><input ref={input} className="sr-only" aria-label="Choose files" type="file" accept={accept} multiple={!single} disabled={!ready||busy} onChange={e=>{void addFiles(Array.from(e.target.files||[]));e.target.value='';}}/><button className="upload-button" disabled={!ready||busy} onClick={()=>input.current?.click()}><Plus/>{single?'Select file':'Select images'}</button><span className="upload-hint">{pdf?'200 MB · up to 150 pages':'50 MB / image · '+(webpConverter?'16':'40')+' megapixels · '+(single?'one image':'20 images / 100 MB batch')}</span></div>
  {entries.length>0&&<ul className="file-list extra-file-list">{entries.map((entry,index)=><li className="file-row" key={`${entry.file.name}-${index}`}>{entry.url&&<img className="file-thumbnail" src={entry.url} alt=""/>}<div className="file-info"><strong>{entry.file.name}</strong><span>{entry.width?`${entry.width} × ${entry.height} px · `:''}{formatBytes(entry.file.size)}</span></div><button aria-label={`Remove ${entry.file.name}`} disabled={busy} onClick={()=>{release(entry.url);setEntries(items=>items.filter((_,i)=>i!==index));clearResult();}}><Trash2/></button></li>)}</ul>}</>}
  {mode==='passport'&&entries.length>0&&<div className="portrait-background-controls"><button className="primary" disabled={busy} onClick={()=>{if(backgroundDone&&originalPortrait.current){release(entries[0].url);setEntries([originalPortrait.current]);originalPortrait.current=null;setBackgroundDone(false);clearResult();}else void replaceBackground();}}>{backgroundDone?'Restore original background':'Replace background with white'}</button><p className="option-help">On-device person segmentation. Inspect hair and edges; the model may miss fine detail. Background processing is capped at 2048 pixels on the longest side.</p></div>}
  {mode==='passport'&&entries[0]?.url&&<div className="mobile-portrait-preview"><h3>Frame your portrait</h3><PortraitPreview entry={entries[0]} ratio={mmWidth/mmHeight} zoom={zoom} x={x} y={y}/></div>}
  <fieldset className="tool-options" disabled={busy} onChange={()=>clearResult()}><legend>Output options</legend>
  {(mode==='compress'||mode==='resize')&&<><label>Output format<select value={format} onChange={e=>setFormat(e.target.value as ImageFormat)}><option value="image/jpeg">JPG · white background</option><option value="image/png">PNG · keep transparency</option><option value="image/webp">WebP</option></select></label>{format!=='image/png'&&<label>Image quality · {quality}%<input type="range" min={10} max={100} value={quality} onChange={e=>setQuality(+e.target.value)}/></label>}</>}
  {mode==='resize'&&<><label>Width (px)<input type="number" min={1} max={8192} value={width} onChange={e=>{if(e.currentTarget.value!=='')e.currentTarget.value=String(Number(e.currentTarget.value));changeDimension(e.currentTarget.value,true);}}/></label><label>Height (px)<input type="number" min={1} max={8192} value={height} onChange={e=>{if(e.currentTarget.value!=='')e.currentTarget.value=String(Number(e.currentTarget.value));changeDimension(e.currentTarget.value,false);}}/></label><label className="extra-check"><input type="checkbox" checked={lock} onChange={e=>setLock(e.target.checked)}/>Keep aspect ratio</label></>}
  {(mode==='target-image'||mode==='target-pdf')&&<><label>Target size (KB)<input type="number" min={1} max={mode==='target-pdf'?10000:10240} value={target} onChange={e=>setTarget(+e.target.value)}/></label><p className="option-help">1 KB = 1024 bytes. {mode==='target-image'?'JPG output; quality and dimensions can decrease to fit. Transparent areas become white.':'Targets are not guaranteed. The smallest result is kept; files are never enlarged.'}</p></>}
  {mode==='target-pdf'&&<label className="extra-check"><input type="checkbox" checked={raster} onChange={e=>setRaster(e.target.checked)}/>Allow image-based compression. Selectable text, links, forms and signatures are lost if used. Image-based compression stays at 150 DPI; a size target may not be achievable at readable quality.</label>}
  {mode==='pdf-png'&&<label>Resolution<select value={scale} onChange={e=>setScale(+e.target.value)}><option value={1}>Standard · 72 DPI</option><option value={2}>High · 144 DPI</option><option value={3}>Print · 216 DPI</option></select></label>}
  {mode==='qr'&&<><label>Download format<select value={qrFormat} onChange={e=>setQrFormat(e.target.value)}><option value="png">PNG image</option><option value="svg">SVG vector</option></select></label><label>Size<select value={qrSize} onChange={e=>setQrSize(+e.target.value)}>{[256,512,1024,2048].map(n=><option key={n} value={n}>{n} × {n} px</option>)}</select></label><label>Error correction<select value={correction} onChange={e=>setCorrection(e.target.value as typeof correction)}><option value="L">Low · 7%</option><option value="M">Medium · 15%</option><option value="Q">Quartile · 25%</option><option value="H">High · 30%</option></select></label><p className="option-help">Static QR codes have no expiry or tracking. A URL must include https:// to open reliably. Longer text makes denser codes.</p></>}
  {mode==='passport'&&<><label>Photo size<select value={size} onChange={e=>{setSize(e.target.value);if(e.target.value!=='custom'){const dims=e.target.value.split('x').map(Number);setMmWidth(dims[0]);setMmHeight(dims[1]);}}}><option value="35x45">35 × 45 mm</option><option value="50.8x50.8">2 × 2 inches</option><option value="custom">Custom dimensions</option></select></label>{size==='custom'&&<><label>Width (mm)<input type="number" min={10} max={100} value={mmWidth} onChange={e=>setMmWidth(+e.target.value)}/></label><label>Height (mm)<input type="number" min={10} max={100} value={mmHeight} onChange={e=>setMmHeight(+e.target.value)}/></label></>}<label>Zoom · {zoom.toFixed(2)}×<input type="range" min={1} max={3} step={.01} value={zoom} onChange={e=>setZoom(+e.target.value)}/></label><label>Horizontal position<input type="range" min={-1} max={1} step={.01} value={x} onChange={e=>setX(+e.target.value)}/></label><label>Vertical position<input type="range" min={-1} max={1} step={.01} value={y} onChange={e=>setY(+e.target.value)}/></label><label className="extra-check"><input type="checkbox" checked={sheet} onChange={e=>setSheet(e.target.checked)}/>Create a 4 × 6 inch print sheet at 300 DPI</label><p className="option-warning">Check your issuing authority’s current photo rules. This tool frames photos; it does not validate faces or guarantee acceptance. Use a well-lit portrait with a plain background.</p></>}
  {webpConverter&&<label>JPG quality · {quality}%<input type="range" min={50} max={100} value={quality} onChange={e=>setQuality(+e.target.value)}/></label>}
  {mode==='convert'&&<p className="option-help">{config.format==='image/jpeg'?'JPG uses lossy compression and a white background.':'PNG keeps the decoded pixels but can be larger than JPG. It cannot restore transparency or detail already lost in the JPG.'}</p>}
  </fieldset>
  {error&&<div role="alert" className="error-message">{error}</div>}<button className="primary" disabled={!ready||busy||(mode==='qr'?!text.trim():!entries.length)} onClick={()=>void run()}>{busy?'Processing…':action}<ArrowRight/></button><div className="status-line" role="status">{busy?`Working on your device… ${progress}%`:entries.length?`${entries.length} file${entries.length===1?'':'s'} ready`:mode==='qr'?'Your code stays on your device.':'Choose a file to get started.'}</div>{busy&&<progress max={100} value={progress} aria-label="Processing progress"/>}
  {result&&<section className={`conversion-result extra-result ${result.note.startsWith('Target not reached')?'target-not-reached':''}`} aria-label="Conversion result"><h2 ref={heading} tabIndex={-1}>{result.note.startsWith('Target not reached')?'Best available result':'Ready to save'}</h2><p>{result.note}</p><strong>{formatBytes(result.size)}</strong>{result.preview&&<img className={mode==='qr'?'qr-preview':'extra-preview'} src={result.preview} alt={mode==='qr'?'Generated QR code':'Converted image preview'}/>}<DownloadButton href={result.url} download={result.name} label={result.name.endsWith('.zip')?'Download all images':result.name.endsWith('.pdf')?'Download PDF':mode==='qr'?'Download QR code':'Download image'}/></section>}
  {result && <AdSlot position="download"/>}
        <div className="panel-privacy"><LockKeyhole/>Files stay on your device, from start to finish</div></section>
  <div className="tool-sidebar"><aside className="side-panel extra-aside"><div className="panel-heading"><h2>{mode==='passport'?'Frame your portrait':'Before you save'}</h2><span>02 / Review</span></div>{mode==='passport'&&entries[0]?.url?<PortraitPreview entry={entries[0]} ratio={mmWidth/mmHeight} zoom={zoom} x={x} y={y}/>:<div className="extra-format"><span>Zipora</span><strong>{mode==='qr'?'QR':mode==='pdf-png'?'PNG':mode==='target-pdf'?'PDF':mode==='convert'?config.format==='image/png'?'PNG':'JPG':mode==='target-image'?'JPG':'IMG'}</strong><span>{config.target?`Target: ${config.target} KB`:'Your file. Your settings.'}</span></div>}<p className="option-help">{mode==='passport'?'Move and zoom until the head is centered. The guide is visual only; crop and review against your authority’s measurements.':mode==='qr'?'Scan the downloaded code with your phone before printing or sharing.':mode==='pdf-png'?'One page downloads as PNG. Multiple pages download together as a numbered ZIP. Pages use a white background.':'Compare the preview, dimensions and real file size before downloading.'}</p><div className="privacy-note"><LockKeyhole/><div><h3>A private workspace</h3><p>No uploads, accounts or added watermarks. Your browser does the work.</p></div></div></aside><AdSlot position="sidebar"/></div></div>
  <ToolSections slug={config.slug}/></main><SiteFooter/></>;
}
function PortraitPreview({entry,ratio,zoom,x,y}:{entry:Entry;ratio:number;zoom:number;x:number;y:number}) {
  const container=useRef<HTMLDivElement>(null),[box,setBox]=useState({width:200,height:257});
  useEffect(()=>{if(!container.current)return;const observer=new ResizeObserver(([entry])=>setBox({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(container.current);return()=>observer.disconnect();},[]);
  const scale=Math.max(box.width/entry.width!,box.height/entry.height!)*zoom,dw=entry.width!*scale,dh=entry.height!*scale;
  return <div ref={container} className="portrait-preview" style={{aspectRatio:Number.isFinite(ratio)&&ratio>0?ratio:35/45}}><img src={entry.url} alt="Portrait crop preview" style={{width:dw,height:dh,left:(box.width-dw)/2+x*(dw-box.width)/2,top:(box.height-dh)/2+y*(dh-box.height)/2}}/><div className="portrait-guide" aria-hidden="true"/></div>;
}
