import { APIGatewayEvent } from "aws-lambda";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { exec } from "child_process";
import { ConversionState } from "./types/ConversionState";
import path from "path";
import fs from "fs";

const dynamo = new DynamoDBClient({});
const sfn = new SFNClient({});

const videoSourceTable = process.env.VIDEO_SOURCES_TABLE!;
const usersTable = process.env.USERS_TABLE!;
const stateMachineArn = process.env.CONVERSION_SM_ARN!;

const triggerStateMachine = async (
  videoTotalDuration: string,
  videoId: string,
  videoSourceUrl: string,
  clientId: string
) => {
  const input = {
    size: decideSize(videoTotalDuration),
    videoSourceUrl,
    videoId,
    clientId,
  };

  const name = `prep-${videoId}-${crypto.randomUUID()}`.slice(0, 80);
  const res = await sfn.send(
    new StartExecutionCommand({
      stateMachineArn: stateMachineArn,
      input: JSON.stringify(input),
      name,
    })
  );
};

const selectYtDlpPath = async (): Promise<string> => {
  try {
    const builtPath = path.resolve(__dirname, "yt-dlp");
    await fs.promises.access(builtPath);
    return builtPath;
  } catch (err) {
    console.error("Error resolving yt-dlp path:", err);
  }
  return "yt-dlp";
};

const decideSize = (videoTotalDuration: string): string => {
  const parts = videoTotalDuration.split(":").map(Number);
  let duration = 0;
  if (parts.length === 3) {
    duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    duration = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    duration = parts[0];
  } else {
    duration = parseInt(videoTotalDuration, 10);
  }

  if (duration < 300) return "small";
  if (duration < 900) return "medium";
  return "large";
};

const cacheVideoSource = async (videoId: string, videoJson: string) => {
  await dynamo.send(
    new PutItemCommand({
      TableName: videoSourceTable,
      Item: {
        VideoId: { S: videoId },
        VideoJson: { S: videoJson },
      },
    })
  );
};

const createUserSession = async (clientID: string, videoId: string) => {
  await dynamo.send(
    new PutItemCommand({
      TableName: usersTable,
      Item: {
        ClientId: { S: clientID },
        Progress: { S: ConversionState.InProgress },
        VideoId: { S: videoId },
        CreatedAt: { S: new Date().toISOString() },
      },
    })
  );
};

const isSessionInProgress = async (
  clientID: string,
  videoId: string
): Promise<boolean | undefined> => {
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: usersTable,
      Key: {
        ClientId: { S: clientID },
        VideoId: { S: videoId },
      },
    })
  );

  return (
    result.Item &&
    result.Item.Progress &&
    result.Item.Progress.S === ConversionState.InProgress
  );
};

const downloadVideoJson = async (videoSourceUrl: string): Promise<string> => {
  const ytDlpPath = await selectYtDlpPath();
  console.log("Using yt-dlp path:", ytDlpPath);

  return new Promise((resolve, reject) => {
    const command = `${ytDlpPath} --dump-json ${videoSourceUrl}`;
    exec(command, (error, stdout, stderr) => {
      if (stderr) {
        console.error(`yt-dlp stderr: ${stderr}`);
      }
      if (error) {
        console.error(`Error downloading video JSON: ${stderr}`);
        reject(error);
      } else {
        console.log(`Downloaded video JSON: ${stdout}`);
        resolve(stdout);
      }
    });
  });
};

export const handler = async (event: APIGatewayEvent) => {
  const body = JSON.parse(event.body || "{}");

  const { clientID, sourceUrl, videoId } = body;

  console.log("clientID:", clientID);
  console.log("sourceUrl:", sourceUrl);
  console.log("videoId:", videoId);

  if (!clientID || !videoId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing clientID or videoId",
      }),
    };
  }

  try {
    const inProgress = await isSessionInProgress(clientID, videoId);
    if (inProgress) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Session already in progress",
        }),
      };
    }
    const videoJson = await downloadVideoJson(sourceUrl);
    const videoTotalDuration = JSON.parse(videoJson).duration_string;
    if (!videoId || !videoTotalDuration) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid video data",
        }),
      };
    }

    await cacheVideoSource(videoId, videoJson);
    await createUserSession(clientID, videoId);
    await triggerStateMachine(videoTotalDuration, videoId, sourceUrl, clientID);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Conversion request received",
      }),
    };
  } catch (error) {
    console.error(`Error processing request: ${error}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing request",
      }),
    };
  }
};
