'use client';
import {useEffect,useRef,useState} from 'react';

type Point={venue_id:string;name:string;region:string;latitude:number;longitude:number;avg_rating:number|null;rating_count:number};
const colours:Record<string,string>={bangalore:'#b83f35',chennai:'#31845f',delhi:'#cf852e',hyderabad:'#4e78b2'};

export default function VenueMap({points,regions,region}:{points:Point[];regions:Record<string,string>;region:string}){
 const element=useRef<HTMLDivElement>(null),[visible,setVisible]=useState({markers:0,clusters:0});
 useEffect(()=>{let map:any,cancelled=false;(async()=>{
  if(!element.current)return;const leafletModule=await import('leaflet'),L=leafletModule.default;if(cancelled||!element.current)return;
  map=L.map(element.current,{preferCanvas:true,scrollWheelZoom:true}).setView([20.59,78.96],5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const layer=L.layerGroup().addTo(map),renderer=L.canvas({padding:.35}),valid=points.filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude));
  if(valid.length)map.fitBounds(valid.map(p=>[p.latitude,p.longitude]),{padding:[28,28],maxZoom:12});
  function venuePopup(point:Point){const popup=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p'),link=document.createElement('a');title.textContent=point.name;detail.textContent=`${regions[point.region]||point.region} · ${point.avg_rating==null?'Unrated':point.avg_rating.toFixed(2)+' stars'} · ${point.rating_count.toLocaleString('en-IN')} rating records`;link.href='/venues/'+point.venue_id;link.textContent='View historical record →';popup.appendChild(title);popup.appendChild(detail);popup.appendChild(link);return popup.outerHTML}
  function render(){layer.clearLayers();const zoom=map.getZoom(),cell=zoom<7?68:zoom<9?58:48;
   if(zoom>=10){for(const point of valid){L.circleMarker([point.latitude,point.longitude],{radius:5,weight:1,color:'#fff',fillColor:colours[point.region]||'#704fa3',fillOpacity:.84,renderer}).bindPopup(venuePopup(point)).addTo(layer)}setVisible({markers:valid.length,clusters:0});return}
   const groups=new Map<string,Point[]>();for(const point of valid){const pixel=map.project([point.latitude,point.longitude],zoom),key=`${Math.floor(pixel.x/cell)}:${Math.floor(pixel.y/cell)}`;groups.set(key,[...(groups.get(key)||[]),point])}
   let clusters=0,markers=0;for(const group of groups.values()){
    if(group.length===1){const point=group[0];L.circleMarker([point.latitude,point.longitude],{radius:5,weight:1,color:'#fff',fillColor:colours[point.region]||'#704fa3',fillOpacity:.84,renderer}).bindPopup(venuePopup(point)).addTo(layer);markers++;continue}
    clusters++;const lat=group.reduce((s,p)=>s+p.latitude,0)/group.length,lng=group.reduce((s,p)=>s+p.longitude,0)/group.length,onlyRegion=group.every(p=>p.region===group[0].region);const marker=L.circleMarker([lat,lng],{radius:Math.min(24,9+Math.sqrt(group.length)*1.35),weight:2,color:'#fff',fillColor:onlyRegion?(colours[group[0].region]||'#704fa3'):'#704fa3',fillOpacity:.9,renderer}).addTo(layer);const popup=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p');title.textContent=`${group.length.toLocaleString('en-IN')} historical venues`;detail.textContent=onlyRegion?(regions[group[0].region]||group[0].region):'Multiple source regions';popup.appendChild(title);popup.appendChild(detail);marker.bindPopup(popup.outerHTML);marker.on('click',()=>map.setView([lat,lng],Math.min(12,zoom+2)))}setVisible({markers,clusters})
  }
  map.on('zoomend moveend',render);render();
 })();return()=>{cancelled=true;if(map)map.remove()}},[points,regions]);
 return <section className="panel map-panel"><div className="panel-head"><div><h2>Clustered historical venue map</h2><p>{points.length.toLocaleString('en-IN')} coordinate records · {visible.clusters?`${visible.clusters} visible clusters and ${visible.markers} individual markers`:`${visible.markers} individual markers`} · zoom to separate nearby records</p></div><label className="map-filter">Source region<select value={region} onChange={e=>window.location.assign('/map'+(e.target.value?'?region='+encodeURIComponent(e.target.value):''))}><option value="">All regions</option>{Object.entries(regions).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div><div ref={element} className="venue-map" aria-label="Interactive clustered map of historical venue coordinates"/><div className="map-legend">{Object.entries(regions).map(([value,label])=><span key={value}><i style={{background:colours[value]||'#704fa3'}}/>{label}</span>)}<span><i style={{background:'#704fa3'}}/>Mixed-region cluster</span></div><p className="footnote">Map tiles © OpenStreetMap contributors. Clustering changes only how nearby markers are drawn; it does not remove records. Coordinates and source-region assignments may be outdated or imprecise.</p></section>;
}
