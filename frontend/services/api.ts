// ⚠️ Cambia esta IP si tu red cambia. Tu IP actual: ipconfig (Windows) o ifconfig (Mac/Linux)
export const API_URL = `http://192.168.100.3:6969`;

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
