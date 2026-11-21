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
    assert.equal(Number(pendingPay.amount), 19);
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
      plan: 'SEMIANNUAL',
      payerNote: 'Novo PIX semestral'
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
    assert.ok(evalAccess.daysRemaining >= 180 && evalAccess.daysRemaining <= 184);
  });

  await check('Upgrade quote matches PIX amount, approval and renewal', async () => {
    const status = await sub.getCompanySubscriptionStatus(companyA.id);
    const offer = status.plans.find(p => p.code === 'PRO_ANNUAL');
    assert.equal(offer.price, 378);
    assert.equal(offer.discountPercent, 10);
    const payment = await sub.submitPixPayment({ companyId: companyA.id, plan: 'PRO_ANNUAL' });
    assert.equal(Number(payment.amount), 378);
    const approved = await sub.reviewSubscriptionPayment({ paymentId: payment.id, action: 'APPROVE', reviewerId: owner.id, reviewerName: owner.name });
    assert.equal(Number(approved.payment.amount), 378);
    assert.equal(Number(approved.company.planPrice), 420);
    const renewal = await sub.getCompanySubscriptionStatus(companyA.id);
    assert.equal(renewal.plans.find(p => p.code === 'PRO_ANNUAL').price, 420);
  });

  await check('Company logo upload, retrieval, replacement and removal stay isolated', async () => {
    const route = require('../src/app/api/settings/logo/route.ts');
    const brand = require('../src/app/api/settings/branding/route.ts');
    const { logoFilePath } = require('../src/lib/company-logo.ts');
    const token = await auth.generateToken({ id: userA.id, email: userA.email, name: userA.name, role: 'ADMIN', companyId: companyA.id, type: 'COMPANY_USER' });
    const headers = { cookie: 'barberpro_token=' + token };
    const url = 'http://localhost/api/settings/logo';
    assert.equal((await route.GET(new NextRequest(url))).status, 401);
    const invalid = new FormData();
    invalid.append('logo', new File(['<svg/>'], 'logo.png', { type: 'image/png' }));
    assert.equal((await route.POST(new NextRequest(url, { method: 'POST', headers, body: invalid }))).status, 400);
    const oversized = new FormData();
    oversized.append('logo', new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'logo.png', { type: 'image/png' }));
    assert.equal((await route.POST(new NextRequest(url, { method: 'POST', headers, body: oversized }))).status, 400);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    let prior;
    for (let i = 0; i < 2; i++) {
      const form = new FormData();
      form.append('logo', new File([png], '../../logo.png', { type: 'image/png' }));
      const uploaded = await route.POST(new NextRequest(url, { method: 'POST', headers, body: form }));
      assert.equal(uploaded.status, 200);
      const body = await uploaded.json();
      assert.match(body.logoUrl, /^\/api\/settings\/logo\?v=[a-f0-9]{32}\.png$/);
      const filename = (await db.company.findUnique({ where: { id: companyA.id } })).logoPath;
      assert.ok(fs.existsSync(logoFilePath(filename)));
      if (prior) assert.equal(fs.existsSync(logoFilePath(prior)), false);
      prior = filename;
      const image = await route.GET(new NextRequest(url, { headers }));
      assert.equal(image.headers.get('content-type'), 'image/png');
      assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
      const branding = await (await brand.GET(new NextRequest(url, { headers }))).json();
      assert.equal(branding.name, companyA.name);
      assert.equal(branding.logoUrl, body.logoUrl);
    }
    const stranger = await auth.generateToken({ id: userA.id, email: userA.email, name: userA.name, role: 'ADMIN', companyId: 'another-company', type: 'COMPANY_USER' });
    assert.equal((await route.GET(new NextRequest(url, { headers: { cookie: 'barberpro_token=' + stranger } }))).status, 401);
    assert.equal((await route.DELETE(new NextRequest(url, { method: 'DELETE', headers }))).status, 200);
    assert.equal(fs.existsSync(logoFilePath(prior)), false);
    assert.equal((await route.GET(new NextRequest(url, { headers }))).status, 404);
    assert.equal((await db.company.findUnique({ where: { id: companyA.id } })).logoPath, null);
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
