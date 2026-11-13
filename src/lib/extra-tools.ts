export type ExtraTool = { slug:string; title:string; description:string; mode:'compress'|'resize'|'convert'|'target-image'|'target-pdf'|'qr'|'passport'|'pdf-png'; target?:number; format?:'image/jpeg'|'image/png'; inputFormat?:'image/jpeg'|'image/png'|'image/webp' };
export const extraTools:ExtraTool[] = [
  {slug:'image-compressor',title:'Image Compressor',description:'Choose quality, compare the size, and save a lighter image.',mode:'compress'},
  {slug:'image-resizer',title:'Image Resizer',description:'Set the exact dimensions. Keep your proportions, or choose a new shape.',mode:'resize'},
  {slug:'qr-code-generator',title:'QR Code Generator',description:'Turn a link or a little text into a QR code. Save it as PNG or SVG.',mode:'qr'},
  ...[20,50,100,200].map(target=>({slug:`compress-image-to-${target}kb`,title:`Compress Image to ${target} KB`,description:'A smaller JPG for forms and attachments. Dimensions may reduce to meet your limit.',mode:'target-image' as const,target})),
  ...[100,200,500].map(target=>({slug:`compress-pdf-to-${target}kb`,title:`Compress PDF to ${target} KB`,description:'Try a smaller document for a strict upload limit. Review the actual result before sending.',mode:'target-pdf' as const,target})),
  {slug:'passport-photo-maker',title:'Passport Photo Maker',description:'Frame your portrait, choose a physical size, and prepare a photo or print sheet.',mode:'passport'},
  {slug:'png-to-jpg',title:'PNG to JPG',description:'Convert PNG images to JPG. Transparent areas become white.',mode:'convert',format:'image/jpeg',inputFormat:'image/png'},
  {slug:'jpg-to-png',title:'JPG to PNG',description:'Save JPG images as PNG. Conversion preserves pixels; it cannot restore lost detail.',mode:'convert',format:'image/png',inputFormat:'image/jpeg'},
  {slug:'webp-to-jpg',title:'WebP to JPG',description:'Convert WebP images to JPG.',mode:'convert',format:'image/jpeg',inputFormat:'image/webp'},
  {slug:'pdf-to-png',title:'PDF to PNG',description:'Each page, as a crisp PNG. One image or a ZIP for the whole document.',mode:'pdf-png'},
];
