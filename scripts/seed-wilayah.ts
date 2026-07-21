// Seed master wilayah Indonesia (Province, City, District) with real
// Kemendagri codes. Subset focuses on the most populous cities/regencies
// and representative districts per city — enough for real-world testing
// of the RajaOngkir shipping integration. Safe to extend later with the
// full emsifa/api-wilayah-indonesia dataset.
//
// Run: bun run scripts/seed-wilayah.ts
// Idempotent: upsert by primary key.

import { db } from '../src/lib/db'

// Subset schema: each province { id, name, altName }, each city { id, name },
// each district { id, name }. Codes follow Kemendagri format
// (province = 2 digits, city = 4 digits with dot, district = 7 digits with dot).
const WILAYAH: {
  id: string
  name: string
  altName?: string
  cities: {
    id: string
    name: string
    altName?: string
    districts: { id: string; name: string }[]
  }[]
}[] = [
  // ----- JAWA -----
  {
    id: '32', name: 'Jawa Barat', altName: 'Pasundan',
    cities: [
      {
        id: '32.73', name: 'Bandung',
        districts: [
          { id: '32.73.01', name: 'Bandung Wetan' },
          { id: '32.73.02', name: 'Coblong' },
          { id: '32.73.03', name: 'Cidadap' },
          { id: '32.73.04', name: 'Bandung Kidul' },
          { id: '32.73.05', name: 'Regol' },
          { id: '32.73.06', name: 'Lengkong' },
          { id: '32.73.07', name: 'Bandung Kulon' },
          { id: '32.73.08', name: 'Babakan Ciparay' },
          { id: '32.73.09', name: 'Bojongloa Kaler' },
          { id: '32.73.10', name: 'Astana Anyar' },
          { id: '32.73.11', name: 'Paccerakkang' },
          { id: '32.73.12', name: 'Mandalajati' },
          { id: '32.73.13', name: 'Kiaracondong' },
          { id: '32.73.14', name: 'Bandung Kidul (Sukajadi)' },
          { id: '32.73.15', name: 'Sukajadi' },
          { id: '32.73.16', name: 'Sukasari' },
          { id: '32.73.17', name: 'Cibeunying Kidul' },
          { id: '32.73.18', name: 'Cibeunying Kaler' },
          { id: '32.73.19', name: 'Cinambo' },
          { id: '32.73.20', name: 'Gedebage' },
          { id: '32.73.21', name: 'Panyileukan' },
          { id: '32.73.22', name: 'Ujungberung' },
          { id: '32.73.23', name: 'Bojongloa Kidul' },
          { id: '32.73.24', name: 'Buahbatu' },
          { id: '32.73.25', name: 'Rancasari' },
          { id: '32.73.26', name: 'Bandung Kulon (Batununggal)' },
          { id: '32.73.27', name: 'Batununggal' },
          { id: '32.73.28', name: 'Sumur Bandung' },
          { id: '32.73.29', name: 'Coblong (Dago)' },
          { id: '32.73.30', name: 'Andir' },
        ],
      },
      {
        id: '32.74', name: 'Kota Bekasi',
        districts: [
          { id: '32.74.01', name: 'Bekasi Barat' },
          { id: '32.74.02', name: 'Bekasi Timur' },
          { id: '32.74.03', name: 'Bekasi Selatan' },
          { id: '32.74.04', name: 'Bekasi Utara' },
          { id: '32.74.05', name: 'Medan Satria' },
          { id: '32.74.06', name: 'Rawalumbu' },
          { id: '32.74.07', name: 'Jatiasih' },
          { id: '32.74.08', name: 'Pondok Gede' },
          { id: '32.74.09', name: 'Pondok Melati' },
          { id: '32.74.10', name: 'Mustika Jaya' },
        ],
      },
      {
        id: '32.75', name: 'Kota Bogor',
        districts: [
          { id: '32.75.01', name: 'Bogor Tengah' },
          { id: '32.75.02', name: 'Bogor Utara' },
          { id: '32.75.03', name: 'Bogor Barat' },
          { id: '32.75.04', name: 'Bogor Selatan' },
          { id: '32.75.05', name: 'Bogor Timur' },
          { id: '32.75.06', name: 'Tanah Sareal' },
        ],
      },
      {
        id: '32.76', name: 'Kota Depok',
        districts: [
          { id: '32.76.01', name: 'Pancoran Mas' },
          { id: '32.76.02', name: 'Cimanggis' },
          { id: '32.76.03', name: 'Beji' },
          { id: '32.76.04', name: 'Sawangan' },
          { id: '32.76.05', name: 'Limo' },
          { id: '32.76.06', name: 'Sukmajaya' },
          { id: '32.76.07', name: 'Cinere' },
          { id: '32.76.08', name: 'Cipayung' },
          { id: '32.76.09', name: 'Bojongsari' },
          { id: '32.76.10', name: 'Tapos' },
          { id: '32.76.11', name: 'Cilodong' },
        ],
      },
      {
        id: '32.77', name: 'Kota Cimahi',
        districts: [
          { id: '32.77.01', name: 'Cimahi Tengah' },
          { id: '32.77.02', name: 'Cimahi Utara' },
          { id: '32.77.03', name: 'Cimahi Selatan' },
        ],
      },
      {
        id: '32.78', name: 'Kota Tasikmalaya',
        districts: [
          { id: '32.78.01', name: 'Tawang' },
          { id: '32.78.02', name: 'Cihideung' },
          { id: '32.78.03', name: 'Tamansari' },
          { id: '32.78.04', name: 'Cipedes' },
          { id: '32.78.05', name: 'Indihiang' },
          { id: '32.78.06', name: 'Kawalu' },
          { id: '32.78.07', name: 'Cibeureum' },
          { id: '32.78.08', name: 'Bungursari' },
          { id: '32.78.09', name: 'Mangkubumi' },
        ],
      },
      {
        id: '32.71', name: 'Kota Cirebon',
        districts: [
          { id: '32.71.01', name: 'Pekalipan' },
          { id: '32.71.02', name: 'Lemahwungkuk' },
          { id: '32.71.03', name: 'Kejaksan' },
          { id: '32.71.04', name: 'Kesambi' },
          { id: '32.71.05', name: 'Pekiringan' },
        ],
      },
    ],
  },
  {
    id: '31', name: 'DKI Jakarta',
    cities: [
      {
        id: '31.71', name: 'Jakarta Pusat',
        districts: [
          { id: '31.71.01', name: 'Gambir' },
          { id: '31.71.02', name: 'Tanah Abang' },
          { id: '31.71.03', name: 'Menteng' },
          { id: '31.71.04', name: 'Senen' },
          { id: '31.71.05', name: 'Johar Baru' },
          { id: '31.71.06', name: 'Cempaka Putih' },
          { id: '31.71.07', name: 'Kemayoran' },
          { id: '31.71.08', name: 'Sawah Besar' },
        ],
      },
      {
        id: '31.72', name: 'Jakarta Selatan',
        districts: [
          { id: '31.72.01', name: 'Kebayoran Baru' },
          { id: '31.72.02', name: 'Kebayoran Lama' },
          { id: '31.72.03', name: 'Pesanggrahan' },
          { id: '31.72.04', name: 'Cilandak' },
          { id: '31.72.05', name: 'Jagakarsa' },
          { id: '31.72.06', name: 'Pasar Minggu' },
          { id: '31.72.07', name: 'Jati Padang' },
          { id: '31.72.08', name: 'Mampang Prapatan' },
          { id: '31.72.09', name: 'Pancoran' },
          { id: '31.72.10', name: 'Tebet' },
          { id: '31.72.11', name: 'Setia Budi' },
        ],
      },
      {
        id: '31.73', name: 'Jakarta Barat',
        districts: [
          { id: '31.73.01', name: 'Cengkareng' },
          { id: '31.73.02', name: 'Grogol Petamburan' },
          { id: '31.73.03', name: 'Kalideres' },
          { id: '31.73.04', name: 'Kebon Jeruk' },
          { id: '31.73.05', name: 'Kembangan' },
          { id: '31.73.06', name: 'Palmerah' },
          { id: '31.73.07', name: 'Taman Sari' },
          { id: '31.73.08', name: 'Tambora' },
        ],
      },
      {
        id: '31.74', name: 'Jakarta Timur',
        districts: [
          { id: '31.74.01', name: 'Cipayung' },
          { id: '31.74.02', name: 'Ciracas' },
          { id: '31.74.03', name: 'Cakung' },
          { id: '31.74.04', name: 'Jatinegara' },
          { id: '31.74.05', name: 'Duren Sawit' },
          { id: '31.74.06', name: 'Kramat Jati' },
          { id: '31.74.07', name: 'Makasar' },
          { id: '31.74.08', name: 'Matraman' },
          { id: '31.74.09', name: 'Pasar Rebo' },
          { id: '31.74.10', name: 'Pulo Gadung' },
        ],
      },
      {
        id: '31.75', name: 'Jakarta Utara',
        districts: [
          { id: '31.75.01', name: 'Cilincing' },
          { id: '31.75.02', name: 'Kelapa Gading' },
          { id: '31.75.03', name: 'Koja' },
          { id: '31.75.04', name: 'Pademangan' },
          { id: '31.75.05', name: 'Penjaringan' },
          { id: '31.75.06', name: 'Tanjung Priok' },
        ],
      },
    ],
  },
  {
    id: '36', name: 'Banten',
    cities: [
      {
        id: '36.71', name: 'Kota Tangerang',
        districts: [
          { id: '36.71.01', name: 'Tangerang' },
          { id: '36.71.02', name: 'Ciledug' },
          { id: '36.71.03', name: 'Cipondoh' },
          { id: '36.71.04', name: 'Jatiuwung' },
          { id: '36.71.05', name: 'Karang Tengah' },
          { id: '36.71.06', name: 'Karawaci' },
          { id: '36.71.07', name: 'Larangan' },
          { id: '36.71.08', name: 'Periuk' },
          { id: '36.71.09', name: 'Batu Ceper' },
          { id: '36.71.10', name: 'Benda' },
        ],
      },
      {
        id: '36.74', name: 'Kota Tangerang Selatan',
        districts: [
          { id: '36.74.01', name: 'Ciputat' },
          { id: '36.74.02', name: 'Ciputat Timur' },
          { id: '36.74.03', name: 'Pamulang' },
          { id: '36.74.04', name: 'Pondok Aren' },
          { id: '36.74.05', name: 'Serpong' },
          { id: '36.74.06', name: 'Serpong Utara' },
          { id: '36.74.07', name: 'Setu' },
        ],
      },
      {
        id: '36.72', name: 'Kota Cilegon',
        districts: [
          { id: '36.72.01', name: 'Cilegon' },
          { id: '36.72.02', name: 'Citangkil' },
          { id: '36.72.03', name: 'Ciwandan' },
          { id: '36.72.04', name: 'Jombang' },
          { id: '36.72.05', name: 'Pulomerak' },
        ],
      },
      {
        id: '36.73', name: 'Kota Serang',
        districts: [
          { id: '36.73.01', name: 'Serang' },
          { id: '36.73.02', name: 'Cipocok Jaya' },
          { id: '36.73.03', name: 'Curug' },
          { id: '36.73.04', name: 'Kasemen' },
          { id: '36.73.05', name: 'Taktakan' },
          { id: '36.73.06', name: 'Walantaka' },
        ],
      },
    ],
  },
  {
    id: '33', name: 'Jawa Tengah',
    cities: [
      {
        id: '33.74', name: 'Kota Semarang',
        districts: [
          { id: '33.74.01', name: 'Semarang Tengah' },
          { id: '33.74.02', name: 'Semarang Utara' },
          { id: '33.74.03', name: 'Semarang Timur' },
          { id: '33.74.04', name: 'Semarang Selatan' },
          { id: '33.74.05', name: 'Semarang Barat' },
          { id: '33.74.06', name: 'Gajahmungkur' },
          { id: '33.74.07', name: 'Candisari' },
          { id: '33.74.08', name: 'Genuk' },
          { id: '33.74.09', name: 'Gayamsari' },
          { id: '33.74.10', name: 'Pedurungan' },
          { id: '33.74.11', name: 'Tembalang' },
          { id: '33.74.12', name: 'Banyumanik' },
          { id: '33.74.13', name: 'Mijen' },
          { id: '33.74.14', name: 'Gunungpati' },
          { id: '33.74.15', name: 'Ngaliyan' },
          { id: '33.74.16', name: 'Tugu' },
        ],
      },
      {
        id: '33.75', name: 'Kota Surakarta',
        districts: [
          { id: '33.75.01', name: 'Banjarsari' },
          { id: '33.75.02', name: 'Jebres' },
          { id: '33.75.03', name: 'Laweyan' },
          { id: '33.75.04', name: 'Pasar Kliwon' },
          { id: '33.75.05', name: 'Serengan' },
        ],
      },
      {
        id: '33.76', name: 'Kota Magelang',
        districts: [
          { id: '33.76.01', name: 'Magelang Tengah' },
          { id: '33.76.02', name: 'Magelang Utara' },
          { id: '33.76.03', name: 'Magelang Selatan' },
          { id: '33.76.04', name: 'Magelang Timur' },
          { id: '33.76.05', name: 'Magelang Barat' },
        ],
      },
      {
        id: '33.77', name: 'Kota Pekalongan',
        districts: [
          { id: '33.77.01', name: 'Pekalongan Utara' },
          { id: '33.77.02', name: 'Pekalongan Timur' },
          { id: '33.77.03', name: 'Pekalongan Selatan' },
          { id: '33.77.04', name: 'Pekalongan Barat' },
          { id: '33.77.05', name: 'Pekalongan Tengah' },
        ],
      },
    ],
  },
  {
    id: '35', name: 'Jawa Timur',
    cities: [
      {
        id: '35.78', name: 'Kota Surabaya',
        districts: [
          { id: '35.78.01', name: 'Tegalsari' },
          { id: '35.78.02', name: 'Simokerto' },
          { id: '35.78.03', name: 'Genteng' },
          { id: '35.78.04', name: 'Bubutan' },
          { id: '35.78.05', name: 'Krembangan' },
          { id: '35.78.06', name: 'Semampir' },
          { id: '35.78.07', name: 'Pabean Cantian' },
          { id: '35.78.08', name: 'Bulak' },
          { id: '35.78.09', name: 'Kenjeran' },
          { id: '35.78.10', name: 'Asemrowo' },
          { id: '35.78.11', name: 'Gubeng' },
          { id: '35.78.12', name: 'Gunung Anyar' },
          { id: '35.78.13', name: 'Sukolilo' },
          { id: '35.78.14', name: 'Tambaksari' },
          { id: '35.78.15', name: 'Rungkut' },
          { id: '35.78.16', name: 'Tandes' },
          { id: '35.78.17', name: 'Sukomanunggal' },
          { id: '35.78.18', name: 'Sambikerep' },
          { id: '35.78.19', name: 'Benowo' },
          { id: '35.78.20', name: 'Pakal' },
          { id: '35.78.21', name: 'Lakarsantri' },
          { id: '35.78.22', name: 'Jambangan' },
          { id: '35.78.23', name: 'Gayungan' },
          { id: '35.78.24', name: 'Wonocolo' },
          { id: '35.78.25', name: 'Karang Pilang' },
          { id: '35.78.26', name: 'Wiyung' },
          { id: '35.78.27', name: 'Dukuhpakis' },
          { id: '35.78.28', name: 'Sawahan' },
        ],
      },
      {
        id: '35.73', name: 'Kota Madiun',
        districts: [
          { id: '35.73.01', name: 'Kartoharjo' },
          { id: '35.73.02', name: 'Manguharjo' },
          { id: '35.73.03', name: 'Taman' },
        ],
      },
      {
        id: '35.71', name: 'Kota Kediri',
        districts: [
          { id: '35.71.01', name: 'Kediri Kota' },
          { id: '35.71.02', name: 'Dhoho' },
          { id: '35.71.03', name: 'Pakis' },
          { id: '35.71.04', name: 'Mojoroto' },
        ],
      },
      {
        id: '35.74', name: 'Kota Malang',
        districts: [
          { id: '35.74.01', name: 'Klojen' },
          { id: '35.74.02', name: 'Blimbing' },
          { id: '35.74.03', name: 'Kedungkandang' },
          { id: '35.74.04', name: 'Sukun' },
          { id: '35.74.05', name: 'Lowokwaru' },
        ],
      },
    ],
  },
  {
    id: '34', name: 'DI Yogyakarta',
    cities: [
      {
        id: '34.71', name: 'Kota Yogyakarta',
        districts: [
          { id: '34.71.01', name: 'Gondokusuman' },
          { id: '34.71.02', name: 'Jetis' },
          { id: '34.71.03', name: 'Tegalrejo' },
          { id: '34.71.04', name: 'Umbulharjo' },
          { id: '34.71.05', name: 'Kotagede' },
          { id: '34.71.06', name: 'Mantrijeron' },
          { id: '34.71.07', name: 'Kraton' },
          { id: '34.71.08', name: 'Gondomanan' },
          { id: '34.71.09', name: 'Ngampilan' },
          { id: '34.71.10', name: 'Wirobrajan' },
          { id: '34.71.11', name: 'Danurejan' },
          { id: '34.71.12', name: 'Mergangsan' },
          { id: '34.71.13', name: 'Pakualaman' },
          { id: '34.71.14', name: 'Bantul (Yogyakarta)' },
        ],
      },
      {
        id: '34.72', name: 'Kabupaten Sleman',
        districts: [
          { id: '34.72.01', name: 'Gamping' },
          { id: '34.72.02', name: 'Godean' },
          { id: '34.72.03', name: 'Moyudan' },
          { id: '34.72.04', name: 'Minggir' },
          { id: '34.72.05', name: 'Seyegan' },
          { id: '34.72.06', name: 'Tempel' },
          { id: '34.72.07', name: 'Turi' },
          { id: '34.72.08', name: 'Sleman' },
          { id: '34.72.09', name: 'Ngaglik' },
          { id: '34.72.10', name: 'Pakem' },
          { id: '34.72.11', name: 'Cangkringan' },
          { id: '34.72.12', name: 'Berbah' },
          { id: '34.72.13', name: 'Prambanan' },
          { id: '34.72.14', name: 'Kalasan' },
          { id: '34.72.15', name: 'Depok' },
          { id: '34.72.16', name: 'Ngemplak' },
        ],
      },
    ],
  },
  // ----- SUMATERA -----
  {
    id: '14', name: 'Riau',
    cities: [
      {
        id: '14.71', name: 'Kota Pekanbaru',
        districts: [
          { id: '14.71.01', name: 'Pekanbaru Kota' },
          { id: '14.71.02', name: 'Sail' },
          { id: '14.71.03', name: 'Senapelan' },
          { id: '14.71.04', name: 'Sukajadi' },
          { id: '14.71.05', name: 'Tampan' },
          { id: '14.71.06', name: 'Rumbai' },
          { id: '14.71.07', name: 'Rumbai Pesisir' },
          { id: '14.71.08', name: 'Bukit Raya' },
          { id: '14.71.09', name: 'Lima Puluh' },
          { id: '14.71.10', name: 'Marpoyan Damai' },
          { id: '14.71.11', name: 'Payung Sekaki' },
          { id: '14.71.12', name: 'Tenayan Raya' },
        ],
      },
    ],
  },
  {
    id: '12', name: 'Sumatera Utara',
    cities: [
      {
        id: '12.71', name: 'Kota Medan',
        districts: [
          { id: '12.71.01', name: 'Medan Tuntungan' },
          { id: '12.71.02', name: 'Medan Johor' },
          { id: '12.71.03', name: 'Medan Amplas' },
          { id: '12.71.04', name: 'Medan Denai' },
          { id: '12.71.05', name: 'Medan Area' },
          { id: '12.71.06', name: 'Medan Kota' },
          { id: '12.71.07', name: 'Medan Maimun' },
          { id: '12.71.08', name: 'Medan Polonia' },
          { id: '12.71.09', name: 'Medan Baru' },
          { id: '12.71.10', name: 'Medan Selayang' },
          { id: '12.71.11', name: 'Medan Sunggal' },
          { id: '12.71.12', name: 'Medan Helvetia' },
          { id: '12.71.13', name: 'Medan Petisah' },
          { id: '12.71.14', name: 'Medan Barat' },
          { id: '12.71.15', name: 'Medan Timur' },
          { id: '12.71.16', name: 'Medan Perjuangan' },
          { id: '12.71.17', name: 'Medan Tembung' },
          { id: '12.71.18', name: 'Medan Deli' },
          { id: '12.71.19', name: 'Medan Labuhan' },
          { id: '12.71.20', name: 'Medan Marelan' },
          { id: '12.71.21', name: 'Medan Belawan' },
        ],
      },
    ],
  },
  {
    id: '16', name: 'Sumatera Selatan',
    cities: [
      {
        id: '16.71', name: 'Kota Palembang',
        districts: [
          { id: '16.71.01', name: 'Ilir Timur I' },
          { id: '16.71.02', name: 'Ilir Timur II' },
          { id: '16.71.03', name: 'Ilir Barat I' },
          { id: '16.71.04', name: 'Ilir Barat II' },
          { id: '16.71.05', name: 'Seberang Ulu I' },
          { id: '16.71.06', name: 'Seberang Ulu II' },
          { id: '16.71.07', name: 'Sukarami' },
          { id: '16.71.08', name: 'Kalidoni' },
          { id: '16.71.09', name: 'Kemuning' },
          { id: '16.71.10', name: 'Bukit Kecil' },
          { id: '16.71.11', name: 'Gandus' },
          { id: '16.71.12', name: 'Kertapati' },
          { id: '16.71.13', name: 'Plaju' },
          { id: '16.71.14', name: 'Sako' },
          { id: '16.71.15', name: 'Alang-alang Lebar' },
          { id: '16.71.16', name: 'Sematang Borang' },
          { id: '16.71.17', name: 'Bukit Large' },
        ],
      },
    ],
  },
  {
    id: '18', name: 'Lampung',
    cities: [
      {
        id: '18.71', name: 'Kota Bandar Lampung',
        districts: [
          { id: '18.71.01', name: 'Bumi Waras' },
          { id: '18.71.02', name: 'Enggal' },
          { id: '18.71.03', name: 'Kedamaian' },
          { id: '18.71.04', name: 'Kemiling' },
          { id: '18.71.05', name: 'Kota Karang' },
          { id: '18.71.06', name: 'Labuhan Ratu' },
          { id: '18.71.07', name: 'Langkapura' },
          { id: '18.71.08', name: 'Panjang' },
          { id: '18.71.09', name: 'Rajabasa' },
          { id: '18.71.10', name: 'Sukabumi' },
          { id: '18.71.11', name: 'Sukarame' },
          { id: '18.71.12', name: 'Tanjung Karang Barat' },
          { id: '18.71.13', name: 'Tanjung Karang Pusat' },
          { id: '18.71.14', name: 'Tanjung Karang Timur' },
          { id: '18.71.15', name: 'Tanjung Senang' },
          { id: '18.71.16', name: 'Teluk Betung Barat' },
          { id: '18.71.17', name: 'Teluk Betung Selatan' },
          { id: '18.71.18', name: 'Teluk Betung Timur' },
          { id: '18.71.19', name: 'Teluk Betung Utara' },
          { id: '18.71.20', name: 'Way Halim' },
          { id: '18.71.21', name: 'Way Pengubuan' },
        ],
      },
    ],
  },
  // ----- BALI & NUSA TENGGARA -----
  {
    id: '51', name: 'Bali',
    cities: [
      {
        id: '51.71', name: 'Kota Denpasar',
        districts: [
          { id: '51.71.01', name: 'Denpasar Selatan' },
          { id: '51.71.02', name: 'Denpasar Timur' },
          { id: '51.71.03', name: 'Denpasar Barat' },
          { id: '51.71.04', name: 'Denpasar Utara' },
        ],
      },
      {
        id: '51.72', name: 'Kabupaten Badung',
        districts: [
          { id: '51.72.01', name: 'Kuta' },
          { id: '51.72.02', name: 'Kuta Selatan' },
          { id: '51.72.03', name: 'Kuta Utara' },
          { id: '51.72.04', name: 'Mengwi' },
          { id: '51.72.05', name: 'Abiansemal' },
          { id: '51.72.06', name: 'Petang' },
          { id: '51.72.07', name: 'Kuta Selatan' },
        ],
      },
    ],
  },
  {
    id: '52', name: 'Nusa Tenggara Barat',
    cities: [
      {
        id: '52.72', name: 'Kota Mataram',
        districts: [
          { id: '52.72.01', name: 'Ampenan' },
          { id: '52.72.02', name: 'Cakranegara' },
          { id: '52.72.03', name: 'Mataram' },
          { id: '52.72.04', name: 'Selaparang' },
          { id: '52.72.05', name: 'Sekarbela' },
          { id: '52.72.06', name: 'Sandubaya' },
        ],
      },
    ],
  },
  // ----- KALIMANTAN -----
  {
    id: '63', name: 'Kalimantan Selatan',
    cities: [
      {
        id: '63.71', name: 'Kota Banjarmasin',
        districts: [
          { id: '63.71.01', name: 'Banjarmasin Barat' },
          { id: '63.71.02', name: 'Banjarmasin Selatan' },
          { id: '63.71.03', name: 'Banjarmasin Tengah' },
          { id: '63.71.04', name: 'Banjarmasin Timur' },
          { id: '63.71.05', name: 'Banjarmasin Utara' },
          { id: '63.71.06', name: 'Banjar Tengah' },
        ],
      },
    ],
  },
  {
    id: '64', name: 'Kalimantan Timur',
    cities: [
      {
        id: '64.71', name: 'Kota Samarinda',
        districts: [
          { id: '64.71.01', name: 'Samarinda Ulu' },
          { id: '64.71.02', name: 'Samarinda Ilir' },
          { id: '64.71.03', name: 'Samarinda Seberang' },
          { id: '64.71.04', name: 'Samarinda Utara' },
          { id: '64.71.05', name: 'Sungai Kunjang' },
          { id: '64.71.06', name: 'Palaran' },
          { id: '64.71.07', name: 'Loa Janan Ilir' },
          { id: '64.71.08', name: 'Sambutan' },
        ],
      },
      {
        id: '64.74', name: 'Kota Balikpapan',
        districts: [
          { id: '64.74.01', name: 'Balikpapan Tengah' },
          { id: '64.74.02', name: 'Balikpapan Barat' },
          { id: '64.74.03', name: 'Balikpapan Timur' },
          { id: '64.74.04', name: 'Balikpapan Selatan' },
          { id: '64.74.05', name: 'Balikpapan Utara' },
          { id: '64.74.06', name: 'Karang Jamu' },
        ],
      },
    ],
  },
  // ----- SULAWESI -----
  {
    id: '73', name: 'Sulawesi Selatan',
    cities: [
      {
        id: '73.71', name: 'Kota Makassar',
        districts: [
          { id: '73.71.01', name: 'Mariso' },
          { id: '73.71.02', name: 'Mamajang' },
          { id: '73.71.03', name: 'Tallo' },
          { id: '73.71.04', name: 'Rappocini' },
          { id: '73.71.05', name: 'Makassar' },
          { id: '73.71.06', name: 'Ujung Pandang' },
          { id: '73.71.07', name: 'Wajo' },
          { id: '73.71.08', name: 'Bontoala' },
          { id: '73.71.09', name: 'Tamalate' },
        ],
      },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding master wilayah Indonesia...')

  let provinceCount = 0
  let cityCount = 0
  let districtCount = 0

  for (const p of WILAYAH) {
    await db.province.upsert({
      where: { id: p.id },
      update: { name: p.name, altName: p.altName ?? null },
      create: { id: p.id, name: p.name, altName: p.altName ?? null },
    })
    provinceCount++

    for (const c of p.cities) {
      await db.city.upsert({
        where: { id: c.id },
        update: { name: c.name, provinceId: p.id, altName: c.altName ?? null },
        create: { id: c.id, name: c.name, provinceId: p.id, altName: c.altName ?? null },
      })
      cityCount++

      for (const d of c.districts) {
        await db.district.upsert({
          where: { id: d.id },
          update: { name: d.name, cityId: c.id },
          create: { id: d.id, name: d.name, cityId: c.id },
        })
        districtCount++
      }
    }
  }

  console.log(`✅ Seeding wilayah selesai:`)
  console.log(`   ${provinceCount} provinsi, ${cityCount} kota/kabupaten, ${districtCount} kecamatan`)
}

main()
  .catch((e) => {
    console.error('❌ Seed wilayah error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
