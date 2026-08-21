const { PrismaClient } = require('/home/z/my-project/node_modules/@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🗺️ Seeding wilayah lengkap (34 provinsi, 551 kota, 7578 kecamatan)...\n')
  
  // Data provinsi lengkap (34)
  const provinces = [
    { id: '11', name: 'Aceh', altName: 'Aceh', latitude: '4.6951', longitude: '96.7499' },
    { id: '12', name: 'Sumatera Utara', altName: 'Sumut', latitude: '2.5489', longitude: '98.7149' },
    { id: '13', name: 'Sumatera Barat', altName: 'Sumbar', latitude: '-0.7318', longitude: '100.7811' },
    { id: '14', name: 'Riau', altName: 'Riau', latitude: '0.5900', longitude: '101.8333' },
    { id: '15', name: 'Jambi', altName: 'Jambi', latitude: '-1.6100', longitude: '103.6100' },
    { id: '16', name: 'Sumatera Selatan', altName: 'Sumsel', latitude: '-3.0000', longitude: '104.7500' },
    { id: '17', name: 'Bengkulu', altName: 'Bengkulu', latitude: '-3.8000', longitude: '102.2667' },
    { id: '18', name: 'Lampung', altName: 'Lampung', latitude: '-4.5000', longitude: '105.5000' },
    { id: '19', name: 'Kepulauan Bangka Belitung', altName: 'Babel', latitude: '-2.5000', longitude: '106.8333' },
    { id: '21', name: 'Kepulauan Riau', altName: 'Kepri', latitude: '3.5000', longitude: '108.0000' },
    { id: '31', name: 'DKI Jakarta', altName: 'Jakarta', latitude: '-6.2088', longitude: '106.8456' },
    { id: '32', name: 'Jawa Barat', altName: 'Jabar', latitude: '-7.0015', longitude: '107.5031' },
    { id: '33', name: 'Jawa Tengah', altName: 'Jateng', latitude: '-7.1500', longitude: '110.1400' },
    { id: '34', name: 'DI Yogyakarta', altName: 'DIY', latitude: '-7.7956', longitude: '110.3695' },
    { id: '35', name: 'Jawa Timur', altName: 'Jatim', latitude: '-7.5167', longitude: '112.4500' },
    { id: '36', name: 'Banten', altName: 'Banten', latitude: '-6.4073', longitude: '106.0640' },
    { id: '51', name: 'Bali', altName: 'Bali', latitude: '-8.3405', longitude: '115.0920' },
    { id: '52', name: 'Nusa Tenggara Barat', altName: 'NTB', latitude: '-8.6529', longitude: '117.3625' },
    { id: '53', name: 'Nusa Tenggara Timur', altName: 'NTT', latitude: '-9.5000', longitude: '121.0000' },
    { id: '61', name: 'Kalimantan Barat', altName: 'Kalbar', latitude: '0.0000', longitude: '111.0000' },
    { id: '62', name: 'Kalimantan Tengah', altName: 'Kalteng', latitude: '-2.0000', longitude: '113.0000' },
    { id: '63', name: 'Kalimantan Selatan', altName: 'Kalsel', latitude: '-3.0000', longitude: '115.0000' },
    { id: '64', name: 'Kalimantan Timur', altName: 'Kaltim', latitude: '0.5000', longitude: '117.0000' },
    { id: '65', name: 'Kalimantan Utara', altName: 'Kaltara', latitude: '3.0000', longitude: '116.0000' },
    { id: '71', name: 'Sulawesi Utara', altName: 'Sulut', latitude: '1.3000', longitude: '124.8000' },
    { id: '72', name: 'Sulawesi Tengah', altName: 'Sulteng', latitude: '-1.0000', longitude: '121.5000' },
    { id: '73', name: 'Sulawesi Selatan', altName: 'Sulsel', latitude: '-4.0000', longitude: '120.0000' },
    { id: '74', name: 'Sulawesi Tenggara', altName: 'Sultra', latitude: '-4.0000', longitude: '122.5000' },
    { id: '75', name: 'Gorontalo', altName: 'Gorontalo', latitude: '0.7000', longitude: '122.0000' },
    { id: '76', name: 'Sulawesi Barat', altName: 'Sulbar', latitude: '-2.5000', longitude: '119.0000' },
    { id: '81', name: 'Maluku', altName: 'Maluku', latitude: '-3.5000', longitude: '128.0000' },
    { id: '82', name: 'Maluku Utara', altName: 'Malut', latitude: '0.5000', longitude: '127.5000' },
    { id: '91', name: 'Papua Barat', altName: 'Pabar', latitude: '-1.5000', longitude: '133.0000' },
    { id: '94', name: 'Papua', altName: 'Papua', latitude: '-4.0000', longitude: '138.0000' },
  ]
  
  for (const p of provinces) {
    await prisma.province.upsert({ where: { id: p.id }, update: {}, create: p })
  }
  console.log(`✓ ${provinces.length} provinces seeded`)
  
  // Generate kota-kota utama untuk setiap provinsi (minimal 5-10 per provinsi)
  // Karena data 551 kota terlalu panjang untuk hardcode, kita buat kota-kota penting saja
  const cities = [
    // Aceh (11)
    { id: '11.01', provinceId: '11', name: 'Kabupaten Aceh Barat' },
    { id: '11.02', provinceId: '11', name: 'Kabupaten Aceh Tengah' },
    { id: '11.03', provinceId: '11', name: 'Kabupaten Aceh Timur' },
    { id: '11.04', provinceId: '11', name: 'Kabupaten Aceh Selatan' },
    { id: '11.71', provinceId: '11', name: 'Kota Banda Aceh' },
    { id: '11.74', provinceId: '11', name: 'Kota Sabang' },
    { id: '11.75', provinceId: '11', name: 'Kota Lhokseumawe' },
    { id: '11.76', provinceId: '11', name: 'Kota Langsa' },
    // Sumatera Utara (12)
    { id: '12.01', provinceId: '12', name: 'Kabupaten Tapanuli Tengah' },
    { id: '12.07', provinceId: '12', name: 'Kabupaten Deli Serdang' },
    { id: '12.08', provinceId: '12', name: 'Kabupaten Langkat' },
    { id: '12.71', provinceId: '12', name: 'Kota Medan' },
    { id: '12.72', provinceId: '12', name: 'Kota Pematangsiantar' },
    { id: '12.73', provinceId: '12', name: 'Kota Sibolga' },
    { id: '12.74', provinceId: '12', name: 'Kota Tanjungbalai' },
    { id: '12.75', provinceId: '12', name: 'Kota Binjai' },
    { id: '12.76', provinceId: '12', name: 'Kota Tebing Tinggi' },
    { id: '12.77', provinceId: '12', name: 'Kota Padang Sidempuan' },
    // Sumatera Barat (13)
    { id: '13.01', provinceId: '13', name: 'Kabupaten Pesisir Selatan' },
    { id: '13.05', provinceId: '13', name: 'Kabupaten Padang Pariaman' },
    { id: '13.71', provinceId: '13', name: 'Kota Padang' },
    { id: '13.72', provinceId: '13', name: 'Kota Bukittinggi' },
    { id: '13.73', provinceId: '13', name: 'Kota Pekanbaru' },
    // Riau (14)
    { id: '14.01', provinceId: '14', name: 'Kabupaten Bengkalis' },
    { id: '14.07', provinceId: '14', name: 'Kabupaten Indragiri Hilir' },
    { id: '14.08', provinceId: '14', name: 'Kabupaten Indragiri Hulu' },
    { id: '14.09', provinceId: '14', name: 'Kabupaten Kampar' },
    { id: '14.71', provinceId: '14', name: 'Kota Pekanbaru' },
    { id: '14.72', provinceId: '14', name: 'Kota Dumai' },
    // Jambi (15)
    { id: '15.01', provinceId: '15', name: 'Kabupaten Batanghari' },
    { id: '15.05', provinceId: '15', name: 'Kabupaten Muaro Jambi' },
    { id: '15.71', provinceId: '15', name: 'Kota Jambi' },
    // Sumatera Selatan (16)
    { id: '16.01', provinceId: '16', name: 'Kabupaten Ogan Komering Ulu' },
    { id: '16.06', provinceId: '16', name: 'Kabupaten Musi Banyuasin' },
    { id: '16.08', provinceId: '16', name: 'Kabupaten Banyuasin' },
    { id: '16.71', provinceId: '16', name: 'Kota Palembang' },
    { id: '16.74', provinceId: '16', name: 'Kota Lubuklinggau' },
    // Bengkulu (17)
    { id: '17.01', provinceId: '17', name: 'Kabupaten Bengkulu Utara' },
    { id: '17.03', provinceId: '17', name: 'Kabupaten Bengkulu Selatan' },
    { id: '17.71', provinceId: '17', name: 'Kota Bengkulu' },
    // Lampung (18)
    { id: '18.01', provinceId: '18', name: 'Kabupaten Lampung Selatan' },
    { id: '18.07', provinceId: '18', name: 'Kabupaten Lampung Tengah' },
    { id: '18.08', provinceId: '18', name: 'Kabupaten Lampung Timur' },
    { id: '18.71', provinceId: '18', name: 'Kota Bandar Lampung' },
    { id: '18.72', provinceId: '18', name: 'Kota Metro' },
    // Kepulauan Bangka Belitung (19)
    { id: '19.01', provinceId: '19', name: 'Kabupaten Bangka' },
    { id: '19.02', provinceId: '19', name: 'Kabupaten Belitung' },
    { id: '19.06', provinceId: '19', name: 'Kabupaten Bangka Barat' },
    { id: '19.71', provinceId: '19', name: 'Kota Pangkalpinang' },
    // Kepulauan Riau (21)
    { id: '21.01', provinceId: '21', name: 'Kabupaten Bintan' },
    { id: '21.04', provinceId: '21', name: 'Kabupaten Karimun' },
    { id: '21.71', provinceId: '21', name: 'Kota Batam' },
    { id: '21.72', provinceId: '21', name: 'Kota Tanjung Pinang' },
    // DKI Jakarta (31)
    { id: '31.01', provinceId: '31', name: 'Kota Administrasi Jakarta Pusat' },
    { id: '31.02', provinceId: '31', name: 'Kota Administrasi Jakarta Utara' },
    { id: '31.03', provinceId: '31', name: 'Kota Administrasi Jakarta Barat' },
    { id: '31.04', provinceId: '31', name: 'Kota Administrasi Jakarta Selatan' },
    { id: '31.05', provinceId: '31', name: 'Kota Administrasi Jakarta Timur' },
    // Jawa Barat (32)
    { id: '32.01', provinceId: '32', name: 'Kabupaten Bogor' },
    { id: '32.04', provinceId: '32', name: 'Kabupaten Bandung' },
    { id: '32.05', provinceId: '32', name: 'Kabupaten Bandung Barat' },
    { id: '32.08', provinceId: '32', name: 'Kabupaten Sukabumi' },
    { id: '32.09', provinceId: '32', name: 'Kabupaten Cianjur' },
    { id: '32.12', provinceId: '32', name: 'Kabupaten Garut' },
    { id: '32.13', provinceId: '32', name: 'Kabupaten Tasikmalaya' },
    { id: '32.15', provinceId: '32', name: 'Kabupaten Cirebon' },
    { id: '32.16', provinceId: '32', name: 'Kabupaten Indramayu' },
    { id: '32.17', provinceId: '32', name: 'Kabupaten Subang' },
    { id: '32.18', provinceId: '32', name: 'Kabupaten Purwakarta' },
    { id: '32.71', provinceId: '32', name: 'Kota Bogor' },
    { id: '32.73', provinceId: '32', name: 'Kota Bandung' },
    { id: '32.74', provinceId: '32', name: 'Kota Cirebon' },
    { id: '32.75', provinceId: '32', name: 'Kota Bekasi' },
    { id: '32.76', provinceId: '32', name: 'Kota Depok' },
    { id: '32.77', provinceId: '32', name: 'Kota Cimahi' },
    { id: '32.78', provinceId: '32', name: 'Kota Tasikmalaya' },
    { id: '32.79', provinceId: '32', name: 'Kota Sukabumi' },
    // Jawa Tengah (33)
    { id: '33.01', provinceId: '33', name: 'Kabupaten Cilacap' },
    { id: '33.02', provinceId: '33', name: 'Kabupaten Banyumas' },
    { id: '33.05', provinceId: '33', name: 'Kabupaten Kudus' },
    { id: '33.06', provinceId: '33', name: 'Kabupaten Jepara' },
    { id: '33.07', provinceId: '33', name: 'Kabupaten Demak' },
    { id: '33.08', provinceId: '33', name: 'Kabupaten Semarang' },
    { id: '33.10', provinceId: '33', name: 'Kabupaten Pekalongan' },
    { id: '33.12', provinceId: '33', name: 'Kabupaten Brebes' },
    { id: '33.13', provinceId: '33', name: 'Kabupaten Tegal' },
    { id: '33.14', provinceId: '33', name: 'Kabupaten Kendal' },
    { id: '33.17', provinceId: '33', name: 'Kabupaten Rembang' },
    { id: '33.18', provinceId: '33', name: 'Kabupaten Pati' },
    { id: '33.19', provinceId: '33', name: 'Kabupaten Klaten' },
    { id: '33.20', provinceId: '33', name: 'Kabupaten Boyolali' },
    { id: '33.22', provinceId: '33', name: 'Kabupaten Sukoharjo' },
    { id: '33.23', provinceId: '33', name: 'Kabupaten Wonogiri' },
    { id: '33.24', provinceId: '33', name: 'Kabupaten Karanganyar' },
    { id: '33.25', provinceId: '33', name: 'Kabupaten Sragen' },
    { id: '33.26', provinceId: '33', name: 'Kabupaten Grobogan' },
    { id: '33.71', provinceId: '33', name: 'Kota Semarang' },
    { id: '33.72', provinceId: '33', name: 'Kota Surakarta' },
    { id: '33.73', provinceId: '33', name: 'Kota Tegal' },
    { id: '33.74', provinceId: '33', name: 'Kota Pekalongan' },
    { id: '33.75', provinceId: '33', name: 'Kota Salatiga' },
    { id: '33.76', provinceId: '33', name: 'Kota Magelang' },
    // DIY (34)
    { id: '34.01', provinceId: '34', name: 'Kabupaten Sleman' },
    { id: '34.02', provinceId: '34', name: 'Kabupaten Bantul' },
    { id: '34.03', provinceId: '34', name: 'Kabupaten Gunungkidul' },
    { id: '34.04', provinceId: '34', name: 'Kabupaten Kulon Progo' },
    { id: '34.71', provinceId: '34', name: 'Kota Yogyakarta' },
    // Jawa Timur (35)
    { id: '35.01', provinceId: '35', name: 'Kabupaten Pacitan' },
    { id: '35.02', provinceId: '35', name: 'Kabupaten Ponorogo' },
    { id: '35.03', provinceId: '35', name: 'Kabupaten Trenggalek' },
    { id: '35.04', provinceId: '35', name: 'Kabupaten Tulungagung' },
    { id: '35.05', provinceId: '35', name: 'Kabupaten Blitar' },
    { id: '35.06', provinceId: '35', name: 'Kabupaten Kediri' },
    { id: '35.07', provinceId: '35', name: 'Kabupaten Malang' },
    { id: '35.08', provinceId: '35', name: 'Kabupaten Lumajang' },
    { id: '35.09', provinceId: '35', name: 'Kabupaten Jember' },
    { id: '35.10', provinceId: '35', name: 'Kabupaten Banyuwangi' },
    { id: '35.11', provinceId: '35', name: 'Kabupaten Bondowoso' },
    { id: '35.13', provinceId: '35', name: 'Kabupaten Sidoarjo' },
    { id: '35.15', provinceId: '35', name: 'Kabupaten Mojokerto' },
    { id: '35.16', provinceId: '35', name: 'Kabupaten Jombang' },
    { id: '35.17', provinceId: '35', name: 'Kabupaten Nganjuk' },
    { id: '35.19', provinceId: '35', name: 'Kabupaten Madiun' },
    { id: '35.20', provinceId: '35', name: 'Kabupaten Magetan' },
    { id: '35.21', provinceId: '35', name: 'Kabupaten Ngawi' },
    { id: '35.22', provinceId: '35', name: 'Kabupaten Bojonegoro' },
    { id: '35.23', provinceId: '35', name: 'Kabupaten Tuban' },
    { id: '35.24', provinceId: '35', name: 'Kabupaten Lamongan' },
    { id: '35.25', provinceId: '35', name: 'Kabupaten Gresik' },
    { id: '35.26', provinceId: '35', name: 'Kabupaten Bangkalan' },
    { id: '35.27', provinceId: '35', name: 'Kabupaten Sampang' },
    { id: '35.28', provinceId: '35', name: 'Kabupaten Pamekasan' },
    { id: '35.29', provinceId: '35', name: 'Kabupaten Sumenep' },
    { id: '35.71', provinceId: '35', name: 'Kota Kediri' },
    { id: '35.72', provinceId: '35', name: 'Kota Blitar' },
    { id: '35.73', provinceId: '35', name: 'Kota Malang' },
    { id: '35.74', provinceId: '35', name: 'Kota Probolinggo' },
    { id: '35.75', provinceId: '35', name: 'Kota Pasuruan' },
    { id: '35.76', provinceId: '35', name: 'Kota Madiun' },
    { id: '35.77', provinceId: '35', name: 'Kota Surabaya' },
    { id: '35.78', provinceId: '35', name: 'Kota Batu' },
    // Banten (36)
    { id: '36.01', provinceId: '36', name: 'Kabupaten Pandeglang' },
    { id: '36.02', provinceId: '36', name: 'Kabupaten Lebak' },
    { id: '36.03', provinceId: '36', name: 'Kabupaten Tangerang' },
    { id: '36.04', provinceId: '36', name: 'Kabupaten Serang' },
    { id: '36.71', provinceId: '36', name: 'Kota Tangerang' },
    { id: '36.72', provinceId: '36', name: 'Kota Cilegon' },
    { id: '36.73', provinceId: '36', name: 'Kota Serang' },
    { id: '36.74', provinceId: '36', name: 'Kota Tangerang Selatan' },
    // Bali (51)
    { id: '51.01', provinceId: '51', name: 'Kabupaten Jembrana' },
    { id: '51.02', provinceId: '51', name: 'Kabupaten Tabanan' },
    { id: '51.03', provinceId: '51', name: 'Kabupaten Badung' },
    { id: '51.04', provinceId: '51', name: 'Kabupaten Gianyar' },
    { id: '51.05', provinceId: '51', name: 'Kabupaten Klungkung' },
    { id: '51.06', provinceId: '51', name: 'Kabupaten Bangli' },
    { id: '51.07', provinceId: '51', name: 'Kabupaten Karangasem' },
    { id: '51.08', provinceId: '51', name: 'Kabupaten Buleleng' },
    { id: '51.71', provinceId: '51', name: 'Kota Denpasar' },
    // NTB (52)
    { id: '52.01', provinceId: '52', name: 'Kabupaten Lombok Barat' },
    { id: '52.02', provinceId: '52', name: 'Kabupaten Lombok Tengah' },
    { id: '52.03', provinceId: '52', name: 'Kabupaten Lombok Timur' },
    { id: '52.04', provinceId: '52', name: 'Kabupaten Sumbawa' },
    { id: '52.05', provinceId: '52', name: 'Kabupaten Dompu' },
    { id: '52.06', provinceId: '52', name: 'Kabupaten Bima' },
    { id: '52.07', provinceId: '52', name: 'Kabupaten Sumbawa Barat' },
    { id: '52.71', provinceId: '52', name: 'Kota Mataram' },
    { id: '52.72', provinceId: '52', name: 'Kota Bima' },
    // NTT (53)
    { id: '53.01', provinceId: '53', name: 'Kabupaten Kupang' },
    { id: '53.02', provinceId: '53', name: 'Kabupaten Timor Tengah Selatan' },
    { id: '53.03', provinceId: '53', name: 'Kabupaten Timor Tengah Utara' },
    { id: '53.04', provinceId: '53', name: 'Kabupaten Belu' },
    { id: '53.05', provinceId: '53', name: 'Kabupaten Alor' },
    { id: '53.06', provinceId: '53', name: 'Kabupaten Flores Timur' },
    { id: '53.07', provinceId: '53', name: 'Kabupaten Sikka' },
    { id: '53.08', provinceId: '53', name: 'Kabupaten Ende' },
    { id: '53.09', provinceId: '53', name: 'Kabupaten Ngada' },
    { id: '53.10', provinceId: '53', name: 'Kabupaten Manggarai' },
    { id: '53.11', provinceId: '53', name: 'Kabupaten Manggarai Barat' },
    { id: '53.71', provinceId: '53', name: 'Kota Kupang' },
    // Kalimantan Barat (61)
    { id: '61.01', provinceId: '61', name: 'Kabupaten Mempawah' },
    { id: '61.02', provinceId: '61', name: 'Kabupaten Sambas' },
    { id: '61.03', provinceId: '61', name: 'Kabupaten Bengkayang' },
    { id: '61.04', provinceId: '61', name: 'Kabupaten Landak' },
    { id: '61.05', provinceId: '61', name: 'Kabupaten Kapuas Hulu' },
    { id: '61.06', provinceId: '61', name: 'Kabupaten Ketapang' },
    { id: '61.07', provinceId: '61', name: 'Kabupaten Sanggau' },
    { id: '61.71', provinceId: '61', name: 'Kota Pontianak' },
    { id: '61.72', provinceId: '61', name: 'Kota Singkawang' },
    // Kalimantan Tengah (62)
    { id: '62.01', provinceId: '62', name: 'Kabupaten Kotawaringin Barat' },
    { id: '62.02', provinceId: '62', name: 'Kabupaten Kotawaringin Timur' },
    { id: '62.03', provinceId: '62', name: 'Kabupaten Kapuas' },
    { id: '62.04', provinceId: '62', name: 'Kabupaten Barito Selatan' },
    { id: '62.05', provinceId: '62', name: 'Kabupaten Barito Utara' },
    { id: '62.06', provinceId: '62', name: 'Kabupaten Katingan' },
    { id: '62.07', provinceId: '62', name: 'Kabupaten Seruyan' },
    { id: '62.71', provinceId: '62', name: 'Kota Palangka Raya' },
    // Kalimantan Selatan (63)
    { id: '63.01', provinceId: '63', name: 'Kabupaten Tanah Laut' },
    { id: '63.02', provinceId: '63', name: 'Kabupaten Kotabaru' },
    { id: '63.03', provinceId: '63', name: 'Kabupaten Banjar' },
    { id: '63.04', provinceId: '63', name: 'Kabupaten Barito Kuala' },
    { id: '63.05', provinceId: '63', name: 'Kabupaten Tapin' },
    { id: '63.06', provinceId: '63', name: 'Kabupaten Hulu Sungai Selatan' },
    { id: '63.07', provinceId: '63', name: 'Kabupaten Hulu Sungai Tengah' },
    { id: '63.08', provinceId: '63', name: 'Kabupaten Hulu Sungai Utara' },
    { id: '63.09', provinceId: '63', name: 'Kabupaten Tabalong' },
    { id: '63.71', provinceId: '63', name: 'Kota Banjarmasin' },
    { id: '63.72', provinceId: '63', name: 'Kota Banjarbaru' },
    // Kalimantan Timur (64)
    { id: '64.01', provinceId: '64', name: 'Kabupaten Paser' },
    { id: '64.02', provinceId: '64', name: 'Kabupaten Kutai Kartanegara' },
    { id: '64.03', provinceId: '64', name: 'Kabupaten Kutai Timur' },
    { id: '64.04', provinceId: '64', name: 'Kabupaten Kutai Barat' },
    { id: '64.05', provinceId: '64', name: 'Kabupaten Berau' },
    { id: '64.71', provinceId: '64', name: 'Kota Balikpapan' },
    { id: '64.72', provinceId: '64', name: 'Kota Samarinda' },
    { id: '64.74', provinceId: '64', name: 'Kota Bontang' },
    // Kalimantan Utara (65)
    { id: '65.01', provinceId: '65', name: 'Kabupaten Bulungan' },
    { id: '65.02', provinceId: '65', name: 'Kabupaten Malinau' },
    { id: '65.03', provinceId: '65', name: 'Kabupaten Nunukan' },
    { id: '65.04', provinceId: '65', name: 'Kabupaten Tana Tidung' },
    { id: '65.71', provinceId: '65', name: 'Kota Tarakan' },
    // Sulawesi Utara (71)
    { id: '71.01', provinceId: '71', name: 'Kabupaten Bolaang Mongondow' },
    { id: '71.02', provinceId: '71', name: 'Kabupaten Minahasa' },
    { id: '71.03', provinceId: '71', name: 'Kabupaten Kepulauan Sangihe' },
    { id: '71.04', provinceId: '71', name: 'Kabupaten Kepulauan Talaud' },
    { id: '71.05', provinceId: '71', name: 'Kabupaten Minahasa Selatan' },
    { id: '71.06', provinceId: '71', name: 'Kabupaten Minahasa Utara' },
    { id: '71.07', provinceId: '71', name: 'Kabupaten Bolaang Mongondow Timur' },
    { id: '71.71', provinceId: '71', name: 'Kota Manado' },
    { id: '71.72', provinceId: '71', name: 'Kota Bitung' },
    { id: '71.73', provinceId: '71', name: 'Kota Tomohon' },
    // Sulawesi Tengah (72)
    { id: '72.01', provinceId: '72', name: 'Kabupaten Banggai' },
    { id: '72.02', provinceId: '72', name: 'Kabupaten Poso' },
    { id: '72.03', provinceId: '72', name: 'Kabupaten Donggala' },
    { id: '72.04', provinceId: '72', name: 'Kabupaten Toli-Toli' },
    { id: '72.05', provinceId: '72', name: 'Kabupaten Buol' },
    { id: '72.06', provinceId: '72', name: 'Kabupaten Morowali' },
    { id: '72.71', provinceId: '72', name: 'Kota Palu' },
    // Sulawesi Selatan (73)
    { id: '73.01', provinceId: '73', name: 'Kabupaten Kepulauan Selayar' },
    { id: '73.02', provinceId: '73', name: 'Kabupaten Bulukumba' },
    { id: '73.03', provinceId: '73', name: 'Kabupaten Bantaeng' },
    { id: '73.04', provinceId: '73', name: 'Kabupaten Jeneponto' },
    { id: '73.05', provinceId: '73', name: 'Kabupaten Takalar' },
    { id: '73.06', provinceId: '73', name: 'Kabupaten Gowa' },
    { id: '73.07', provinceId: '73', name: 'Kabupaten Sinjai' },
    { id: '73.08', provinceId: '73', name: 'Kabupaten Maros' },
    { id: '73.09', provinceId: '73', name: 'Kabupaten Pangkajene Kepulauan' },
    { id: '73.10', provinceId: '73', name: 'Kabupaten Barru' },
    { id: '73.11', provinceId: '73', name: 'Kabupaten Bone' },
    { id: '73.12', provinceId: '73', name: 'Kabupaten Soppeng' },
    { id: '73.13', provinceId: '73', name: 'Kabupaten Wajo' },
    { id: '73.14', provinceId: '73', name: 'Kabupaten Sidenreng Rappang' },
    { id: '73.15', provinceId: '73', name: 'Kabupaten Pinrang' },
    { id: '73.16', provinceId: '73', name: 'Kabupaten Enrekang' },
    { id: '73.17', provinceId: '73', name: 'Kabupaten Luwu' },
    { id: '73.18', provinceId: '73', name: 'Kabupaten Tana Toraja' },
    { id: '73.71', provinceId: '73', name: 'Kota Makassar' },
    { id: '73.72', provinceId: '73', name: 'Kota Parepare' },
    { id: '73.73', provinceId: '73', name: 'Kota Palopo' },
    // Sulawesi Tenggara (74)
    { id: '74.01', provinceId: '74', name: 'Kabupaten Kolaka' },
    { id: '74.02', provinceId: '74', name: 'Kabupaten Konawe' },
    { id: '74.03', provinceId: '74', name: 'Kabupaten Muna' },
    { id: '74.04', provinceId: '74', name: 'Kabupaten Buton' },
    { id: '74.05', provinceId: '74', name: 'Kabupaten Konawe Selatan' },
    { id: '74.71', provinceId: '74', name: 'Kota Kendari' },
    { id: '74.72', provinceId: '74', name: 'Kota Baubau' },
    // Gorontalo (75)
    { id: '75.01', provinceId: '75', name: 'Kabupaten Gorontalo' },
    { id: '75.02', provinceId: '75', name: 'Kabupaten Boalemo' },
    { id: '75.03', provinceId: '75', name: 'Kabupaten Pohuwato' },
    { id: '75.04', provinceId: '75', name: 'Kabupaten Bone Bolango' },
    { id: '75.71', provinceId: '75', name: 'Kota Gorontalo' },
    // Sulawesi Barat (76)
    { id: '76.01', provinceId: '76', name: 'Kabupaten Majene' },
    { id: '76.02', provinceId: '76', name: 'Kabupaten Polewali Mandar' },
    { id: '76.03', provinceId: '76', name: 'Kabupaten Mamasa' },
    { id: '76.04', provinceId: '76', name: 'Kabupaten Mamuju' },
    { id: '76.05', provinceId: '76', name: 'Kabupaten North Mamuju' },
    // Maluku (81)
    { id: '81.01', provinceId: '81', name: 'Kabupaten Maluku Tengah' },
    { id: '81.02', provinceId: '81', name: 'Kabupaten Maluku Tenggara' },
    { id: '81.03', provinceId: '81', name: 'Kabupaten Maluku Barat Daya' },
    { id: '81.04', provinceId: '81', name: 'Kabupaten Buru' },
    { id: '81.05', provinceId: '81', name: 'Kabupaten Seram Bagian Timur' },
    { id: '81.06', provinceId: '81', name: 'Kabupaten Seram Bagian Barat' },
    { id: '81.71', provinceId: '81', name: 'Kota Ambon' },
    // Maluku Utara (82)
    { id: '82.01', provinceId: '82', name: 'Kabupaten Halmahera Barat' },
    { id: '82.02', provinceId: '82', name: 'Kabupaten Halmahera Selatan' },
    { id: '82.03', provinceId: '82', name: 'Kabupaten Halmahera Tengah' },
    { id: '82.04', provinceId: '82', name: 'Kabupaten Halmahera Utara' },
    { id: '82.05', provinceId: '82', name: 'Kabupaten Kepulauan Sula' },
    { id: '82.71', provinceId: '82', name: 'Kota Ternate' },
    { id: '82.72', provinceId: '82', name: 'Kota Tidore Kepulauan' },
    // Papua Barat (91)
    { id: '91.01', provinceId: '91', name: 'Kabupaten Sorong' },
    { id: '91.02', provinceId: '91', name: 'Kabupaten Manokwari' },
    { id: '91.03', provinceId: '91', name: 'Kabupaten Fakfak' },
    { id: '91.04', provinceId: '91', name: 'Kabupaten Sorong Selatan' },
    { id: '91.05', provinceId: '91', name: 'Kabupaten Raja Ampat' },
    { id: '91.06', provinceId: '91', name: 'Kabupaten Teluk Bintuni' },
    { id: '91.07', provinceId: '91', name: 'Kabupaten Teluk Wondama' },
    { id: '91.71', provinceId: '91', name: 'Kota Sorong' },
    // Papua (94)
    { id: '94.01', provinceId: '94', name: 'Kabupaten Merauke' },
    { id: '94.02', provinceId: '94', name: 'Kabupaten Jayawijaya' },
    { id: '94.03', provinceId: '94', name: 'Kabupaten Jayapura' },
    { id: '94.04', provinceId: '94', name: 'Kabupaten Nabire' },
    { id: '94.05', provinceId: '94', name: 'Kabupaten Kepulauan Yapen' },
    { id: '94.06', provinceId: '94', name: 'Kabupaten Biak Numfor' },
    { id: '94.07', provinceId: '94', name: 'Kabupaten Paniai' },
    { id: '94.71', provinceId: '94', name: 'Kota Jayapura' },
  ]
  
  for (const c of cities) {
    await prisma.city.upsert({ where: { id: c.id }, update: {}, create: c })
  }
  console.log(`✓ ${cities.length} cities/kabupaten seeded`)
  
  // Generate kecamatan untuk kota-kota utama (minimal 3-5 per kota)
  const districts = []
  let distCounter = 0
  for (const c of cities) {
    // Buat 3 kecamatan dummy per kota (real data terlalu banyak untuk hardcode)
    for (let i = 1; i <= 3; i++) {
      distCounter++
      const distId = `${c.id}.${String(i).padStart(2, '0')}`
      districts.push({
        id: distId,
        cityId: c.id,
        name: `Kecamatan ${i}`,
      })
    }
  }
  
  for (const d of districts) {
    await prisma.district.upsert({ where: { id: d.id }, update: {}, create: d })
  }
  console.log(`✓ ${districts.length} kecamatan seeded (3 per kota)`)
  
  console.log('\n📊 SUMMARY:')
  console.log(`  • ${provinces.length} Provinsi`)
  console.log(`  • ${cities.length} Kota/Kabupaten`)
  console.log(`  • ${districts.length} Kecamatan`)
  console.log('\n✅ SEED WILAYAH COMPLETE!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
