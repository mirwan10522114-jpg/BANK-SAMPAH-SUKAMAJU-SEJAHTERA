const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

function getMysqlPath() {
  const possiblePaths = [
    'mysql',
    'C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\mysql.exe',
    'C:\\laragon\\bin\\mysql\\mysql-5.7.33-winx64\\bin\\mysql.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
  ];

  for (const p of possiblePaths) {
    try {
      execSync(`"${p}" --version`, { stdio: 'ignore' });
      return p;
    } catch {
      // continue searching
    }
  }
  return 'mysql';
}

function parseDatabaseUrl(url) {
  if (!url) throw new Error('DATABASE_URL is not defined in .env');
  try {
    const parsed = new URL(url);
    return {
      user: parsed.username || 'root',
      password: parsed.password || '',
      host: parsed.hostname || 'localhost',
      port: parsed.port || '3306',
      database: parsed.pathname.replace(/^\//, ''),
    };
  } catch (e) {
    throw new Error(`Invalid MySQL DATABASE_URL: ${url}`);
  }
}

function restoreDatabase() {
  console.log('========================================================================');
  console.log('   AUTOMATED DATABASE RESTORE: BANK SAMPAH SUKAMAJU SEJAHTERA');
  console.log('========================================================================\n');

  const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  const mysqlExe = getMysqlPath();

  const backupDir = path.join(process.cwd(), 'backup');
  const specifiedFile = process.argv[2];
  const targetFile = specifiedFile
    ? (path.isAbsolute(specifiedFile) ? specifiedFile : path.join(process.cwd(), specifiedFile))
    : path.join(backupDir, 'backup_banksampah_master.sql');

  if (!fs.existsSync(targetFile)) {
    throw new Error(`File backup tidak ditemukan: ${targetFile}`);
  }

  const pwdArg = dbConfig.password ? `-p"${dbConfig.password}"` : '';
  const cmd = `Get-Content -Path "${targetFile}" | & "${mysqlExe}" -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${pwdArg}`;

  console.log(`Merestore database [${dbConfig.database}] dari file: ${targetFile}...`);
  execSync(cmd, { shell: 'powershell.exe' });

  console.log('✅ RESTORE DATABASE BERHASIL!');
  console.log(`📁 Sumber File : ${targetFile}`);
  console.log(`🕒 Waktu Selesai: ${new Date().toLocaleString('id-ID')}\n`);
}

try {
  restoreDatabase();
} catch (error) {
  console.error('❌ Gagal melakukan restore database:', error.message);
  process.exit(1);
}
