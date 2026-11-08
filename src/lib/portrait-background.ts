import { canvasBlob } from './image-processing';

/** Local person segmentation. No image leaves this browser. */
export async function whitePortraitBackground(image:ImageBitmap) {
  const {FilesetResolver,ImageSegmenter}=await import('@mediapipe/tasks-vision');
  const vision=await FilesetResolver.forVisionTasks('/portrait/wasm');
  const segmenter=await ImageSegmenter.createFromOptions(vision,{baseOptions:{modelAssetPath:'/portrait/selfie_segmenter.tflite',delegate:'CPU'},runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false});
  const canvas=document.createElement('canvas'),maskCanvas=document.createElement('canvas');
  const factor=Math.min(1,2048/Math.max(image.width,image.height));
  canvas.width=Math.max(1,Math.round(image.width*factor));canvas.height=Math.max(1,Math.round(image.height*factor));
  const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0,canvas.width,canvas.height);
  try {
    const result=segmenter.segment(canvas);
    try {
      // This model has one foreground ("selfie") output; two-class models use index 1.
      const masks=result.confidenceMasks;
      const person=masks?.[masks.length===1?0:1];if(!person)throw new Error('Portrait segmentation could not create a person mask.');
      const confidence=person.getAsFloat32Array();
      let found=0;for(const value of confidence)if(value>.7)found++;
      if(found<confidence.length*.01)throw new Error('No clear person found. Try a well-lit portrait with one person.');
      maskCanvas.width=person.width;maskCanvas.height=person.height;
      const maskCtx=maskCanvas.getContext('2d')!,pixels=maskCtx.createImageData(person.width,person.height);
      for(let i=0;i<confidence.length;i++){const offset=i*4;pixels.data[offset]=pixels.data[offset+1]=pixels.data[offset+2]=255;pixels.data[offset+3]=Math.round(Math.min(1,Math.max(0,(confidence[i]-.2)/.6))*255);}
      maskCtx.putImageData(pixels,0,0);
      ctx.globalCompositeOperation='destination-in';ctx.drawImage(maskCanvas,0,0,canvas.width,canvas.height);
      ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';
      return await canvasBlob(canvas,'image/png');
    }finally{result.close();}
  }finally{segmenter.close();canvas.width=canvas.height=maskCanvas.width=maskCanvas.height=0;}
}
