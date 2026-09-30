export function validateVenueSubmission(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid venue form.');
 const b=value as Record<string,unknown>;
 const allowed=['action','name','region','locality','address','description','latitude','longitude','activities','turnstileToken'];
 if(Object.keys(b).some(k=>!allowed.includes(k)))throw new Error('Unexpected venue field.');
 function field(key:string,min:number,max:number){const v=b[key]??'';if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw new Error(`Check ${key}: ${min}–${max} characters required.`);return v.trim();}
 function coordinate(key:string,min:number,max:number){const v=b[key];if(v==null||v==='')return null;if(typeof v!=='string'&&typeof v!=='number')throw new Error(`Invalid ${key}.`);if(typeof v==='string'&&!v.trim())return null;const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new Error(`Invalid ${key}.`);return n;}
 const latitude=coordinate('latitude',-90,90),longitude=coordinate('longitude',-180,180);
 if((latitude===null)!==(longitude===null))throw new Error('Enter both latitude and longitude, or leave both blank.');
 if(!Array.isArray(b.activities)||b.activities.length<1||b.activities.length>15||b.activities.some(a=>typeof a!=='string'||a.length<1||a.length>120))throw new Error('Choose 1–15 activities from the directory.');
 return {record:{name:field('name',2,160),region:field('region',1,60),locality:field('locality',2,120),address:field('address',0,400),description:field('description',0,2000),latitude,longitude,activities:[...new Set(b.activities as string[])]},turnstileToken:field('turnstileToken',1,2048)};
}

export function validateVenueReport(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid correction report.');
 const b=value as Record<string,unknown>;const allowed=['action','targetType','targetId','reason','details','turnstileToken'];
 if(Object.keys(b).some(k=>!allowed.includes(k)))throw new Error('Unexpected report field.');
 const targetType=b.targetType;if(targetType!=='historical'&&targetType!=='submitted')throw new Error('Choose a valid venue record.');
 const targetId=typeof b.targetId==='string'?b.targetId:'';if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId))throw new Error('Choose a valid venue record.');
 const reasons=['duplicate','closed_or_moved','incorrect_location','incorrect_activities','incorrect_name','other'];
 if(typeof b.reason!=='string'||!reasons.includes(b.reason))throw new Error('Choose a correction reason.');
 const details=typeof b.details==='string'?b.details.trim():'';if(details.length<10||details.length>2000)throw new Error('Explain the correction in 10–2,000 characters.');
 const turnstileToken=typeof b.turnstileToken==='string'?b.turnstileToken:'';if(!turnstileToken||turnstileToken.length>2048)throw new Error('Complete the verification challenge.');
 return {report:{targetType,targetId,reason:b.reason,details},turnstileToken};
}
