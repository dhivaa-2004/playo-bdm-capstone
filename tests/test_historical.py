import json, tempfile, unittest, zipfile
from pathlib import Path
from pipeline.historical import prepare
class HistoricalTests(unittest.TestCase):
 def run_rows(self,rows):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.zip'
   with zipfile.ZipFile(p,'w') as z:z.writestr('playo-find-venue-master/data/venues_bangalore.json',json.dumps(rows))
   return prepare(p)
 def row(self,**changes):
  r=dict(name='Test venue',lat=12.9,lng=77.5,avgRating=4.2,ratingCount=10,filter_by=['Badminton'],fullLink='https://example.test/?venueId=1',info='PRIVATE PHONE 12345',rating=4,icon='5.png');r.update(changes);return r
 def test_sanitization_lineage_and_null_targets(self):
  r=self.row();p=self.run_rows([r,r,self.row(fullLink='',name='Other',avgRating=0,ratingCount=0)])
  self.assertEqual(p['quality']['accepted_rows'],2);self.assertEqual(p['quality']['duplicate_rows'],1)
  self.assertEqual(sum(len(v['lineage']) for v in p['venues']),3)
  self.assertNotIn('PRIVATE PHONE',json.dumps(p));self.assertEqual(p['quality']['unrated_rows'],1)
 def test_entity_groups_do_not_merge_records(self):
  p=self.run_rows([self.row(),self.row(name='Different',fullLink='https://example.test/?venueId=2')]);self.assertEqual(len(p['venues']),2);self.assertEqual(p['quality']['entity_groups'],1)
 def test_conflicting_provider_id_rejected(self):
  with self.assertRaises(ValueError):self.run_rows([self.row(),self.row(name='Changed')])
 def test_bad_rating_pair_rejected(self):
  with self.assertRaises(ValueError):self.run_rows([self.row(ratingCount=0)])
 def test_memberships_unique_and_ids_stable(self):
  rows=[self.row(filter_by=['Badminton','Badminton'])];p=self.run_rows(rows)
  self.assertEqual(p['venues'][0]['labels'],['Badminton']);self.assertEqual(p['venues'][0]['venue_id'],self.run_rows(rows)['venues'][0]['venue_id'])
if __name__=='__main__':unittest.main()
