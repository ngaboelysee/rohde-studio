// One-off probe: find the correct Supabase pooler region for this project.
import { PrismaClient } from "@prisma/client";

const REF = "ycyeaqjiphoxwmtieqjj";
const PW = process.argv[2] ?? "";
const REGIONS = [
  "aws-0-us-east-1", "aws-0-us-east-2", "aws-0-us-west-1", "aws-0-us-west-2",
  "aws-0-eu-west-1", "aws-0-eu-west-2", "aws-0-eu-west-3", "aws-0-eu-central-1",
  "aws-0-eu-north-1", "aws-0-ap-southeast-1", "aws-0-ap-southeast-2",
  "aws-0-ap-northeast-1", "aws-0-ap-south-1", "aws-0-sa-east-1",
  "aws-1-us-east-1", "aws-1-us-east-2", "aws-1-eu-central-1", "aws-1-eu-west-2",
];

async function probe(region) {
  const url = `postgresql://postgres.${REF}:${PW}@${region}.pooler.supabase.com:6543/postgres?sslmode=require&connect_timeout=5&pool_timeout=5&connection_limit=3`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

for (const region of REGIONS) {
  process.stdout.write(`probing ${region}... `);
  const ok = await probe(region);
  console.log(ok ? "OK ✔" : "fail");
  if (ok) {
    console.log(`FOUND_REGION=${region}`);
    process.exit(0);
  }
}
console.log("NO_MATCH");
