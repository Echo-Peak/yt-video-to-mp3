import { SQSEvent } from "aws-lambda";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

const ddb = new DynamoDBClient({});
const tableName = process.env.CONNECTIONS_TABLE!;
const wsEndpoint = process.env.WS_ENDPOINT!; // e.g., "abc123.execute-api.us-east-1.amazonaws.com/Prod"

const apigwClient = new ApiGatewayManagementApiClient({
  endpoint: `https://${wsEndpoint}`,
});

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const { clientID, videoID, status, s3Url } = message;

      if (!clientID || !videoID || !status) {
        console.warn("Missing clientID, videoID, or status");
        continue;
      }

      // Get connectionId from DynamoDB
      const getResult = await ddb.send(
        new GetItemCommand({
          TableName: tableName,
          Key: {
            clientID: { S: clientID },
          },
        })
      );

      const connectionId = getResult.Item?.connectionId?.S;
      if (!connectionId) {
        console.warn(`No connectionId found for clientID ${clientID}`);
        continue;
      }

      // Send message to client
      const payload = {
        type: "statusUpdate",
        clientID,
        videoID,
        status,
        url: s3Url || null,
      };

      await apigwClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify(payload)),
        })
      );

      console.log(`Notification sent to ${connectionId}`);
    } catch (err: any) {
      console.error("Error processing record:", err);
    }
  }
};
