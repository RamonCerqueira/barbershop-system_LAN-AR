const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { Client } = require('pg');
require('./register-ts.cjs');
if(process.argv.includes('--http'))process.env.RUN_HTTP_TESTS='true';
try { process.loadEnvFile('.env'); } catch {}
const source = new URL(process.env.TEST_DATABASE_ADMIN_URL || process.env.DATABASE_URL);
if (!['localhost','127.0.0.1','[::1]'].includes(source.hostname)) throw Error('Use um PostgreSQL local para o teste descartável.');
const name = 'barberpro_test_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
const admin = new Client({ connectionString: source.toString() });
const testUrl = new URL(source);
testUrl.pathname = '/' + name;
process.env.DATABASE_URL = testUrl.toString();
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
const results = [];
let db;
async function check(name,fn) { await fn(); results.push({ name, status: 'PASSED' }); console.log('PASS ' + name); }
async function main() {
  await admin.connect();
  await admin.query('CREATE DATABASE "' + name + '"');
  const sql = new Client({ connectionString: testUrl.toString() });
  await sql.connect();
  try {
    for (const dir of fs.readdirSync('prisma/migrations').filter(f=>/^\d/.test(f)).sort()) await sql.query(fs.readFileSync(path.join('prisma/migrations',dir,'migration.sql'),'utf8'));
  } finally { await sql.end(); }
  db = require('../src/lib/prisma.ts').prisma;
  const { createBooking,updateBooking } = require('../src/lib/bookings.ts');
  const { registerSale,transitionSale } = require('../src/lib/sales.ts');
  const { companyInput,passwordInput } = require('../src/lib/validation.ts');
  const auth = require('../src/lib/auth.ts');
  const { NextRequest } = require('next/server');
  const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0,10);
  const hours = Object.fromEntries(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d=>[d,{isOpen:true,openTime:'08:00',closeTime:'20:00',breakStart:'12:00',breakEnd:'13:00'}]));
  async function company(suffix) {
    return db.company.create({ data: { name: suffix, email: suffix + '@example.invalid', cpf: suffix, fullName: suffix, birthDate: new Date('1990-01-01'), address: 'Audit address', phone: '5511999999999', plan: 'MONTHLY', planPrice: 10, settings: { create: { businessHours: hours, appointmentConfig: {slotDuration:30,advanceBookingDays:30} } } } });
  }
  const a = await company('tenant-a'), b = await company('tenant-b');
  const signupData = { name:'Barbearia Cadastro Teste', email:'signup@example.invalid', cpf:'52998224725', fullName:'Pessoa Teste', birthDate:'1990-01-01', address:'Rua Teste, 10 - Centro, São Paulo/SP', phone:'5511999999999', plan:'MONTHLY', password:'Barber88!' };
  await check('password requires eight characters, a letter, a number and a special character',async()=>{
    assert.equal(passwordInput.safeParse('Barber88!').success,true);
    for(const invalid of ['Barb8!x','barberxx!','Barber888','12345678!']) assert.equal(passwordInput.safeParse(invalid).success,false,invalid);
  });
  await check('company registration requires explicit terms acceptance',async()=>{
    assert.equal(companyInput.safeParse(signupData).success,false);
    assert.equal(companyInput.safeParse({...signupData,acceptTerms:false}).success,false);
    assert.equal(companyInput.safeParse({...signupData,acceptTerms:true}).success,true);
  });
  await check('company registration accepts consent and creates the account',async()=>{
    const register=require('../src/app/api/companies/register/route.ts').POST;
    const request=new NextRequest('http://localhost/api/companies/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...signupData,acceptTerms:true})});
    const response=await register(request);
    assert.equal(response.status,201);
    assert.match(response.headers.get('set-cookie')||' /',/barberpro_token=.*HttpOnly/i);
    const body=await response.json();
    assert.equal(body.user.email,signupData.email);
    assert.equal((await db.company.findUnique({where:{id:body.companyId}})).email,signupData.email);
  });
  const user = await db.user.create({ data: {companyId:a.id,email:'admin@example.invalid',password:await auth.hashPassword('test-password-12345'),name:'Admin',role:'ADMIN'} });
  const emp = await db.employee.create({data:{companyId:a.id,name:'Barber',phone:'5511999999999',role:'BARBER',hireDate:new Date()}});
  const foreign = await db.employee.create({data:{companyId:b.id,name:'Other barber',phone:'5511999999998',role:'BARBER',hireDate:new Date()}});
  const service = await db.service.create({data:{companyId:a.id,name:'Cut',price:45,duration:60}});
  const payload = { serviceId:service.id,employeeId:emp.id,clientName:'Audit client',clientPhone:'5511988888888',date,time:'10:00' };
  let booking;
  await check('booking creates within company',async()=> { booking = await createBooking(payload,a.id,crypto.randomUUID(),true); assert.equal(booking.appointment.duration,60); });
  await check('interval overlap is refused',async()=> { await assert.rejects(createBooking({...payload,time:'10:30'},a.id,crypto.randomUUID(),true),e=>e.status===409); });
  await check('foreign employee is refused',async()=> { await assert.rejects(createBooking({...payload,employeeId:foreign.id,time:'14:00'},a.id,crypto.randomUUID(),true),e=>e.status===404); });
  await check('pause overlap is refused',async()=> { await assert.rejects(createBooking({...payload,time:'11:30'},a.id,crypto.randomUUID(),true),e=>e.status===400); });
  await check('simultaneous reservations do not duplicate',async()=> { const out=await Promise.allSettled([createBooking({...payload,time:'14:00'},a.id,crypto.randomUUID()),createBooking({...payload,time:'14:00'},a.id,crypto.randomUUID())]); assert.equal(out.filter(x=>x.status==='fulfilled').length,1); });
  await check('booking idempotency returns one entity',async()=> { const key=crypto.randomUUID(); const one=await createBooking({...payload,time:'16:00'},a.id,key);const two=await createBooking({...payload,time:'16:00'},a.id,key);assert.equal(one.appointment.id,two.appointment.id);assert.equal(two.repeated,true); });
  await check('reschedule refuses foreign employee',async()=> {await assert.rejects(updateBooking(booking.appointment.id,a.id,{employeeId:foreign.id}),e=>e.status===404);});
  await check('visit counted once; completion does not create spending',async()=> {await updateBooking(booking.appointment.id,a.id,{status:'IN_PROGRESS'});await updateBooking(booking.appointment.id,a.id,{status:'COMPLETED'});await updateBooking(booking.appointment.id,a.id,{status:'COMPLETED'});const c=await db.client.findUnique({where:{id:booking.appointment.clientId}});assert.equal(c.totalVisits,1);assert.equal(Number(c.totalSpent),0);});
  const product=await db.product.create({data:{companyId:a.id,name:'Water',price:5,stock:10,minStock:2,category:'BEVERAGES'}});
  let sale;
  await check('sale price is calculated from catalog',async()=> {sale=await registerSale({type:'PRODUCT',description:'Water sale',amount:0.01,paymentMethod:'CASH',clientId:booking.appointment.clientId,items:[{productId:product.id,quantity:2,unitPrice:0.01}]},a.id,user.id,crypto.randomUUID());assert.equal(Number(sale.sale.amount),10);assert.equal((await db.product.findUnique({where:{id:product.id}})).stock,8);});
  await check('negative quantity is refused',async()=> {await assert.rejects(registerSale({type:'PRODUCT',description:'Invalid',paymentMethod:'CASH',items:[{productId:product.id,quantity:-2}]},a.id,user.id,crypto.randomUUID()));});
  await check('sale idempotency prevents duplicate stock movement',async()=> {const key=crypto.randomUUID();const body={type:'PRODUCT',description:'Water sale',paymentMethod:'CASH',items:[{productId:product.id,quantity:1}]};const one=await registerSale(body,a.id,user.id,key);const two=await registerSale(body,a.id,user.id,key);assert.equal(one.sale.id,two.sale.id);assert.equal((await db.product.findUnique({where:{id:product.id}})).stock,7);});
  await check('stock race never oversells',async()=> {await db.product.update({where:{id:product.id},data:{stock:1}});const body={type:'PRODUCT',description:'Last unit',paymentMethod:'CASH',items:[{productId:product.id,quantity:1}]};const out=await Promise.allSettled([registerSale(body,a.id,user.id,crypto.randomUUID()),registerSale(body,a.id,user.id,crypto.randomUUID())]);assert.equal(out.filter(x=>x.status==='fulfilled').length,1);assert.equal((await db.product.findUnique({where:{id:product.id}})).stock,0);});
  await check('refund is audited and idempotent',async()=> {await transitionSale(sale.sale.id,a.id,user.id,{status:'REFUNDED',reason:'Customer returned items'});await transitionSale(sale.sale.id,a.id,user.id,{status:'REFUNDED',reason:'Repeated refund'});assert.equal((await db.product.findUnique({where:{id:product.id}})).stock,2);assert.equal(await db.auditLog.count({where:{entityId:sale.sale.id,action:'PAYMENT_REFUNDED'}}),1);});
  await check('a foreign tenant cannot refund sale',async()=> {await assert.rejects(transitionSale(sale.sale.id,b.id,user.id,{status:'REFUNDED',reason:'Attack denied'}),e=>e.status===404);});
  await check('receipt uses appointment snapshot and cannot be duplicated',async()=> {const body={type:'SERVICE',description:'Cut receipt',appointmentId:booking.appointment.id,amount:0.01,paymentMethod:'CASH'};const r=await registerSale(body,a.id,user.id,crypto.randomUUID());assert.equal(Number(r.sale.amount),45);await assert.rejects(registerSale(body,a.id,user.id,crypto.randomUUID()),e=>e.status===409);});
  await check('suspension blocks an existing session',async()=> {const token=await auth.generateToken({id:user.id,name:user.name,email:user.email,companyId:a.id,type:'COMPANY_USER',role:'ADMIN'});const req=new NextRequest('http://localhost/api/services',{headers:{cookie:'barberpro_token='+token}});assert.ok(await auth.getAuthUser(req));await db.company.update({where:{id:a.id},data:{isActive:false}});assert.equal(await auth.getAuthUser(req),null);await db.company.update({where:{id:a.id},data:{isActive:true}});});
  await check('logout revokes the server session',async()=> {const token=await auth.generateToken({id:user.id,name:user.name,email:user.email,companyId:a.id,type:'COMPANY_USER',role:'ADMIN'});const req=new NextRequest('http://localhost/api/auth/logout',{method:'POST',headers:{cookie:'barberpro_token='+token}});await require('../src/app/api/auth/logout/route.ts').POST(req);assert.equal(await auth.getAuthUser(req),null);});
  await check('seed and public history are inaccessible',async()=> {assert.equal(require('../src/app/api/seed/route.ts').GET().status,404);assert.equal(require('../src/app/api/public/appointments/route.ts').GET().status,401);});
  await check('public confirmation requires its secret token',async()=> {const req=new NextRequest('http://localhost/api/public/appointments/'+booking.appointment.id);const res=await require('../src/app/api/public/appointments/[id]/route.ts').GET(req,{params:Promise.resolve({id:booking.appointment.id})});assert.equal(res.status,404);});
  await check('unsigned token is rejected by middleware',async()=>{
    const token='fake.'+Buffer.from(JSON.stringify({type:'SYSTEM_OWNER',sessionId:'fake',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fake';
    const res=await require('../src/middleware.ts').middleware(new NextRequest('http://localhost/admin',{headers:{cookie:'barberpro_token='+token}}));
    assert.equal(res.status,307);
  });
  await check('cross-origin mutation is refused',async()=>{
    const res=await require('../src/middleware.ts').middleware(new NextRequest('http://localhost/api/sales',{method:'POST',headers:{origin:'https://invalid.example'}}));assert.equal(res.status,403);
  });
  await check('reset code is secret, single-use and revokes sessions (SMTP adapter mocked)',async()=>{
    let delivered=''; const mail=require('nodemailer'); const original=mail.createTransport;
    const host=process.env.SMTP_HOST,from=process.env.SMTP_FROM;
    mail.createTransport=()=>({sendMail:async message=>{delivered=message.text.match(/[a-f0-9]{64}/)[0]}});
    process.env.SMTP_HOST='smtp.example.invalid';process.env.SMTP_FROM='audit@example.invalid';
    try{
      const token=await auth.generateToken({id:user.id,name:user.name,email:user.email,companyId:a.id,type:'COMPANY_USER',role:'ADMIN'});
      const req=()=>new NextRequest('http://localhost/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email})});
      const response=await require('../src/app/api/auth/forgot-password/route.ts').POST(req());
      assert.equal(response.status,200);assert.equal((await response.json()).code,undefined);assert.equal(delivered.length,64);
      const reset=()=>new NextRequest('http://localhost/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,code:delivered,newPassword:'test-password-12345'})});
      assert.equal((await require('../src/app/api/auth/reset-password/route.ts').POST(reset())).status,200);
      assert.equal((await require('../src/app/api/auth/reset-password/route.ts').POST(reset())).status,400);
      assert.equal(await auth.getAuthUser(new NextRequest('http://localhost/api/services',{headers:{cookie:'barberpro_token='+token}})),null);
    }finally{mail.createTransport=original;if(host===undefined)delete process.env.SMTP_HOST;else process.env.SMTP_HOST=host;if(from===undefined)delete process.env.SMTP_FROM;else process.env.SMTP_FROM=from;}
  });
  await check('WhatsApp endpoint requires authentication and does not fake delivery',async()=>{
    const req=new NextRequest('http://localhost/api/send-whatsapp',{method:'POST',body:JSON.stringify({to:'5511999999999',message:'Audit'})});
    assert.equal((await require('../src/app/api/send-whatsapp/route.ts').POST(req)).status,401);
  });
  if(process.env.RUN_HTTP_TESTS==='true') {
    const cp=require('node:child_process'),net=require('node:net');
    const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
    const base='http://127.0.0.1:'+port;
    const child=cp.spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,APP_URL:base,NEXT_TELEMETRY_DISABLED:'1',SMTP_HOST:'',WHATSAPP_API_URL:'',WHATSAPP_API_TOKEN:''},stdio:['ignore','pipe','pipe']});
    let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
    try{
      let ready=false;
      for(let i=0;i<60;i++){try{const response=await fetch(base+'/login');if(response.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500));}
      if(!ready)throw Error('HTTP server did not start: '+logs.slice(-1500));
      let cookie='';
      const http=async(url,method='GET',body,extra={})=>fetch(base+url,{method,headers:{...(cookie?{cookie}:{}),...(method!=='GET'?{Origin:base,'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
      await check('HTTP login creates HttpOnly session; token absent from JSON',async()=>{const res=await http('/api/auth/login','POST',{email:user.email,password:'test-password-12345'});assert.equal(res.status,200);const set=res.headers.get('set-cookie');assert.match(set,/HttpOnly/i);cookie=set.split(';')[0];assert.equal((await res.json()).token,undefined);});
      await check('HTTP service list serializes Decimal as number',async()=>{const res=await http('/api/services');assert.equal(res.status,200);const list=await res.json();assert.equal(typeof list[0].price,'number');assert.equal(list[0].companyId,a.id);});
      await check('HTTP mutation enforces Origin',async()=>{const res=await http('/api/services','POST',{name:'Invalid',price:1,duration:30},{Origin:'https://evil.invalid'});assert.equal(res.status,403);});
      let created;
      await check('HTTP catalog creation and stock sale use server price',async()=>{const res=await http('/api/products','POST',{name:'HTTP water',price:5,stock:3,minStock:1,category:'BEVERAGES'});assert.equal(res.status,201);created=await res.json();const sale=await http('/api/sales','POST',{type:'PRODUCT',description:'HTTP sale',paymentMethod:'CASH',amount:0.01,items:[{productId:created.id,quantity:1,unitPrice:0.01}]});assert.equal(sale.status,201);assert.equal((await sale.json()).amount,5);assert.equal((await db.product.findUnique({where:{id:created.id}})).stock,2);});
      let publicBooking;
      await check('HTTP public booking and private confirmation flow',async()=>{const res=await http('/api/public/appointments','POST',{...payload,companyId:a.id,time:'18:00'});assert.equal(res.status,201);publicBooking=await res.json();const token=new URL(base+publicBooking.confirmationUrl).searchParams.get('token');const detail=await http('/api/public/appointments/'+publicBooking.id,'GET',undefined,{'X-Confirmation-Token':token});assert.equal(detail.status,200);const confirmed=await http('/api/public/appointments/'+publicBooking.id,'PATCH',{status:'CONFIRMED'},{'X-Confirmation-Token':token});assert.equal(confirmed.status,200);assert.equal((await confirmed.json()).status,'CONFIRMED');});
      await check('HTTP rendered dashboard and booking page are available',async()=>{assert.equal((await http('/dashboard')).status,200);assert.equal((await http('/cliente/barbearia/'+a.id)).status,200);});
      await check('HTTP serves landing hero image directly',async()=>{const image=await http('/hero-barber-banner.jpg');assert.equal(image.status,200);assert.match(image.headers.get('content-type')||'',/image\/jpeg/i);});
      await check('HTTP logout prevents reuse of the session',async()=>{assert.equal((await http('/api/auth/logout','POST',{})).status,200);assert.equal((await http('/api/services')).status,401);});
    } finally { child.kill();await new Promise(r=>child.once('exit',r)); }
  }
  console.log('INTEGRATION COMPLETE: ' + results.length + ' cases');
}
main().catch(e=> {console.error(e);results.push({name:'execution',status:'FAILED',error:e.message});process.exitCode=1;}).finally(async()=> {
  if(db)await db.$disconnect();
  if(admin._connected) {
    // Only the exact database name generated by this process can be dropped.
    if(!/^barberpro_test_\d+_[a-f0-9]{6}$/.test(name))throw Error('Unsafe cleanup target');
    await admin.query('DROP DATABASE IF EXISTS "'+name+'" WITH (FORCE)');
    await admin.end();
  }
  fs.writeFileSync('docs/producao/integracao-atual.json',JSON.stringify({at:new Date().toISOString(),database:'isolated disposable PostgreSQL database',results},null,2));
});
