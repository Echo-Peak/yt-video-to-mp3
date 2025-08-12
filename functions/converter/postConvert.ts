import * as S3Signer from "@aws-sdk/s3-request-presigner";
import * as DynamoDB from "@aws-sdk/client-dynamodb";
import * as S3Client from "@aws-sdk/client-s3";
import { ConvertResult, PostConvertEvent } from "./types";
import { ConversionState } from "../queryStatus/types";

const s3 = new S3Client.S3Client({});
const dynamo = new DynamoDB.DynamoDBClient({});

const usersTable = process.env.USERS_TABLE!;
const BUCKET = process.env.S3_VIDEO_BUCKET!;

const updateSession = async (clientId: string, s3VideoUrl: string) => {
  const signedUrl = await createSignedUrl(s3VideoUrl);
  await dynamo.send(
    new DynamoDB.PutItemCommand({
      TableName: usersTable,
      Item: {
        ClientId: { S: clientId },
        Progress: { S: ConversionState.Completed },
        DownloadUrl: { S: signedUrl },
        FinishedAt: { S: new Date().toISOString() },
      },
    })
  );
};

const createSignedUrl = async (
  s3VideoObjectPath: string,
  expireLengthInSeconds = 600
): Promise<string> => {
  const contentType = "application/octet-stream";
  if (!s3VideoObjectPath) throw new Error("Missing s3VideoObjectPath");

  const url = await S3Signer.getSignedUrl(
    s3,
    new S3Client.PutObjectCommand({
      Bucket: BUCKET,
      Key: s3VideoObjectPath,
      ContentType: contentType,
    }),
    { expiresIn: expireLengthInSeconds }
  );
  return url;
};

export const handler = async (event: PostConvertEvent) => {
  try {
    const { clientId, s3VideoUrl } = event;

    await updateSession(clientId, s3VideoUrl);

    return {
      ok: true,
      details: { message: "Conversion finished successfully" },
    } as ConvertResult;
  } catch (error) {
    console.error(`Error processing conversion: ${error}`);
    return {
      ok: false,
      details: { error: (error as Error).message },
    } as ConvertResult;
  }
};
