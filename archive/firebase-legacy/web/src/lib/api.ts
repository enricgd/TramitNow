import { User } from "firebase/auth";

const BASE = "https://us-central1-tramitnow-development.cloudfunctions.net";

// Llama a una Cloud Function (onRequest) con el token de Firebase Auth.
// Lanza Error con el mensaje del backend si la respuesta no es 2xx.
export async function callApi<T = unknown>(
  user: User,
  endpoint: string,
  body?: unknown
): Promise<T> {
  const firebaseToken = await user.getIdToken();

  const res = await fetch(`${BASE}/${endpoint}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${firebaseToken}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    throw new ApiError(data.error || "Sesión expirada", 401);
  }
  if (!res.ok) throw new ApiError(data.error || "Error en la petición", res.status);
  return data as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
