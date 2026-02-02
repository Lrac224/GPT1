export async function POST(req) {
  const { symbol } = await req.json();

  const apiKey = process.env.CHARTEXCHANGE_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "missing_api_key" }, { status: 500 });
  }

const url =
  `https://chartexchange.com/api/v1/data/options/chain/` +
  `?symbol=${symbol}&format=json&api_key=${apiKey}`;
  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();

  return Response.json({
    status: r.status,
    raw: text.slice(0, 500)
  });
}

    const data = await r.json();

    return NextResponse.json({
      symbol,
      chainSummary: data
    });

  } catch (err) {
    return NextResponse.json(
      { error: "server_error", detail: err.message },
      { status: 500 }
    );
  }
}
