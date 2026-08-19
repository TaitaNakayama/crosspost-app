import Fastify from "fastify";
import { accountRoutes } from "./routes/accounts.js";
import { postRoutes } from "./routes/posts.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

const app = Fastify({ logger: true });

// TODO: real session auth. Until then the caller identifies itself with a header
// so the routes can be exercised end to end. This must be replaced before any
// deployment — it currently trusts the client completely.
app.decorateRequest("userId", "");
app.addHook("onRequest", async (request, reply) => {
  if (request.url === "/health") return;
  const userId = request.headers["x-user-id"];
  if (typeof userId !== "string" || userId === "") {
    return reply.code(401).send({ error: "missing x-user-id" });
  }
  request.userId = userId;
});

app.get("/health", async () => ({ ok: true }));

await app.register(accountRoutes);
await app.register(postRoutes);

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
