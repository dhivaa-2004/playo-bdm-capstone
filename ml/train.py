"""Grouped historical rating experiment. Protocol: docs/feature-store-and-evaluation.md."""
import argparse,hashlib,json,platform,uuid
from pathlib import Path
import numpy as np
import sklearn
from sklearn.feature_extraction import DictVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupShuffleSplit,GroupKFold,cross_val_score
from sklearn.metrics import mean_absolute_error,mean_squared_error,r2_score
from pipeline.database import read_view
from pipeline.historical import canonical,sql_literal

def feature(r):
    return {'region='+r['region']:1.,'latitude':float(r['latitude']),'longitude':float(r['longitude']),**{'activity='+s:1. for s in r['activity_labels']}}
def hash_rows(rows):return hashlib.sha256(canonical(rows).encode()).hexdigest()
def metrics(y,p):
    return {'n':len(y),'mae':float(mean_absolute_error(y,p)),'rmse':float(np.sqrt(mean_squared_error(y,p))),'r2':float(r2_score(y,p)) if len(y)>1 and np.var(y)>0 else None}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True);args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    rows=read_view('feature_store_v1');rows=sorted(rows,key=lambda r:str(r['venue_id']))
    if len(rows)!=3697 or any(r['is_synthetic'] or r['source_type']!='third_party_historical' for r in rows):raise ValueError('Unexpected empirical dataset')
    # Normalize UUID/datetime-compatible direct database values to JSON strings.
    rows=json.loads(json.dumps(rows,default=str));rated=[r for r in rows if r['target_avg_rating'] is not None]
    X=[feature(r) for r in rated];y=np.array([r['target_avg_rating'] for r in rated],dtype=float);groups=np.array([r['entity_group'] for r in rated])
    train,test=next(GroupShuffleSplit(n_splits=1,test_size=.2,random_state=42).split(X,y,groups))
    assert set(groups[train]).isdisjoint(groups[test]);xt=[X[i] for i in train];xv=[X[i] for i in test]
    models={'dummy_mean':DummyRegressor(strategy='mean'),'dummy_median':DummyRegressor(strategy='median'),'ridge':Ridge(alpha=10.),'random_forest':RandomForestRegressor(n_estimators=200,min_samples_leaf=15,max_depth=12,random_state=42,n_jobs=2)}
    fitted={};result={};cv=GroupKFold(n_splits=5)
    for name,model in models.items():
        pipe=Pipeline([('vectorizer',DictVectorizer(sparse=False)),('scale',StandardScaler()),('model',model)])
        scores=-cross_val_score(pipe,xt,y[train],groups=groups[train],cv=cv,scoring='neg_mean_absolute_error',n_jobs=1)
        pipe.fit(xt,y[train]);prediction=np.clip(pipe.predict(xv),1,5)
        result[name]={**metrics(y[test],prediction),'training_cv_mae':float(scores.mean()),'training_cv_mae_std':float(scores.std())};fitted[name]=pipe
    selected=min(result,key=lambda n:result[n]['training_cv_mae']);model=fitted[selected];pred=np.clip(model.predict(xv),1,5)
    sensitivity={'regions':{},'rating_count_thresholds':{}}
    for region in sorted({r['region'] for r in rated}):
        mask=np.array([rated[i]['region']==region for i in test]);sensitivity['regions'][region]=metrics(y[test][mask],pred[mask]) if mask.any() else {'n':0}
    for t in [1,5,10,20,50,100]:
        mask=np.array([rated[i]['rating_count']>=t for i in test]);sensitivity['rating_count_thresholds'][str(t)]=metrics(y[test][mask],pred[mask]) if mask.any() else {'n':0}
    run_id=str(uuid.uuid4());train_ids={rated[i]['venue_id'] for i in train};test_ids={rated[i]['venue_id'] for i in test}
    all_predictions=np.clip(model.predict([feature(r) for r in rows]),1,5)
    split={'seed':42,'train_rows':len(train),'test_rows':len(test),'unrated_rows':len(rows)-len(rated),'train_groups':len(set(groups[train])),'test_groups':len(set(groups[test])),'group_overlap':0,'selection':'minimum five-fold grouped training-CV MAE; test not used for selection'}
    run={'run_id':run_id,'feature_version':'historical-v1','dataset_hash':hash_rows(rows),'training_hash':hash_rows([rated[i] for i in train]),'model_name':selected,'metrics':result,'split_summary':split,'sensitivity':sensitivity,'parameters':{n:m.get_params() for n,m in models.items()},'versions':{'python':platform.python_version(),'sklearn':sklearn.__version__,'numpy':np.__version__}}
    preds=[{'run_id':run_id,'venue_id':r['venue_id'],'predicted_rating':float(p),'split':'train' if r['venue_id'] in train_ids else 'test' if r['venue_id'] in test_ids else 'unrated','feature_hash':hash_rows(feature(r))} for r,p in zip(rows,all_predictions)]
    (args.output/'feature_snapshot.json').write_text(canonical(rows));(args.output/'evaluation.json').write_text(json.dumps(run,indent=2,allow_nan=False));(args.output/'predictions.json').write_text(canonical(preds))
    import joblib
    joblib.dump(model,args.output/'model.joblib')
    columns=list(run);values=[sql_literal(canonical(run[c]))+'::jsonb' if isinstance(run[c],dict) else sql_literal(str(run[c])) for c in columns]
    sql='BEGIN;\nINSERT INTO public.model_runs('+','.join(columns)+') VALUES('+','.join(values)+');\n'
    for start in range(0,len(preds),500):
        sql+='INSERT INTO public.predictions SELECT * FROM jsonb_to_recordset('+sql_literal(canonical(preds[start:start+500]))+'::jsonb) AS x(run_id uuid,venue_id uuid,predicted_rating double precision,split text,feature_hash text);\n'
    sql+='COMMIT;\nSELECT split,count(*) FROM public.predictions WHERE run_id='+sql_literal(run_id)+' GROUP BY split;'
    (args.output/'writeback.sql').write_text(sql)
    print(json.dumps({'selected':selected,'split':split,'metrics':result},indent=2))
if __name__=='__main__':main()
