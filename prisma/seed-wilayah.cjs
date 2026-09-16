const { execSync } = require('child_process');

async function main() {
  console.log('⚠️ Peringatan: Script ini sudah tidak menggunakan data dummy.');
  console.log('🔄 Mengalihkan ke proses restore data asli...');
  try {
    execSync('node scripts/restore_regions.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('Gagal melakukan restore wilayah:', error.message);
  }
}

main().catch(console.error);
