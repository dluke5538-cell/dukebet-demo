export async function onRequest(context) {
  const { request, env } = context;

  try {
    if (request.method !== "GET") {
      return json({
        error: "Method not allowed"
      }, 405);
    }

    const url = new URL(request.url);

    const sport =
      url.searchParams.get("sport");

    let result;

    if (sport && sport !== "all") {
      result = await env.DB
        .prepare(
          `SELECT
             id,
             sport,
             league,
             home_team,
             away_team,
             kickoff,
             status,
             home_odds,
             draw_odds,
             away_odds,
             result
           FROM fixtures
           WHERE sport = ?
           ORDER BY kickoff ASC`
        )
        .bind(sport)
        .all();
    } else {
      result = await env.DB
        .prepare(
          `SELECT
             id,
             sport,
             league,
             home_team,
             away_team,
             kickoff,
             status,
             home_odds,
             draw_odds,
             away_odds,
             result
           FROM fixtures
           ORDER BY kickoff ASC`
        )
        .all();
    }

    return json({
      success: true,
      fixtures: result.results || []
    });

  } catch (error) {

    return json({
      error: "Server error",
      details: error.message
    }, 500);

  }
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
