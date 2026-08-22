import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, getBucketName } from "@repo/shared/aws/s3";
import fs from "fs";

const s3 = createS3Client();

export const uploadFile = async (fileName: string, localFilePath: string) => {
  const fileContent = fs.readFileSync(localFilePath);
  const command = new PutObjectCommand({
    Body: fileContent,
    Bucket: getBucketName(),
    Key: fileName,
  });
  await s3.send(command);
};
