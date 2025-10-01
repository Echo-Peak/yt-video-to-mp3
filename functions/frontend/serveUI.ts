import { readFileSync } from "fs";
import { join } from "path";
import * as jsdom from "jsdom";
import { APIGatewayEvent } from "aws-lambda";

const { JSDOM } = jsdom;

const embedData = (data: Record<string, string>, htmlString: string) => {
  const doc = new JSDOM(htmlString).window.document;
  const script = doc.createElement("script");
  script.textContent = `window.lambdaEnv = ${JSON.stringify(data)};`;
  doc.head.appendChild(script);
  return doc.documentElement.outerHTML;
};

const createLoginUrl = (
  cognitoHostedDomain: string,
  cognitoClientId: string,
  frontendApiHost: string,
  apiStage: string
) => {
  return `https://${cognitoHostedDomain}/login
            ?response_type=code
            &client_id=${cognitoClientId}
            &redirect_uri=https%3A%2F%2F${frontendApiHost}%2F${apiStage}%2Fauth%2Fcallback
            &scope=openid+email+profile`.trim();
};

const createLogoutUrl = (
  cognitoHostedDomain: string,
  cognitoClientId: string,
  frontendApiHost: string,
  apiStage: string
) => {
  return `https://${cognitoHostedDomain}/logout
            ?client_id=${cognitoClientId}
            &logout_uri=https%3A%2F%2F${frontendApiHost}%2F${apiStage}%2Fauth%2Flogout`.trim();
};

let cachedHtml: string | null = null;
export const handler = async (event: APIGatewayEvent) => {
  if (!cachedHtml) {
    const filePath = join(__dirname, "public", "index.html");
    cachedHtml = readFileSync(filePath, "utf8");
  }

  console.log(JSON.stringify(event, null, 2));

  const cognitoHostedDomain = process.env.COGNITO_HOSTED_UI_DOMAIN || "";
  const cognitoClientId = process.env.COGNITO_CLIENT_ID || "";
  const host =
    event.headers?.["x-forwarded-host"] ?? event.headers?.["host"] ?? "";
  const stage = event.requestContext?.stage ?? "staging";

  const env = {
    HOSTED_UI_LOGIN_URL: createLoginUrl(
      cognitoHostedDomain,
      cognitoClientId,
      host,
      stage
    ),
    HOSTED_UI_LOGOUT_URL: createLogoutUrl(
      cognitoHostedDomain,
      cognitoClientId,
      host,
      stage
    ),
  };

  try {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: embedData(env, cachedHtml),
      isBase64Encoded: true,
    };
  } catch {
    return {
      statusCode: 404,
      body: "File not found",
    };
  }
};
