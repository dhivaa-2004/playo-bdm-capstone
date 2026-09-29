"""Read-only ZIP audit. Never imports or runs scripts contained in the archive.

Usage: python scripts/audit_historical.py INPUT.zip --output audit/historical
Only aggregate statistics and row locators are exported; phone values are omitted.
"""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
from hashlib import sha256
from html import unescape
from html.parser import HTMLParser
import json
import math
from pathlib import Path
import re
import statistics
from urllib.parse import parse_qs, urlsplit
import zipfile


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def missing(value):
    return value is None or value == "" or value == [] or (isinstance(value,str) and not value.strip())


def numeric(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value)


def quantile(values, q):
    a = sorted(values)
    if not a: return None
    p = (len(a) - 1) * q
    lo, hi = math.floor(p), math.ceil(p)
    return a[lo] + (a[hi] - a[lo]) * (p-lo)


def summary(values):
    a = [v for v in values if numeric(v)]
    if not a: return {"n":0}
    return {"n":len(a), "min":min(a), "p25":quantile(a,.25), "median":quantile(a,.5),
            "p75":quantile(a,.75), "p95":quantile(a,.95), "max":max(a),
            "mean":statistics.mean(a), "sample_stddev":statistics.stdev(a) if len(a)>1 else None}


def correlation(pairs):
    if len(pairs)<3: return None
    x,y=zip(*pairs)
    if len(set(x))<2 or len(set(y))<2:return None
    return statistics.correlation(x,y)


def distance(lat, lng, center):
    a,b,c,d=map(math.radians,[lat,lng,center['lat'],center['lng']])
    h=math.sin((c-a)/2)**2+math.cos(a)*math.cos(c)*math.sin((d-b)/2)**2
    return 6371.0088*2*math.asin(min(1,math.sqrt(h)))


class InfoParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.text=[]; self.tags=Counter(); self.headings=[]; self.in_h3=False; self.labels=[]; self.in_strong=False
    def handle_starttag(self,tag,attrs):
        self.tags[tag]+=1
        if tag=='h3':self.in_h3=True
        if tag=='strong':self.in_strong=True
    def handle_endtag(self,tag):
        if tag=='h3':self.in_h3=False
        if tag=='strong':self.in_strong=False
    def handle_data(self,data):
        self.text.append(data)
        if self.in_h3:self.headings.append(data)
        if self.in_strong:self.labels.append(data.strip())


def duplicate_groups(rows, key):
    groups=defaultdict(list)
    for r in rows:
        v=key(r)
        if v is not None:groups[v].append(r['locator'])
    dup=[locators for locators in groups.values() if len(locators)>1]
    return {"distinct_keys":len(groups),"duplicate_groups":len(dup),
            "rows_in_duplicate_groups":sum(map(len,dup)),"excess_rows":sum(len(g)-1 for g in dup),
            "groups":dup}


def audit(zip_path):
    original_hash=sha256(zip_path.read_bytes()).hexdigest()
    rows=[]; inventory=[]; datasets={}; issues=defaultdict(list)
    with zipfile.ZipFile(zip_path) as z:
        for item in z.infolist():
            if not item.is_dir():
                content=z.read(item)
                inventory.append({"path":item.filename,"bytes":len(content),"sha256":sha256(content).hexdigest(),
                                  "zip_modified_time_unverified":list(item.date_time)})
        centers=json.loads(z.read('playo-find-venue-master/js/locations.json'))
        for name in z.namelist():
            if '/data/venues_' not in name or not name.endswith('.json'):continue
            city=Path(name).stem.removeprefix('venues_')
            data=json.loads(z.read(name))
            assert isinstance(data,list), name
            assert all(isinstance(r,dict) for r in data),name
            datasets[city]={"path":name,"rows":len(data)}
            for i,r in enumerate(data):
                loc=f'{city}:{i}'
                try:identifier=parse_qs(urlsplit(r.get('fullLink','')).query).get('venueId',[None])[0]
                except ValueError:identifier=None
                rows.append({"city":city,"locator":loc,"id":identifier,"raw":r})
    columns=sorted(set().union(*(r['raw'].keys() for r in rows)))
    profile={}
    for col in columns:
        profile[col]={"absent":sum(col not in r['raw'] for r in rows),
                      "null":sum(col in r['raw'] and r['raw'][col] is None for r in rows),
                      "blank_or_empty":sum(col in r['raw'] and r['raw'][col] is not None and missing(r['raw'][col]) for r in rows),
                      "types":dict(Counter(type(r['raw'][col]).__name__ for r in rows if col in r['raw'])),
                      "distinct_values":len({canonical(r['raw'].get(col)) for r in rows})}
    sports=Counter(); city_sports=defaultdict(Counter); combinations=Counter(); cardinalities=Counter()
    labels=Counter(); tags=Counter(); info_lengths=[]; template_checks=Counter(); phone_presence=Counter()
    for row in rows:
        r=row['raw']; loc=row['locator']; city=row['city']
        if not row['id']:issues['missing_venue_id'].append(loc)
        sport=r.get('filter_by')
        if not isinstance(sport,list) or any(not isinstance(s,str) or not s.strip() for s in sport):
            issues['invalid_sport_list'].append(loc); sport=[]
        if not sport:issues['empty_sports'].append(loc)
        if len(sport)!=len(set(sport)):issues['repeated_sport_in_record'].append(loc)
        sports.update(set(sport));city_sports[city].update(set(sport)); cardinalities[len(set(sport))]+=1
        combinations[tuple(sorted(set(sport)))]+=1
        a,n,display=r.get('avgRating'),r.get('ratingCount'),r.get('rating')
        if not numeric(a) or not 0<=a<=5:issues['invalid_average_rating'].append(loc)
        if not numeric(n) or n<0 or int(n)!=n:issues['invalid_rating_count'].append(loc)
        if numeric(a) and numeric(display) and int(a)!=display:issues['display_rating_not_truncated_average'].append(loc)
        if n==0 and a==0:issues['unrated_zero_pair'].append(loc)
        if numeric(n) and n>0 and a==0:issues['positive_count_zero_average'].append(loc)
        if n==0 and numeric(a) and a>0:issues['zero_count_positive_average'].append(loc)
        lat,lng=r.get('lat'),r.get('lng')
        if not numeric(lat) or not numeric(lng) or not(-90<=lat<=90 and -180<=lng<=180):
            issues['invalid_coordinates'].append(loc)
        else:
            row['distance_km']=distance(lat,lng,centers[city])
            if row['distance_km']>100:issues['more_than_100km_from_query_center'].append(loc)
            if lat==0 and lng==0:issues['zero_zero_coordinates'].append(loc)
        info=r.get('info',''); parser=InfoParser()
        if isinstance(info,str):
            parser.feed(info); plain=' '.join(parser.text)
            info_lengths.append(len(info));tags.update(parser.tags); labels.update(parser.labels)
            template_checks['h3_equals_name']+=unescape(''.join(parser.headings)).strip()==str(r.get('name','')).strip()
            m=re.search(r'<strong>Ratings:</strong>\s*(.*?)\s*\[(.*?)\]',info,re.S)
            if m:
                try:match=float(m.group(1))==a and float(m.group(2))==n
                except ValueError:match=False
                template_checks['rating_matches_columns']+=match
                if not match:issues['info_rating_mismatch'].append(loc)
            else:issues['info_rating_missing'].append(loc)
            m=re.search(r'<strong>Sports:</strong>\s*(.*?)<br\s*/?>',info,re.S)
            if m:
                match=unescape(m.group(1)).strip()==', '.join(sport)
                template_checks['sports_match_columns']+=match
                if not match:issues['info_sports_mismatch'].append(loc)
            else:issues['info_sports_missing'].append(loc)
            m=re.search(r'<strong>Phone:</strong>\s*(.*?)<br\s*/?>',info,re.S)
            val=m.group(1).strip() if m else None
            phone_presence['field_present']+=bool(m)
            phone_presence['has_digits']+=bool(val and re.search(r'\d',val))
            phone_presence['placeholder_or_blank']+=bool(m and (not val or val.lower() in {'n/a','na','none','null'}))
            expected_labels={'Ratings:','Sports:','Phone:'}
            if set(parser.labels)!=expected_labels:issues['unexpected_info_labels'].append(loc)
            if parser.tags.get('script',0):issues['info_script_tag'].append(loc)
        else:issues['nontext_info'].append(loc)
    dup={
        'exact_record':duplicate_groups(rows,lambda r:canonical(r['raw'])),
        'venue_id':duplicate_groups(rows,lambda r:r['id']),
        'name_normalized':duplicate_groups(rows,lambda r:' '.join(r['raw'].get('name','').casefold().split())),
        'city_name_normalized':duplicate_groups(rows,lambda r:(r['city'],' '.join(r['raw'].get('name','').casefold().split()))),
        'coordinates':duplicate_groups(rows,lambda r:(r['raw'].get('lat'),r['raw'].get('lng'))),
    }
    by_id=defaultdict(list)
    for r in rows:
        if r['id']:by_id[r['id']].append(r)
    cross=[];conflicts=[]
    for k,group in by_id.items():
        if len({r['city'] for r in group})>1:cross.append([r['locator'] for r in group])
        if len(group)>1:
            fields=[f for f in columns if len({canonical(r['raw'].get(f)) for r in group})>1]
            if fields:conflicts.append({'rows':[r['locator'] for r in group],'conflicting_fields':fields})
    for city,data in datasets.items():
        group=[r for r in rows if r['city']==city]; a=[r['raw'] for r in group]
        rated=[r for r in a if numeric(r.get('ratingCount')) and r['ratingCount']>0 and numeric(r.get('avgRating')) and r['avgRating']>0]
        data.update({"unique_venue_ids":len({r['id'] for r in group if r['id']}),"unique_sports":len(city_sports[city]),
                     "missing_by_column":{c:sum(c not in r or missing(r[c]) for r in a) for c in columns},
                     "rated_rows":len(rated),"unrated_zero_pair":sum(r.get('ratingCount')==0 and r.get('avgRating')==0 for r in a),
                     "ratings_rated":summary([r['avgRating'] for r in rated]),"rating_counts":summary([r.get('ratingCount') for r in a]),
                     "latitude":summary([r.get('lat') for r in a]),"longitude":summary([r.get('lng') for r in a]),
                     "distance_km_from_query_center":summary([r['distance_km'] for r in group if 'distance_km' in r]),
                     "outside_100km":sum(r.get('distance_km',0)>100 for r in group),
                     "sports":dict(city_sports[city].most_common())})
    rated=[r['raw'] for r in rows if numeric(r['raw'].get('ratingCount')) and r['raw']['ratingCount']>0 and numeric(r['raw'].get('avgRating')) and r['raw']['avgRating']>0]
    all_raw=[r['raw'] for r in rows]
    unique=list({canonical(r):r for r in all_raw}.values())
    unique_rated=[r for r in unique if r['ratingCount']>0 and r['avgRating']>0]
    clean_summary={"rows":len(unique),"rated_rows":len(unique_rated),
                   "unrated_rows":len(unique)-len(unique_rated),
                   "ratings_rated":summary([r['avgRating'] for r in unique_rated]),
                   "rating_count_thresholds":{str(n):sum(r['ratingCount']>=n for r in unique_rated) for n in [1,5,10,20,50,100]}}
    report={"after_exact_deduplication":clean_summary,"audit_at":datetime.now(timezone.utc).isoformat(),"input_zip_sha256":original_hash,
            "record_total":len(rows),"files":inventory,"datasets":datasets,"columns":profile,
            "duplicates":dup,"cross_city_id_groups":cross,"conflicting_id_groups":conflicts,
            "sports":dict(sports.most_common()),"sport_cardinalities":dict(sorted(cardinalities.items())),
            "sport_combinations":[{"sports":list(k),"rows":v} for k,v in combinations.most_common()],
            "ratings_all_including_zeros":summary([r.get('avgRating') for r in all_raw]),
            "ratings_rated_only":summary([r['avgRating'] for r in rated]),
            "ratings_histogram_rated":dict(Counter(str(math.floor(r['avgRating'])) for r in rated)),
            "rating_counts_all":summary([r.get('ratingCount') for r in all_raw]),
            "rating_counts_rated":summary([r['ratingCount'] for r in rated]),
            "rating_count_thresholds":{str(n):sum(r['ratingCount']>=n for r in rated) for n in [1,5,10,20,50,100]},
            "rating_count_pearson_rated":correlation([(r['avgRating'],r['ratingCount']) for r in rated]),
            "rating_log1p_count_pearson_rated":correlation([(r['avgRating'],math.log1p(r['ratingCount'])) for r in rated]),
            "info":{"length":summary(info_lengths),"labels":dict(labels),"tags":dict(tags),
                    "template_checks":dict(template_checks),"phone_presence":dict(phone_presence)},
            "issues":{k:{"count":len(v),"rows":v} for k,v in issues.items()},
            "query_centers":centers,
            "collection_timestamp":"unknown; ZIP member times are not source observation dates",
            "provenance":{"source_type":"third_party_historical","is_synthetic":False,"source_dataset":"playo-find-venue-master"}}
    assert sha256(zip_path.read_bytes()).hexdigest()==original_hash
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('zip',type=Path);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();report=audit(args.zip);args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False,allow_nan=False)+'\n')
    compact={k:report[k] for k in ['record_total','ratings_rated_only','rating_counts_all','rating_count_thresholds','info']}
    compact['duplicates']={k:{a:b for a,b in v.items() if a!='groups'} for k,v in report['duplicates'].items()}
    compact['issues']={k:v['count'] for k,v in report['issues'].items()}
    compact['sports']=report['sports'];compact['city_counts']={k:v['rows'] for k,v in report['datasets'].items()}
    print(json.dumps(compact,indent=2))


if __name__=='__main__':main()
