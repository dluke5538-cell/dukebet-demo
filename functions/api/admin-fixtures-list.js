export async function onRequestGet(context) {
  try {
    const adminKey = context.request.headers.get("x-admin-key");

    if (!adminKey || adminKey !== context.env.ADMIN_KEY) {
      return Response.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const result = await context.env.DB
      .prepare(`
        SELECT
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
        ORDER BY kickoff ASC
      `)
      .all();

    return Response.json({
      success: true,
      fixtures: result.results || []
    });

  } catch (error) {
    console.error("Admin fixtures list error:", error);

    return Response.json(
      { error: "Unable to load fixtures." },
      { status: 500 }
    );
  }
}
