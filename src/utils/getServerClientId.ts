const SERVER_CLIENT_ID_KEY = "dorder_server_client_id";

export const getServerClientId = () => {
  const existing = localStorage.getItem(SERVER_CLIENT_ID_KEY);
  if (existing) return existing;

  const newId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(SERVER_CLIENT_ID_KEY, newId);
  return newId;
};
