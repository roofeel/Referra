import { AthenaClient } from '@aws-sdk/client-athena';
import { S3Client } from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { Hash } from '@smithy/hash-node';
import { SignatureV4 } from '@smithy/signature-v4';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';

function getAwsRegion() {
  return process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim() || 'us-east-1';
}

function getStaticCredentialsFromEnv() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

  if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
    throw new Error('Both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required when using static AWS credentials');
  }

  if (!accessKeyId || !secretAccessKey) return null;

  if (accessKeyId.startsWith('ASIA') && !sessionToken) {
    throw new Error(
      'AWS_SESSION_TOKEN is required when AWS_ACCESS_KEY_ID is temporary credentials (ASIA...)',
    );
  }

  return {
    accessKeyId,
    secretAccessKey,
    ...(sessionToken ? { sessionToken } : {}),
  };
}

function withTemporaryCredentialGuard(credentials: AwsCredentialIdentityProvider): AwsCredentialIdentityProvider {
  return async () => {
    const resolved = await credentials();
    if (resolved.accessKeyId?.startsWith('ASIA') && !resolved.sessionToken) {
      throw new Error('Resolved temporary AWS credentials are missing session token');
    }
    return resolved;
  };
}

export function resolveAwsCredentialConfig() {
  // Production defaults to IAM role/provider chain for centralized, safer runtime behavior.
  if ((process.env.NODE_ENV || '').trim().toLowerCase() === 'production') {
    return { credentials: withTemporaryCredentialGuard(fromNodeProviderChain()) };
  }

  const staticCredentials = getStaticCredentialsFromEnv();
  if (staticCredentials) {
    return { credentials: staticCredentials };
  }

  return { credentials: withTemporaryCredentialGuard(fromNodeProviderChain()) };
}

export function createAthenaClient() {
  return new AthenaClient({
    region: getAwsRegion(),
    ...resolveAwsCredentialConfig(),
  });
}

export function createS3Client() {
  const s3Endpoint = process.env.AWS_S3_ENDPOINT?.trim();
  const s3ForcePathStyle = (process.env.AWS_S3_FORCE_PATH_STYLE?.trim() || 'true').toLowerCase() !== 'false';

  return new S3Client({
    region: getAwsRegion(),
    forcePathStyle: s3ForcePathStyle,
    ...(s3Endpoint ? { endpoint: s3Endpoint } : {}),
    ...resolveAwsCredentialConfig(),
  });
}

export function getAwsRegionValue() {
  return getAwsRegion();
}

export function createElasticsearchSigner() {
  const credentialConfig = resolveAwsCredentialConfig();
  const credentials = 'credentials' in credentialConfig
    ? credentialConfig.credentials
    : credentialConfig;

  return new SignatureV4({
    credentials,
    region: getAwsRegion(),
    service: 'es',
    sha256: Hash.bind(null, 'sha256'),
  });
}

export function resolveBedrockCredentialConfig() {
  // createAmazonBedrock accepts either {accessKeyId,secretAccessKey,sessionToken?}
  // or {credentialProvider}
  if ((process.env.NODE_ENV || '').trim().toLowerCase() === 'production') {
    return { credentialProvider: fromNodeProviderChain() };
  }

  const staticCredentials = getStaticCredentialsFromEnv();
  if (staticCredentials) {
    return staticCredentials;
  }

  return { credentialProvider: fromNodeProviderChain() };
}
