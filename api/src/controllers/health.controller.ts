export const healthController = {
  async check() {
    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  },
};
