export const handler = async (event: any) => {
  const d = process.env.COGNITO_DOMAIN!;
  const c = process.env.COGNITO_CLIENT_ID!;
  const u = process.env.APP_BASE_URL!;
  return {
    statusCode: 302,
    headers: {
      Location: `${d}/logout?client_id=${encodeURIComponent(
        c
      )}&logout_uri=${encodeURIComponent(u)}`,
    },
    body: "",
  };
};
