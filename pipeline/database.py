"""Read SQL views via HTTPS Data API or direct PostgreSQL; never log credentials."""
import json,os,urllib.request,urllib.parse

def read_view(view):
    if view not in {'feature_store_v1','region_statistics','dataset_status','model_runs'}:raise ValueError('Unsupported view')
    if os.environ.get('DATABASE_URL'):
        import psycopg
        from psycopg.rows import dict_row
        with psycopg.connect(os.environ['DATABASE_URL'],row_factory=dict_row) as conn:
            return conn.execute('SELECT * FROM public.'+view+(' ORDER BY venue_id' if view=='feature_store_v1' else '')).fetchall()
    url=os.environ['SUPABASE_URL'].rstrip('/')+'/rest/v1/'+view
    key=os.environ['SUPABASE_PUBLISHABLE_KEY'];rows=[];offset=0
    while True:
        query={'select':'*','limit':'500','offset':str(offset)}
        if view=='feature_store_v1':query['order']='venue_id.asc'
        req=urllib.request.Request(url+'?'+urllib.parse.urlencode(query),headers={'apikey':key})
        with urllib.request.urlopen(req,timeout=60) as response:batch=json.load(response)
        rows.extend(batch)
        if len(batch)<500:return rows
        offset+=500
