/* Audit of actual route handlers with isolated adapters. Never connects to a database.
 * This is evidence about server contracts, not a browser/database E2E suite.
 * Run: node scripts/audit-production.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const results = [];
const auth = { id: 'user-a', type: 'COMPANY_USER', companyId: 'company-a', role: 'EMPLOYEE' };
const response = (body, options = {}) => ({ body, status: options.status || 200, cookies: { set() {}, delete() {} } });
function load(relative, prisma = {}, options = {}) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  const requireMock = (name) => {
    if (name === 'next/server') return { NextResponse: { json: response, next: () => response({}), redirect: (url) => response({ redirect: String(url) }, { status: 307 }) } };
    if (name.endsWith('/prisma') || name === './prisma') return { prisma };
    if (name.endsWith('/auth')) return { getAuthUser: async () => options.anonymous ? null : options.owner ? { ...auth, type: 'SYSTEM_OWNER' } : auth, hashPassword: async () => 'hashed', ...options.authExports };
    if (name === 'bcryptjs') return { hash: async () => 'hash', compare: async () => true };
    if (name === 'jsonwebtoken') return { verify: () => auth, sign: () => 'token' };
    if (name.endsWith('/seed/route')) return { runDatabaseSeed: async () => {} };
    throw new Error(`Unexpected import: ${name}`);
  };
  vm.runInNewContext(output, { exports, require: requireMock, process: { env: {} }, console: { error() {}, log() {} }, URL, atob, fetch: async () => { throw new Error('External network forbidden in audit'); } }, { filename: relative });
  return exports;
}
const request = (body = {}, query = '') => ({ json: async () => body, url: `http://audit.local/api${query}`, headers: { get: () => null }, cookies: { get: () => ({ value: 'audit-token' }) } });
const context = { params: Promise.resolve({ id: 'record-a' }) };
async function check(id, area, kind, run) {
  try { const evidence = await run(); results.push({ id, area, kind, status: 'REPRODUCED', evidence }); }
  catch (error) { results.push({ id, area, kind, status: 'AUDIT_ERROR', evidence: error.message }); }
}
async function main() {
  await check('SEC-01', 'Seed', 'FINDING', async () => {
    let updates = 0;
    const upsert = async () => { updates++; return { id: 'demo', email: 'demo', name: 'demo' }; };
    const route = load('src/app/api/seed/route.ts', { systemOwner: { upsert }, company: { upsert }, user: { upsert }, companySettings: { upsert }, service: { count: async () => 1 } });
    const res = await route.GET(); assert.equal(res.status, 200); assert.equal(updates, 4);
    return 'Anonymous GET reaches four upserts, including default password replacement.';
  });
  await check('SEC-02', 'Password recovery', 'FINDING', async () => {
    const route = load('src/app/api/auth/forgot-password/route.ts', { user: { findUnique: async () => ({ id: 'victim', companyId: 'company-a' }) }, passwordReset: { upsert: async () => ({}) }, notification: { create: async () => ({}) } });
    const res = await route.POST(request({ email: 'victim@example.invalid' })); assert.match(res.body.code, /^\d{6}$/);
    return 'Unauthenticated response contains the password reset code.';
  });
  await check('SEC-03', 'Client history', 'FINDING', async () => {
    let query;
    const route = load('src/app/api/public/appointments/route.ts', { appointment: { findMany: async (q) => { query = q; return []; } } });
    await route.GET(request()); assert.equal(Object.keys(query.where).length, 0);
    return 'GET without phone/email queries appointments with an empty where filter.';
  });
  await check('SEC-04', 'Confirmation', 'FINDING', async () => {
    let update;
    const route = load('src/app/api/public/appointments/[id]/route.ts', { appointment: { update: async (q) => { update = q; return { id: 'record-a', status: q.data.status, client: { fullName: 'Client' }, service: { name: 'Cut' }, companyId: 'company-a' }; } }, notification: { create: async () => ({}) } });
    const res = await route.PATCH(request({ status: 'CONFIRMED' }), context); assert.equal(res.status, 200); assert.equal(update.where.id, 'record-a');
    return 'An ID alone authorizes a public status change; no token or prior-state check.';
  });
  await check('BOOK-01', 'Public booking', 'FINDING', async () => {
    let conflict, created;
    const route = load('src/app/api/public/appointments/route.ts', {
      service: { findFirst: async () => ({ id: 'service-a', price: 45, duration: 60 }) },
      client: { findFirst: async () => ({ id: 'client-a', fullName: 'Client' }) },
      companySettings: { findUnique: async () => ({ appointmentConfig: {} }) },
      appointment: { findFirst: async (q) => { conflict = q; return null; }, create: async (q) => { created = q; return { id: 'new', ...q.data, company: { name: 'Shop' }, service: { name: 'Cut' }, employee: { name: 'Foreign employee' } }; } }, notification: { create: async () => ({}) }
    });
    const res = await route.POST(request({ companyId: 'company-a', serviceId: 'service-a', employeeId: 'employee-from-b', date: '2026-11-02', time: '10:30', clientName: 'Client', clientPhone: '550000000000' }));
    assert.equal(res.status, 201); assert.equal(created.data.employeeId, 'employee-from-b'); assert.equal(conflict.where.time, '10:30');
    return 'Only exact start time is queried; employee ownership is never loaded or validated.';
  });
  await check('BOOK-02', 'Rescheduling', 'FINDING', async () => {
    let data;
    const base = { id: 'record-a', date: new Date('2026-11-02T12:00:00Z'), time: '10:00', status: 'SCHEDULED', price: 45, clientId: 'client-a', serviceId: 'service-a', employeeId: 'employee-a' };
    const route = load('src/app/api/appointments/[id]/route.ts', { appointment: { findFirst: async () => base, update: async (q) => { data = q.data; return { ...base, ...q.data, client: { fullName: 'C', phone: '1' }, service: { name: 'S', duration: 30 }, employee: { name: 'E' } }; } } });
    const res = await route.PATCH(request({ employeeId: 'employee-from-b', serviceId: 'service-from-b', time: '10:30' }), context);
    assert.equal(res.status, 200); assert.equal(data.employeeId, 'employee-from-b');
    return 'Reschedule accepts foreign relation IDs without loading related entities or checking conflicts.';
  });
  await check('CASH-01', 'Stock and sale', 'FINDING', async () => {
    let decrement, amount;
    const tx = { sale: { create: async (q) => { amount = q.data.amount; return { id: 'sale-a' }; }, findUnique: async () => ({ id: 'sale-a' }) }, product: { findFirst: async () => ({ stock: 5, name: 'Product' }), update: async (q) => { decrement = q.data.stock.decrement; return { stock: 7, minStock: 0 }; } }, saleItem: { create: async () => ({}) }, notification: { create: async () => ({}) } };
    const route = load('src/app/api/sales/route.ts', { $transaction: async (fn) => fn(tx) });
    const res = await route.POST(request({ type: 'PRODUCT', amount: 1, paymentMethod: 'CASH', items: [{ productId: 'product-a', quantity: -2, unitPrice: 100 }] }));
    assert.equal(res.status, 201); assert.equal(decrement, -2); assert.equal(amount, 1);
    return 'Negative quantity reaches stock decrement; amount=1 accepted independently of item prices.';
  });
  await check('CASH-02', 'Sale removal', 'FINDING', async () => {
    let removed = false;
    const route = load('src/app/api/sales/[id]/route.ts', { sale: { findFirst: async () => ({ id: 'record-a' }), delete: async () => { removed = true; } } });
    const res = await route.DELETE(request(), context); assert.equal(res.status, 200); assert.ok(removed);
    return 'Deletion completes with only a sale.delete call; no stock, client balance or audit reversal.';
  });
  await check('MSG-01', 'WhatsApp send', 'FINDING', async () => {
    const route = load('src/app/api/send-whatsapp/route.ts', {}, { anonymous: true });
    const res = await route.POST(request({ to: '550000000000', message: 'Audit - no real delivery' }));
    assert.equal(res.body.success, true); assert.equal(res.body.status, 'DELIVERED');
    return 'Anonymous request without provider credentials returns success and DELIVERED.';
  });
  await check('AUTH-01', 'Session revocation', 'FINDING', async () => {
    const route = load('src/lib/auth.ts');
    const res = await route.getAuthUser(request()); assert.equal(res.companyId, 'company-a');
    return 'Verified payload is accepted without querying active user/company or a revocation record.';
  });
  await check('AUTH-02', 'Middleware signature', 'FINDING', async () => {
    const payload = Buffer.from(JSON.stringify({ type: 'SYSTEM_OWNER', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const route = load('src/middleware.ts');
    const res = route.middleware({ cookies: { get: () => ({ value: `fake.${payload}.fake` }) }, nextUrl: { pathname: '/admin' }, url: 'http://audit.local/admin' });
    assert.equal(res.status, 200);
    return 'Unsigned fabricated token passes the page middleware; this does not demonstrate API bypass.';
  });
  await check('SIGNUP-01', 'Company signup', 'FINDING', async () => {
    let input;
    const route = load('src/app/api/companies/register/route.ts', {}, { authExports: { createCompany: async (data) => { input = data; return { user: { id: 'u', email: data.email, name: data.fullName, role: 'ADMIN' }, company: { id: 'c', name: data.name } }; }, generateToken: () => 'token' } });
    const res = await route.POST(request({ name: 'Audit', email: 'audit@example.invalid', cpf: '11111111111', fullName: 'Audit', birthDate: '2000-01-01', address: 'Audit street', phone: '1', plan: 'MONTHLY', password: 'x' }));
    assert.equal(res.status, 201); assert.equal(input.password, 'x');
    return 'Server accepts a one-character password and CPF with invalid check digits; frontend validation is not enforced here.';
  });
  await check('SETTINGS-01', 'Settings', 'FINDING', async () => {
    let saved;
    const route = load('src/app/api/settings/route.ts', { $transaction: async (fn) => fn({ companySettings: { upsert: async (q) => { saved = q.update; return {}; } } }) });
    const res = await route.PUT(request({ businessHours: { monday: { isOpen: false } } }));
    assert.equal(res.status, 200); assert.deepEqual(JSON.parse(JSON.stringify(saved.locationConfig)), { description: '', website: '' });
    return 'Saving only business hours also replaces locationConfig with empty description/website.';
  });
  await check('MSG-02', 'Campaign dispatch', 'FINDING', async () => {
    let delivery;
    const route = load('src/app/api/whatsapp-campaigns/[id]/route.ts', { whatsAppCampaign: { findFirst: async () => ({ id: 'campaign-a', company: { name: 'Audit' }, triggerDays: 20, message: 'Hello {nome}' }), update: async () => ({ lastSent: new Date() }) }, client: { findMany: async () => [{ id: 'client-a', fullName: 'Audit', createdAt: new Date(), appointments: [] }] }, whatsAppCampaignLog: { create: async (q) => { delivery = q.data; return q.data; } } });
    const res = await route.PATCH(request({ trigger: true }), context);
    assert.equal(res.status, 200); assert.equal(delivery.status, 'DELIVERED');
    return 'A newly created client receives a DELIVERED log through fallback targeting, without any provider call.';
  });
  await check('COSTS-01', 'Service costs', 'CONTRACT', async () => {
    let lookup;
    const route = load('src/app/api/service-costs/route.ts', { service: { findFirst: async (q) => { lookup = q; return { id: 'service-a' }; } }, serviceCost: { create: async () => ({ id: 'cost-a' }) } });
    const res = await route.POST(request({ serviceId: 'service-a', itemName: 'Blade', costPerUse: 1, unit: 'unit' }));
    assert.equal(res.status, 201); assert.equal(lookup.where.companyId, 'company-a');
    return 'Service cost creation checks service ownership before writing; real margin calculation remains unverified.';
  });
  await check('NOTIFY-01', 'Notifications', 'CONTRACT', async () => {
    let filter;
    const route = load('src/app/api/notifications/route.ts', { notification: { findMany: async (q) => { filter = q.where; return []; } } });
    const res = await route.GET(request()); assert.equal(res.status, 200); assert.equal(filter.companyId, 'company-a');
    return 'Company notification listing includes the authenticated company filter.';
  });
  await check('ADMIN-01', 'System administration', 'CONTRACT', async () => {
    const route = load('src/app/api/admin/overview/route.ts');
    const res = await route.GET(request()); assert.equal(res.status, 403);
    return 'Company user is rejected with 403 by the system owner overview handler.';
  });
  await check('PUBLIC-01', 'Barbershop search', 'CONTRACT', async () => {
    let query;
    const route = load('src/app/api/public/barbershops/route.ts', { company: { findMany: async (q) => { query = q; return []; } } });
    const res = await route.GET(request({}, '?search=Audit')); assert.equal(res.status, 200); assert.equal(query.where.isActive, true); assert.equal(query.where.OR.length, 3);
    return 'Public search limits companies to active ones and searches name, address and services.';
  });
  for (const [area, entity, url, body] of [
    ['Services', 'service', 'services', { name: 'Audit', price: 45, duration: 30 }],
    ['Employees', 'employee', 'employees', { name: 'Audit', phone: '550000000000', specialties: [] }],
    ['Products', 'product', 'products', { name: 'Audit', price: 5, stock: 10 }],
    ['Clients', 'client', 'clients', { fullName: 'Audit', phone: '550000000000' }]
  ]) {
    await check(`CRUD-${url}`, area, 'CONTRACT', async () => {
      let stored;
      const route = load(`src/app/api/${url}/route.ts`, { [entity]: { create: async (q) => { stored = q.data; return { id: 'new', ...q.data }; } } });
      const res = await route.POST(request(body)); assert.equal(res.status, 201); assert.equal(stored.companyId, 'company-a');
      return 'Create handler returns 201 and injects company from authentication; database and UI not exercised.';
    });
  }
  const report = { generatedAt: new Date().toISOString(), mode: 'isolated-real-handlers-with-mocked-adapters', externalCalls: 0, databaseWrites: 0, disclaimer: 'Not E2E. REPRODUCED findings represent failures of production requirements. CONTRACT checks only confirm the isolated handler behavior.', results };
  fs.mkdirSync(path.join(root, 'docs/producao'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/producao/auditoria-handlers.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (results.some((r) => r.status === 'AUDIT_ERROR')) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
