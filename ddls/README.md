# Delivery dashboard Athena optimization

The service uses `GROUPING SETS` to read impressions once for hourly, DMA and creative metrics. Existing month-partition tables remain supported by default. Bid metrics still count requests with at least one bid, not the number of bids inside each response.

## Create a daily projection table

1. Check the existing table's **actual** `storage.location.template` and S3 keys. The supplied `impression_logs.txt` has different prefixes in `LOCATION` and the projection template; do not infer the production path from these anonymized examples.
2. Confirm the existing log objects live under `.../yyyy/MM/dd/`. Copy `impression_logs_daily.sql`, replace `REPLACE_BUCKET`, `REPLACE_PREFIX` (remove it if absent), and `REPLACE_ACCOUNT` in both locations. Keep the original SerDe. Adjust the projection date range if older data is needed.
3. Execute the resulting CREATE TABLE in the same Athena database. This creates metadata pointing at existing objects; no log copy or conversion is required. The original table is unchanged.
4. Compare old and new results for a completed day, including each filter's hourly, DMA and creative counts. Check dates near midnight and a month boundary. The daily query defaults to scanning the previous/current/next file dates, with event timestamps still restricted to the requested UTC day. Confirm this covers the actual file-date/event-date offset; padding is configurable from 0 to 31 days. Zero should only be used after verifying same-day file placement. Comparing against the old month query at month boundaries can reveal events that the old query omitted.

## Switch the service

Set these in the environment of both the API and delivery dashboard worker, then restart them:

```dotenv
ATHENA_IMPRESSION_TABLE=impression_logs_daily
ATHENA_IMPRESSION_PARTITION=day
ATHENA_IMPRESSION_PARTITION_PADDING_DAYS=1
```

The default remains `ATHENA_IMPRESSION_TABLE=impression_logs` and `ATHENA_IMPRESSION_PARTITION=month`. The partition setting must match the selected table. To roll back, restore both defaults and restart.

Refresh the same completed date and compare the `[delivery-metrics] Athena query completed` logs: `dataScannedInBytes`, `engineExecutionTimeInMillis`, and `totalExecutionTimeInMillis`. Capture an original-query baseline before rollout if measuring the combined grouping and partition savings. Actual savings depend on the number of adjacent partitions scanned and the share of bid logs; no fixed reduction is guaranteed.

The query continues rebuilding a complete event day, so PostgreSQL daily replacement and Elasticsearch install merging retain their existing behavior. Hourly incremental refresh requires a separate persistence change. Raw ELB directories generally provide daily rather than hourly prefixes; an hourly projection alone cannot subdivide those files.

The DDL has not been executed against AWS. Validate the actual table and query in Athena before switching production; local aggregation equivalence checks do not validate Athena's complete execution plan or production log placement.
