export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const telegram_id = String(body.telegram_id || "").trim();
    const selections = Array.isArray(body.selections) ? body.selections : [];

    if (!telegram_id) {
      return Response.json(
        { error: "Telegram user is required." },
        { status: 400 }
      );
    }

    if (!selections.length) {
      return Response.json(
        { error: "No selections were provided." },
        { status: 400 }
      );
    }

    const allowedSelections = ["home", "draw", "away"];

    // Check every fixture against the database.
    const checkedSelections = [];

    for (const item of selections) {
      const fixture_id = String(item.fixture_id || "").trim();
      const selection = String(item.selection || "").trim().toLowerCase();

      if (!fixture_id || !allowedSelections.includes(selection)) {
        return Response.json(
          { error: "Invalid bet selection." },
          { status: 400 }
        );
      }

      const fixture = await context.env.DB
        .prepare(`
          SELECT id, home_team, away_team, status,
                 home_odds, draw_odds, away_odds
          FROM fixtures
          WHERE id = ?
        `)
        .bind(fixture_id)
        .first();

      if (!fixture) {
        return Response.json(
          { error: `Fixture ${fixture_id} was not found.` },
          { status: 400 }
        );
      }

      if (fixture.status !== "open") {
        return Response.json(
          { error: `${fixture.home_team} vs ${fixture.away_team} is not open.` },
          { status: 400 }
        );
      }

      let odds;

      if (selection === "home") odds = fixture.home_odds;
      if (selection === "draw") odds = fixture.draw_odds;
      if (selection === "away") odds = fixture.away_odds;

      if (odds === null || odds === undefined) {
        return Response.json(
          { error: "The selected market is unavailable." },
          { status: 400 }
        );
      }

      checkedSelections.push({
        fixture_id: fixture.id,
        selection,
        odds: Number(odds)
      });
    }

    const betId =
      "BET-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      crypto.randomUUID().slice(0, 6).toUpperCase();

    // The existing database still has old demo-money columns.
    // They are kept at zero for now and are NOT used as a balance or stake.
    await context.env.DB
      .prepare(`
        INSERT INTO bets
          (id, telegram_id, stake, total_odds, potential_return, status)
        VALUES (?, ?, 0, 0, 0, 'open')
      `)
      .bind(betId, telegram_id)
      .run();

    for (const item of checkedSelections) {
      await context.env.DB
        .prepare(`
          INSERT INTO bet_selections
            (bet_id, fixture_id, selection, odds)
          VALUES (?, ?, ?, ?)
        `)
        .bind(
          betId,
          item.fixture_id,
          item.selection,
          item.odds
        )
        .run();
    }

    return Response.json({
      success: true,
      bet: {
        id: betId,
        status: "open",
        selections: checkedSelections
      }
    });

  } catch (error) {
    console.error("Bet recording error:", error);

    return Response.json(
      { error: "Unable to record bet slip." },
      { status: 500 }
    );
  }
}
