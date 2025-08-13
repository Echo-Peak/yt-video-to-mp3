import { APIGatewayEvent } from "aws-lambda";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { exec } from "child_process";
import { ConversionState } from "../queryStatus/types";

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
  clientID: string
): Promise<boolean | undefined> => {
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: usersTable,
      Key: {
        ClientId: { S: clientID },
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
  return new Promise((resolve, reject) => {
    const command = `yt-dlp --dump-json ${videoSourceUrl}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error downloading video JSON: ${stderr}`);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
};

export const handler = async (event: APIGatewayEvent) => {
  const body = JSON.parse(event.body || "{}");

  const { clientID, videoSourceUrl } = body;

  if (!clientID || !videoSourceUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing clientID or videoSourceUrl",
      }),
    };
  }

  try {
    const inProgress = await isSessionInProgress(clientID);
    if (inProgress) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Session already in progress",
        }),
      };
    }
    const videoJson = await downloadVideoJson(videoSourceUrl);
    const videoId = JSON.parse(videoJson).id;
    const videoTotalDuration = JSON.parse(videoJson).duration_string;
    if (!videoId || !videoTotalDuration) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid video data",
        }),
      };
    }

    await cacheVideoSource(videoId, videoJson); // This is so we can do more work on video sources in the future and use the same DB table
    await createUserSession(clientID, videoId);
    await triggerStateMachine(videoTotalDuration, videoId, clientID, videoJson);

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
