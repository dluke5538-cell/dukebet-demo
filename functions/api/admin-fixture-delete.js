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

    if (!id) {
      return Response.json(
        { error: "Fixture ID is required." },
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
        DELETE FROM fixtures
        WHERE id = ?
      `)
      .bind(id)
      .run();

    return Response.json({
      success: true,
      message: "Fixture deleted successfully."
    });

  } catch (error) {
    console.error("Fixture delete error:", error);

    return Response.json(
      { error: "Unable to delete fixture." },
      { status: 500 }
    );
  }
}
