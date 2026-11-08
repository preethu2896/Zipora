import { chromium } from '@playwright/test';
import { PDFDocument,StandardFonts,rgb } from 'pdf-lib';
import { writeFile,mkdir } from 'node:fs/promises';

// Synthetic text + photo fixture: no user documents or personal images.
const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined});
let imageBytes;
try {
  const page=await browser.newPage();
  const encoded=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1200;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(canvas.width,canvas.height);let seed=147;
    for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;pixels.data[i]=seed&255;pixels.data[i+1]=(seed>>>8)&255;pixels.data[i+2]=(seed>>>16)&255;pixels.data[i+3]=255;}
    ctx.putImageData(pixels,0,0);return canvas.toDataURL('image/jpeg',.91).split(',')[1];
  });
  imageBytes=Buffer.from(encoded,'base64');
} finally {await browser.close();}
const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),photo=await document.embedJpg(imageBytes);
document.setTitle('Zipora 36-page readable PDF regression');
for(let index=0;index<36;index++) {
  const page=document.addPage([595.28,841.89]);
  page.drawText(`Readable PDF verification - page ${index+1}`,{x:48,y:790,size:18,font});
  for(let line=0;line<30;line++)page.drawText(`Page ${index+1}, line ${line+1}: Balanced keeps real selectable text. Readable quality matters.`,{x:48,y:752-line*16,size:10,font});
  page.drawImage(photo,{x:48,y:70,width:240,height:180});
  page.drawText('Photo sample and vector text must both remain visible.',{x:306,y:190,size:9,font,maxWidth:240,lineHeight:14});
  page.drawText(String(index+1),{x:535,y:35,size:10,font,color:rgb(.3,.3,.3)});
}
const target=2621440;let padding=0,bytes=await document.save({useObjectStreams:false});
for(let attempt=0;attempt<5;attempt++){
  padding=Math.max(0,padding+Math.round((target-bytes.length)/4));
  document.setSubject('Synthetic verification metadata: '+'x'.repeat(padding));
  bytes=await document.save({useObjectStreams:false});
}
await mkdir('tests/fixtures',{recursive:true});
await writeFile('tests/fixtures/readable-36-pages-2.5mb.pdf',bytes);
console.log(JSON.stringify({path:'tests/fixtures/readable-36-pages-2.5mb.pdf',bytes:bytes.length,megabytes:bytes.length/1048576,pages:36,photoBytes:imageBytes.length,metadataPaddingCharacters:padding}));
