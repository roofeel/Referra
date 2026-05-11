#!/usr/bin/env ruby
# frozen_string_literal: true
# 手动归因脚本

require 'csv'
require 'aws-sdk-athena'

# Usage:
# ruby athena_reg_impression_match_fetch.rb \
#   --output matched_reg_impression_202605.csv \
#   --database your_athena_db \
#   --result-s3 s3://your-athena-query-results/prefix/ \
#   [--workgroup primary] [--region us-east-1] \
#   [--impression-tables impression_waf_logs_202604,impression_waf_logs_202605] \
#   [--pixel-table pixel_waf_logs_202605]

POLL_INTERVAL_SECONDS = 2

OPTIONS = {
  output: nil,
  database: ENV['ATHENA_DATABASE'],
  workgroup: ENV['ATHENA_WORKGROUP'] || 'primary',
  result_s3: ENV['ATHENA_OUTPUT_LOCATION'],
  region: ENV['AWS_REGION'] || 'us-east-1',
  impression_tables: %w[impression_waf_logs_202604 impression_waf_logs_202605],
  pixel_table: 'pixel_waf_logs_202605'
}.freeze

def parse_args
  opts = OPTIONS.dup
  args = ARGV.dup

  until args.empty?
    flag = args.shift
    case flag
    when '--output' then opts[:output] = args.shift
    when '--database' then opts[:database] = args.shift
    when '--workgroup' then opts[:workgroup] = args.shift
    when '--result-s3' then opts[:result_s3] = args.shift
    when '--region' then opts[:region] = args.shift
    when '--impression-tables'
      raw = args.shift.to_s
      opts[:impression_tables] = raw.split(',').map(&:strip).reject(&:empty?)
    when '--pixel-table' then opts[:pixel_table] = args.shift
    when '-h', '--help'
      print_usage
      exit 0
    else
      warn "Unknown option: #{flag}"
      print_usage
      exit 1
    end
  end

  missing = []
  missing << '--output' if opts[:output].to_s.strip.empty?
  missing << '--database or ATHENA_DATABASE' if opts[:database].to_s.strip.empty?
  missing << '--result-s3 or ATHENA_OUTPUT_LOCATION' if opts[:result_s3].to_s.strip.empty?
  missing << '--impression-tables' if opts[:impression_tables].nil? || opts[:impression_tables].empty?

  unless missing.empty?
    warn "Missing required option(s): #{missing.join(', ')}"
    print_usage
    exit 1
  end

  opts
end

def print_usage
  puts <<~USAGE
    Usage:
      ruby athena_reg_impression_match_fetch.rb \
        --output matched_reg_impression_202605.csv \
        --database your_athena_db \
        --result-s3 s3://your-athena-query-results/prefix/ \
        [--workgroup primary] [--region us-east-1] \
        [--impression-tables impression_waf_logs_202604,impression_waf_logs_202605] \
        [--pixel-table pixel_waf_logs_202605]
  USAGE
end

def build_query(database, impression_tables, pixel_table)
  impression_sql = impression_tables.map do |table|
    <<~SQL
      SELECT
        CASE
          WHEN "timestamp" >= 1000000000000 THEN from_unixtime("timestamp" / 1000.0)
          ELSE from_unixtime("timestamp")
        END AS imp_timestamp,
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
      FROM #{database}.#{table}
      WHERE httpRequest.uri = '/v2/23135/impression'
    SQL
  end.join("\nUNION ALL\n")

  <<~SQL
    WITH reg_base AS (
      SELECT
        CASE
          WHEN "timestamp" >= 1000000000000 THEN from_unixtime("timestamp" / 1000.0)
          ELSE from_unixtime("timestamp")
        END AS reg_timestamp,
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
      FROM #{database}.#{pixel_table}
      WHERE url_extract_parameter(
              concat('https://dummy?', coalesce(httpRequest.args, '')),
              'ev'
            ) = 'REG'
        AND coalesce(httpRequest.args, '') LIKE 'id=1304f80e792a4d93a2d98def382c69a0%'
        AND date(
          CASE
            WHEN "timestamp" >= 1000000000000 THEN from_unixtime("timestamp" / 1000.0)
            ELSE from_unixtime("timestamp")
          END
        ) = date '2026-05-07'
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
      #{impression_sql}
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
  SQL
end

def start_query(client, query_string, database, output_location, workgroup)
  resp = client.start_query_execution(
    query_string: query_string,
    query_execution_context: { database: database },
    result_configuration: { output_location: output_location },
    work_group: workgroup
  )

  resp.query_execution_id
end

def wait_for_query(client, query_execution_id)
  poll_count = 0

  loop do
    resp = client.get_query_execution(query_execution_id: query_execution_id)
    status = resp.query_execution.status.state
    poll_count += 1

    if (poll_count % 5).zero?
      puts "Query #{query_execution_id} status=#{status} (poll=#{poll_count})"
    end

    case status
    when 'SUCCEEDED'
      puts "Query #{query_execution_id} status=SUCCEEDED"
      return
    when 'FAILED', 'CANCELLED'
      reason = resp.query_execution.status.state_change_reason
      raise "Athena query #{status}: #{reason}"
    else
      sleep POLL_INTERVAL_SECONDS
    end
  end
end

def fetch_rows(client, query_execution_id)
  rows = []
  next_token = nil
  header_skipped = false
  page = 0

  loop do
    page += 1
    resp = client.get_query_results(
      query_execution_id: query_execution_id,
      next_token: next_token,
      max_results: 1000
    )

    resp.result_set.rows.each_with_index do |row, idx|
      if !header_skipped && next_token.nil? && idx.zero?
        header_skipped = true
        next
      end

      values = row.data.map { |d| d.var_char_value.to_s }
      rows << values
    end

    puts "Query #{query_execution_id} fetch page=#{page}, accumulated_rows=#{rows.size}"

    next_token = resp.next_token
    break if next_token.nil?
  end

  rows
end

def write_output(output_csv, rows)
  headers = %w[
    reg_row_id
    reg_timestamp
    imp_timestamp
    final_true_ip
    reg_host
    reg_uri
    reg_args
    imp_host
    imp_uri
    imp_args
    seconds_from_impression_to_reg
  ]

  CSV.open(output_csv, 'w') do |csv|
    csv << headers
    rows.each { |r| csv << r }
  end
end

opts = parse_args
client = Aws::Athena::Client.new(region: opts[:region])

query = build_query(opts[:database], opts[:impression_tables], opts[:pixel_table])
puts "Running Athena match query: REG from #{opts[:database]}.#{opts[:pixel_table]}, impression from #{opts[:impression_tables].map { |t| "#{opts[:database]}.#{t}" }.join(', ')}"
qid = start_query(client, query, opts[:database], opts[:result_s3], opts[:workgroup])
puts "Started query_execution_id=#{qid}"
wait_for_query(client, qid)
rows = fetch_rows(client, qid)

write_output(opts[:output], rows)
puts "Done. Output=#{opts[:output]}, matched_rows=#{rows.size}"
