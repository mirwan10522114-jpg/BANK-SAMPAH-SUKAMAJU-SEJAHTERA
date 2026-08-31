const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

function getMysqldumpPath() {
  const possiblePaths = [
    'mysqldump',
    'C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\mysqldump.exe',
    'C:\\laragon\\bin\\mysql\\mysql-5.7.33-winx64\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
  ];

  for (const p of possiblePaths) {
    try {
      execSync(`"${p}" --version`, { stdio: 'ignore' });
      return p;
    } catch {
      // continue searching
    }
  }
  return 'mysqldump';
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

function backupDatabase() {
  console.log('========================================================================');
  console.log('   AUTOMATED DATABASE BACKUP: BANK SAMPAH SUKAMAJU SEJAHTERA');
  console.log('========================================================================\n');

  const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  const mysqldumpExe = getMysqldumpPath();

  const backupDir = path.join(process.cwd(), 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const targetFile = path.join(backupDir, 'backup_banksampah_master.sql');

  const pwdArg = dbConfig.password ? `-p"${dbConfig.password}"` : '';
  const cmd = `& "${mysqldumpExe}" -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${pwdArg} --databases ${dbConfig.database} --routines --triggers --events --add-drop-database --add-drop-table > "${targetFile}"`;

  console.log(`Menyimpan backup dari database [${dbConfig.database}] ke [${targetFile}]...`);
  execSync(cmd, { shell: 'powershell.exe' });

  const stats = fs.statSync(targetFile);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('✅ BACKUP BERHASIL DIBUAT!');
  console.log(`📁 File Backup : ${targetFile}`);
  console.log(`📊 Ukuran File : ${sizeMB} MB (${stats.size} bytes)`);
  console.log(`🕒 Waktu Backup: ${new Date().toLocaleString('id-ID')}\n`);
}

try {
  backupDatabase();
} catch (error) {
  console.error('❌ Gagal melakukan backup database:', error.message);
  process.exit(1);
}
