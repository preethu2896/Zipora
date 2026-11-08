'use client';
import { createContext,useContext,useState,type ReactNode } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { siteTools } from '@/lib/site-content';
const SearchContext=createContext({query:'',setQuery:(_query:string)=>{}});
export function ToolSearchProvider({children}:{children:ReactNode}){const [query,setQuery]=useState('');return <SearchContext.Provider value={{query,setQuery}}>{children}</SearchContext.Provider>;}
export const useToolSearch=()=>useContext(SearchContext);
export function ToolSearch({hero=false,dropdown=false}:{hero?:boolean;dropdown?:boolean}){
 const {query,setQuery}=useToolSearch();const matches=siteTools.filter(t=>`${t.name} ${t.description}`.toLowerCase().includes(query.trim().toLowerCase()));
 return <div className={`tool-search ${hero?'hero-search':''}`}><label><Search/><input type="search" aria-label={hero?'Search tools in hero':'Search tools'} placeholder="Search tools... e.g. Merge PDF" value={query} onChange={e=>setQuery(e.target.value)}/></label>{dropdown&&query.trim()&&<div className="search-results" aria-label="Matching tools">{matches.length?matches.map(t=><Link key={t.slug} href={`/${t.slug}/`} onClick={()=>setQuery('')}>{t.name}</Link>):<p>No matching tools</p>}</div>}</div>;
}
