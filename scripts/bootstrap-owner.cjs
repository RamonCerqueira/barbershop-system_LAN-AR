const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
try { process.loadEnvFile('.env'); } catch { /* VPS may inject environment directly. */ }
const db = new PrismaClient();
async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password || password.length < 12 || password.length > 72) throw Error('Configure OWNER_EMAIL e OWNER_PASSWORD com 12 a 72 caracteres.');
  const existing = await db.systemOwner.findUnique({ where: { email } });
  if (existing) throw Error('Proprietário já existe. Use recuperação de senha; bootstrap não redefine contas.');
  await db.systemOwner.create({ data: { email, password: await bcrypt.hash(password,12), name: process.env.OWNER_NAME || 'Proprietário' } });
  console.log('Proprietário criado. Remova OWNER_PASSWORD do ambiente após o bootstrap.');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
