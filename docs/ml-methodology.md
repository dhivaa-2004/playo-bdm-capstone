# ML decision gate and evaluation plan

No target/model is finalized, trained or evaluated. The course's core task requires supervised classification or regression plus prediction write-back; clustering alone is insufficient for that requirement.

## Candidate task

If enough independent venues have permitted observed ratings, test rating regression from non-target descriptive characteristics. This is a hypothesis about associated ratings, not a forecast of revenue, bookings, demand or future customer experience.

Candidate predictors after profiling: verified sport/amenity counts, city category, genuine hours where parseable, description length/missingness. Exclude rating and rating-derived categories/rankings, post-outcome fields and any aggregate computed from holdout targets. Review rating count for timing/availability and potential proxy leakage before including it.

If the task is a high-rating classifier, its threshold is an explicitly justified modelling choice. Remove the source rating from inputs. Do not define a label directly from a predictor and then report rediscovery of that rule as a useful prediction.

## Evaluation

1. Group all observations of the same venue into one split. If genuine temporal outcomes exist, use time-ordered splits and ensure all features predate the outcome.
2. Keep a reproducible held-out test set. Fit imputers, encoders, scaling and tuning only on training data/folds.
3. Compare a dummy baseline against a small interpretable model, then a justified tree model. Do not promise that the fitted model will outperform baseline.
4. For regression report MAE, RMSE, R², test count and uncertainty where supportable. For classification report per-class precision/recall/F1, confusion matrix and class balance.
5. Evaluate source-derived and synthetic populations separately. A synthetic-only score measures behavior on the generator, not Playo performance. Split before any expansion based on real records; keep synthetic derivatives with their source group.
6. Store model/version, dataset hash, seed, features, split IDs, metrics and predictions in PostgreSQL. Feature version is part of prediction identity.
7. If sample size/coverage is inadequate, report the limitation instead of manufacturing accuracy. Keep source-linked analysis and simulation results distinct.

## Transactional-data issue

The course's practical examples use transactions; venue listing snapshots are not booking transactions. Do not rename them as such. If transactional analysis is required for assessment, use permissioned transactions or a separate explicitly simulated booking demonstration with instructor acceptance. The production core must not imply access to actual Playo bookings.
