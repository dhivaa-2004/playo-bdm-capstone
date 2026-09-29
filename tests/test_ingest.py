import copy
import json
from pathlib import Path
import tempfile
import unittest
from pipeline.ingest import ingest
from pipeline.validation import InvalidRecord, normalize


def fixture():
    return {"source_type": "synthetic", "source_id": "fixture-1", "source_url": None,
            "observed_at": "2026-09-29T00:00:00Z",
            "venue": {"name": " Fictional   Test Court ", "city": "Test City",
                      "rating": "4.1", "rating_count": "12", "sports": ["Badminton", " badminton "]}}


class ImportTests(unittest.TestCase):
    def test_normalization_and_nulls(self):
        r = normalize(fixture())
        self.assertEqual(r["name"], "Fictional Test Court")
        self.assertEqual(r["sports"], ["badminton"])
        self.assertIsNone(r["address"])
        self.assertTrue(r["is_synthetic"])

    def test_invalid_ratings(self):
        for value in (True, -1, 5.1, "NaN", "Infinity", "bad"):
            with self.subTest(value=value), self.assertRaises(InvalidRecord):
                r = fixture(); r["venue"]["rating"] = value; normalize(r)

    def test_invalid_counts(self):
        for value in (True, -1, 2.5):
            with self.subTest(value=value), self.assertRaises(InvalidRecord):
                r = fixture(); r["venue"]["rating_count"] = value; normalize(r)

    def test_timezone_required(self):
        r = fixture(); r["observed_at"] = "2026-09-29T12:00:00"
        with self.assertRaises(InvalidRecord): normalize(r)

    def test_equivalent_timezones_normalize_identically(self):
        a = fixture(); b = fixture()
        b["observed_at"] = "2026-09-29T05:30:00+05:30"
        self.assertEqual(normalize(a)["observed_at"], normalize(b)["observed_at"])

    def test_real_source_permission_reference_required(self):
        r = fixture(); r.update(source_type="playo_public", source_url="https://playo.co/venues/example")
        with self.assertRaises(InvalidRecord): normalize(r)

    def test_synthetic_cannot_claim_real_url(self):
        r = fixture(); r["source_url"] = "https://playo.co/venues/example"
        with self.assertRaises(InvalidRecord): normalize(r)

    def test_source_origin_not_substring(self):
        r = fixture(); r.update(source_type="playo_public", permission_reference="test-only")
        for url in ("https://playo.co.evil.test/x", "https://user:pass@playo.co/x", "http://playo.co/x"):
            with self.subTest(url=url), self.assertRaises(InvalidRecord):
                r["source_url"] = url; normalize(r)

    def test_entity_id_stable_and_source_separated(self):
        a = fixture(); b = copy.deepcopy(a)
        b["observed_at"] = "2026-09-30T00:00:00Z"
        self.assertEqual(normalize(a)["entity_id"], normalize(b)["entity_id"])
        b.update(source_type="licensed_other", source_url="https://example.org/fixture", permission_reference="test-only")
        self.assertNotEqual(normalize(a)["entity_id"], normalize(b)["entity_id"])

    def test_raw_preservation_reconciliation_and_idempotence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); source = root / "input.jsonl"
            bad = fixture(); bad["venue"]["rating"] = 6
            later = fixture(); later["observed_at"] = "2026-09-30T00:00:00Z"
            source.write_bytes(("\n".join(json.dumps(r) for r in [fixture(),fixture(),bad,later]) + '\n{"x":1,"x":2}\nnot-json\n\n').encode())
            first = ingest(source, root / "run1"); second = ingest(source, root / "run2")
            self.assertEqual((root / "run1/raw.jsonl").read_bytes(), source.read_bytes())
            self.assertEqual(first["counts"], {"input_records":6,"accepted":2,"duplicates":1,"rejected":3,"blank_lines":1})
            self.assertEqual(first["counts"], second["counts"])
            self.assertEqual(first["synthetic_share"], 1.0)
            self.assertEqual((root / "run1/venues.jsonl").read_bytes(), (root / "run2/venues.jsonl").read_bytes())
            with self.assertRaises(FileExistsError): ingest(source, root / "run1")

    def test_empty_file_does_not_claim_real_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); (root / "empty.jsonl").touch()
            r = ingest(root / "empty.jsonl", root / "run")
            self.assertIsNone(r["synthetic_share"])
            self.assertEqual(r["counts"]["accepted"], 0)


if __name__ == "__main__":
    unittest.main()
