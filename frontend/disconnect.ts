import { APIGatewayEvent } from "aws-lambda";
import {
  DynamoDBClient,
  ScanCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({});
const tableName = process.env.CONNECTIONS_TABLE!;

export const handler = async (event: APIGatewayEvent) => {
  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    return { statusCode: 400, body: "Missing connectionId" };
  }

  try {
    // Find the item with this connectionId
    const scanResult = await dynamo.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "connectionId = :cid",
        ExpressionAttributeValues: {
          ":cid": { S: connectionId },
        },
      })
    );

    const match = scanResult.Items?.[0];
    if (!match) {
      console.warn(
        `No matching record found for connectionId: ${connectionId}`
      );
      return { statusCode: 200, body: "Already removed or not found" };
    }

    const clientID = match.clientID?.S;

    if (!clientID) {
      console.warn(
        `No clientID found in record for connectionId: ${connectionId}`
      );
      return { statusCode: 400, body: "Invalid record: missing clientID" };
    }

    await dynamo.send(
      new DeleteItemCommand({
        TableName: tableName,
        Key: {
          clientID: { S: clientID },
        },
      })
    );

    return { statusCode: 200, body: "Disconnected" };
  } catch (err) {
    console.error("Disconnect error:", err);
    return { statusCode: 500, body: "Failed to disconnect client" };
  }
};
