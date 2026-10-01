import { Client } from "@elastic/elasticsearch";
import { config } from "../config/env.js";
import { prisma } from "../prisma/client.js";

let esClient: Client | null = null;
let isEsAvailable = false;

export function getElasticsearchClient(): Client | null {
  if (esClient) return esClient;

  try {
    esClient = new Client({
      node: config.elasticsearchNode,
      requestTimeout: 2000,
      maxRetries: 1,
    });
    return esClient;
  } catch (err) {
    console.warn("Elasticsearch client init failed, DB fallback will be used.");
    return null;
  }
}

export async function initElasticsearchIndex() {
  const client = getElasticsearchClient();
  if (!client) return;

  try {
    await client.ping();
    isEsAvailable = true;
    console.log("Elasticsearch connected successfully at " + config.elasticsearchNode);

    const exists = await client.indices.exists({ index: config.elasticsearchIndex });
    if (!exists) {
      await client.indices.create({
        index: config.elasticsearchIndex,
        body: {
          mappings: {
            properties: {
              id: { type: "keyword" },
              senderEmail: { type: "keyword" },
              recipientEmail: { type: "text", fields: { keyword: { type: "keyword" } } },
              subject: { type: "text" },
              body: { type: "text" },
              status: { type: "keyword" },
              scheduledAt: { type: "date" },
              sentAt: { type: "date" },
              createdAt: { type: "date" },
              etherealPreviewUrl: { type: "keyword" },
            },
          },
        },
      });
      console.log(`Elasticsearch index '${config.elasticsearchIndex}' created.`);
    }
  } catch (error) {
    isEsAvailable = false;
    console.warn("Elasticsearch not reachable. Operating in resilient DB fallback mode.");
  }
}

export async function indexEmailInElasticsearch(email: {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  createdAt: Date;
  etherealPreviewUrl?: string | null;
}) {
  if (!isEsAvailable) return;
  const client = getElasticsearchClient();
  if (!client) return;

  try {
    await client.index({
      index: config.elasticsearchIndex,
      id: email.id,
      document: {
        id: email.id,
        senderEmail: email.senderEmail,
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt.toISOString(),
        sentAt: email.sentAt ? email.sentAt.toISOString() : null,
        createdAt: email.createdAt.toISOString(),
        etherealPreviewUrl: email.etherealPreviewUrl || null,
      },
    });
  } catch (error) {
    console.warn(`Failed to index email ${email.id} in ES:`, (error as Error).message);
  }
}

export async function searchEmails(query: string, statusFilter?: string, page = 1, limit = 20) {
  const client = getElasticsearchClient();

  if (isEsAvailable && client && query.trim().length > 0) {
    try {
      const mustClauses: any[] = [];

      mustClauses.push({
        multi_match: {
          query: query,
          fields: ["subject^3", "recipientEmail^2", "body", "senderEmail"],
          fuzziness: "AUTO",
        },
      });

      if (statusFilter && statusFilter !== "ALL") {
        mustClauses.push({ term: { status: statusFilter } });
      }

      const response = await client.search({
        index: config.elasticsearchIndex,
        from: (page - 1) * limit,
        size: limit,
        query: {
          bool: {
            must: mustClauses,
          },
        },
      });

      const hits = response.hits.hits.map((h: any) => h._source);
      const total = typeof response.hits.total === "number" ? response.hits.total : response.hits.total?.value || 0;

      return {
        source: "elasticsearch",
        total,
        page,
        limit,
        emails: hits,
      };
    } catch (err) {
      console.warn("Elasticsearch search query failed, falling back to DB search:", (err as Error).message);
    }
  }

  // Fallback: Prisma DB Search
  const where: any = {};
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter;
  }

  if (query.trim().length > 0) {
    where.OR = [
      { recipientEmail: { contains: query } },
      { subject: { contains: query } },
      { body: { contains: query } },
      { sender: { email: { contains: query } } },
    ];
  }

  const [total, records] = await Promise.all([
    prisma.emailJob.count({ where }),
    prisma.emailJob.findMany({
      where,
      include: { sender: true },
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    source: "database-fallback",
    total,
    page,
    limit,
    emails: records.map((r) => ({
      id: r.id,
      senderEmail: r.sender.email,
      senderName: r.sender.name,
      recipientEmail: r.recipientEmail,
      subject: r.subject,
      body: r.body,
      status: r.status,
      scheduledAt: r.scheduledAt,
      sentAt: r.sentAt,
      failureReason: r.failureReason,
      etherealPreviewUrl: r.etherealPreviewUrl,
      createdAt: r.createdAt,
    })),
  };
}
