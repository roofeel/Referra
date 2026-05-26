import { AthenaClient } from '@aws-sdk/client-athena';
import { S3Client } from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

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

  return {
    accessKeyId,
    secretAccessKey,
    ...(sessionToken ? { sessionToken } : {}),
  };
}

export function resolveAwsCredentialConfig() {
  // Production defaults to IAM role/provider chain for centralized, safer runtime behavior.
  if ((process.env.NODE_ENV || '').trim().toLowerCase() === 'production') {
    return { credentials: fromNodeProviderChain() };
  }

  const staticCredentials = getStaticCredentialsFromEnv();
  if (staticCredentials) {
    return { credentials: staticCredentials };
  }

  return { credentials: fromNodeProviderChain() };
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
