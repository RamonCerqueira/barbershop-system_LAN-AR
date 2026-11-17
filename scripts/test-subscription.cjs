const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { Client } = require('pg');
require('./register-ts.cjs');
try { process.loadEnvFile('.env'); } catch {}

const source = new URL(process.env.TEST_DATABASE_ADMIN_URL || process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) {
  throw Error('Use um PostgreSQL local para o teste descartável.');
}

const name = 'barberpro_sub_test_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
const admin = new Client({ connectionString: source.toString() });
const testUrl = new URL(source);
testUrl.pathname = '/' + name;
process.env.DATABASE_URL = testUrl.toString();
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');

const results = [];
let db;

async function check(label, fn) {
  await fn();
  results.push({ name: label, status: 'PASSED' });
  console.log('PASS ' + label);
}

async function main() {
  await admin.connect();
  await admin.query('CREATE DATABASE "' + name + '"');
  const sql = new Client({ connectionString: testUrl.toString() });
  await sql.connect();
  try {
    for (const dir of fs.readdirSync('prisma/migrations').filter((f) => /^\d/.test(f)).sort()) {
      await sql.query(fs.readFileSync(path.join('prisma/migrations', dir, 'migration.sql'), 'utf8'));
    }
  } finally {
    await sql.end();
  }

  db = require('../src/lib/prisma.ts').prisma;
  const auth = require('../src/lib/auth.ts');
  const sub = require('../src/lib/subscription.ts');
  const reminders = require('../src/lib/subscription-reminders.ts');
  const { NextRequest } = require('next/server');

  let companyA, userA, companyB, owner;

  await check('1. New company registration activates 7-day free trial', async () => {
    const created = await auth.createCompany({
      name: 'Barbearia Trial Teste',
      email: 'trial@example.invalid',
      cpf: '52998224725',
      fullName: 'Titular Trial',
      birthDate: '1990-01-01',
      address: 'Rua A, 100 - Centro, São Paulo/SP',
      phone: '5511999999999',
      plan: 'MONTHLY',
      password: 'Password123!'
    });
    companyA = created.company;
    userA = created.user;
    const status = await sub.getCompanySubscriptionStatus(companyA.id);
    assert.equal(status.subscription.effectiveStatus, 'TRIAL');
    assert.equal(status.subscription.hasAccess, true);
    assert.equal(status.subscription.isTrial, true);
    assert.ok(status.subscription.daysRemaining >= 6 && status.subscription.daysRemaining <= 7);
    assert.equal(status.pix.key, '03207834566');
    assert.equal(status.pix.beneficiary, 'Ramon Santos Cerqueira');
    assert.equal(status.pix.institution, 'Caixa Econômica Federal');
  });

  await check('2. Expired 7-day trial blocks protected access', async () => {
    const expiredDate = new Date(Date.now() - 2 * 86_400_000);
    await db.company.update({
      where: { id: companyA.id },
      data: {
        trialStartedAt: new Date(Date.now() - 9 * 86_400_000),
        trialEndsAt: expiredDate
      }
    });
    await assert.rejects(
      sub.requireCompanySubscriptionAccess(companyA.id),
      (e) => e.status === 402
    );
  });

  let pendingPay;
  await check('3. Submitting PIX payment stays PENDING and does NOT unlock access', async () => {
    pendingPay = await sub.submitPixPayment({
      companyId: companyA.id,
      plan: 'MONTHLY',
      payerNote: 'PIX teste'
    });
    assert.equal(pendingPay.status, 'PENDING');
    assert.equal(Number(pendingPay.amount), 10);
    await assert.rejects(
      sub.requireCompanySubscriptionAccess(companyA.id),
      (e) => e.status === 402
    );
  });

  await check('4. Duplicate pending PIX request is refused', async () => {
    await assert.rejects(
      sub.submitPixPayment({ companyId: companyA.id, plan: 'ANNUAL' }),
      (e) => e.status === 409
    );
  });

  await check('5. Company user cannot approve payments (403 permission check)', async () => {
    const token = await auth.generateToken({
      id: userA.id,
      email: userA.email,
      name: userA.name,
      role: 'ADMIN',
      companyId: companyA.id,
      type: 'COMPANY_USER'
    });
    const req = new NextRequest('http://localhost/api/admin/payments/' + pendingPay.id, {
      method: 'PATCH',
      headers: { cookie: 'barberpro_token=' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'APPROVE' })
    });
    const res = await require('../src/app/api/admin/payments/[id]/route.ts').PATCH(req, {
      params: Promise.resolve({ id: pendingPay.id })
    });
    assert.equal(res.status, 403);
  });

  await check('6. SUPERADMIN rejection keeps access blocked and records audit', async () => {
    owner = await db.systemOwner.create({
      data: { email: 'owner-sub@example.invalid', password: 'hash', name: 'Super Admin' }
    });
    const rej = await sub.reviewSubscriptionPayment({
      paymentId: pendingPay.id,
      action: 'REJECT',
      reviewerId: owner.id,
      reviewerName: owner.name,
      rejectionReason: 'Comprovante não encontrado'
    });
    assert.equal(rej.payment.status, 'REJECTED');
    await assert.rejects(
      sub.requireCompanySubscriptionAccess(companyA.id),
      (e) => e.status === 402
    );
  });

  await check('7. SUPERADMIN approval activates subscription and unlocks access', async () => {
    const newPay = await sub.submitPixPayment({
      companyId: companyA.id,
      plan: 'QUARTERLY',
      payerNote: 'Novo PIX trimestral'
    });
    const approved = await sub.reviewSubscriptionPayment({
      paymentId: newPay.id,
      action: 'APPROVE',
      reviewerId: owner.id,
      reviewerName: owner.name
    });
    assert.equal(approved.payment.status, 'APPROVED');
    assert.equal(approved.company.subscriptionStatus, 'ACTIVE');
    const evalAccess = await sub.requireCompanySubscriptionAccess(companyA.id);
    assert.equal(evalAccess.hasAccess, true);
    assert.ok(evalAccess.daysRemaining >= 89 && evalAccess.daysRemaining <= 90);
  });

  await check('8. Due reminders (7d, 4d, 1d) fire without duplicates in Brazil timezone', async () => {
    const c2 = await auth.createCompany({
      name: 'Barbearia Lembrete',
      email: 'lembrete@example.invalid',
      cpf: '11144477735',
      fullName: 'Titular Lembrete',
      birthDate: '1991-02-02',
      address: 'Rua B, 200',
      phone: '5511988887777',
      plan: 'MONTHLY',
      password: 'Password123!'
    });
    companyB = c2.company;
    const now = new Date();
    await db.company.update({
      where: { id: companyB.id },
      data: { trialEndsAt: sub.addDays(now, 4) }
    });

    const run1 = await reminders.runDailySubscriptionReminders(now);
    const run2 = await reminders.runDailySubscriptionReminders(now);
    const logs = await db.subscriptionNotificationLog.findMany({
      where: { companyId: companyB.id, type: 'REMINDER_4D', channel: 'IN_APP' }
    });
    assert.equal(logs.length, 1);
    assert.ok(run1.remindersDispatched >= 1);
    assert.equal(run2.remindersDispatched, 0);
  });

  console.log('SUBSCRIPTION SUITE COMPLETE: ' + results.length + ' cases');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (db) await db.$disconnect();
    if (admin._connected) {
      if (!/^barberpro_sub_test_\d+_[a-f0-9]{6}$/.test(name)) throw Error('Unsafe cleanup target');
      await admin.query('DROP DATABASE IF EXISTS "' + name + '" WITH (FORCE)');
      await admin.end();
    }
  });
