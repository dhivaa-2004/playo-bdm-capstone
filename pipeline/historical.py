"""Immutable historical ZIP -> sanitized relational payload and SQL import.
No collection. No raw HTML, phone, links or truncated ratings in output.
"""
import argparse, hashlib, json, math, re, uuid, zipfile
from pathlib import Path
from urllib.parse import parse_qs,urlsplit
NS=uuid.UUID('28186831-9db7-4544-926d-4d4277741260')
def digest(b):return hashlib.sha256(b).hexdigest()
def canonical(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def prepare(path):
    archive_hash=digest(path.read_bytes());venues={};raw_n=0;repeats=0
    with zipfile.ZipFile(path) as z:
        for member in sorted(n for n in z.namelist() if re.search(r'/data/venues_[a-z]+\.json$',n)):
            content=z.read(member);region=Path(member).stem.removeprefix('venues_')
            for i,row in enumerate(json.loads(content)):
                raw_n+=1;h=digest(canonical(row).encode());loc={'source_file':member,'row_index':i,'record_hash':h,'member_hash':digest(content)}
                if h in venues:venues[h]['lineage'].append(loc);continue
                lat,lng=row['lat'],row['lng'];rating,count=row['avgRating'],row['ratingCount']
                if not (all(type(v) in (int,float) and math.isfinite(v) for v in [lat,lng,rating]) and -90<=lat<=90 and -180<=lng<=180 and 0<=rating<=5 and type(count) is int and count>=0):raise ValueError(f'Invalid numeric values: {region}:{i}')
                if (count==0)!=(rating==0):raise ValueError(f'Inconsistent rating: {region}:{i}')
                if not isinstance(row['filter_by'],list) or not row['filter_by'] or not all(isinstance(s,str) and s.strip() for s in row['filter_by']):raise ValueError('Invalid activity list')
                labels=sorted(set(row['filter_by']));repeats+=len(row['filter_by'])-len(labels)
                provider_id=parse_qs(urlsplit(row.get('fullLink','')).query).get('venueId',[None])[0]
                key='provider:'+provider_id if provider_id else 'row:'+region+':'+str(i)+':'+h
                venues[h]={'venue_id':str(uuid.uuid5(NS,key)),'source_key':key,'name':row['name'].strip(),'region':region,'latitude':lat,'longitude':lng,'avg_rating':rating if count else None,'rating_count':count,'labels':labels,'lineage':[loc]}
    rows=sorted(venues.values(),key=lambda v:v['venue_id']);ids=[r['venue_id'] for r in rows]
    if len(set(ids))!=len(ids):raise ValueError('Conflicting provider ID; review needed')
    parent={i:i for i in ids}
    def find(x):
        while x!=parent[x]:parent[x]=parent[parent[x]];x=parent[x]
        return x
    def union(x,y):
        x,y=find(x),find(y)
        if x!=y:parent[max(x,y)]=min(x,y)
    seen={}
    for v in rows:
        for k in [('name',v['region'],' '.join(v['name'].casefold().split())),('coordinates',v['latitude'],v['longitude'])]:
            if k in seen:union(v['venue_id'],seen[k])
            else:seen[k]=v['venue_id']
    for v in rows:v['entity_group']=find(v['venue_id'])
    quality={'raw_rows':raw_n,'accepted_rows':len(rows),'duplicate_rows':raw_n-len(rows),'rejected_rows':0,'rated_rows':sum(v['avg_rating'] is not None for v in rows),'unrated_rows':sum(v['avg_rating'] is None for v in rows),'repeated_memberships_removed':repeats,'label_count':len({s for v in rows for s in v['labels']}),'entity_groups':len({v['entity_group'] for v in rows}),'missing_provider_ids':sum(v['source_key'].startswith('row:') for v in rows)}
    assert quality['raw_rows']==quality['accepted_rows']+quality['duplicate_rows']+quality['rejected_rows']
    return {'archive_hash':archive_hash,'source_dataset':'playo-find-venue-master','source_type':'third_party_historical','is_synthetic':False,'parser_version':'historical-v1','quality':quality,'venues':rows}
def sql_literal(value):return "'"+value.replace("'","''")+"'"
def main():
    p=argparse.ArgumentParser();p.add_argument('zip',type=Path);p.add_argument('--output',type=Path,required=True);args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    payload=prepare(args.zip)
    (args.output/'payload.json').write_text(canonical(payload)+'\n')
    (args.output/'quality.json').write_text(json.dumps({k:v for k,v in payload.items() if k!='venues'},indent=2)+'\n')
    sql='BEGIN;\nSELECT private.load_historical('+sql_literal(canonical(payload))+'::jsonb);\nCOMMIT;\nSELECT * FROM public.dataset_status;\n'
    (args.output/'load.sql').write_text(sql)
    print(json.dumps(payload['quality'],indent=2))
if __name__=='__main__':main()
