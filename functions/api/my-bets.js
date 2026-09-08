export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const telegram_id = String(url.searchParams.get("telegram_id") || "").trim();

    if (!telegram_id) {
      return Response.json(
        { error: "Telegram user is required." },
        { status: 400 }
      );
    }

    const betsResult = await context.env.DB
      .prepare(`
        SELECT id, status, created_at
        FROM bets
        WHERE telegram_id = ?
        ORDER BY created_at DESC
      `)
      .bind(telegram_id)
      .all();

    const bets = betsResult.results || [];

    for (const bet of bets) {
      const selectionsResult = await context.env.DB
        .prepare(`
          SELECT
            bs.fixture_id,
            bs.selection,
            bs.odds,
            f.home_team,
            f.away_team,
            f.status AS fixture_status,
            f.result
          FROM bet_selections bs
          LEFT JOIN fixtures f ON f.id = bs.fixture_id
          WHERE bs.bet_id = ?
        `)
        .bind(bet.id)
        .all();

      bet.selections = selectionsResult.results || [];

      bet.selections = bet.selections.map(selection => {
        let selection_name = selection.selection;

        if (selection.selection === "home") {
          selection_name = "Home Win";
        } else if (selection.selection === "draw") {
          selection_name = "Draw";
        } else if (selection.selection === "away") {
          selection_name = "Away Win";
        }

        return {
          ...selection,
          selection_name
        };
      });
    }

    return Response.json({
      success: true,
      bets
    });

  } catch (error) {
    console.error("My Bets error:", error);

    return Response.json(
      { error: "Unable to load your bets." },
      { status: 500 }
    );
  }
}
