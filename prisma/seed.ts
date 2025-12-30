import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  UserRole,
  AIDraftStatus,
} from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { env } from "prisma/config";

const connectionString = env("DATABASE_URL");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedUsers() {
  const defaultPassword = "Admin123!";
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);

  const users = [
    {
      email: "admin@ambitful.ai",
      name: "System Administrator",
      password: hashedPassword,
      role: "ADMIN" as UserRole,
      isEmailVerified: true,
    },
    {
      email: "moderator@ambitful.ai",
      name: "Content Moderator",
      password: hashedPassword,
      role: "MODERATOR" as UserRole,
      isEmailVerified: true,
    },
  ];

  for (const userData of users) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: userData,
      });
      console.log(`Created user: ${userData.email}`);
    }
  }

  const totalUsers = await prisma.user.count();
  console.log(`Total users: ${totalUsers}`);
}

async function seedOpportunityTypes() {
  const opportunityTypes = [
    { name: "General" },
    { name: "Job" },
    { name: "Internship" },
    { name: "Fellowship" },
    { name: "Scholarship" },
    { name: "Grant" },
    { name: "Volunteer" },
    { name: "Competition" },
    { name: "Workshop" },
    { name: "Mentorship" },
    { name: "Exchange Program" },
    { name: "Residency" },
    { name: "Accelerator" },
  ];

  for (const typeData of opportunityTypes) {
    const existingType = await prisma.opportunityType.findUnique({
      where: { name: typeData.name },
    });

    if (!existingType) {
      await prisma.opportunityType.create({
        data: typeData,
      });
      console.log(`Created type: ${typeData.name}`);
    }
  }

  const totalTypes = await prisma.opportunityType.count();
  console.log(`Total opportunity types: ${totalTypes}`);
}

async function seedCrawlSources() {
  const crawlSources = [
    {
      name: "Indeed",
      url: "https://www.indeed.com",
      isActive: true,
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/jobs",
      isActive: true,
    },
    {
      name: "Glassdoor",
      url: "https://www.glassdoor.com",
      isActive: true,
    },
  ];

  for (const sourceData of crawlSources) {
    const existingSource = await prisma.crawlSource.findFirst({
      where: { name: sourceData.name },
    });

    if (!existingSource) {
      await prisma.crawlSource.create({
        data: sourceData,
      });
      console.log(`Created crawl source: ${sourceData.name}`);
    }
  }

  const totalSources = await prisma.crawlSource.count();
  console.log(`Total crawl sources: ${totalSources}`);
}

async function seedAIDrafts() {
  // Get the first crawl source
  const crawlSource = await prisma.crawlSource.findFirst();

  if (!crawlSource) {
    console.log("⚠️  No crawl source found. Skipping AI drafts seeding.");
    return;
  }

  const aiDrafts = [
    {
      title: "Software Engineering Internship at Google",
      organization: "Google",
      description:
        "Join our team as a Software Engineering Intern and work on cutting-edge projects that impact billions of users worldwide.",
      requirements: [
        "Currently pursuing a BS/MS in Computer Science or related field",
        "Strong programming skills in Java, C++, or Python",
        "Understanding of data structures and algorithms",
      ],
      benefits: [
        "Competitive salary",
        "Health insurance",
        "Free meals",
        "Gym membership",
      ],
      compensation: "$8,000/month",
      compensationType: "stipend",
      locations: ["Mountain View, CA", "New York, NY"],
      isRemote: false,
      deadline: new Date("2025-03-31"),
      applicationUrl: "https://careers.google.com/jobs/results/123456/",
      contactEmail: "recruiting@google.com",
      experienceLevel: "internship",
      duration: "12 weeks",
      eligibility: [
        "Must be enrolled in a university",
        "Work authorization required",
      ],
      crawlSourceId: crawlSource.id,
      sourceUrl: "https://careers.google.com/jobs/results/123456/",
      status: AIDraftStatus.PENDING,
    },
    {
      title: "Data Science Fellowship at Microsoft",
      organization: "Microsoft",
      description:
        "Work alongside world-class researchers and engineers to solve complex data problems using machine learning and AI.",
      requirements: [
        "MS or PhD in Computer Science, Statistics, or related field",
        "Experience with Python, R, or similar languages",
        "Strong background in machine learning",
      ],
      benefits: [
        "Competitive compensation",
        "Relocation assistance",
        "Professional development",
      ],
      compensation: "$120,000/year",
      compensationType: "salary",
      locations: ["Redmond, WA", "Remote"],
      isRemote: true,
      deadline: new Date("2025-04-15"),
      applicationUrl: "https://careers.microsoft.com/us/en/job/1234567",
      contactEmail: "careers@microsoft.com",
      experienceLevel: "mid",
      duration: "1 year",
      eligibility: ["Advanced degree required", "US work authorization"],
      crawlSourceId: crawlSource.id,
      sourceUrl: "https://careers.microsoft.com/us/en/job/1234567",
      status: AIDraftStatus.PENDING,
    },
    {
      title: "UX Design Internship at Meta",
      organization: "Meta",
      description:
        "Design innovative user experiences for products used by billions of people around the world.",
      requirements: [
        "Currently pursuing a degree in Design, HCI, or related field",
        "Portfolio demonstrating UX design skills",
        "Proficiency in Figma or Sketch",
      ],
      benefits: [
        "Competitive pay",
        "Housing stipend",
        "Networking opportunities",
      ],
      compensation: "$7,500/month",
      compensationType: "stipend",
      locations: ["Menlo Park, CA"],
      isRemote: false,
      deadline: new Date("2025-02-28"),
      applicationUrl: "https://www.metacareers.com/jobs/123456789",
      contactEmail: "recruiting@meta.com",
      experienceLevel: "internship",
      duration: "12 weeks",
      eligibility: ["Must be a current student", "Portfolio required"],
      crawlSourceId: crawlSource.id,
      sourceUrl: "https://www.metacareers.com/jobs/123456789",
      status: AIDraftStatus.PENDING,
    },
  ];

  for (const draftData of aiDrafts) {
    // Check if draft already exists by title and organization
    const existingDraft = await prisma.aIDraft.findFirst({
      where: {
        title: draftData.title,
        organization: draftData.organization,
      },
    });

    if (!existingDraft) {
      await prisma.aIDraft.create({
        data: draftData,
      });
      console.log(`Created AI draft: ${draftData.title}`);
    }
  }

  const totalDrafts = await prisma.aIDraft.count();
  console.log(`Total AI drafts: ${totalDrafts}`);
}

async function main() {
  console.log("🌱 Starting database seeding...");

  try {
    await seedUsers();
    await seedOpportunityTypes();
    await seedCrawlSources();
    await seedAIDrafts();
    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
