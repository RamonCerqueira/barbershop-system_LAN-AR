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

const name = 'barberpro_customer_test_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
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

  const account = require('../src/app/api/customer/auth/route.ts');
  const history = require('../src/app/api/customer/appointments/route.ts');
  const edit = require('../src/app/api/customer/appointments/[id]/route.ts');
  const claim = require('../src/app/api/customer/appointments/claim/route.ts');
  const favorite = require('../src/app/api/customer/favorites/route.ts');
  const review = require('../src/app/api/customer/reviews/route.ts');
  const profile = require('../src/app/api/customer/profile/route.ts');
  const recovery = require('../src/app/api/customer/recovery/route.ts');
  const avatar = require('../src/app/api/customer/avatar/route.ts');
  const gallery = require('../src/app/api/settings/photos/route.ts');
  const publicPhotos = require('../src/app/api/public/barbershops/[id]/photos/[photoId]/route.ts');
  const publicBook = require('../src/app/api/public/appointments/route.ts');
  const publicList = require('../src/app/api/public/barbershops/route.ts');
  const { CUSTOMER_COOKIE, createCustomerSession } = require('../src/lib/customer-auth.ts');
  const { logoFilePath } = require('../src/lib/company-logo.ts');
  const { createBooking, updateBooking } = require('../src/lib/bookings.ts');
  const { distanceKm, isShopOpen } = require('../src/lib/shop-discovery.ts');
  const req = (method, body, token, url='http://localhost/api/customer/auth') => new NextRequest(url,{method,headers:{...(token?{cookie:CUSTOMER_COOKIE+'='+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const date = new Date(Date.now()+3*86400000).toISOString().slice(0,10);
  const hours = Object.fromEntries(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day=>[day,{isOpen:true,openTime:'08:00',closeTime:'20:00',breakStart:'12:00',breakEnd:'13:00'}]));
  const company = await db.company.create({data:{name:'Portal Shop',email:'portal-shop@example.invalid',cpf:'portal-shop',fullName:'Owner',birthDate:new Date('1990-01-01'),address:'Rua Teste, 1',phone:'5511999999999',plan:'MONTHLY',planPrice:19,settings:{create:{businessHours:hours,appointmentConfig:{slotDuration:30,advanceBookingDays:30,cancellationDeadline:2},locationConfig:{city:'São Paulo',latitude:-23.55,longitude:-46.63}}}}});
  const employee = await db.employee.create({data:{companyId:company.id,name:'Barbeiro sem login',phone:'5511888888888',role:'BARBER',hireDate:new Date()}});
  const service = await db.service.create({data:{companyId:company.id,name:'Corte real',price:40,duration:30}});
  const old = await createBooking({clientName:'Cliente legado',clientPhone:'11977777777',serviceId:service.id,employeeId:employee.id,date,time:'08:00'},company.id,crypto.randomUUID(),true);
  let tokenA,tokenB,customerA,customerB,bookingId;
  await check('Customer registration requires consent and enforces password rules',async()=>{
    const body={action:'REGISTER',name:'Cliente Um',email:' CLIENTE1@example.invalid '.trim(),phone:'(11) 97777-7777',password:'Password123!'};
    assert.equal((await account.POST(req('POST',body))).status,400);
    assert.equal((await account.POST(req('POST',{...body,acceptTerms:true,password:'weak'}))).status,400);
    const response=await account.POST(req('POST',{...body,acceptTerms:true}));assert.equal(response.status,201);
    tokenA=response.cookies.get(CUSTOMER_COOKIE).value;customerA=(await response.json()).customer;
    assert.equal(customerA.email,'cliente1@example.invalid');assert.equal(customerA.phone,'11977777777');assert.equal(customerA.password,undefined);
    assert.notEqual((await db.customerAccount.findUnique({where:{id:customerA.id}})).password,'Password123!');
    assert.equal(await db.user.count(),0);assert.equal(await db.employee.count(),1);
    const second=await account.POST(req('POST',{action:'REGISTER',name:'Cliente Dois',email:'cliente2@example.invalid',phone:'11977777777',password:'Password123!',acceptTerms:true}));
    tokenB=second.cookies.get(CUSTOMER_COOKIE).value;customerB=(await second.json()).customer;
  });
  await check('Client sessions are separate from administrative access and never discover old cuts by phone',async()=>{
    assert.equal((await history.GET(req('GET'))).status,401);
    assert.deepEqual(await (await history.GET(req('GET',null,tokenA))).json(),[]);
    assert.equal(await auth.getAuthUser(req('GET',null,tokenA,'http://localhost/api/appointments')),null);
    const state=await (await account.GET(req('GET',null,tokenA))).json();assert.equal(state.customer.id,customerA.id);
    const session=await db.customerSession.findFirst({where:{customerId:customerA.id}});assert.notEqual(session.tokenHash,tokenA);
  });
  await check('Authenticated booking binds server identity and is idempotent',async()=>{
    const key=crypto.randomUUID(),body={companyId:company.id,serviceId:service.id,employeeId:employee.id,date,time:'09:00',clientName:'FORGED',clientPhone:'00000000000',price:0.01};
    const request=()=>new NextRequest('http://localhost/api/public/appointments',{method:'POST',headers:{cookie:CUSTOMER_COOKIE+'='+tokenA,'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)});
    const first=await publicBook.POST(request());assert.equal(first.status,201);bookingId=(await first.json()).id;
    const replay=new NextRequest('http://localhost/api/public/appointments',{method:'POST',headers:{cookie:CUSTOMER_COOKIE+'='+tokenB,'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)});assert.equal((await publicBook.POST(replay)).status,409);
    const second=await publicBook.POST(request());assert.equal(second.status,200);assert.equal((await second.json()).id,bookingId);
    const saved=await db.appointment.findUnique({where:{id:bookingId},include:{client:true}});assert.equal(saved.customerAccountId,customerA.id);assert.equal(saved.client.fullName,customerA.name);assert.equal(Number(saved.price),40);
    assert.deepEqual(await (await history.GET(req('GET',null,tokenB))).json(),[]);
    assert.equal((await (await history.GET(req('GET',null,tokenA))).json()).length,1);
  });
  await check('Portal reservations require a live customer session and enforce account ownership',async()=>{
    const body={companyId:company.id,serviceId:service.id,employeeId:employee.id,date,time:'15:00',clientName:'FORGED',clientPhone:'00000000000'};
    assert.equal((await history.POST(req('POST',body))).status,401);
    const request=()=>new NextRequest('http://localhost/api/customer/appointments',{method:'POST',headers:{cookie:CUSTOMER_COOKIE+'='+tokenA,'content-type':'application/json','idempotency-key':'customer-private-booking-123'},body:JSON.stringify(body)});
    const response=await history.POST(request());assert.equal(response.status,201);const id=(await response.json()).id;
    assert.equal((await db.appointment.findUnique({where:{id}})).customerAccountId,customerA.id);
    assert.equal((await history.POST(request())).status,200);
  });
  await check('Foreign customer cannot cancel or reschedule another booking',async()=>{
    assert.equal((await edit.PATCH(req('PATCH',{action:'CANCEL'},tokenB),{params:Promise.resolve({id:bookingId})})).status,404);
    assert.equal((await edit.PATCH(req('PATCH',{action:'RESCHEDULE',date,time:'10:00',price:0.01},tokenA),{params:Promise.resolve({id:bookingId})})).status,200);
    const saved=await db.appointment.findUnique({where:{id:bookingId}});assert.equal(saved.time,'10:00');assert.equal(Number(saved.price),40);
    assert.equal((await edit.PATCH(req('PATCH',{action:'RESCHEDULE',date,time:'10:07'},tokenA),{params:Promise.resolve({id:bookingId})})).status,400);
  });
  await check('Reviews require completed own appointment and publish genuine ratings',async()=>{
    assert.equal((await review.POST(req('POST',{appointmentId:bookingId,rating:5,comment:'Ainda não fui'},tokenA))).status,403);
    await updateBooking(bookingId,company.id,{status:'IN_PROGRESS'});await updateBooking(bookingId,company.id,{status:'COMPLETED'});
    assert.equal((await review.POST(req('POST',{appointmentId:bookingId,rating:5,comment:'Atendimento ótimo'},tokenB))).status,403);
    for(const rating of [5,4])assert.equal((await review.POST(req('POST',{appointmentId:bookingId,rating,comment:'Atendimento ótimo'},tokenA))).status,200);
    assert.equal(await db.customerReview.count(),1);
    const shops=await (await publicList.GET(req('GET',null,null,'http://localhost/api/public/barbershops'))).json();assert.equal(shops[0].reviewCount,1);assert.equal(shops[0].rating,4);
  });
  await check('Cancellation deadline enforced server-side and old private links can be claimed only once',async()=>{
    const future=await createBooking({clientName:customerA.name,clientPhone:customerA.phone,serviceId:service.id,employeeId:employee.id,date,time:'11:00'},company.id,crypto.randomUUID(),true,customerA.id);
    const soon=new Date(Date.now()+60*60000),soonDate=sub.brazilDateString(soon),soonTime=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(soon);
    await db.appointment.update({where:{id:future.appointment.id},data:{date:new Date(soonDate+'T12:00:00Z'),time:soonTime}});
    assert.equal((await edit.PATCH(req('PATCH',{action:'CANCEL'},tokenA),{params:Promise.resolve({id:future.appointment.id})})).status,409);
    assert.equal((await claim.POST(req('POST',{id:old.appointment.id,token:old.confirmationToken},tokenA))).status,200);
    assert.equal((await claim.POST(req('POST',{id:old.appointment.id,token:old.confirmationToken},tokenB))).status,404);
    assert.equal((await edit.PATCH(req('PATCH',{action:'CANCEL'},tokenA),{params:Promise.resolve({id:old.appointment.id})})).status,200);
  });
  await check('PIX instructions stop after confirmation and expired deadlines reject notices',async()=>{
    await db.companySettings.update({where:{companyId:company.id},data:{appointmentConfig:{slotDuration:30,advanceBookingDays:30,cancellationDeadline:2,requirePrepaymentToConfirm:true,pixKey:'pix-test',paymentDeadlineHours:2}}});
    const rows=await (await history.GET(req('GET',null,tokenA))).json();assert.equal(rows.find(a=>a.id===bookingId).pix,null);
    const soon=await db.appointment.findFirst({where:{customerAccountId:customerA.id,status:'SCHEDULED',date:{lt:new Date(Date.now()+86400000)}}});
    assert.equal((await edit.PATCH(req('PATCH',{action:'PAYMENT_NOTICE'},tokenA),{params:Promise.resolve({id:soon.id})})).status,409);
  });
  await check('Favorites persist across sessions, remain private and support idempotent removal',async()=>{
    for(let i=0;i<2;i++)assert.equal((await favorite.PUT(req('PUT',{companyId:company.id,favorite:true},tokenA))).status,200);
    assert.deepEqual(await (await favorite.GET(req('GET',null,tokenA))).json(),[company.id]);assert.deepEqual(await (await favorite.GET(req('GET',null,tokenB))).json(),[]);
    await favorite.PUT(req('PUT',{companyId:company.id,favorite:false},tokenA));assert.deepEqual(await (await favorite.GET(req('GET',null,tokenA))).json(),[]);
  });
  await check('Customer profile changes only linked customer records, not other people sharing phone',async()=>{
    assert.equal((await profile.PATCH(req('PATCH',{name:'Novo Nome',phone:'11966666666',id:customerB.id},tokenA))).status,200);
    assert.equal((await db.customerAccount.findUnique({where:{id:customerB.id}})).name,customerB.name);
    assert.equal((await db.client.findFirst({where:{customerAccountId:customerA.id}})).fullName,'Novo Nome');
  });
  await check('Administrative reservations follow verified client ownership and reassignment removes old access',async()=>{
    const linked=await db.client.findFirst({where:{customerAccountId:customerA.id}});
    const key=crypto.randomUUID(),body={clientId:linked.id,serviceId:service.id,employeeId:employee.id,date,time:'14:00'};
    const reservation=await createBooking(body,company.id,key);
    assert.equal(reservation.appointment.customerAccountId,customerA.id);
    assert.equal((await createBooking(body,company.id,key)).repeated,true);
    await updateBooking(reservation.appointment.id,company.id,{clientId:old.appointment.clientId});
    assert.equal((await db.appointment.findUnique({where:{id:reservation.appointment.id}})).customerAccountId,null);
    assert.equal((await edit.PATCH(req('PATCH',{action:'CANCEL'},tokenA),{params:Promise.resolve({id:reservation.appointment.id})})).status,404);
  });
  await check('Changing password requires current password and revokes customer sessions',async()=>{
    assert.equal((await profile.PATCH(req('PATCH',{name:'Novo Nome',phone:'11966666666',currentPassword:'wrong',newPassword:'Interim123!'},tokenA))).status,400);
    assert.equal((await profile.PATCH(req('PATCH',{name:'Novo Nome',phone:'11966666666',currentPassword:'Password123!',newPassword:'Interim123!'},tokenA))).status,200);
    assert.equal((await (await account.GET(req('GET',null,tokenA))).json()).customer,null);
    tokenA=await createCustomerSession(customerA.id);
  });
  await check('Discovery distance and open-now respect Sao Paulo timezone and lunch break',async()=>{
    assert.equal(distanceKm({latitude:0,longitude:0},{latitude:0,longitude:0}),0);assert.ok(Math.abs(distanceKm({latitude:0,longitude:0},{latitude:1,longitude:0})-111.19)<.1);
    const monday={monday:{isOpen:true,openTime:'09:00',closeTime:'18:00',breakStart:'12:00',breakEnd:'13:00'}};
    assert.equal(isShopOpen(monday,new Date('2026-11-23T13:00:00Z')),true);assert.equal(isShopOpen(monday,new Date('2026-11-23T15:30:00Z')),false);assert.equal(isShopOpen(monday,new Date('2026-11-23T21:00:00Z')),false);
  });
  await check('Recovery does not leak secrets, invalidates sessions, and is single-use',async()=>{
    const mail=require('../src/lib/mail.ts'),original=mail.sendRecoveryMail,configured=mail.isMailConfigured;let code;
    mail.isMailConfigured=()=>false;assert.equal((await recovery.POST(req('POST',{email:customerA.email}))).status,503);
    mail.isMailConfigured=()=>true;mail.sendRecoveryMail=async(_email,value)=>{code=value};
    try {
      const result=await recovery.POST(req('POST',{email:customerA.email}));assert.equal(result.status,200);assert.equal(JSON.stringify(await result.json()).includes(code),false);
      assert.notEqual((await db.customerPasswordReset.findFirst({where:{customerId:customerA.id}})).tokenHash,code);
      assert.equal((await recovery.PUT(req('PUT',{token:code,password:'NewPassword123!'}))).status,200);
      assert.equal((await (await account.GET(req('GET',null,tokenA))).json()).customer,null);
      assert.equal((await recovery.PUT(req('PUT',{token:code,password:'NewPassword123!'}))).status,400);
      const login=await account.POST(req('POST',{action:'LOGIN',email:customerA.email,password:'NewPassword123!'}));assert.equal(login.status,200);tokenA=login.cookies.get(CUSTOMER_COOKIE).value;
    }finally{mail.sendRecoveryMail=original;mail.isMailConfigured=configured}
  });
  await check('Avatar upload is authenticated, private, persistent and removable',async()=>{
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
    const data=new FormData();data.append('avatar',new File([png],'photo.png',{type:'image/png'}));
    const response=await avatar.POST(new NextRequest('http://localhost/api/customer/avatar',{method:'POST',headers:{cookie:CUSTOMER_COOKIE+'='+tokenA},body:data}));assert.equal(response.status,200);
    const filename=(await db.customerAccount.findUnique({where:{id:customerA.id}})).avatarPath;
    try{assert.equal((await avatar.GET(req('GET'))).status,401);assert.deepEqual(Buffer.from(await (await avatar.GET(req('GET',null,tokenA))).arrayBuffer()),png);assert.equal((await avatar.DELETE(req('DELETE',null,tokenA))).status,200);assert.equal(fs.existsSync(logoFilePath(filename,'customer')),false)}finally{fs.rmSync(logoFilePath(filename,'customer'),{force:true})}
  });
  await check('Gallery is admin-only, public images are scoped to shop, removal cleans files',async()=>{
    const adminUser=await db.user.create({data:{companyId:company.id,email:'photo-owner@example.invalid',password:'unused',name:'Owner',role:'ADMIN'}});
    const adminToken=await auth.generateToken({id:adminUser.id,email:adminUser.email,name:adminUser.name,role:'ADMIN',companyId:company.id,type:'COMPANY_USER'});
    assert.equal((await gallery.GET(req('GET',null,tokenA))).status,403);
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
    const data=new FormData();data.append('photo',new File([png],'shop.png',{type:'image/png'}));
    const response=await gallery.POST(new NextRequest('http://localhost/api/settings/photos',{method:'POST',headers:{cookie:'barberpro_token='+adminToken},body:data}));assert.equal(response.status,200);
    const photo=await db.companyPhoto.findFirst({where:{companyId:company.id}});
    try{assert.equal((await publicPhotos.GET(req('GET'),{params:Promise.resolve({id:'foreign',photoId:photo.id})})).status,404);assert.equal((await publicPhotos.GET(req('GET'),{params:Promise.resolve({id:company.id,photoId:photo.id})})).status,200);assert.equal((await gallery.DELETE(new NextRequest('http://localhost/api/settings/photos',{method:'DELETE',headers:{cookie:'barberpro_token='+adminToken,'content-type':'application/json'},body:JSON.stringify({id:photo.id})}))).status,200);assert.equal(fs.existsSync(logoFilePath(photo.filename,'gallery')),false)}finally{fs.rmSync(logoFilePath(photo.filename,'gallery'),{force:true})}
  });
  await check('Unavailable shops cannot be rescheduled online while timely cancellation remains available',async()=>{
    const reservation=await db.appointment.findFirst({where:{customerAccountId:customerA.id,status:'SCHEDULED',date:{gt:new Date(Date.now()+86400000)}}});
    await db.company.update({where:{id:company.id},data:{subscriptionStatus:'SUSPENDED'}});
    try {
      assert.equal((await edit.PATCH(req('PATCH',{action:'RESCHEDULE',date,time:'16:00'},tokenA),{params:Promise.resolve({id:reservation.id})})).status,409);
      assert.equal((await edit.PATCH(req('PATCH',{action:'CANCEL'},tokenA),{params:Promise.resolve({id:reservation.id})})).status,200);
    } finally { await db.company.update({where:{id:company.id},data:{subscriptionStatus:'TRIAL'}}); }
  });
  await check('Logout revokes customer session without creating barber access',async()=>{
    assert.equal((await account.DELETE(req('DELETE',null,tokenA))).status,200);assert.equal((await (await account.GET(req('GET',null,tokenA))).json()).customer,null);
    const user=await db.user.findFirst();assert.equal(user.role,'ADMIN');assert.equal(await db.user.count(),1);
  });
  console.log('CUSTOMER PORTAL SUITE COMPLETE: '+results.length+' cases');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (db) await db.$disconnect();
    if (admin._connected) {
      if (!/^barberpro_customer_test_\d+_[a-f0-9]{6}$/.test(name)) throw Error('Unsafe cleanup target');
      await admin.query('DROP DATABASE IF EXISTS "' + name + '" WITH (FORCE)');
      await admin.end();
    }
  });
