export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const fixture_id = String(body.fixture_id || "").trim();
    const result = String(body.result || "").trim().toLowerCase();

    const allowedResults = ["home", "draw", "away"];

    if (!fixture_id) {
      return Response.json(
        { error: "Fixture is required." },
        { status: 400 }
      );
    }

    if (!allowedResults.includes(result)) {
      return Response.json(
        { error: "Invalid result." },
        { status: 400 }
      );
    }

    const fixture = await context.env.DB
      .prepare(`
        SELECT id, home_team, away_team, status
        FROM fixtures
        WHERE id = ?
      `)
      .bind(fixture_id)
      .first();

    if (!fixture) {
      return Response.json(
        { error: "Fixture not found." },
        { status: 404 }
      );
    }

    await context.env.DB
      .prepare(`
        UPDATE fixtures
        SET result = ?, status = 'finished'
        WHERE id = ?
      `)
      .bind(result, fixture_id)
      .run();

    return Response.json({
      success: true,
      fixture: {
        id: fixture.id,
        home_team: fixture.home_team,
        away_team: fixture.away_team,
        result,
        status: "finished"
      }
    });

  } catch (error) {
    console.error("Result update error:", error);

    return Response.json(
      { error: "Unable to update fixture result." },
      { status: 500 }
    );
  }
}
