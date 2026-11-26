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
  async function submitPayment(params) {
    const company=await db.company.findUniqueOrThrow({where:{id:params.companyId}});
    const actor=await db.user.findFirstOrThrow({where:{companyId:params.companyId,role:'ADMIN'}});
    const document=require('../src/lib/contracts.ts').commercialContract(company,params.plan,actor);
    return sub.submitPixPayment({...params,legalAcceptance:{accepted:true,hash:document.hash,version:document.version,actor}});
  }


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
    pendingPay = await submitPayment({
      companyId: companyA.id,
      plan: 'MONTHLY',
      payerNote: 'PIX teste'
    });
    assert.equal(pendingPay.status, 'PENDING');
    assert.equal(Number(pendingPay.amount), 89.9);
    await assert.rejects(
      sub.requireCompanySubscriptionAccess(companyA.id),
      (e) => e.status === 402
    );
  });

  await check('4. Duplicate pending PIX request is refused', async () => {
    await assert.rejects(
      submitPayment({ companyId: companyA.id, plan: 'ANNUAL' }),
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
    const newPay = await submitPayment({
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
    assert.equal(offer.price, 1192.48);
    assert.equal(offer.discountPercent, 10);
    const payment = await submitPayment({ companyId: companyA.id, plan: 'PRO_ANNUAL' });
    assert.equal(Number(payment.amount), 1192.48);
    const approved = await sub.reviewSubscriptionPayment({ paymentId: payment.id, action: 'APPROVE', reviewerId: owner.id, reviewerName: owner.name });
    assert.equal(Number(approved.payment.amount), 1192.48);
    assert.equal(Number(approved.company.planPrice), 1192.48);
    const renewal = await sub.getCompanySubscriptionStatus(companyA.id);
    assert.equal(renewal.plans.find(p => p.code === 'PRO_ANNUAL').price, 1324.98);
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


  const entitlement = require('../src/lib/entitlements.ts');
  const plans = require('../src/lib/plans.ts');
  const paidUntil = new Date(Date.now()+30*86400000);
  let tokenC, companyC, userC;
  await check('Trial exposes Elite management but denies WhatsApp and campaigns',async()=>{
    const created = await auth.createCompany({name:'Entitlements',email:'caps@example.invalid',cpf:'39053344705',fullName:'Admin Caps',birthDate:'1990-01-01',address:'Rua C, 10',phone:'5511977776666',plan:'MONTHLY',password:'Password123!'});
    companyC=created.company;userC=created.user;
    await entitlement.requirePlanFeature(companyC.id,'analytics');
    await assert.rejects(entitlement.requirePlanFeature(companyC.id,'whatsapp'),e=>e.status===403);
    assert.equal((await sub.getCompanySubscriptionStatus(companyC.id)).entitlements.professionals,10);
    await db.company.update({where:{id:companyC.id},data:{trialEndsAt:null}});
    await db.employee.createMany({data:[1,2].map(i=>({companyId:companyC.id,name:'Trial compat '+i,phone:'5511999999999',role:'BARBER',hireDate:new Date(),isActive:true}))});
    await db.$transaction(async tx=>{await entitlement.lockCompany(tx,companyC.id);await entitlement.assertProfessionalCapacity(tx,companyC.id)});
    await db.employee.deleteMany({where:{companyId:companyC.id,name:{startsWith:'Trial compat '}}});
    await db.company.update({where:{id:companyC.id},data:{trialEndsAt:created.company.trialEndsAt}});

    tokenC=await auth.generateToken({id:userC.id,email:userC.email,name:userC.name,role:'ADMIN',companyId:companyC.id,type:'COMPANY_USER'});
    await db.company.update({where:{id:companyC.id},data:{subscriptionStatus:'ACTIVE',subscriptionStartedAt:new Date(),currentPeriodEnd:paidUntil,plan:'MONTHLY'}});
  });
  const reqC=(path,method='GET',body)=>new NextRequest('http://localhost'+path,{method,headers:{cookie:'barberpro_token='+tokenC,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  await check('Direct APIs enforce tier features and tenant authentication',async()=>{
    for (const [path,file] of [['/api/products','products'],['/api/sales','sales'],['/api/commissions','commissions'],['/api/service-costs','service-costs'],['/api/whatsapp-campaigns','whatsapp-campaigns']]) {
      assert.equal((await require('../src/app/api/'+file+'/route.ts').GET(reqC(path))).status,403,path);
    }
    assert.equal((await require('../src/app/api/products/route.ts').GET(reqC('/api/%70roducts'))).status,403);
    await db.company.update({where:{id:companyC.id},data:{plan:'PRO_MONTHLY'}});
    assert.equal((await require('../src/app/api/products/route.ts').GET(reqC('/api/products'))).status,200);
    assert.equal((await require('../src/app/api/service-costs/route.ts').GET(reqC('/api/service-costs'))).status,403);
    assert.equal((await require('../src/app/api/whatsapp-campaigns/route.ts').GET(reqC('/api/whatsapp-campaigns'))).status,403);
    await db.company.update({where:{id:companyC.id},data:{plan:'ELITE_MONTHLY'}});
    assert.equal((await require('../src/app/api/service-costs/route.ts').GET(reqC('/api/service-costs'))).status,200);
    await db.company.update({where:{id:companyC.id},data:{plan:'MONTHLY'}});
  });
  await check('Concurrent professional creation and reactivation respect cap; admin records excluded',async()=>{
    const route=require('../src/app/api/employees/route.ts');
    const body=i=>({name:'Profissional '+i,phone:'5511999999999',role:'BARBER',isActive:true});
    const responses=await Promise.all([1,2,3].map(i=>route.POST(reqC('/api/employees','POST',body(i)))));
    assert.deepEqual(responses.map(r=>r.status).sort(),[201,201,409]);
    const defaultRole={...body(5)};delete defaultRole.role;
    assert.equal((await route.POST(reqC('/api/employees','POST',defaultRole))).status,409);
    assert.equal((await route.POST(reqC('/api/employees','POST',{...body(4),role:'ADMIN'}))).status,201);
    const inactive=await db.employee.create({data:{companyId:companyC.id,name:'Inativo',phone:'5511999999999',role:'MASSAGE',isActive:false,hireDate:new Date()}});
    const item=require('../src/app/api/employees/[id]/route.ts');
    assert.equal((await item.PUT(reqC('/api/employees/'+inactive.id,'PUT',{isActive:true}),{params:Promise.resolve({id:inactive.id})})).status,409);
    await db.company.update({where:{id:companyC.id},data:{currentPeriodEnd:new Date(Date.now()-86400000)}});
    const active=await db.employee.findFirst({where:{companyId:companyC.id,role:'BARBER',isActive:true}});
    assert.equal((await item.PUT(reqC('/api/employees/'+active.id,'PUT',{isActive:false}),{params:Promise.resolve({id:active.id})})).status,200);
    assert.equal((await route.GET(reqC('/api/employees'))).status,200);
    const anotherActive=await db.employee.findFirst({where:{companyId:companyC.id,role:'BARBER',isActive:true}});
    assert.equal((await item.DELETE(reqC('/api/employees/'+anotherActive.id,'DELETE'),{params:Promise.resolve({id:anotherActive.id})})).status,200);
    await db.company.update({where:{id:companyC.id},data:{currentPeriodEnd:paidUntil,subscriptionStatus:'ACTIVE'}});
  });
  await check('Admin add-ons unlock capacity and enter next PIX with immutable payment snapshot',async()=>{
    const route=require('../src/app/api/admin/companies/[id]/route.ts');
    const ownerToken=await auth.generateToken({id:owner.id,email:owner.email,name:owner.name,type:'SYSTEM_OWNER'});
    const patch=async(value,token=ownerToken)=>route.PATCH(new NextRequest('http://localhost/api/admin/companies/'+companyC.id,{method:'PATCH',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({additionalProfessionals:value})}),{params:Promise.resolve({id:companyC.id})});
    assert.equal((await route.PATCH(reqC('/api/admin/companies/'+companyC.id,'PATCH',{additionalProfessionals:1}),{params:Promise.resolve({id:companyC.id})})).status,403);
    for(const value of [-1,1.5,'1',1001]) assert.equal((await patch(value)).status,400);
    assert.equal((await patch(1)).status,200);
    assert.equal((await sub.getCompanySubscriptionStatus(companyC.id)).professionalCapacity,3);
    const employees=require('../src/app/api/employees/route.ts');
    for(let i=0;i<3;i++) assert.equal((await employees.POST(reqC('/api/employees','POST',{name:'Adicional '+i,phone:'5511999999999',role:'BARBER',isActive:true}))).status,201);
    assert.equal((await employees.POST(reqC('/api/employees','POST',{name:'Excedente',phone:'5511999999999',role:'BARBER',isActive:true}))).status,409);
    assert.equal((await patch(0)).status,409);
    const payment=await submitPayment({companyId:companyC.id,plan:'MONTHLY'});
    assert.equal(Number(payment.amount),109.8);
    assert.equal(Number(payment.additionalAmount),19.9);
    assert.equal(payment.additionalProfessionals,1);
    assert.equal((await patch(2)).status,409);
    const approved=await sub.reviewSubscriptionPayment({paymentId:payment.id,action:'APPROVE',reviewerId:owner.id,reviewerName:owner.name});
    assert.equal(approved.company.additionalProfessionals,1);
    assert.equal(sub.evaluateCompanySubscription(approved.company).hasAccess,true);
    await db.employee.updateMany({where:{companyId:companyC.id},data:{isActive:false}});
    assert.equal((await patch(0)).status,200);
    assert.equal(Number((await db.subscriptionPayment.findUniqueOrThrow({where:{id:payment.id}})).amount),109.8);
    await db.company.update({where:{id:companyC.id},data:{currentPeriodEnd:paidUntil}});
  });
  await check('Paid downgrade remains scheduled, locks capacity and activates on renewal',async()=>{
    await db.company.update({where:{id:companyC.id},data:{plan:'ELITE_MONTHLY'}});
    const payment=await submitPayment({companyId:companyC.id,plan:'MONTHLY'});
    const approved=await sub.reviewSubscriptionPayment({paymentId:payment.id,action:'APPROVE',reviewerId:owner.id,reviewerName:owner.name});
    assert.equal(approved.company.plan,'ELITE_MONTHLY');
    assert.equal(approved.company.pendingPlan,'MONTHLY');
    assert.equal(approved.company.pendingPlanStartsAt.toISOString(),paidUntil.toISOString());
    assert.equal(sub.evaluateCompanySubscription(approved.company,new Date(paidUntil.getTime()-1)).plan,'ELITE_MONTHLY');
    assert.equal(sub.evaluateCompanySubscription(approved.company,paidUntil).plan,'MONTHLY');
    await assert.rejects(submitPayment({companyId:companyC.id,plan:'PRO_MONTHLY'}),e=>e.status===409);
    await db.company.update({where:{id:companyC.id},data:{pendingPlanStartsAt:new Date(Date.now()-1000)}});
    assert.equal((await sub.requireCompanySubscriptionAccess(companyC.id)).plan,'MONTHLY');
    assert.equal((await db.company.findUnique({where:{id:companyC.id}})).pendingPlan,null);
    assert.equal(Number(approved.payment.baseAmount),89.9);
    assert.equal(approved.payment.discountPercent,0);
    await assert.rejects(sub.reviewSubscriptionPayment({paymentId:payment.id,action:'APPROVE',reviewerId:owner.id,reviewerName:owner.name}),e=>e.status===409);
  });
  await check('Evolution isolates tenant instances, validates consent, counts quota and never retries uncertain sends',async()=>{
    await db.company.update({where:{id:companyC.id},data:{plan:'PRO_MONTHLY'}});
    const evo=require('../src/lib/evolution.ts');
    const messages=require('../src/lib/messages.ts');
    const client=await db.client.create({data:{companyId:companyC.id,fullName:'Cliente consentido',phone:'5511999999999',whatsappConsent:true}});
    const instance=evo.evolutionInstance(companyC.id);
    await db.whatsAppConnection.create({data:{companyId:companyC.id,instanceName:instance}});
    assert.notEqual(instance,evo.evolutionInstance(companyA.id));
    await assert.rejects(messages.queueMessage(companyC.id,client.phone,'Teste','no-consent'),e=>e.status===400);
    const originalFetch=global.fetch;
    const saved=Object.fromEntries(['EVOLUTION_API_URL','EVOLUTION_API_KEY','EVOLUTION_WEBHOOK_SECRET','APP_URL'].map(k=>[k,process.env[k]]));
    Object.assign(process.env,{EVOLUTION_API_URL:'http://127.0.0.1:8088',EVOLUTION_API_KEY:'test-only',EVOLUTION_WEBHOOK_SECRET:'test-webhook',APP_URL:'https://example.invalid'});
    let sends=0,timeout=false;
    global.fetch=async(url,options)=>{
      assert.equal(new URL(url).hostname,'127.0.0.1');
      assert.equal(options.headers.apikey,'test-only');
      if(String(url).includes('/connectionState/')) return Response.json({instance:{state:'open'}});
      sends++;
      if(timeout)throw new Error('timeout-after-acceptance');
      return Response.json({key:{id:'provider-'+sends}});
    };
    try {
      const job=await messages.queueMessage(companyC.id,client.phone,'Teste autorizado','tenant-one',undefined,client.id);
      await messages.processMessages();
      const sent=await db.outboundMessage.findUnique({where:{id:job.id}});
      assert.equal(sent.status,'SENT');assert.ok(sent.acceptedAt);assert.equal(await evo.whatsappUsage(companyC.id),1);
      const duplicate=await messages.queueMessage(companyC.id,client.phone,'Teste autorizado','tenant-one',undefined,client.id);
      assert.equal(duplicate.id,job.id);
      timeout=true;
      const uncertain=await messages.queueMessage(companyC.id,client.phone,'Teste incerto','tenant-two',undefined,client.id);
      await messages.processMessages();await messages.processMessages();
      assert.equal((await db.outboundMessage.findUnique({where:{id:uncertain.id}})).status,'UNKNOWN');
      assert.equal(sends,2);assert.equal(await evo.whatsappUsage(companyC.id),2);
      await db.outboundMessage.createMany({data:Array.from({length:2998},(_,i)=>({companyId:companyC.id,instanceName:instance,to:client.phone,message:'Cota de teste',dedupKey:'quota-'+companyC.id+'-'+i,status:'SENT',acceptedAt:new Date(),quotaMonth:evo.quotaMonth()}))});
      const paused=await messages.queueMessage(companyC.id,client.phone,'Sem excedente','tenant-three',undefined,client.id);
      await messages.processMessages();assert.equal(sends,2);
      assert.equal((await db.outboundMessage.findUnique({where:{id:paused.id}})).status,'QUEUED');
      assert.equal(await db.notification.count({where:{companyId:companyC.id,title:'Cota de WhatsApp atingida'}}),1);
      const webhook=require('../src/app/api/webhooks/evolution/route.ts');
      const event={event:'messages.update',instance,data:{keyId:sent.providerId,status:'READ'}};
      const request=(secret,payload)=>new NextRequest('https://example.invalid/api/webhooks/evolution',{method:'POST',headers:{'x-evolution-secret':secret,'Content-Type':'application/json'},body:JSON.stringify(payload)});
      assert.equal((await webhook.POST(request('wrong',event))).status,401);
      assert.equal((await webhook.POST(request('test-webhook',{...event,instance:evo.evolutionInstance(companyA.id)}))).status,404);
      assert.equal((await webhook.POST(request('test-webhook',event))).status,200);
      assert.equal((await db.outboundMessage.findUnique({where:{id:job.id}})).status,'READ');
      await webhook.POST(request('test-webhook',{...event,data:{keyId:sent.providerId,status:'DELIVERY_ACK'}}));
      assert.equal((await db.outboundMessage.findUnique({where:{id:job.id}})).status,'READ');
    } finally { global.fetch=originalFetch;for(const [k,v] of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v} }
  });

  await check('Contract preview and payment require explicit current consent; receipts stay private and immutable',async()=>{
    const contracts=require('../src/app/api/contracts/route.ts');
    const payRoute=require('../src/app/api/subscription/payments/route.ts');
    const download=require('../src/app/api/contracts/[id]/route.ts');
    const previewResponse=await contracts.GET(reqC('/api/contracts?plan=ELITE_MONTHLY'));
    assert.equal(previewResponse.status,200);
    const preview=await previewResponse.json();assert.equal(preview.kind,'UPGRADE');
    const body={plan:'ELITE_MONTHLY',contractHash:preview.hash,contractVersion:preview.version};
    assert.equal((await payRoute.POST(reqC('/api/subscription/payments','POST',body))).status,400);
    assert.equal((await payRoute.POST(reqC('/api/subscription/payments','POST',{...body,acceptContract:true,contractHash:'0'.repeat(64)}))).status,409);
    assert.equal(await db.subscriptionPayment.count({where:{companyId:companyC.id,status:'PENDING'}}),0);
    const response=await payRoute.POST(reqC('/api/subscription/payments','POST',{...body,acceptContract:true}));
    assert.equal(response.status,201);
    const payment=(await response.json()).payment;
    const acceptance=await db.contractAcceptance.findUnique({where:{paymentId:payment.id}});
    assert.equal(acceptance.content,preview.content);assert.equal(acceptance.documentHash,preview.hash);assert.equal(acceptance.actorId,userC.id);
    assert.equal(Number(acceptance.amount),159.9);
    const list=await contracts.GET(reqC('/api/contracts'));assert.equal((await list.json()).some(d=>d.id===acceptance.id),true);
    const aToken=await auth.generateToken({id:userA.id,email:userA.email,name:userA.name,role:'ADMIN',companyId:companyA.id,type:'COMPANY_USER'});
    const foreign=new NextRequest('http://localhost/api/contracts/'+acceptance.id,{headers:{cookie:'barberpro_token='+aToken}});
    assert.equal((await download.GET(foreign,{params:Promise.resolve({id:acceptance.id})})).status,404);
    const own=await download.GET(reqC('/api/contracts/'+acceptance.id+'?download=true'),{params:Promise.resolve({id:acceptance.id})});
    assert.equal(own.status,200);assert.equal(await own.text(),preview.content);
    assert.match(own.headers.get('cache-control'),/no-store/);
    await sub.reviewSubscriptionPayment({paymentId:payment.id,action:'APPROVE',reviewerId:owner.id,reviewerName:owner.name});
    const unchanged=await db.contractAcceptance.findUnique({where:{id:acceptance.id}});assert.equal(unchanged.content,preview.content);
    assert.equal(require('../src/lib/contracts.ts').commercialContract(await db.company.findUnique({where:{id:companyC.id}}),'MONTHLY',userC).kind,'DOWNGRADE');
    const adminToken=await auth.generateToken({id:owner.id,email:owner.email,name:owner.name,type:'SYSTEM_OWNER'});
    const ownerRequest=new NextRequest('http://localhost/api/contracts/'+acceptance.id,{headers:{cookie:'barberpro_token='+adminToken}});
    assert.equal((await download.GET(ownerRequest,{params:Promise.resolve({id:acceptance.id})})).status,200);
  });

  await check('Unified login selects the panel from verified credentials and ignores a requested role',async()=>{
    const route=require('../src/app/api/auth/login/route.ts');
    const request=body=>new NextRequest('http://localhost/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const companyResponse=await route.POST(request({email:userC.email.toUpperCase(),password:'Password123!',type:'SYSTEM_OWNER',loginType:'admin'}));
    assert.equal(companyResponse.status,200);
    const companyBody=await companyResponse.json();assert.equal(companyBody.user.type,'COMPANY_USER');assert.equal(companyBody.redirectTo,'/dashboard');
    await db.systemOwner.update({where:{id:owner.id},data:{password:await auth.hashPassword('OwnerTest123!')}});
    const ownerResponse=await route.POST(request({email:owner.email,password:'OwnerTest123!'}));
    assert.equal(ownerResponse.status,200);
    const ownerBody=await ownerResponse.json();assert.equal(ownerBody.user.type,'SYSTEM_OWNER');assert.equal(ownerBody.redirectTo,'/admin');
    const denied=await route.POST(request({email:owner.email,password:'invalid-password'}));assert.equal(denied.status,401);
    const deniedBody=await denied.json();assert.equal(deniedBody.user,undefined);assert.equal(deniedBody.redirectTo,undefined);
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
