-- Manual Attribution SQL Template
-- Variables supported by the Manual Attribution page:
--   {{start_date}}  YYYY-MM-DD
--   {{end_date}}    YYYY-MM-DD
--
-- Table names are not generated automatically. Update the monthly tables below
-- before running a cross-month query.
-- Pattern:
--   pixel_waf_logs_YYYYMM
--   impression_waf_logs_YYYYMM

WITH reg_base AS (
  SELECT
    from_unixtime("timestamp")AS reg_timestamp,
    COALESCE(
      nullif(split_part(
        element_at(
          filter(httpRequest.headers, x -> lower(x.name) = 'x-forwarded-for'),
          1
        ).value,
        ',',
        1
      ), ''),
      httpRequest.clientIp
    ) AS final_true_ip,
    httpRequest.host AS reg_host,
    httpRequest.uri AS reg_uri,
    httpRequest.args AS reg_args
  FROM default.pixel_waf_logs_YYYYMM
  WHERE url_extract_parameter(
          concat('https://dummy?', coalesce(httpRequest.args, '')),
          'ev'
        ) = 'REG'
    AND coalesce(httpRequest.args, '') LIKE 'id=1304f80e792a4d93a2d98def382c69a0%'
    AND date(
      from_unixtime("timestamp")
    ) BETWEEN date '{{start_date}}' AND date '{{end_date}}'
),
reg_rows AS (
  SELECT
    row_number() OVER (
      ORDER BY reg_timestamp, final_true_ip, reg_host, reg_uri, coalesce(reg_args, '')
    ) AS reg_row_id,
    reg_timestamp,
    final_true_ip,
    reg_host,
    reg_uri,
    reg_args
  FROM reg_base
  WHERE final_true_ip IS NOT NULL
    AND final_true_ip <> ''
),
imp_rows AS (
  SELECT
    from_unixtime("timestamp") AS imp_timestamp,
    COALESCE(
      nullif(split_part(
        element_at(
          filter(httpRequest.headers, x -> lower(x.name) = 'x-forwarded-for'),
          1
        ).value,
        ',',
        1
      ), ''),
      httpRequest.clientIp
    ) AS final_true_ip,
    httpRequest.host AS imp_host,
    httpRequest.uri AS imp_uri,
    httpRequest.args AS imp_args
  FROM default.impression_waf_logs_YYYYMM
  WHERE httpRequest.uri = '/v2/23135/impression'

  UNION ALL

  SELECT
    from_unixtime("timestamp") AS imp_timestamp,
    COALESCE(
      nullif(split_part(
        element_at(
          filter(httpRequest.headers, x -> lower(x.name) = 'x-forwarded-for'),
          1
        ).value,
        ',',
        1
      ), ''),
      httpRequest.clientIp
    ) AS final_true_ip,
    httpRequest.host AS imp_host,
    httpRequest.uri AS imp_uri,
    httpRequest.args AS imp_args
  FROM default.impression_waf_logs_YYYYMM
  WHERE httpRequest.uri = '/v2/23135/impression'
),
joined AS (
  SELECT
    r.reg_row_id,
    r.reg_timestamp,
    r.final_true_ip,
    r.reg_host,
    r.reg_uri,
    r.reg_args,
    i.imp_timestamp,
    i.imp_host,
    i.imp_uri,
    i.imp_args,
    row_number() OVER (
      PARTITION BY r.reg_row_id
      ORDER BY i.imp_timestamp DESC
    ) AS imp_rank
  FROM reg_rows r
  JOIN imp_rows i
    ON r.final_true_ip = i.final_true_ip
   AND i.imp_timestamp < r.reg_timestamp
   AND i.imp_timestamp >= date_add('day', CAST(-14 AS BIGINT), r.reg_timestamp)
  WHERE i.final_true_ip IS NOT NULL
    AND i.final_true_ip <> ''
)
SELECT
  reg_row_id,
  reg_timestamp,
  imp_timestamp,
  final_true_ip,
  reg_host,
  reg_uri,
  reg_args,
  imp_host,
  imp_uri,
  imp_args,
  date_diff('second', imp_timestamp, reg_timestamp) AS seconds_from_impression_to_reg
FROM joined
WHERE imp_rank = 1
ORDER BY reg_timestamp
