'use client';
import {useEffect,useLayoutEffect} from 'react';
import {usePathname} from 'next/navigation';

const normalize=(path:string)=>path.replace(/\/+$/,'')||'/';
const scrollToTop=()=>window.scrollTo({top:0,left:0,behavior:'instant'});

/** Open pages at the top; explicit section anchors retain native navigation. */
export function ToolRouteScroll(){
 const pathname=usePathname();
 useLayoutEffect(()=>{
  if(window.location.hash&&window.location.hash!=='#top')return;
  scrollToTop();
  // Run after the router's navigation layout effects too.
  const frame=requestAnimationFrame(scrollToTop);
  return()=>cancelAnimationFrame(frame);
 },[pathname]);
 useEffect(()=>{
  const previousRestoration=window.history.scrollRestoration;
  window.history.scrollRestoration='manual';
  function reopenTool(event:MouseEvent){
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const anchor=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
   if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target!=='_self'))return;
   const destination=new URL(anchor.href,window.location.href);
   if(destination.origin!==window.location.origin)return;
   if(destination.hash&&destination.hash!=='#top')return;
   scrollToTop();
   requestAnimationFrame(()=>{if(normalize(window.location.pathname)===normalize(destination.pathname))scrollToTop();});
  }
  document.addEventListener('click',reopenTool,true);
  return()=>{document.removeEventListener('click',reopenTool,true);window.history.scrollRestoration=previousRestoration;};
 },[]);
 return null;
}
