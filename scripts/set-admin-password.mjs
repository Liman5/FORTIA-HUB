// ============================================================
// FORTIA HUB — DÉFINIR / RÉINITIALISER UN MOT DE PASSE ADMINISTRATEUR
// ------------------------------------------------------------
// Usage :
//   node scripts/set-admin-password.mjs <email> <motdepasse>
//
// • écrit un hash bcrypt (bcryptjs) dans `admin_users.password_hash` ;
// • mot de passe : 8 caractères min., au moins une lettre et un chiffre ;
// • UNICITÉ : refuse un mot de passe déjà utilisé par un autre compte admin ;
// • ne modifie QUE la ligne correspondant à l'email indiqué.
// ============================================================
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const [emailArg, passwordArg] = process.argv.slice(2);
const email = String(emailArg || "").trim().toLowerCase();
const password = String(passwordArg || "");

if (!email || !password) {
  console.error("Usage : node scripts/set-admin-password.mjs <email> <motdepasse>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Le mot de passe doit contenir au moins 8 caractères.");
  process.exit(1);
}
if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
  console.error("Le mot de passe doit contenir au moins une lettre et un chiffre.");
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

try {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    console.error("Aucun compte administrateur avec cet email :", email);
    process.exit(1);
  }

  // UNICITÉ : aucun autre compte administrateur ne doit avoir ce mot de passe.
  const others = await prisma.adminUser.findMany({ select: { id: true, email: true, passwordHash: true } });
  for (const other of others) {
    if (other.id === admin.id) continue;
    const hash = String(other.passwordHash || "");
    if (hash.length < 20) continue;
    let samePassword = false;
    try {
      samePassword = await bcrypt.compare(password, hash);
    } catch {
      samePassword = false;
    }
    if (samePassword) {
      console.error(
        `Ce mot de passe est déjà utilisé par le compte administrateur ${other.email}. Chaque compte doit avoir un mot de passe unique.`
      );
      process.exit(1);
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.update({
    where: { email },
    data: { passwordHash, isActive: true },
  });

  console.log("Mot de passe administrateur mis à jour.");
  console.log("  email :", email);
  console.log("  role  :", admin.role);
  console.log("  hash  : bcrypt (coût 10) · unique");
} catch (error) {
  console.error("Erreur :", error?.message || String(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
