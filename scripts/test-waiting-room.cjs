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

const name = 'barberpro_board_test_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
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
  const { NextRequest } = require('next/server');

  const board = require('../src/app/api/waiting-room/route.ts');
  const publicRoute = require('../src/app/api/painel/[token]/route.ts');
  const publicLogo = require('../src/app/api/painel/[token]/logo/route.ts');
  const profileRoute = require('../src/app/api/profile/route.ts');
  const avatarRoute = require('../src/app/api/profile/avatar/route.ts');
  const { publicBoard, boardAppointments } = require('../src/lib/waiting-room.ts');
  const { updateBooking } = require('../src/lib/bookings.ts');
  const { logoFilePath } = require('../src/lib/company-logo.ts');
  const today = sub.brazilDateString();
  const tomorrow = new Date(Date.parse(today + 'T12:00:00Z') + 86400000).toISOString().slice(0,10);
  const createCompany = suffix => db.company.create({ data: { name: 'Barbearia ' + suffix, email: suffix + '@example.invalid', cpf: suffix, fullName: suffix, birthDate: new Date('1990-01-01'), address: 'Rua Teste, 10', phone: '5511999999999', plan: 'MONTHLY', planPrice: 19 } });
  const a = await createCompany('board-a'), b = await createCompany('board-b');
  const password = await auth.hashPassword('Password123!');
  const adminUser = await db.user.create({ data: { companyId: a.id, name: 'Admin Original', email: 'admin-board@example.invalid', password, role: 'ADMIN' } });
  const manager = await db.user.create({ data: { companyId: a.id, name: 'Gestor', email: 'manager-board@example.invalid', password, role: 'MANAGER' } });
  const employeeUser = await db.user.create({ data: { companyId: a.id, name: 'Sem Acesso', email: 'employee-board@example.invalid', password, role: 'EMPLOYEE' } });
  const tokenFor = user => auth.generateToken({ id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId, type: 'COMPANY_USER' });
  const adminToken = await tokenFor(adminUser), managerToken = await tokenFor(manager), employeeToken = await tokenFor(employeeUser);
  const otherSession = await tokenFor(adminUser);
  const request = (method, body, token = adminToken, url = 'http://localhost/api/waiting-room') => new NextRequest(url, { method, headers: { ...(token ? { cookie: 'barberpro_token=' + token } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const fixture = async (company, suffix) => {
    const employee = await db.employee.create({ data: { companyId: company.id, name: 'Profissional ' + suffix, phone: '5511888888888', role: 'BARBER', hireDate: new Date() } });
    const service = await db.service.create({ data: { companyId: company.id, name: 'Corte Teste', price: 50, duration: 30 } });
    const client = await db.client.create({ data: { companyId: company.id, fullName: 'Maria Silva Segredo ' + suffix, phone: '5511777777777', email: suffix + '@client.invalid', notes: 'DADO PRIVADO' } });
    return { employee, service, client };
  };
  const fa = await fixture(a, 'A'), fb = await fixture(b, 'B');
  const makeApt = (company, f, status, time, date = today) => db.appointment.create({ data: { companyId: company.id, employeeId: f.employee.id, serviceId: f.service.id, clientId: f.client.id, date: new Date(date + 'T12:00:00Z'), time, duration: 30, status, price: 50, notes: 'DADO PRIVADO' } });
  const current = await makeApt(a, fa, 'IN_PROGRESS', '09:00');
  const next = await makeApt(a, fa, 'CONFIRMED', '10:00');
  const second = await makeApt(a, fa, 'SCHEDULED', '11:00');
  const completed = await makeApt(a, fa, 'COMPLETED', '12:00');
  await makeApt(a, fa, 'CANCELLED', '13:00');
  await makeApt(a, fa, 'NO_SHOW', '14:00');
  const future = await makeApt(a, fa, 'CONFIRMED', '15:00', tomorrow);
  const foreign = await makeApt(b, fb, 'CONFIRMED', '08:00');
  let token;
  const readPublic = (value = token) => publicRoute.GET(new NextRequest('http://localhost/api/painel/' + value), { params: Promise.resolve({ token: value }) });

  await check('Private controls require an authenticated management account', async () => {
    assert.equal((await board.GET(request('GET', null, null))).status, 401);
    assert.equal((await board.GET(request('GET', null, employeeToken))).status, 401);
    assert.equal((await profileRoute.GET(request('GET', null, employeeToken))).status, 401);
    assert.equal((await readPublic('a'.repeat(64))).status, 404);
  });
  await check('Only admin activates panel; no professional accounts are created', async () => {
    const count = await db.user.count();
    assert.equal((await board.PUT(request('PUT', { action: 'ENABLE' }, managerToken))).status, 403);
    assert.equal((await board.PUT(request('PUT', { action: 'ENABLE' }))).status, 200);
    assert.equal(await db.user.count(), count);
    const config = await (await board.GET(request('GET'))).json();
    assert.equal(config.enabled, true);
    assert.equal(config.canConfigure, true);
    token = config.publicPath.split('/').pop();
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.equal(config.appointments.length, 3);
    assert.equal((await (await board.GET(request('GET', null, managerToken))).json()).canConfigure, false);
  });
  await check('Public display is read only and reveals only approved presentation fields', async () => {
    const res = await readPublic();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    const body = await res.json();
    assert.equal(body.companyName, a.name);
    assert.equal(body.current.length, 1);
    assert.equal(body.upcoming.length, 2);
    assert.deepEqual(body.upcoming.map(x => x.time), ['10:00', '11:00']);
    assert.equal(body.current[0].name, 'Maria A.');
    const json = JSON.stringify(body);
    for (const secret of ['Segredo', 'DADO PRIVADO', fa.client.phone, fa.client.email, fa.client.id, fb.employee.name, '12:00', '13:00', '14:00', '15:00']) assert.equal(json.includes(secret), false, secret);
    assert.deepEqual(Object.keys(body.current[0]).sort(), ['key','name','professional','service','status','time']);
  });
  await check('Dates use Sao Paulo calendar including the UTC midnight boundary', async () => {
    const appointments = await boardAppointments(a.id, new Date(tomorrow + 'T02:30:00Z'));
    assert.deepEqual(appointments.map(x => x.id), [current.id, next.id, second.id]);
  });
  await check('Calls reject foreign, completed and future bookings', async () => {
    for (const appointmentId of [foreign.id, completed.id, future.id]) assert.equal((await board.POST(request('POST', { appointmentId }))).status, 409);
    assert.equal((await board.POST(request('POST', { appointmentId: next.id }, managerToken))).status, 200);
    assert.equal((await (await readPublic()).json()).called.time, '10:00');
    await db.company.update({ where: { id: a.id }, data: { waitingRoomCalledAt: new Date(Date.now() - 181000) } });
    assert.equal((await publicBoard(token)).called, null);
  });
  await check('Cannot start a second appointment for the same professional', async () => {
    await assert.rejects(updateBooking(next.id, a.id, { status: 'IN_PROGRESS' }), e => e.status === 409);
    await updateBooking(current.id, a.id, { status: 'COMPLETED' });
    const outcomes = await Promise.allSettled([updateBooking(next.id, a.id, { status: 'IN_PROGRESS' }), updateBooking(second.id, a.id, { status: 'IN_PROGRESS' })]);
    assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal((await publicBoard(token)).current.length, 1);
    assert.equal((await publicBoard(token)).upcoming.length, 1);
  });
  await check('Rotating and disabling revoke public data and logo access', async () => {
    const old = token;
    assert.equal((await board.PUT(request('PUT', { action: 'ROTATE' }))).status, 200);
    token = (await db.company.findUnique({ where: { id: a.id } })).waitingRoomToken;
    assert.notEqual(token, old);
    assert.equal((await readPublic(old)).status, 404);
    assert.equal((await publicLogo.GET(new NextRequest('http://localhost/logo'), { params: Promise.resolve({ token: old }) })).status, 404);
    assert.equal((await readPublic()).status, 200);
    assert.equal((await board.PUT(request('PUT', { action: 'DISABLE' }))).status, 200);
    assert.equal((await readPublic()).status, 404);
    assert.equal((await board.POST(request('POST', { appointmentId: second.id }))).status, 409);
  });
  await check('Suspended subscription hides the public panel', async () => {
    await board.PUT(request('PUT', { action: 'ENABLE' }));
    await db.company.update({ where: { id: a.id }, data: { subscriptionStatus: 'SUSPENDED' } });
    assert.equal((await readPublic()).status, 404);
    await db.company.update({ where: { id: a.id }, data: { subscriptionStatus: 'TRIAL' } });
  });
  await check('Profile updates own name only, never role or another account', async () => {
    const response = await profileRoute.PATCH(request('PATCH', { name: 'Nome Atualizado', role: 'ADMIN', id: adminUser.id }, managerToken));
    assert.equal(response.status, 200);
    const person = await db.user.findUnique({ where: { id: manager.id } });
    assert.equal(person.name, 'Nome Atualizado'); assert.equal(person.role, 'MANAGER');
    assert.equal((await db.user.findUnique({ where: { id: adminUser.id } })).name, adminUser.name);
  });
  await check('Password requires current credential and revokes other sessions', async () => {
    assert.equal((await profileRoute.PATCH(request('PATCH', { name: 'Admin Novo', currentPassword: 'Wrong123!', newPassword: 'Changed123!' }))).status, 400);
    assert.equal((await profileRoute.PATCH(request('PATCH', { name: 'Admin Novo', currentPassword: 'Password123!', newPassword: 'Changed123!' }))).status, 200);
    assert.equal(await auth.getAuthUser(request('GET', null, otherSession)), null);
    assert.equal((await profileRoute.GET(request('GET'))).status, 200);
    assert.equal(await auth.verifyPassword('Changed123!', (await db.user.findUnique({ where: { id: adminUser.id } })).password), true);
  });
  await check('Profile avatar upload, authenticated retrieval and cleanup', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    const form = new FormData(); form.append('avatar', new File([png], 'avatar.png', { type: 'image/png' }));
    const response = await avatarRoute.POST(new NextRequest('http://localhost/api/profile/avatar', { method: 'POST', headers: { cookie: 'barberpro_token=' + adminToken }, body: form }));
    assert.equal(response.status, 200);
    const user = await db.user.findUnique({ where: { id: adminUser.id } });
    try {
      assert.ok(fs.existsSync(logoFilePath(user.avatarPath, 'profile')));
      assert.deepEqual(Buffer.from(await (await avatarRoute.GET(request('GET'))).arrayBuffer()), png);
      assert.equal((await avatarRoute.GET(request('GET', null, null))).status, 401);
      assert.equal((await profileRoute.GET(request('GET'))).status, 200);
      assert.equal((await avatarRoute.DELETE(request('DELETE'))).status, 200);
      assert.equal(fs.existsSync(logoFilePath(user.avatarPath, 'profile')), false);
    } finally { if (user.avatarPath) fs.rmSync(logoFilePath(user.avatarPath, 'profile'), { force: true }); }
  });
  console.log('WAITING ROOM SUITE COMPLETE: ' + results.length + ' cases');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (db) await db.$disconnect();
    if (admin._connected) {
      if (!/^barberpro_board_test_\d+_[a-f0-9]{6}$/.test(name)) throw Error('Unsafe cleanup target');
      await admin.query('DROP DATABASE IF EXISTS "' + name + '" WITH (FORCE)');
      await admin.end();
    }
  });
