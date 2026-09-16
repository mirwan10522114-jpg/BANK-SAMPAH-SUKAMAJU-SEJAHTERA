import { getBankSampahKasBalance } from './src/backend/lib/business'

async function run() {
  try {
    const balance = await getBankSampahKasBalance('utama')
    console.log('balance utama:', balance)
  } catch (e) {
    console.error('error:', e)
  }
}

run()
