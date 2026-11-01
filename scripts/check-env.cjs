try { process.loadEnvFile('.env'); } catch {}
const failures=[];
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<48||/your-|secret-jwt-key|change.me/i.test(process.env.JWT_SECRET))failures.push('JWT_SECRET');
try {
  const db=new URL(process.env.DATABASE_URL);
  if(!['postgresql:','postgres:'].includes(db.protocol))failures.push('DATABASE_URL');
  if(process.env.NODE_ENV==='production'&&db.username==='postgres')failures.push('DATABASE_URL (use uma role exclusiva da aplicação)');
}catch{failures.push('DATABASE_URL');}
if(process.env.NODE_ENV==='production'){
 try{const app=new URL(process.env.APP_URL);if(app.protocol!=='https:')failures.push('APP_URL (HTTPS obrigatório)');}catch{failures.push('APP_URL');}
 if(!process.env.UPLOAD_DIR||!require('node:path').isAbsolute(process.env.UPLOAD_DIR))failures.push('UPLOAD_DIR (diretório absoluto persistente)');
}
if(failures.length){console.error('Configuração incompleta: '+failures.join(', '));process.exitCode=1;}
else console.log('Configuração obrigatória validada.');
