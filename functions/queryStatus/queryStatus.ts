import { APIGatewayEvent } from "aws-lambda";
import * as DynamoDB from "@aws-sdk/client-dynamodb";
import { UserConversionStatus } from "./types";

const dynamo = new DynamoDB.DynamoDBClient({});
const usersTable = process.env.USERS_TABLE!;

const mapUserStatus = (item: {
  [key: string]: DynamoDB.AttributeValue;
}): UserConversionStatus => {
  return {
    videoId: item.VideoId.S!,
    status: item.Progress.S! as UserConversionStatus["status"],
    downloadUrl: item.DownloadUrl?.S,
    errorMessage: item.ErrorMessage?.S,
  };
};

const getUserStatus = async (
  clientId: string,
  videoId: string
): Promise<UserConversionStatus | undefined> => {
  const command = new DynamoDB.GetItemCommand({
    TableName: usersTable,
    Key: {
      ClientId: { S: clientId },
      VideoId: { S: videoId },
    },
  });
  const response = await dynamo.send(command);
  return response.Item ? mapUserStatus(response.Item) : undefined;
};

const extractRequiredFields = (rawBody: string | null) => {
  if (!rawBody) {
    throw new Error("Request body is required");
  }
  try {
    const { clientId, videoId } = JSON.parse(rawBody);
    if (!clientId || typeof clientId !== "string") {
      throw new Error("Invalid or missing clientId");
    }
    if (videoId && typeof videoId !== "string") {
      throw new Error("Invalid videoId");
    }
    return { clientId, videoId };
  } catch (error) {
    throw new Error("Invalid JSON");
  }
};

export const handler = async (event: APIGatewayEvent) => {
  const { clientId, videoId } = extractRequiredFields(event.body);

  if (!clientId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Client ID is required" }),
    };
  }

  try {
    const userStatus = await getUserStatus(clientId, videoId);
    if (!userStatus) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(userStatus),
    };
  } catch (error) {
    console.error("Error fetching user status:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
