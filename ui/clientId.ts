const generateUuid = () => {
  const randomPart = Math.random().toString(36).substring(2, 15);
  const timestampPart = Date.now().toString(36);
  return `${randomPart}-${timestampPart}`;
};

const createClientId = () => {
  const existingId = localStorage.getItem("clientId");
  if (existingId) return existingId;
  const newId = generateUuid();
  localStorage.setItem("clientId", newId);
  return newId;
};

export const clientId = {
  getId() {
    return createClientId();
  },
};
