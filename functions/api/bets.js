export async function onRequest(context) {
  const { request, env } = context;

  try {
    if (request.method !== "POST") {
      return json({
        error: "Method not allowed"
      }, 405);
    }

    const body = await request.json();

    const telegramId = String(body.telegram_id || "");
    const stake = Number(body.stake);
    const selections = body.selections || [];

    if (!telegramId) {
      return json({
        error: "Telegram ID is required"
      }, 400);
    }

    if (!Number.isFinite(stake) || stake <= 0) {
      return json({
        error: "Invalid stake"
      }, 400);
    }

    if (!Array.isArray(selections) || selections.length === 0) {
      return json({
        error: "No selections provided"
      }, 400);
    }

    // Get user
    const user = await env.DB
      .prepare(
        `SELECT telegram_id, balance
         FROM users
         WHERE telegram_id = ?`
      )
      .bind(telegramId)
      .first();

    if (!user) {
      return json({
        error: "User not found"
      }, 404);
    }

    // Check balance
    if (stake > Number(user.balance)) {
      return json({
        error: "Insufficient demo balance"
      }, 400);
    }

    // Calculate combined odds
    let totalOdds = 1;

    for (const selection of selections) {
      const odds = Number(selection.odds);

      if (!Number.isFinite(odds) || odds <= 0) {
        return json({
          error: "Invalid odds"
        }, 400);
      }

      totalOdds *= odds;
    }

    totalOdds = Number(totalOdds.toFixed(2));

    const potentialReturn =
      Math.floor(stake * totalOdds);

    // Generate bet ID
    const betId =
      "DB" +
      Date.now() +
      Math.floor(Math.random() * 1000);

    // Deduct stake
    const newBalance =
      Number(user.balance) - stake;

    await env.DB
      .prepare(
        `UPDATE users
         SET balance = ?
         WHERE telegram_id = ?`
      )
      .bind(
        newBalance,
        telegramId
      )
      .run();

    // Save bet
    await env.DB
      .prepare(
        `INSERT INTO bets
         (id,
          telegram_id,
          stake,
          total_odds,
          potential_return,
          status)
         VALUES (?, ?, ?, ?, ?, 'open')`
      )
      .bind(
        betId,
        telegramId,
        Math.floor(stake),
        totalOdds,
        potentialReturn
      )
      .run();

    // Save selections
    for (const selection of selections) {

      await env.DB
        .prepare(
          `INSERT INTO bet_selections
           (bet_id,
            fixture_id,
            selection,
            odds)
           VALUES (?, ?, ?, ?)`
        )
        .bind(
          betId,
          String(selection.fixture_id),
          String(selection.selection),
          Number(selection.odds)
        )
        .run();

    }

    return json({
      success: true,
      bet: {
        id: betId,
        stake: Math.floor(stake),
        total_odds: totalOdds,
        potential_return: potentialReturn,
        status: "open"
      },
      balance: newBalance
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
