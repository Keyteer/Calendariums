export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://localhost:6969`;

export async function apiGet(path: string) {
  try {
    console.log(`[API] GET ${API_URL}${path}`);
    const res = await fetch(`${API_URL}${path}`);
    const data = await res.json();
    console.log(`[API] Response:`, data);
    return data;
  } catch (error) {
    console.error(`[API] Error in GET ${path}:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function apiPost(path: string, body: any) {
  try {
    console.log(`[API] POST ${API_URL}${path}`, body);
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log(`[API] Response:`, data);
    return data;
  } catch (error) {
    console.error(`[API] Error in POST ${path}:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
