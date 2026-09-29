# Historical data audit and synthetic-data proposal

## Decision and scope

Audit date: 29 September 2026. Input: playo-find-venue-master.zip.

The historical export contains 3,701 rows across four source regions. Four exact duplicate rows leave 3,697 candidate venue records, including 3,186 rated and 511 unrated records. This is sufficient to attempt SQL analysis and a modest rating-prediction experiment; successful predictive performance is not established.

Recommendation: generate ZERO additional records for the core empirical analysis or model evaluation. Missing real features, unknown collection dates and sparse/noisy rating evidence cannot be repaired by increasing synthetic row volume.

Optional later scope: 400 explicitly fictional venues, 100 per source region, solely to exercise richer schema, filtering and dashboard states. This is a bounded demonstration budget, not a statistically necessary expansion. No synthetic expansion has been generated.

The uploaded ZIP and four extracted dataset files were preserved byte-for-byte, with SHA-256 verification. Archive code was inspected but never executed. No automated Playo collection was performed. Two public venue pages were reviewed only as domain/schema references.

The public repository is dhivaa-2004/playo-bdm-capstone. The current milestone is the audit and proposal. Supabase migrations, historical ETL adaptation, ML and dashboard deployment remain subsequent work.

## Archive inventory and source interpretation

| File | Bytes |
|---|---|
| .github/workflows/main.yml | 972 |
| LICENSE | 34,520 |
| README.md | 1,078 |
| data/venues_bangalore.json | 1,032,947 |
| data/venues_chennai.json | 414,069 |
| data/venues_delhi.json | 524,024 |
| data/venues_hyderabad.json | 810,676 |
| index.html | 4,139 |
| js/locations.json | 228 |
| js/places.js | 7,657 |
| requirements.txt | 138 |
| scripts/fetch_venues.py | 4,554 |
| scripts/gh-actions-update-venues.sh | 403 |
| scripts/git-checkout-date-sequence | 1,392 |

There are four venue datasets, one city-query-centre reference, and supporting application, collection, documentation and licence files. The README mentions only three regions, while the archive contains four.

The upstream Python script filters active venues, maps sports, derives integer rating/icon and constructs HTML info. Consequently this is an already transformed third-party historical export, not original provider API payloads. Its daily workflow is not enabled or copied into this project.

ZIP member timestamps are 28 September 2026; these are archive metadata, NOT verified observation/collection dates. Collection dates and historical completeness are unknown. The LICENSE identifies GNU AGPL v3 for the source repository; separate data redistribution rights are not established. The public project includes authored audit code and aggregate results, not the uploaded archive, contact details or original collection scripts.

Input SHA-256: 55f338caebbac0eeed8d563f3848e98118ead6baed4831b057ec8a5fecaff07e

## Schema and missingness

| Column | Python types / counts | Blank | Meaning |
|---|---|---|---|
| avgRating | float: 1790, int: 1911 | 0 | Observed average; zero paired with no ratings is unrated. |
| deferLink | str: 3701 | 2 | Legacy deep-link URL; two blanks. |
| filter_by | list: 3701 | 0 | Activity/service label list; normalize to a junction table. |
| fullLink | str: 3701 | 3 | Provider URL; venueId missing in three rows. |
| icon | str: 3701 | 0 | Derived display artifact; exclude from predictive features. |
| info | str: 3701 | 0 | Generated HTML summary with rating and phone information. |
| lat | float: 3701 | 0 | Latitude; valid numeric range does not verify locality. |
| lng | float: 3701 | 0 | Longitude; valid numeric range does not verify locality. |
| name | str: 3701 | 0 | Venue name; repeated names are not necessarily duplicate entities. |
| rating | int: 3701 | 0 | Integer truncation of avgRating; redundant target leakage. |
| ratingCount | int: 3701 | 0 | Number of ratings; not bookings or demand. |

All 11 keys appear in every row; JSON null count and absent-key count are zero for every column. This does not imply complete semantic data: 511 zero-rating/count pairs are unrated, and rich venue attributes are absent entirely. fullLink has three blanks; deferLink has two. No empty sports lists or invalid rating/count ranges were found. Three rows repeat a label inside filter_by; deduplicate memberships before loading the junction table.

No structured address, locality, timing, amenities, venue type, original description, rules, facility information, price, booking history or observation timestamp exists. Source-file region may be added as derived lineage, but is not a verified municipal-city field. Preserve unknowns as NULL; do not fabricate attributes on real venue rows.

## Regions and geographic coverage

| Source region | Raw rows | Rated | Unrated | Labels |
|---|---|---|---|---|
| Bangalore | 1359 | 1300 | 59 | 74 |
| Chennai | 557 | 534 | 23 | 31 |
| Delhi | 699 | 351 | 348 | 35 |
| Hyderabad | 1086 | 1005 | 81 | 61 |

| Region | Latitude range | Longitude range | Maximum distance from query centre |
|---|---|---|---|
| Bangalore | 12.56488 to 13.30038 | 77.27696 to 77.95568 | 46.46 km |
| Chennai | 12.74153 to 13.23769 | 79.64399 to 80.30407 | 48.21 km |
| Delhi | 28.15251 to 29.37599 | 76.28427 to 77.75994 | 91.03 km |
| Hyderabad | 16.72963 to 17.83804 | 78.00661 to 78.72732 | 91.35 km |

Coordinates are numeric, within global latitude/longitude bounds and never (0,0). No record is more than 100 km from its source query centre. This is a radius sanity check, not boundary validation: Delhi/NCR and outer-region venues must not be forced into municipal-city or locality claims. No reverse geocoding was conducted.

Coverage is geographically selective and cannot represent India or all venues in any city. Delhi has 348/699 unrated rows (49.79%), so rated-only comparisons disproportionately omit that region. Selection and unknown observation dates limit current-market claims.

## Ratings, counts and relationships

All statistics below use raw rows unless explicitly labelled deduplicated. Ratings with ratingCount=0 and avgRating=0 are missing targets, not zero-star reviews.

| Metric | Result |
|---|---|
| Rated / unrated raw rows | 3,190 / 511 (13.81% unrated) |
| Rated average / median | 4.4471 / 4.67 |
| Rated Q1 / Q3 / range | 4.10 / 5.00 / 1 to 5 |
| Rating count mean / median | 29.35 / 5 |
| Rating count Q1 / Q3 / 95th percentile / maximum | 1 / 19 / 154 / 1,463 |
| Exact-deduplicated rated rows | 3,186 |
| Deduplicated rows with at least 5 / 10 / 20 ratings | 1,965 / 1,363 / 904 |
| Pearson average rating vs rating count, rated rows | -0.2239 |
| Pearson average rating vs log(1+count), rated rows | -0.4041 |

Mean rated scores by source region: Bangalore 4.3443; Chennai 4.6385; Delhi 4.5517; Hyderabad 4.4418. Many values sit at the upper limit, and low rating counts weaken label reliability. Treat these as descriptive sample associations, not causal findings or proof of venue popularity.

There are 89 activity/service labels. 57 occur in fewer than 10 rows. Raw membership counts are not disjoint venue totals. 1,683/3,701 rows (45.47%) have more than one unique label. Sport-list cardinality ranges from 1 to 13.

The largest combination is Badminton alone (790 rows), followed by Box Cricket + Football (461). Shared sport patterns support multilabel SQL modelling; rare classes limit sport-specific ML claims. Do not treat all 89 labels as literal sports: the vocabulary includes services such as Rental and Massage Therapy.

Use a dummy mean/median baseline and a modest rating regression based on source region, coordinates and sport indicators. Evaluate on historical-only entity-grouped held-out data, fitting preprocessing only on training data. Report MAE/RMSE/R-squared plus region and rating-count sensitivity; 904 rows with 20+ ratings offer a stricter sensitivity subset. Exclude info, rating, icon, identifiers, links and name from initial features. avgRating is the target. Avoid ratingCount in the initial feature set; use it for reliability strata. No model or accuracy claim is produced by this audit. No demand, price, revenue or booking prediction is supported.

## Duplicates and HTML information

| Check | Finding | Cleaning decision |
|---|---|---|
| Exact full-record duplicates | Four pairs; four excess rows | Retain one per pair and full raw-row lineage |
| Nonempty provider venue IDs | 3,694 distinct; four duplicate pairs | Duplicate pairs equal exact duplicates |
| Missing provider IDs | Three Bangalore records | Assign source-file/row/hash lineage IDs; never merge NULL IDs |
| Conflicting nonempty IDs / IDs across regions | Zero / zero | No observed conflict to resolve |
| Normalized name duplicates | 19 groups, 39 rows, 20 excess | Candidate review only |
| Region + normalized name duplicates | 12 pairs | Candidate review only |
| Identical coordinate pairs | 26 pairs | Co-location is not proof of duplication |

Exact duplicate zero-based row locators: bangalore:1059/1060, chennai:128/129, delhi:533/534, hyderabad:263/264. Deleting only the four exact extras yields 3,697 candidates; this is not a claim of fully verified unique real businesses.

All 3,701 info fields are generated HTML. In every row, the heading repeats name, Ratings repeats avgRating/ratingCount, and Sports repeats filter_by. Phone is present with digits in every row. Typical length is 284 characters (median), range 214–414. No script tags or unexpected strong-label sets were detected, but stored HTML must still not be rendered as trusted content.

This field is not a corpus of independent venue descriptions, reviews or rules. Feeding it to a rating model would reveal the target. It cannot support an honest sentiment-analysis claim. Remove contact values from public exports and keep raw HTML out of the public UI and feature store. Retain the original only in the unchanged raw archive under controlled storage.

## Current domain reference and gap analysis

Only two current public venue pages were reviewed. They are examples, not an exhaustive schema census; fields absent on these pages may exist elsewhere. No page content became dataset rows.

| Field | Historical export | Current reference pages | Implication |
|---|---|---|---|
| Name, rating/count, sports | Present | Visible | Preserve historical values and date uncertainty |
| Locality and address | No structured fields | Visible | Real enrichment requires an appropriate new source |
| Timing | Absent | Visible | Optional synthetic opening-hour demonstrations |
| Amenities | Absent | Visible | Optional synthetic normalized amenities |
| About text, rules, equipment | Absent; info is generated summary | Examples visible | Do not reinterpret info as original prose |
| Coordinates | Present | Not audited as machine-readable page fields | Keep historical coordinates |
| Truncated rating, icon, deferLink | Export display artifacts | Not visible as standalone fields in reviewed pages | Preserve lineage, omit analytical features |
| Bookings, revenue, price history | Absent | Not established by this review | No empirical transactional analysis |

Tiger 5 PTP page demonstrates timing, location, sports, amenities and instructions/equipment information. Playspot demonstrates timing, address, amenities, about text and rules. Attribute presence varies.

Sources, accessed 29 September 2026:
https://playo.co/venues/kadubeesanahalli-bengaluru/tiger-5-sports-ptp-3-kadubeesanahalli-bengaluru
https://playo.co/venues/chennai/playspot-multisports-arena-choolaimedu-chennai

The real gaps are semantic feature coverage, observation dates, low evidence for some ratings, rare activities, geography bias and independent outcomes. More synthetic rows do not resolve these empirical limitations. SQL joins, CTEs, windows, aggregates, JSONB ingestion and a feature view can already be demonstrated with this historical base. Time cohorts and transactional analyses need genuine time/transaction inputs or explicitly separate simulation.

## Synthetic proposal and provenance contract

Core recommendation: 0 new records. Optional future demonstration: exactly 400 fictional venue records (100 per source region), stored separately and excluded from empirical model training/evaluation by default. An equal region allocation improves test coverage; it deliberately does not reproduce historical region shares.

| Fields | Proposed method | Purpose and limit |
|---|---|---|
| Synthetic ID and name | SYN-REGION-0001; explicit Synthetic Demo Venue names | No fictional real business claims |
| Region, activity combinations | Within-region empirical combination frequencies with documented smoothing | Exercise multisport relationships; rare labels not invented as observed |
| Rating and rating count | Joint empirical sampling/controlled variation, maintaining zero/zero pairs | Preserve dependence; simulation only, no new evidence |
| Coordinates | Small perturbations around observed regional clusters, with radius checks | Approximate simulated geography, not verified locality |
| Locality | Explicit synthetic area IDs | Avoid claiming unverified real neighbourhood assignments |
| Venue type, amenities, facilities | Documented sport-compatible rule tables | Assumptions; absent from historical source |
| Hours and opening days | Plausible schedules, overnight flag and interval validation | Exercise open/closed logic; assumptions, not learned distributions |
| Description and sport rules | Deterministic templates tied to sports/facilities | Useful UI text; no target rating embedded |

Use a fixed seed, generator version, configuration hash and training-reference hash. If any synthetic data is used in a later training experiment, split historical entities first and learn generator distributions only from the training partition; maintain an untouched historical test set and report synthetic augmentation as a separate experiment. Do not assert augmentation helps without that comparison.

Never populate missing historical fields with unmarked simulated values. Keep data/raw/playo_historical/ and data/synthetic/playo_expansion/ separate. Produce combined tables only through an explicit controlled union retaining provenance.

| Field | Historical | Synthetic |
|---|---|---|
| source_type | third_party_historical | synthetic |
| is_synthetic | false | true |
| source_dataset | playo-find-venue-master | playo_bdm_synthetic_expansion |
| observed_at | NULL (unknown) | NULL (not an observation) |
| generated_at / generator_version | NULL | Actual run timestamp / version |
| original lineage | ZIP hash, member hash/path, row index | Seed/config hash, generated ID |

Enforce compatible source_type/is_synthetic combinations with a database CHECK and non-null provenance. Give historical records a source namespace plus provider ID, or a stable row/hash fallback. Add field_origin metadata when future derived/enriched attributes are introduced. Deriving region from a filename must not be labelled observed city. Add source filters and a visible Synthetic badge to every later dashboard detail view; default empirical metrics to historical only.

Validate source counts, foreign keys, exact duplicates, required provenance, ratings/count consistency, sport membership uniqueness, geographic envelopes, schedule intervals and type/amenity rules. Reconcile raw, accepted, rejected and duplicate counts. Review synthetic-vs-reference marginals and combinations, recording intentional differences. No generator, combined production table or ML model has been created at this milestone.

## Complete activity and service vocabulary

Counts are raw venue memberships after deduplicating labels within each row; exact duplicate rows remain included.

| Label | Rows | Label | Rows |
|---|---|---|---|
| Box Cricket | 1402 | Paintball | 5 |
| Badminton | 1212 | Dance | 4 |
| Football | 1061 | Adventure Sports | 4 |
| Pickleball | 665 | Massage Therapy | 4 |
| Cricket Nets | 460 | Climbing | 4 |
| Cricket | 339 | Sports Massage | 4 |
| Table Tennis | 284 | Zumba | 3 |
| Bowling Machine | 183 | Darts | 3 |
| Swimming | 167 | Rugby | 3 |
| Basketball | 167 | Board Games | 3 |
| Snooker | 127 | Crossfit | 3 |
| Tennis | 118 | Trampoline | 2 |
| Volleyball | 108 | Boxing | 2 |
| Pool | 95 | Baseball | 2 |
| Padel | 58 | XBox | 2 |
| Play Station | 41 | Taekwondo | 2 |
| Skating | 38 | Screening | 2 |
| Foosball | 38 | Physiotherapy | 2 |
| Ultimate Frisbee | 37 | VR | 2 |
| eSports | 34 | Escape Time | 2 |
| Carrom | 28 | Zapminton | 2 |
| Beach Volleyball | 28 | Running | 1 |
| Gym | 26 | Combat Sports | 1 |
| Chess | 24 | Racket Stringing | 1 |
| SideArm Ball Throws | 24 | Water Spa | 1 |
| Futsal | 22 | Kick Boxing | 1 |
| Squash | 21 | Futnet | 1 |
| Shooting | 20 | Skyball | 1 |
| Throwball | 16 | Sauna | 1 |
| Rifle Shooting | 16 | Workout | 1 |
| Air Hockey | 13 | Coaching | 1 |
| Billiards | 13 | Heyball | 1 |
| Cricket Match | 9 | Water Sports | 1 |
| Hockey | 8 | Equestrian | 1 |
| Indoor Cricket | 8 | Box Office | 1 |
| Golf | 8 | Hall | 1 |
| Laser Tag | 8 | Cue Sports | 1 |
| Archery | 7 | Go Karting | 1 |
| Rental | 7 | Horse Riding | 1 |
| Handball | 7 | Bubble soccer | 1 |
| Yoga | 6 | Jazzminton | 1 |
| Kids Play Area | 6 | Cycling | 1 |
| Steam Bath | 6 | Kayaking | 1 |
| Car Racing | 6 | Footpool | 1 |
| Bowling | 6 |  |  |
