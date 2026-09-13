export async function onRequestGet(context) {
  try {
    const adminKey = context.request.headers.get("x-admin-key");

    if (!adminKey || adminKey !== context.env.ADMIN_KEY) {
      return Response.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const result = await context.env.DB.prepare(`
      SELECT
        b.id AS bet_id,
        b.telegram_id,
        u.username,
        u.display_name,
        b.created_at,
        bs.fixture_id,
        bs.selection,
        bs.odds,
        f.home_team,
        f.away_team,
        f.league,
        f.kickoff,
        f.status AS fixture_status,
        f.result
      FROM bets b
      LEFT JOIN users u
        ON u.telegram_id = b.telegram_id
      LEFT JOIN bet_selections bs
        ON bs.bet_id = b.id
      LEFT JOIN fixtures f
        ON f.id = bs.fixture_id
      ORDER BY b.created_at DESC, bs.id ASC
    `).all();

    const rows = result.results || [];
    const grouped = new Map();

    for (const row of rows) {
      if (!grouped.has(row.bet_id)) {
        grouped.set(row.bet_id, {
          id: row.bet_id,
          telegram_id: row.telegram_id,
          username: row.username || "",
          display_name: row.display_name || "Guest",
          created_at: row.created_at,
          selections: []
        });
      }

      grouped.get(row.bet_id).selections.push({
        fixture_id: row.fixture_id,
        selection: row.selection,
        odds: row.odds,
        home_team: row.home_team,
        away_team: row.away_team,
        league: row.league,
        kickoff: row.kickoff,
        fixture_status: row.fixture_status,
        result: row.result
      });
    }

    const bets = Array.from(grouped.values()).map(bet => {
      const complete =
        bet.selections.length > 0 &&
        bet.selections.every(s => s.result);

      const won =
        complete &&
        bet.selections.every(s => s.result === s.selection);

      const status = complete
        ? (won ? "won" : "lost")
        : "open";

      return {
        ...bet,
        status
      };
    });

    return Response.json({
      success: true,
      bets
    });

  } catch (error) {
    console.error("Admin bets list error:", error);

    return Response.json(
      { error: "Unable to load recorded bets." },
      { status: 500 }
    );
  }
}
