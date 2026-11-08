export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';
export const IMAGE_PIXEL_LIMIT = 40_000_000;
export const OUTPUT_PIXEL_LIMIT = 16_000_000;
export function imageDimensions(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > OUTPUT_PIXEL_LIMIT) throw new Error('Use whole-number dimensions from 1 to 8192 pixels, up to 16 megapixels.');
  return { width, height };
}
export async function readImage(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216;
  const png = [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  if (!jpeg && !png && !webp) throw new Error('Choose a valid JPG, PNG or WebP image.');
  if (file.size > 50 * 1024 * 1024) throw new Error('Choose an image under 50 MB.');
  let image: ImageBitmap;
  try { image = await createImageBitmap(file); } catch { throw new Error('This image could not be decoded. Try a different image.'); }
  if (image.width * image.height > IMAGE_PIXEL_LIMIT) { image.close(); throw new Error('Choose an image up to 40 megapixels.'); }
  return { image, format: (jpeg ? 'image/jpeg' : png ? 'image/png' : 'image/webp') as ImageFormat };
}
export function canvasBlob(canvas: HTMLCanvasElement, format: ImageFormat, quality = .85) {
  return new Promise<Blob>((resolve,reject) => canvas.toBlob(blob => blob && blob.type === format ? resolve(blob) : reject(new Error('Your browser cannot export this image format.')), format, quality));
}
export async function renderImage(image: ImageBitmap, width: number, height: number, format: ImageFormat, quality = .85) {
  imageDimensions(width,height);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  try {
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Your browser cannot create images.');
    if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0,0,width,height); }
    ctx.drawImage(image,0,0,width,height);
    return await canvasBlob(canvas,format,quality);
  } finally { canvas.width = canvas.height = 0; }
}
export async function imageToTarget(image: ImageBitmap, target: number, progress = (_value:number) => {}) {
  if (!Number.isFinite(target) || target < 1024 || target > 10*1024*1024) throw new Error('Target must be between 1 KB and 10 MB.');
  let factor = Math.min(1,Math.sqrt(OUTPUT_PIXEL_LIMIT/(image.width*image.height)),8192/Math.max(image.width,image.height));
  for (let step=0; step<24; step++) {
    const width = Math.max(1,Math.floor(image.width*factor)), height = Math.max(1,Math.floor(image.height*factor));
    let best: Blob | undefined;
    let low=.12, high=.95;
    const smallest = await renderImage(image,width,height,'image/jpeg',low);
    if (smallest.size <= target) {
      best = smallest;
      for (let i=0;i<7;i++) {
        const quality=(low+high)/2, candidate=await renderImage(image,width,height,'image/jpeg',quality);
        if (candidate.size<=target) { best=candidate; low=quality; } else high=quality;
      }
      progress(100); return { blob:best,width,height };
    }
    factor *= Math.min(.85,Math.sqrt(target/smallest.size)*.9); progress(Math.round((step+1)/24*95));
  }
  throw new Error('This image could not fit the requested size. Choose a larger target.');
}
export function photoPixels(widthMM:number,heightMM:number) {
  if (![widthMM,heightMM].every(v=>Number.isFinite(v)&&v>=10&&v<=100)) throw new Error('Photo dimensions must be between 10 and 100 mm.');
  return { width:Math.round(widthMM/25.4*300),height:Math.round(heightMM/25.4*300) };
}
export async function cropPhoto(image:ImageBitmap, width:number,height:number,zoom:number,x:number,y:number,sheet=false) {
  imageDimensions(width,height);
  if (![zoom,x,y].every(Number.isFinite) || zoom<1 || zoom>3 || Math.abs(x)>1 || Math.abs(y)>1) throw new Error('Invalid crop settings.');
  const crop=document.createElement('canvas'); crop.width=width;crop.height=height;
  const ctx=crop.getContext('2d'); if(!ctx) throw new Error('Your browser cannot create photos.');
  const scale=Math.max(width/image.width,height/image.height)*zoom;
  const dw=image.width*scale,dh=image.height*scale;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
  ctx.drawImage(image,(width-dw)/2+x*(dw-width)/2,(height-dh)/2+y*(dh-height)/2,dw,dh);
  let output=crop;
  if(sheet) {
    output=document.createElement('canvas');output.width=1200;output.height=1800;
    const paper=output.getContext('2d')!;paper.fillStyle='#fff';paper.fillRect(0,0,1200,1800);
    const gap=24, cols=Math.floor((1200-gap)/(width+gap)),rows=Math.floor((1800-gap)/(height+gap));
    if(!cols||!rows) throw new Error('This photo does not fit on a 4 × 6 inch sheet.');
    const left=(1200-(cols*width+(cols-1)*gap))/2,top=(1800-(rows*height+(rows-1)*gap))/2;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)paper.drawImage(crop,left+col*(width+gap),top+row*(height+gap));
  }
  try {
    const blob=await canvasBlob(output,'image/jpeg',.95);
    const bytes=new Uint8Array(await blob.arrayBuffer());
    // Canvas JPEGs include JFIF. Set density metadata to 300 DPI for physical printing.
    if(bytes[2]===255&&bytes[3]===224&&String.fromCharCode(...bytes.slice(6,11))==='JFIF\0') { bytes[13]=1;bytes[14]=1;bytes[15]=44;bytes[16]=1;bytes[17]=44; }
    return {blob:new Blob([bytes],{type:'image/jpeg'}),width:output.width,height:output.height};
  } finally {crop.width=crop.height=0;if(sheet)output.width=output.height=0;}
}
