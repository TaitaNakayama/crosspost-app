import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

interface CreatePostBody {
  caption: string;
  connectedAccountIds: string[];
  scheduledAt?: string;
}

export async function postRoutes(app: FastifyInstance) {
  // One composed Post fans out into one PostTarget per selected account.
  app.post<{ Body: CreatePostBody }>("/posts", async (request, reply) => {
    const userId = request.userId;
    const { caption, connectedAccountIds, scheduledAt } = request.body ?? {};

    if (typeof caption !== "string" || caption.trim() === "") {
      return reply.code(400).send({ error: "caption is required" });
    }
    if (!Array.isArray(connectedAccountIds) || connectedAccountIds.length === 0) {
      return reply.code(400).send({ error: "at least one account must be selected" });
    }

    // Only the caller's own accounts, and only ones that can actually publish.
    const ids = [...new Set(connectedAccountIds)];
    const accounts = await prisma.connectedAccount.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true, status: true },
    });

    if (accounts.length !== ids.length) {
      return reply.code(400).send({ error: "one or more accounts were not found" });
    }
    const unusable = accounts.filter((a) => a.status !== "active");
    if (unusable.length > 0) {
      return reply.code(409).send({
        error: "one or more accounts need to be reconnected",
        accountIds: unusable.map((a) => a.id),
      });
    }

    const post = await prisma.post.create({
      data: {
        userId,
        caption,
        status: "queued",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        targets: {
          create: accounts.map((a) => ({ connectedAccountId: a.id })),
        },
      },
      include: { targets: true },
    });

    return reply.code(201).send(post);
  });

  // Per-target status. The UI reports success and failure per account, never
  // as a single rolled-up result.
  app.get<{ Params: { id: string } }>("/posts/:id", async (request, reply) => {
    const post = await prisma.post.findFirst({
      where: { id: request.params.id, userId: request.userId },
      include: {
        targets: {
          include: {
            connectedAccount: {
              select: { id: true, platform: true, handle: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!post) return reply.code(404).send({ error: "post not found" });
    return post;
  });
}
