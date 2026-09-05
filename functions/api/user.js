export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const url = new URL(request.url);
    const telegramId = url.searchParams.get("telegram_id");
    const username = url.searchParams.get("username") || "";
    const displayName = url.searchParams.get("display_name") || "";

    if (!telegramId) {
      return new Response(
        JSON.stringify({ error: "Telegram ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    let user = await env.DB
      .prepare(
        `SELECT telegram_id, username, display_name, balance
         FROM users
         WHERE telegram_id = ?`
      )
      .bind(telegramId)
      .first();

    if (!user) {
      await env.DB
        .prepare(
          `INSERT INTO users
           (telegram_id, username, display_name, balance)
           VALUES (?, ?, ?, 100000)`
        )
        .bind(telegramId, username, displayName)
        .run();

      user = await env.DB
        .prepare(
          `SELECT telegram_id, username, display_name, balance
           FROM users
           WHERE telegram_id = ?`
        )
        .bind(telegramId)
        .first();
    }

    return new Response(
      JSON.stringify({
        success: true,
        user
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Database error",
        details: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
