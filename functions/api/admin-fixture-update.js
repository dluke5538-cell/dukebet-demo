export async function onRequestPost(context) {
  try {
    const adminKey = context.request.headers.get("x-admin-key");

    if (!adminKey || adminKey !== context.env.ADMIN_KEY) {
      return Response.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await context.request.json();

    const id = String(body.id || "").trim();
    const sport = String(body.sport || "").trim().toLowerCase();
    const league = String(body.league || "").trim();
    const home_team = String(body.home_team || "").trim();
    const away_team = String(body.away_team || "").trim();
    const kickoff = String(body.kickoff || "").trim();
    const status = String(body.status || "").trim().toLowerCase();

    const home_odds = Number(body.home_odds);
    const draw_odds = Number(body.draw_odds);
    const away_odds = Number(body.away_odds);

    const allowedStatuses = [
      "open",
      "suspended",
      "finished"
    ];

    if (
      !id ||
      !sport ||
      !home_team ||
      !away_team ||
      !kickoff
    ) {
      return Response.json(
        { error: "Required fixture information is missing." },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return Response.json(
        { error: "Invalid fixture status." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(home_odds) ||
      !Number.isFinite(draw_odds) ||
      !Number.isFinite(away_odds)
    ) {
      return Response.json(
        { error: "Invalid odds." },
        { status: 400 }
      );
    }

    const existing = await context.env.DB
      .prepare(`
        SELECT id
        FROM fixtures
        WHERE id = ?
      `)
      .bind(id)
      .first();

    if (!existing) {
      return Response.json(
        { error: "Fixture not found." },
        { status: 404 }
      );
    }

    await context.env.DB
      .prepare(`
        UPDATE fixtures
        SET
          sport = ?,
          league = ?,
          home_team = ?,
          away_team = ?,
          kickoff = ?,
          status = ?,
          home_odds = ?,
          draw_odds = ?,
          away_odds = ?
        WHERE id = ?
      `)
      .bind(
        sport,
        league,
        home_team,
        away_team,
        kickoff,
        status,
        home_odds,
        draw_odds,
        away_odds,
        id
      )
      .run();

    return Response.json({
      success: true,
      message: "Fixture updated successfully."
    });

  } catch (error) {
    console.error("Fixture update error:", error);

    return Response.json(
      { error: "Unable to update fixture." },
      { status: 500 }
    );
  }
}
