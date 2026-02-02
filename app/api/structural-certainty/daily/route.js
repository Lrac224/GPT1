export async function POST(request) {
  const body = await request.json();
  return Response.json({ ok: true, type: "daily", body });
}
