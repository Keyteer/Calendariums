export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://localhost:6969`;

export async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
