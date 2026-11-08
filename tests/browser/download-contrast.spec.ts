import {test,expect,type Locator} from '@playwright/test';

function luminance(color:string){
 const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;});
 return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
async function settle(button:Locator){
 await button.evaluate(async element=>{await Promise.all(element.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
}
async function colors(button:Locator){
 await settle(button);
 const values=await button.evaluate(element=>{const style=getComputedStyle(element);return {foreground:style.color,background:style.backgroundColor,fontSize:style.fontSize,width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height,outline:style.outlineStyle,outlineWidth:parseFloat(style.outlineWidth)};});
 const a=luminance(values.foreground),b=luminance(values.background);
 return {...values,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
}

for(const reducedMotion of ['no-preference','reduce'] as const)test(`download contrast and repeat interaction with ${reducedMotion} motion`,async({page},testInfo)=>{
 await page.emulateMedia({reducedMotion});await page.goto('/qr-code-generator/');
 await page.getByLabel('Text or URL').fill('Zipora Batch 1 contrast fixture');
 await page.getByRole('button',{name:'Generate QR code',exact:true}).click();
 const button=page.getByRole('button',{name:'Download QR code',exact:true});await expect(button).toBeVisible();
 const normal=await colors(button);expect(normal.contrast).toBeGreaterThanOrEqual(4.5);
 await button.hover();const hover=await colors(button);expect(hover.contrast).toBeGreaterThanOrEqual(4.5);
 await page.mouse.down();const active=await colors(button);expect(active.contrast).toBeGreaterThanOrEqual(4.5);
 let download=page.waitForEvent('download');await page.mouse.up();const first=await download;expect((await first.failure())).toBeNull();
 await expect(button).toHaveAttribute('data-phase','done');
 const done=await colors(button);expect(done.foreground).toBe('rgb(255, 255, 255)');expect(done.background).toBe('rgb(4, 120, 87)');expect(done.fontSize).toBe('14px');expect(done.contrast).toBeGreaterThanOrEqual(4.5);
 expect(done.width).toBeCloseTo(normal.width,1);expect(done.height).toBeCloseTo(normal.height,1);await expect(button).toBeEnabled();
 await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(button).toBeFocused();
 expect(await button.evaluate(e=>e.matches(':focus-visible'))).toBeTruthy();const focus=await colors(button);expect(focus.outline).not.toBe('none');expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);expect(focus.contrast).toBeGreaterThanOrEqual(4.5);
 // Confirmation is still an enabled control; keyboard activation starts another download.
 download=page.waitForEvent('download');await page.keyboard.press('Enter');const second=await download;expect(second.suggestedFilename()).toBe(first.suggestedFilename());expect((await second.failure())).toBeNull();
 await expect(button).toHaveAttribute('data-phase','done');
 if(reducedMotion==='reduce')expect(await button.evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');
 await testInfo.attach('computed-download-colors',{body:JSON.stringify({normal,hover,active,done,focus},null,2),contentType:'application/json'});
});
