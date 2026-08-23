import { defineConfig, env } from "prisma/config";
import { config } from "dotenv";
import path from "path";

// Charger .env.local (les variables d'environnement réelles du projet)
config({ path: path.resolve(process.cwd(), ".env.local") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});