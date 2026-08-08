# api

To install dependencies:

```bash
bun install
```

Create `api/.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/ai_referrer?schema=public"
GOOGLE_GENERATIVE_AI_API_KEY=your_google_generative_ai_api_key
GOOGLE_CLIENT_ID=your_google_web_client_id
GOOGLE_CLIENT_SECRET=your_google_web_client_secret

# BullMQ
REDIS_URL=redis://127.0.0.1:6379
REPORT_EXPORT_BUCKET=testing
REPORT_EXPORT_PREFIX=ai-referrer
REPORT_EXPORT_WORKER_CONCURRENCY=2

# Journey Matching (AWS Athena)
AWS_REGION=us-east-1
# IAM Role environments do not need AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY.
# For local IAM user credentials, set both variables.
# AWS_ACCESS_KEY_ID=your_aws_access_key_id
# AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

# Delivery Dashboard aggregation (Athena -> PostgreSQL)
ATHENA_DATABASE=default
ATHENA_WORKGROUP=primary
ATHENA_OUTPUT_LOCATION=s3://aws-athena-query-results-246648750489-us-east-1/
ATHENA_IMPRESSION_TABLE=impression_logs
ATHENA_INSTALL_TABLE=tracking_lb_logs
ATHENA_BID_TABLE=fm_bidding_agent_test_bids
# Optional ID filters. Format: id:showBid,id:showBid. Omit to disable ID filtering.
DELIVERY_METRICS_FILTERS=23703:true,45678:false
ELASTICSEARCH_URL=https://your-domain.us-east-1.es.amazonaws.com
ELASTICSEARCH_INDEX=conversion_records-*
DELIVERY_METRICS_ENABLED=true
DELIVERY_METRICS_INTERVAL_MS=3600000

# Sentry (Optional)
SENTRY_DSN=

# Auth (Optional)
# Restrict login emails to this suffix
LOGIN_ALLOWED_EMAIL_SUFFIX=
```

You can also copy from `api/.env.example`:

```bash
cp api/.env.example api/.env
```

Run API:

```bash
bun run dev
```

Run export worker:

```bash
bun run worker:report-export

Run the delivery metrics worker:

```bash
bun run worker:delivery-dashboard
```
```

This project was created using `bun init` in bun v1.3.8. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
