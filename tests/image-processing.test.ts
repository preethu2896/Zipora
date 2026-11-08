import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageDimensions,photoPixels } from '../src/lib/image-processing';
test('image dimensions enforce integer, side and memory limits',()=>{
  assert.deepEqual(imageDimensions(1200,800),{width:1200,height:800});
  for(const pair of [[0,1],[1.5,20],[8193,1],[5000,5000],[NaN,1]])assert.throws(()=>imageDimensions(pair[0],pair[1]));
});
test('photo physical sizes convert to exact 300 DPI pixel dimensions',()=>{
  assert.deepEqual(photoPixels(35,45),{width:413,height:531});
  assert.deepEqual(photoPixels(50.8,50.8),{width:600,height:600});
  assert.throws(()=>photoPixels(0,45));assert.throws(()=>photoPixels(NaN,45));
});
