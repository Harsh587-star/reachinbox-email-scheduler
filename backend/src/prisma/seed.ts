import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ReachInbox Database...");

  // Seed Default Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: "demo.reviewer@reachinbox.ai" },
    update: {},
    create: {
      email: "demo.reviewer@reachinbox.ai",
      name: "Alex Reviewer",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    },
  });

  // Seed Multiple Senders (to test multi-sender & per-sender rate limits)
  const sender1 = await prisma.sender.upsert({
    where: { email: "outreach@reachinbox.ai" },
    update: {},
    create: {
      name: "ReachInbox Growth Team",
      email: "outreach@reachinbox.ai",
      hourlyLimit: 10, // low limit to easily test rate limit alerts
      isActive: true,
    },
  });

  const sender2 = await prisma.sender.upsert({
    where: { email: "founders@reachinbox.ai" },
    update: {},
    create: {
      name: "Outbox Labs Founders",
      email: "founders@reachinbox.ai",
      hourlyLimit: 50,
      isActive: true,
    },
  });

  const sender3 = await prisma.sender.upsert({
    where: { email: "sales@reachinbox.ai" },
    update: {},
    create: {
      name: "Enterprise Sales",
      email: "sales@reachinbox.ai",
      hourlyLimit: 100,
      isActive: true,
    },
  });

  // Seed Slack Integration default
  await prisma.slackIntegration.upsert({
    where: { id: "default-slack" },
    update: {},
    create: {
      id: "default-slack",
      channel: "#email-alerts",
      teamName: "ReachInbox Team",
      isConnected: false,
    },
  });

  console.log("Database seeded successfully!");
  console.log(`- Created Demo User: ${demoUser.email}`);
  console.log(`- Created Senders: ${sender1.email}, ${sender2.email}, ${sender3.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
