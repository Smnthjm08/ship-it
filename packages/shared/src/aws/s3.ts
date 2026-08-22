import { S3Client } from "@aws-sdk/client-s3";

// One client for both shipyard (uploads) and proxy (reads), so the two ends
// can't drift — e.g. uploading to AWS while reading from R2. AWS_ENDPOINT opts
// into any S3-compatible service and forces path-style addressing, which they need.
export const createS3Client = (): S3Client =>
  new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    ...(process.env.AWS_ENDPOINT
      ? { endpoint: process.env.AWS_ENDPOINT, forcePathStyle: true }
      : {}),
  });

/** Bucket name shared by uploads and reads. */
export const getBucketName = (): string => process.env.AWS_BUCKET_NAME!;
