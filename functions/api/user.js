export async function onRequest(context) {
  const { request, env } = context;

  try {
    // =========================
    // GET USER
    // =========================

    if (request.method === "GET") {

      const url = new URL(request.url);

      const telegramId =
        url.searchParams.get("telegram_id");

      const username =
        url.searchParams.get("username") || "";

      const displayName =
        url.searchParams.get("display_name") || "";


      if (!telegramId) {
        return json({
          error: "Telegram ID is required"
        }, 400);
      }


      let user = await env.DB
        .prepare(
          `SELECT telegram_id,
                  username,
                  display_name,
                  balance
           FROM users
           WHERE telegram_id = ?`
        )
        .bind(telegramId)
        .first();


      if (!user) {

        await env.DB
          .prepare(
            `INSERT INTO users
             (telegram_id,
              username,
              display_name,
              balance)
             VALUES (?, ?, ?, 100000)`
          )
          .bind(
            telegramId,
            username,
            displayName
          )
          .run();


        user = await env.DB
          .prepare(
            `SELECT telegram_id,
                    username,
                    display_name,
                    balance
             FROM users
             WHERE telegram_id = ?`
          )
          .bind(telegramId)
          .first();

      }


      return json({
        success: true,
        user
      });

    }


    // =========================
    // UPDATE BALANCE
    // =========================

    if (request.method === "POST") {

      const body = await request.json();

      const telegramId =
        String(body.telegram_id || "");

      const balance =
        Number(body.balance);


      if (!telegramId) {
        return json({
          error: "Telegram ID is required"
        }, 400);
      }


      if (!Number.isFinite(balance) || balance < 0) {
        return json({
          error: "Invalid balance"
        }, 400);
      }


      await env.DB
        .prepare(
          `UPDATE users
           SET balance = ?
           WHERE telegram_id = ?`
        )
        .bind(
          Math.floor(balance),
          telegramId
        )
        .run();


      return json({
        success: true,
        balance: Math.floor(balance)
      });

    }


    return json({
      error: "Method not allowed"
    }, 405);


  } catch (error) {

    return json({
      error: "Server error",
      details: error.message
    }, 500);

  }
}


// =========================
// JSON RESPONSE HELPER
// =========================

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
