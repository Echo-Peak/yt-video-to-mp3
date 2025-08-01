import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({});
const tableName = process.env.CONNECTIONS_TABLE!;

export const handler = async (event: APIGatewayEvent) => {
  const connectionId = event.requestContext.connectionId;

  // You can extract clientID from query string or headers
  const clientID =
    event.queryStringParameters?.clientID ||
    event.headers["x-client-id"] ||
    generateClientID();

  if (!clientID || !connectionId) {
    return { statusCode: 400, body: "Missing clientID or connectionId" };
  }

  try {
    await dynamo.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          clientID: { S: clientID },
          connectionId: { S: connectionId },
        },
      })
    );

    return { statusCode: 200, body: "Connected" };
  } catch (err) {
    console.error("DynamoDB error:", err);
    return { statusCode: 500, body: "Failed to save connection" };
  }
};

function generateClientID(): string {
  return "client-" + Math.random().toString(36).substring(2, 10);
}
