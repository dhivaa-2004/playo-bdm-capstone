import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVenueSubmission} from '../lib/venue-submission.ts';
const valid={action:'submit_venue',name:'Community Court',region:'chennai',locality:'Adyar',activities:['Badminton'],latitude:'13.0',longitude:'80.2'};
test('valid submission keeps only permitted public fields',()=>{const r=validateVenueSubmission(valid);assert.equal(r.latitude,13);assert.equal(r.longitude,80.2);assert.equal(r.address,'');assert.equal('source_type' in r,false)});
test('cannot supply trusted provenance, ids or ownership',()=>{for(const field of ['source_type','is_synthetic','id','owner_id','verification_status','submitted_at'])assert.throws(()=>validateVenueSubmission({...valid,[field]:'forged'}))});
test('coordinates must be paired, finite and within geographic bounds',()=>{for(const coords of [{latitude:'',longitude:'80'},{latitude:'91'},{longitude:'181'},{latitude:'NaN'},{latitude:true}])assert.throws(()=>validateVenueSubmission({...valid,...coords}));const r=validateVenueSubmission({...valid,latitude:'',longitude:''});assert.equal(r.latitude,null)});
test('reject malformed labels, huge content and empty names',()=>{for(const changes of [{name:' '},{description:'x'.repeat(2001)},{activities:[]},{activities:[null]},{activities:Array(16).fill('Badminton')}])assert.throws(()=>validateVenueSubmission({...valid,...changes}))});
test('normalizes whitespace and repeated activity labels',()=>{const r=validateVenueSubmission({...valid,name:'  Court name  ',activities:['Badminton','Badminton']});assert.equal(r.name,'Court name');assert.deepEqual(r.activities,['Badminton'])});
