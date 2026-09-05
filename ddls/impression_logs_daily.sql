-- Replace the S3 placeholders with the actual existing log prefix before execution.
CREATE EXTERNAL TABLE `impression_logs_daily`(
  `type` string COMMENT '', 
  `timestamp` string COMMENT '', 
  `elb_name` string COMMENT '', 
  `request_ip` string COMMENT '', 
  `request_port` int COMMENT '', 
  `backend_ip` string COMMENT '', 
  `backend_port` int COMMENT '', 
  `request_processing_time` double COMMENT '', 
  `backend_processing_time` double COMMENT '', 
  `client_response_time` double COMMENT '', 
  `elb_response_code` string COMMENT '', 
  `backend_response_code` string COMMENT '', 
  `received_bytes` bigint COMMENT '', 
  `sent_bytes` bigint COMMENT '', 
  `request_verb` string COMMENT '', 
  `url` string COMMENT '', 
  `protocol` string COMMENT '', 
  `user_agent` string COMMENT '')
PARTITIONED BY ( 
  `day` string)
ROW FORMAT SERDE 
  'org.apache.hadoop.hive.serde2.RegexSerDe' 
WITH SERDEPROPERTIES ( 
  'input.regex'='^([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) \\\"([^ ]*) ([^ ]*) (- |[^ ]*)\\\" (\"[^\"]*\") .*$') 
STORED AS INPUTFORMAT 
  'org.apache.hadoop.mapred.TextInputFormat' 
OUTPUTFORMAT 
  'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION
  's3://REPLACE_BUCKET/REPLACE_PREFIX/AWSLogs/REPLACE_ACCOUNT/elasticloadbalancing/us-east-1'
TBLPROPERTIES (
  'projection.enabled'='true', 
  'projection.day.format'='yyyy/MM/dd', 
  'projection.day.interval'='1', 
  'projection.day.interval.unit'='DAYS', 
  'projection.day.range'='2026/01/01,NOW', 
  'projection.day.type'='date', 
  'storage.location.template'='s3://REPLACE_BUCKET/REPLACE_PREFIX/AWSLogs/REPLACE_ACCOUNT/elasticloadbalancing/us-east-1/${day}/');
