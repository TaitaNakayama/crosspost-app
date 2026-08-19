import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { publicAccount } from "../serialize.js";

export async function accountRoutes(app: FastifyInstance) {
  // The composer's account picker. Every account is its own row — two X accounts
  // are two entries, not one "X" checkbox.
  app.get("/accounts", async (request) => {
    const userId = request.userId;
    const accounts = await prisma.connectedAccount.findMany({
      where: { userId },
      orderBy: [{ platform: "asc" }, { handle: "asc" }],
    });
    return accounts.map(publicAccount);
  });
}
