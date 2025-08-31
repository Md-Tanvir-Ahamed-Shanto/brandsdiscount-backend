import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  try {
    execSync("npx prisma generate");
    console.log("✅ Prisma Client regenerated at runtime");
  } catch (err) {
    console.error("❌ Prisma generate failed", err);
  }
}

const prisma = new PrismaClient();
export default prisma;
