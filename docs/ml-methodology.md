# Implemented rating-estimation methodology

See [frozen feature/evaluation protocol](feature-store-and-evaluation.md) and `audit/historical/model-evaluation.json` for executed details. This supersedes the earlier provisional target plan.

Target avgRating; 3,186 rated historical records. Entity-grouped split: 2,547 train / 639 test, with zero group overlap; 511 unrated records reserved for inference. Features: region, coordinates and activity indicators. All preprocessing is fit inside each training fold. Exclude target-derived HTML/truncated rating and identifiers/names/links/icons. Rating count is a sensitivity variable, not an input.

Five-fold grouped training CV compared mean, median, Ridge and random forest. Random forest selected using training CV only. The held-out MAE is 0.465545, RMSE 0.610195 and R² 0.163259. Median baseline MAE 0.516901. Most rating variation remains unexplained. Predictions are clipped to the rating range; no full-data refit was made.

Feature hashes, dataset/training hashes, package versions, parameters and subset sensitivity are persisted. The current website revision does not retrain the model or replace it with a heuristic. Synthetic records, demand, bookings and revenue claims are excluded.
