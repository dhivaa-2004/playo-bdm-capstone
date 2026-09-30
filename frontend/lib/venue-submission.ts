export function validateVenueSubmission(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid venue form.');
 const b=value as Record<string,unknown>;
 const allowed=['action','name','region','locality','address','description','latitude','longitude','activities'];
 if(Object.keys(b).some(k=>!allowed.includes(k)))throw new Error('Unexpected venue field.');
 function field(key:string,min:number,max:number){const v=b[key]??'';if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw new Error(`Check ${key}: ${min}–${max} characters required.`);return v.trim();}
 function coordinate(key:string,min:number,max:number){const v=b[key];if(v==null||v==='')return null;if(typeof v!=='string'&&typeof v!=='number')throw new Error(`Invalid ${key}.`);if(typeof v==='string'&&!v.trim())return null;const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new Error(`Invalid ${key}.`);return n;}
 const latitude=coordinate('latitude',-90,90),longitude=coordinate('longitude',-180,180);
 if((latitude===null)!==(longitude===null))throw new Error('Enter both latitude and longitude, or leave both blank.');
 if(!Array.isArray(b.activities)||b.activities.length<1||b.activities.length>15||b.activities.some(a=>typeof a!=='string'||a.length<1||a.length>120))throw new Error('Choose 1–15 activities from the directory.');
 return {name:field('name',2,160),region:field('region',1,60),locality:field('locality',2,120),address:field('address',0,400),description:field('description',0,2000),latitude,longitude,activities:[...new Set(b.activities as string[])]};
}
