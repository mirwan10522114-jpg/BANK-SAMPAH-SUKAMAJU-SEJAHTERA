-- =====================================
-- Bank Sampah Sukamaju Sejahtera
-- MySQL Database for Laragon
-- Generated: 2026-07-15T23:20:00.255Z
-- =====================================

CREATE DATABASE IF NOT EXISTS bank_sampah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bank_sampah;

-- ==================== USERS & ROLES ====================
CREATE TABLE IF NOT EXISTS `User` (
  id VARCHAR(128) PRIMARY KEY,
  memberCode VARCHAR(128) UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  nik VARCHAR(255) UNIQUE,
  phone VARCHAR(255),
  address TEXT,
  password VARCHAR(255) NOT NULL DEFAULT 'password',
  roles VARCHAR(255) NOT NULL DEFAULT '[]',
  isMember BOOLEAN NOT NULL DEFAULT FALSE,
  isEmailVerified BOOLEAN NOT NULL DEFAULT FALSE,
  emailVerifiedAt DATETIME NULL,
  memberJoinedAt DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Balance (
  id VARCHAR(128) PRIMARY KEY,
  userId VARCHAR(128) NOT NULL UNIQUE,
  saldoTertahan DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldoTersedia DECIMAL(15,2) NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS MemberCodeCounter (
  id VARCHAR(128) PRIMARY KEY,
  prefix VARCHAR(255) NOT NULL UNIQUE,
  counter INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== WASTE CATEGORIES & ITEMS ====================
CREATE TABLE IF NOT EXISTS WasteCategory (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image VARCHAR(255),
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS WasteItem (
  id VARCHAR(128) PRIMARY KEY,
  wasteCategoryId VARCHAR(128) NOT NULL,
  code VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image VARCHAR(255),
  defaultUnit VARCHAR(255) NOT NULL DEFAULT 'kg',
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (wasteCategoryId) REFERENCES WasteCategory(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS WastePrice (
  id VARCHAR(128) PRIMARY KEY,
  wasteItemId VARCHAR(128) NOT NULL,
  pricePerUnit DECIMAL(15,2) NOT NULL DEFAULT 0,
  effectiveFrom DATE NOT NULL,
  notes TEXT,
  createdById VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (wasteItemId) REFERENCES WasteItem(id) ON DELETE CASCADE,
  FOREIGN KEY (createdById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SAVING TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS SavingTransaction (
  id VARCHAR(128) PRIMARY KEY,
  userId VARCHAR(128) NOT NULL,
  totalWeight DECIMAL(15,3) NOT NULL DEFAULT 0,
  totalValue DECIMAL(15,2) NOT NULL DEFAULT 0,
  pointsAwarded INT NOT NULL DEFAULT 0,
  qcStatus VARCHAR(255) NOT NULL DEFAULT 'pending',
  qcNotes TEXT,
  qcById VARCHAR(128) NULL,
  qcAt DATETIME NULL,
  notes TEXT,
  transactedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE RESTRICT,
  FOREIGN KEY (qcById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS SavingTransactionItem (
  id VARCHAR(128) PRIMARY KEY,
  savingTransactionId VARCHAR(128) NOT NULL,
  wasteItemId VARCHAR(128) NOT NULL,
  itemCodeSnapshot VARCHAR(255),
  itemNameSnapshot VARCHAR(255),
  categoryNameSnapshot VARCHAR(255),
  pricePerUnitSnapshot DECIMAL(15,2) NOT NULL DEFAULT 0,
  quantityBeforeQc DECIMAL(15,3) NOT NULL DEFAULT 0,
  quantityAfterQc DECIMAL(15,3),
  susutQc DECIMAL(15,3) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (savingTransactionId) REFERENCES SavingTransaction(id) ON DELETE CASCADE,
  FOREIGN KEY (wasteItemId) REFERENCES WasteItem(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SEDEKAH TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS SedekahTransaction (
  id VARCHAR(128) PRIMARY KEY,
  userId VARCHAR(128) NULL,
  donorName VARCHAR(255),
  totalWeight DECIMAL(15,3) NOT NULL DEFAULT 0,
  totalWeightKotor DECIMAL(15,3) NOT NULL DEFAULT 0,
  totalWeightBersih DECIMAL(15,3),
  persentaseSusut DECIMAL(5,2),
  qcStatus VARCHAR(255) NOT NULL DEFAULT 'pending',
  qcNotes TEXT,
  qcById VARCHAR(128) NULL,
  qcAt DATETIME NULL,
  notes TEXT,
  transactedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE SET NULL,
  FOREIGN KEY (qcById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS SedekahTransactionItem (
  id VARCHAR(128) PRIMARY KEY,
  sedekahTransactionId VARCHAR(128) NOT NULL,
  wasteItemId VARCHAR(128) NOT NULL,
  itemCodeSnapshot VARCHAR(255),
  itemNameSnapshot VARCHAR(255),
  categoryNameSnapshot VARCHAR(255),
  quantityBeforeQc DECIMAL(15,3) NOT NULL DEFAULT 0,
  quantityAfterQc DECIMAL(15,3),
  susutQc DECIMAL(15,3) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sedekahTransactionId) REFERENCES SedekahTransaction(id) ON DELETE CASCADE,
  FOREIGN KEY (wasteItemId) REFERENCES WasteItem(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== POINTS ====================
CREATE TABLE IF NOT EXISTS PointHistory (
  id VARCHAR(128) PRIMARY KEY,
  userId VARCHAR(128) NOT NULL,
  type VARCHAR(255) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  balanceAfter INT NOT NULL DEFAULT 0,
  description TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== KOPERASI ====================
CREATE TABLE IF NOT EXISTS KoperasiSetting (
  id VARCHAR(128) PRIMARY KEY,
  namaKoperasi VARCHAR(255),
  nominalSimpananPokok DECIMAL(15,2) NOT NULL DEFAULT 100000,
  nominalSimpananWajib DECIMAL(15,2) NOT NULL DEFAULT 10000,
  biayaAdminPinjaman DECIMAL(15,2) NOT NULL DEFAULT 50000,
  sukuBungaPinjaman DECIMAL(5,2) NOT NULL DEFAULT 6,
  dendaTerlambatPerHari INT NOT NULL DEFAULT 5000,
  minimalBulanAnggota INT NOT NULL DEFAULT 3,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS KoperasiAnggota (
  id VARCHAR(128) PRIMARY KEY,
  nomorAnggota VARCHAR(255) NOT NULL UNIQUE,
  nama VARCHAR(255) NOT NULL,
  noKtp VARCHAR(255) NOT NULL DEFAULT '',
  noTelepon VARCHAR(255),
  alamat TEXT,
  foto VARCHAR(255),
  status VARCHAR(255) NOT NULL DEFAULT 'aktif',
  tanggalBergabung DATETIME NOT NULL,
  tanggalKeluar DATETIME NULL,
  deletedAt DATETIME NULL,
  pinjamanDiblokir BOOLEAN NOT NULL DEFAULT FALSE,
  userId VARCHAR(128) NULL UNIQUE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS KoperasiSimpananSaldo (
  id VARCHAR(128) PRIMARY KEY,
  koperasiAnggotaId VARCHAR(128) NOT NULL,
  jenisSimpanan VARCHAR(255) NOT NULL,
  saldo DECIMAL(15,2) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_anggota_jenis (koperasiAnggotaId, jenisSimpanan),
  FOREIGN KEY (koperasiAnggotaId) REFERENCES KoperasiAnggota(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS KoperasiSimpananTransaksi (
  id VARCHAR(128) PRIMARY KEY,
  nomorTransaksi VARCHAR(255) NOT NULL UNIQUE,
  koperasiAnggotaId VARCHAR(128) NOT NULL,
  jenisSimpanan VARCHAR(255) NOT NULL,
  tipe VARCHAR(255) NOT NULL,
  jumlah DECIMAL(15,2) NOT NULL,
  saldoSebelum DECIMAL(15,2) NOT NULL,
  saldoSesudah DECIMAL(15,2) NOT NULL,
  keterangan TEXT,
  tanggalTransaksi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  userId VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (koperasiAnggotaId) REFERENCES KoperasiAnggota(id) ON DELETE RESTRICT,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS KoperasiPinjaman (
  id VARCHAR(128) PRIMARY KEY,
  nomorPinjaman VARCHAR(255) NOT NULL UNIQUE,
  koperasiAnggotaId VARCHAR(128) NOT NULL,
  jumlahPinjaman DECIMAL(15,2) NOT NULL,
  tenorBulan INT NOT NULL,
  angsuranPerBulan DECIMAL(15,2) NOT NULL,
  biayaAdmin DECIMAL(15,2) NOT NULL DEFAULT 0,
  tanggalPengajuan DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tanggalPencairan DATETIME NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'diajukan',
  sisaPinjaman DECIMAL(15,2) NOT NULL,
  sukuBunga DECIMAL(5,2) NOT NULL DEFAULT 0,
  keterangan TEXT,
  userId VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (koperasiAnggotaId) REFERENCES KoperasiAnggota(id) ON DELETE RESTRICT,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS KoperasiPinjamanAngsuran (
  id VARCHAR(128) PRIMARY KEY,
  koperasiPinjamanId VARCHAR(128) NOT NULL,
  angsuranKe INT NOT NULL,
  jumlahBayar DECIMAL(15,2) NOT NULL,
  dendaBayar INT NOT NULL DEFAULT 0,
  tanggalBayar DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sisaPinjamanSetelah DECIMAL(15,2) NOT NULL,
  keterangan TEXT,
  userId VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pinjaman_angsuranke (koperasiPinjamanId, angsuranKe),
  FOREIGN KEY (koperasiPinjamanId) REFERENCES KoperasiPinjaman(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS KoperasiKasTransaksi (
  id VARCHAR(128) PRIMARY KEY,
  nomorReferensi VARCHAR(255),
  sumber VARCHAR(255) NOT NULL,
  tipe VARCHAR(255) NOT NULL,
  jumlah DECIMAL(15,2) NOT NULL,
  keterangan TEXT,
  tanggalTransaksi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  userId VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS KoperasiPenarikanSukarela (
  id VARCHAR(128) PRIMARY KEY,
  nomorPengajuan VARCHAR(255) NOT NULL UNIQUE,
  koperasiAnggotaId VARCHAR(128) NOT NULL,
  jumlah DECIMAL(15,2) NOT NULL,
  alasan TEXT NOT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'menunggu',
  tanggalPengajuan DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tanggalPersetujuan DATETIME NULL,
  namaPengurus VARCHAR(255),
  tanggalPencairan DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (koperasiAnggotaId) REFERENCES KoperasiAnggota(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== PRODUCTS & TOKO ====================
CREATE TABLE IF NOT EXISTS ProductCategory (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  image VARCHAR(255),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Product (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image VARCHAR(255),
  images VARCHAR(1000) NOT NULL DEFAULT '[]',
  unit VARCHAR(255) NOT NULL DEFAULT 'pcs',
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  pointsCost INT NOT NULL DEFAULT 0,
  stock DECIMAL(15,2) NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  productCategoryId VARCHAR(128) NULL,
  weightGram INT NOT NULL DEFAULT 0,
  lengthCm INT NOT NULL DEFAULT 0,
  widthCm INT NOT NULL DEFAULT 0,
  heightCm INT NOT NULL DEFAULT 0,
  dijualOnline BOOLEAN NOT NULL DEFAULT FALSE,
  dijualOffline BOOLEAN NOT NULL DEFAULT TRUE,
  minOrderQty INT NOT NULL DEFAULT 1,
  maxOrderQty INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productCategoryId) REFERENCES ProductCategory(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ProductPrice (
  id VARCHAR(128) PRIMARY KEY,
  productId VARCHAR(128) NOT NULL,
  pricePerUnit DECIMAL(15,2) NOT NULL DEFAULT 0,
  effectiveFrom DATE NOT NULL,
  notes TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ProductMovement (
  id VARCHAR(128) PRIMARY KEY,
  productId VARCHAR(128) NOT NULL,
  direction VARCHAR(255) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  quantity DECIMAL(15,2) NOT NULL,
  stockAfter DECIMAL(15,2) NOT NULL,
  sourceRefType VARCHAR(255),
  sourceRefId VARCHAR(128),
  notes TEXT,
  createdById VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE RESTRICT,
  FOREIGN KEY (createdById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ProductSale (
  id VARCHAR(128) PRIMARY KEY,
  buyerName VARCHAR(255) NOT NULL,
  buyerPhone VARCHAR(255),
  paymentMethod VARCHAR(255) NOT NULL DEFAULT 'cash',
  paymentStatus VARCHAR(255) NOT NULL DEFAULT 'paid',
  totalQuantity DECIMAL(15,2) NOT NULL DEFAULT 0,
  totalValue DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount DECIMAL(15,2) NOT NULL DEFAULT 0,
  amountPaid DECIMAL(15,2) NOT NULL DEFAULT 0,
  `change` DECIMAL(15,2) NOT NULL DEFAULT 0,
  channel VARCHAR(255) NOT NULL DEFAULT 'offline',
  notes TEXT,
  refNumber VARCHAR(255),
  transactedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdById VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ProductSaleItem (
  id VARCHAR(128) PRIMARY KEY,
  productSaleId VARCHAR(128) NOT NULL,
  productId VARCHAR(128) NOT NULL,
  productNameSnapshot VARCHAR(255) NOT NULL,
  unitSnapshot VARCHAR(255) NOT NULL,
  pricePerUnitSnapshot DECIMAL(15,2) NOT NULL,
  quantity DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productSaleId) REFERENCES ProductSale(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS TokoOrder (
  id VARCHAR(128) PRIMARY KEY,
  orderNumber VARCHAR(255) NOT NULL UNIQUE,
  buyerName VARCHAR(255) NOT NULL,
  buyerPhone VARCHAR(255) NOT NULL,
  buyerEmail VARCHAR(255),
  buyerAddress TEXT NOT NULL,
  subtotalProduk DECIMAL(15,2) NOT NULL DEFAULT 0,
  ongkir DECIMAL(15,2) NOT NULL DEFAULT 0,
  totalBayar DECIMAL(15,2) NOT NULL DEFAULT 0,
  paymentMethod VARCHAR(255) NOT NULL DEFAULT 'midtrans',
  paymentStatus VARCHAR(255) NOT NULL DEFAULT 'menunggu',
  midtransOrderId VARCHAR(255) UNIQUE,
  midtransSnapToken VARCHAR(255),
  paidAt DATETIME NULL,
  orderStatus VARCHAR(255) NOT NULL DEFAULT 'menunggu_pembayaran',
  kurirNama VARCHAR(255),
  noResi VARCHAR(255),
  shippedAt DATETIME NULL,
  receivedAt DATETIME NULL,
  notes TEXT,
  createdById VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS TokoOrderItem (
  id VARCHAR(128) PRIMARY KEY,
  tokoOrderId VARCHAR(128) NOT NULL,
  productId VARCHAR(128) NOT NULL,
  productNameSnapshot VARCHAR(255) NOT NULL,
  unitSnapshot VARCHAR(255) NOT NULL,
  pricePerUnitSnapshot DECIMAL(15,2) NOT NULL,
  quantity DECIMAL(15,2) NOT NULL,
  weightGramSnapshot INT NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tokoOrderId) REFERENCES TokoOrder(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS TokoOrderStatusHistory (
  id VARCHAR(128) PRIMARY KEY,
  tokoOrderId VARCHAR(128) NOT NULL,
  status VARCHAR(255) NOT NULL,
  keterangan TEXT,
  createdById VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tokoOrderId) REFERENCES TokoOrder(id) ON DELETE CASCADE,
  FOREIGN KEY (createdById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS TokoSetting (
  id VARCHAR(128) PRIMARY KEY,
  tokoOnlineAktif BOOLEAN NOT NULL DEFAULT FALSE,
  ongkirRatePerKg DECIMAL(15,2) NOT NULL DEFAULT 0,
  ongkirRatePerKm DECIMAL(15,2) NOT NULL DEFAULT 0,
  ongkirTetap DECIMAL(15,2) NOT NULL DEFAULT 0,
  beratMinimumKg DECIMAL(10,2) NOT NULL DEFAULT 1,
  originAddress TEXT,
  midtransServerKey VARCHAR(255),
  midtransClientKey VARCHAR(255),
  midtransIsProduction BOOLEAN NOT NULL DEFAULT FALSE,
  stokRendahThreshold INT NOT NULL DEFAULT 5,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS TokoAturan (
  id VARCHAR(128) PRIMARY KEY,
  productCategoryId VARCHAR(128) NULL,
  minPembelian DECIMAL(15,2) NOT NULL DEFAULT 0,
  maxPembelian DECIMAL(15,2) NOT NULL DEFAULT 0,
  berlakuOffline BOOLEAN NOT NULL DEFAULT TRUE,
  berlakuOnline BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productCategoryId) REFERENCES ProductCategory(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== PARTNER (MITRA) ====================
CREATE TABLE IF NOT EXISTS Partner (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL DEFAULT 'pengepul',
  phone VARCHAR(255),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== INVENTORY ====================
CREATE TABLE IF NOT EXISTS InventoryMovement (
  id VARCHAR(128) PRIMARY KEY,
  wasteItemId VARCHAR(128) NOT NULL,
  direction VARCHAR(255) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  stockAfter DECIMAL(15,3) NOT NULL,
  sourceRefType VARCHAR(255),
  sourceRefId VARCHAR(128),
  notes TEXT,
  unitCost DECIMAL(15,2),
  createdById VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (wasteItemId) REFERENCES WasteItem(id) ON DELETE RESTRICT,
  FOREIGN KEY (createdById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== PROCESSING ====================
CREATE TABLE IF NOT EXISTS ProcessingTransaction (
  id VARCHAR(128) PRIMARY KEY,
  batchNumber VARCHAR(255) NOT NULL UNIQUE,
  notes TEXT,
  totalModalBahan DECIMAL(15,2) NOT NULL DEFAULT 0,
  totalOutput DECIMAL(15,3) NOT NULL DEFAULT 0,
  status VARCHAR(255) NOT NULL DEFAULT 'draft',
  transactedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdById VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ProcessingBahan (
  id VARCHAR(128) PRIMARY KEY,
  processingTransactionId VARCHAR(128) NOT NULL,
  wasteItemId VARCHAR(128) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unitCost DECIMAL(15,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  source VARCHAR(255) NOT NULL DEFAULT 'nabung',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (processingTransactionId) REFERENCES ProcessingTransaction(id) ON DELETE CASCADE,
  FOREIGN KEY (wasteItemId) REFERENCES WasteItem(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ProcessingOutput (
  id VARCHAR(128) PRIMARY KEY,
  processingTransactionId VARCHAR(128) NOT NULL,
  productId VARCHAR(128) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit VARCHAR(255) NOT NULL DEFAULT 'pcs',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (processingTransactionId) REFERENCES ProcessingTransaction(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== PENJUALAN MITRA ====================
CREATE TABLE IF NOT EXISTS PenjualanMitra (
  id VARCHAR(128) PRIMARY KEY,
  partnerId VARCHAR(128) NOT NULL,
  invoiceNumber VARCHAR(255) NOT NULL UNIQUE,
  notes TEXT,
  totalValue DECIMAL(15,2) NOT NULL DEFAULT 0,
  transactedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdById VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (partnerId) REFERENCES Partner(id) ON DELETE RESTRICT,
  FOREIGN KEY (createdById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PenjualanMitraItem (
  id VARCHAR(128) PRIMARY KEY,
  penjualanMitraId VARCHAR(128) NOT NULL,
  wasteItemId VARCHAR(128) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  hargaJual DECIMAL(15,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (penjualanMitraId) REFERENCES PenjualanMitra(id) ON DELETE CASCADE,
  FOREIGN KEY (wasteItemId) REFERENCES WasteItem(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== REDEMPTION ====================
CREATE TABLE IF NOT EXISTS Redemption (
  id VARCHAR(128) PRIMARY KEY,
  userId VARCHAR(128) NOT NULL,
  productId VARCHAR(128) NOT NULL,
  productNameSnapshot VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  pointsUsed INT NOT NULL DEFAULT 0,
  redeemedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== KOPERASI PINJAMAN PERBAIKAN ====================
CREATE TABLE IF NOT EXISTS KoperasiPinjamanPerbaikan (
  id VARCHAR(128) PRIMARY KEY,
  koperasiAnggotaId VARCHAR(128) NOT NULL,
  alasan TEXT NOT NULL,
  janjiPerbaikan TEXT,
  status VARCHAR(255) NOT NULL DEFAULT 'menunggu',
  catatanAdmin TEXT,
  syaratTambahan TEXT,
  reviewedById VARCHAR(128) NULL,
  reviewedAt DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (koperasiAnggotaId) REFERENCES KoperasiAnggota(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewedById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS KoperasiAnggotaKeluar (
  id VARCHAR(128) PRIMARY KEY,
  koperasiAnggotaId VARCHAR(128) NOT NULL,
  totalSimpanan DECIMAL(15,2) NOT NULL DEFAULT 0,
  sisaPinjaman DECIMAL(15,2) NOT NULL DEFAULT 0,
  danaDikembalikan DECIMAL(15,2) NOT NULL DEFAULT 0,
  tanggalKeluar DATETIME NOT NULL,
  keterangan TEXT,
  userId VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (koperasiAnggotaId) REFERENCES KoperasiAnggota(id) ON DELETE RESTRICT,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== ARTICLE (EDUKASI) ====================
CREATE TABLE IF NOT EXISTS Article (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featuredImage VARCHAR(255),
  publishedAt DATETIME NULL,
  authorId VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (authorId) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== KEGIATAN ====================
CREATE TABLE IF NOT EXISTS Kegiatan (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  activityDate DATETIME NULL,
  location VARCHAR(255),
  images VARCHAR(1000) NOT NULL DEFAULT '[]',
  coverImage VARCHAR(255),
  publishedAt DATETIME NULL,
  authorId VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (authorId) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== PENARIKAN BS ====================
CREATE TABLE IF NOT EXISTS PenarikanBS (
  id VARCHAR(128) PRIMARY KEY,
  userId VARCHAR(128) NOT NULL,
  receiptNo VARCHAR(255) NOT NULL UNIQUE,
  amount DECIMAL(15,2) NOT NULL,
  method VARCHAR(255) NOT NULL DEFAULT 'cash',
  status VARCHAR(255) NOT NULL DEFAULT 'pending',
  processedAt DATETIME NULL,
  processedById VARCHAR(128) NULL,
  notes TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE RESTRICT,
  FOREIGN KEY (processedById) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== KAS BANK SAMPAH ====================
CREATE TABLE IF NOT EXISTS KasBankSampah (
  id VARCHAR(128) PRIMARY KEY,
  tipe VARCHAR(255) NOT NULL,
  sumber VARCHAR(255) NOT NULL,
  jumlah DECIMAL(15,2) NOT NULL,
  keterangan TEXT,
  tanggalTransaksi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  userId VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES `User`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== POINT RULES ====================
CREATE TABLE IF NOT EXISTS PointRule (
  id VARCHAR(128) PRIMARY KEY,
  pointsPerRupiah DECIMAL(10,4) NOT NULL DEFAULT 0,
  rupiahPerPoint DECIMAL(15,2) NOT NULL DEFAULT 0,
  effectiveFrom DATE NOT NULL,
  notes TEXT,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- ==================== SAMPLE DATA ====================

INSERT INTO `User` (id, memberCode, name, email, nik, phone, address, password, roles, isMember, isEmailVerified, emailVerifiedAt, memberJoinedAt, createdAt, updatedAt) VALUES ('cmrivn4zl0000v7feteb5k5bh', NULL, 'Admin Utama', 'admin@gmail.com', '1111111111111111', '081111111111', NULL, 'password', '["admin"]', FALSE, FALSE, NULL, NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO `User` (id, memberCode, name, email, nik, phone, address, password, roles, isMember, isEmailVerified, emailVerifiedAt, memberJoinedAt, createdAt, updatedAt) VALUES ('cmrivn4zq0001v7feckqjm34s', NULL, 'Owner Sistem', 'owner@gmail.com', '2222222222222222', '082222222222', NULL, 'password', '["owner"]', FALSE, FALSE, NULL, NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO `User` (id, memberCode, name, email, nik, phone, address, password, roles, isMember, isEmailVerified, emailVerifiedAt, memberJoinedAt, createdAt, updatedAt) VALUES ('cmrj3u6z70001v7n7bae4hqt9', 'BS003', 'Mirwan Kholid', 'mirwan.10522114@mahasiswa.unikom.ac.id', '1232132132131221', '081211547844', 'padalrang', 'password', '["koperasi","nasabah"]', TRUE, FALSE, '2026-07-13 10:54:07', '2026-07-13 10:53:58', '2026-07-13 10:53:58', '2026-07-15 21:38:19');
INSERT INTO `User` (id, memberCode, name, email, nik, phone, address, password, roles, isMember, isEmailVerified, emailVerifiedAt, memberJoinedAt, createdAt, updatedAt) VALUES ('cmrj45dtm0000v7u9ek78c9m3', 'BS002', 'Budi Santoso (Test Pinjaman)', 'testpinjaman@gmail.com', '3333333333333333', '083333333333', NULL, 'password', '["nasabah","koperasi"]', TRUE, FALSE, NULL, '2024-01-01 00:00:00', '2026-07-13 11:02:40', '2026-07-15 21:46:17');
INSERT INTO Balance (id, userId, saldoTertahan, saldoTersedia, points, createdAt, updatedAt) VALUES ('cmrjs82z0000qv7ika3ilthir', 'cmrj3u6z70001v7n7bae4hqt9', 0, 17998, 179, '2026-07-13 22:16:36', '2026-07-14 01:55:11');
INSERT INTO Balance (id, userId, saldoTertahan, saldoTersedia, points, createdAt, updatedAt) VALUES ('cmrjtacwq0017v7fwlhvfxqql', 'cmrj45dtm0000v7u9ek78c9m3', 0, 0, 0, '2026-07-13 22:46:22', '2026-07-13 22:46:22');
INSERT INTO WasteCategory (id, name, slug, description, image, isActive, createdAt, updatedAt) VALUES ('cmrivn4zw0007v7fe2sujurp5', 'Kertas', 'kertas', 'Dus, duplex, arsip, buku bekas.', NULL, TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteCategory (id, name, slug, description, image, isActive, createdAt, updatedAt) VALUES ('cmrivn4zx0008v7feranp03ei', 'Logam', 'logam', 'Besi, kaleng, tembaga, seng, aluminium.', NULL, TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteCategory (id, name, slug, description, image, isActive, createdAt, updatedAt) VALUES ('cmrivn4zy0009v7feor6rdlac', 'Botol', 'botol', 'Botol kaca bening, botol warna, beling.', NULL, TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteCategory (id, name, slug, description, image, isActive, createdAt, updatedAt) VALUES ('cmrivn4zz000av7fefqrd8q1n', 'Plastik', 'plastik', 'PET, kresek, galon, jenis plastik lain.', NULL, TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteCategory (id, name, slug, description, image, isActive, createdAt, updatedAt) VALUES ('cmrivn500000bv7ferp2iq7b7', 'Lain-lain', 'lain-lain', 'Karpet, sandal karet, minyak jelantah, fiber, paralon.', NULL, TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteCategory (id, name, slug, description, image, isActive, createdAt, updatedAt) VALUES ('cmrivn501000cv7fe2of32ae7', 'Residu', 'residu', 'Sampah multilayer tak terdaur.', NULL, TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn502000ev7fegqlw1bcl', 'cmrivn4zw0007v7fe2sujurp5', 'KT1', 'Dus', 'dus-kt1', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn505000gv7feieigc9zj', 'cmrivn4zw0007v7fe2sujurp5', 'KT2', 'Duplex', 'duplex-kt2', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn507000iv7feszrk9x09', 'cmrivn4zw0007v7fe2sujurp5', 'KT3', 'Arsip', 'arsip-kt3', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50a000kv7fewvkpf4qg', 'cmrivn4zw0007v7fe2sujurp5', 'KT4', 'Buku', 'buku-kt4', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50c000mv7fe3m96xizj', 'cmrivn4zx0008v7feranp03ei', 'LG1', 'Besi 1', 'besi-1-lg1', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50d000ov7febinm1d71', 'cmrivn4zx0008v7feranp03ei', 'LG2', 'Besi 2 (Paku)', 'besi-2-paku-lg2', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50f000qv7fepix3n6on', 'cmrivn4zx0008v7feranp03ei', 'LG3', 'Kaleng', 'kaleng-lg3', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50h000sv7feg7xfdslr', 'cmrivn4zx0008v7feranp03ei', 'LG4', 'Kaleng Aluminium/Aro', 'kaleng-aluminium-lg4', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50i000uv7feo1y2j48g', 'cmrivn4zx0008v7feranp03ei', 'LG5', 'Tembaga', 'tembaga-lg5', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50k000wv7fepbwrpg1u', 'cmrivn4zx0008v7feranp03ei', 'LG6', 'Seng', 'seng-lg6', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50m000yv7fewo6kdjq2', 'cmrivn4zy0009v7feor6rdlac', 'BL1', 'Botol Bening', 'botol-bening-bl1', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50o0010v7fe89vxwpky', 'cmrivn4zy0009v7feor6rdlac', 'BL2', 'Botol Warna/Kecap', 'botol-warna-bl2', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50q0012v7festn9adfd', 'cmrivn4zy0009v7feor6rdlac', 'BL3', 'Beling', 'beling-bl3', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50s0014v7feu6xvzrik', 'cmrivn4zz000av7fefqrd8q1n', 'PL1', 'AGB', 'agb-pl1', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50u0016v7fes6lpkmzz', 'cmrivn4zz000av7fefqrd8q1n', 'PL2', 'AGK', 'agk-pl2', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50w0018v7feeh36ztcw', 'cmrivn4zz000av7fefqrd8q1n', 'PL3', 'PET Botol Bersih', 'pet-bersih-pl3', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn50y001av7fe54dz3v0t', 'cmrivn4zz000av7fefqrd8q1n', 'PL4', 'PET Botol Kotor', 'pet-kotor-pl4', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn510001cv7fei6200ob8', 'cmrivn4zz000av7fefqrd8q1n', 'PL5', 'Ale-Ale', 'ale-ale-pl5', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn512001ev7fem1j4d5cj', 'cmrivn4zz000av7fefqrd8q1n', 'PL6', 'Mizone Bersih', 'mizone-bersih-pl6', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn514001gv7febdo548pb', 'cmrivn4zz000av7fefqrd8q1n', 'PL7', 'Mizone Kotor', 'mizone-kotor-pl7', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn516001iv7fe2ezzg9x5', 'cmrivn4zz000av7fefqrd8q1n', 'PL8', 'Jeli', 'jeli-pl8', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn518001kv7fe7pszhvjj', 'cmrivn4zz000av7fefqrd8q1n', 'PL9', 'Kerasan', 'kerasan-pl9', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn51a001mv7fevegb2n0n', 'cmrivn4zz000av7fefqrd8q1n', 'PL10', 'Gebrus 1 (GB 1)', 'gebrus-1-pl10', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn51c001ov7fe74ez7q7b', 'cmrivn4zz000av7fefqrd8q1n', 'PL11', 'Gebrus 2 (GB 2)', 'gebrus-2-pl11', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn51e001qv7fehh5eq9ax', 'cmrivn4zz000av7fefqrd8q1n', 'PL11A', 'Gebrus 3 (GB 3)', 'gebrus-3-pl11a', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WasteItem (id, wasteCategoryId, code, name, slug, description, image, defaultUnit, isActive, createdAt, updatedAt) VALUES ('cmrivn51g001sv7fekxmokee3', 'cmrivn501000cv7fe2of32ae7', 'R1', 'Plastik Residu Multilayer', 'residu-multilayer-r1', NULL, NULL, 'undefined', TRUE, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-KT1', 'cmrivn502000ev7fegqlw1bcl', 1000, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-KT2', 'cmrivn505000gv7feieigc9zj', 300, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-KT3', 'cmrivn507000iv7feszrk9x09', 800, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-KT4', 'cmrivn50a000kv7fewvkpf4qg', 500, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-LG1', 'cmrivn50c000mv7fe3m96xizj', 1500, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-LG2', 'cmrivn50d000ov7febinm1d71', 1000, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-LG3', 'cmrivn50f000qv7fepix3n6on', 500, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-LG4', 'cmrivn50h000sv7feg7xfdslr', 4500, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-LG5', 'cmrivn50i000uv7feo1y2j48g', 3000, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-LG6', 'cmrivn50k000wv7fepbwrpg1u', 500, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-BL1', 'cmrivn50m000yv7fewo6kdjq2', 100, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-BL2', 'cmrivn50o0010v7fe89vxwpky', 200, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-BL3', 'cmrivn50q0012v7festn9adfd', 300, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL1', 'cmrivn50s0014v7feu6xvzrik', 2700, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL2', 'cmrivn50u0016v7fes6lpkmzz', 1500, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL3', 'cmrivn50w0018v7feeh36ztcw', 2000, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL4', 'cmrivn50y001av7fe54dz3v0t', 1500, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL5', 'cmrivn510001cv7fei6200ob8', 1000, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL6', 'cmrivn512001ev7fem1j4d5cj', 500, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL7', 'cmrivn514001gv7febdo548pb', 300, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL8', 'cmrivn516001iv7fe2ezzg9x5', 2000, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL9', 'cmrivn518001kv7fe7pszhvjj', 300, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL10', 'cmrivn51a001mv7fevegb2n0n', 1200, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL11', 'cmrivn51c001ov7fe74ez7q7b', 1000, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-PL11A', 'cmrivn51e001qv7fehh5eq9ax', 500, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO WastePrice (id, wasteItemId, pricePerUnit, effectiveFrom, notes, createdById, createdAt, updatedAt) VALUES ('seed-R1', 'cmrivn51g001sv7fekxmokee3', 500, '2026-06-19', 'Harga awal seed (banner Bank Sampah).', NULL, '2026-07-13 07:04:32', '2026-07-13 07:04:32');
INSERT INTO ProductCategory (id, name, slug, image, createdAt, updatedAt) VALUES ('cmrjl7mbf000kv79d8cu1izjp', 'plastik', 'plastik', NULL, '2026-07-13 19:00:17', '2026-07-13 19:00:17');
INSERT INTO ProductCategory (id, name, slug, image, createdAt, updatedAt) VALUES ('cmrjoecd7003kv7dd2o6dkbn8', 'Kerajinan Tangan', 'kerajinan', NULL, '2026-07-13 20:29:30', '2026-07-13 20:29:47');
INSERT INTO Product (id, name, slug, description, image, images, unit, price, pointsCost, stock, isActive, productCategoryId, weightGram, lengthCm, widthCm, heightCm, dijualOnline, dijualOffline, minOrderQty, maxOrderQty, createdAt, updatedAt) VALUES ('cmrjs5g360002v7ik8vg5mrf3', 'paving block', 'paving-block', 'wkwkwk', '/uploads/products/paving-block.png', '[]', 'pcs', 10000, 0, 48, TRUE, 'cmrjl7mbf000kv79d8cu1izjp', 1000, 22, 2, 0, TRUE, TRUE, 1, 10, '2026-07-13 22:14:33', '2026-07-15 23:05:09');
INSERT INTO Product (id, name, slug, description, image, images, unit, price, pointsCost, stock, isActive, productCategoryId, weightGram, lengthCm, widthCm, heightCm, dijualOnline, dijualOffline, minOrderQty, maxOrderQty, createdAt, updatedAt) VALUES ('cmrjs9k7e0012v7ikffogascj', 'kerajinan', 'kerajinan', 'wkekew', '/uploads/products/kerajinan.png', '[]', 'pcs', 10000, 0, 42, TRUE, 'cmrjoecd7003kv7dd2o6dkbn8', 1000, 3, 3, 0, TRUE, TRUE, 1, 0, '2026-07-13 22:17:45', '2026-07-15 23:05:09');
INSERT INTO KoperasiAnggota (id, nomorAnggota, nama, noKtp, noTelepon, alamat, foto, status, tanggalBergabung, tanggalKeluar, deletedAt, pinjamanDiblokir, userId, createdAt, updatedAt) VALUES ('cmrjta85h000zv7fws8azbcrb', 'KP001', 'Mirwan Kholid', '1232132132131221', '081211547844', 'padalrang', NULL, 'aktif', '2026-07-13 22:46:16', NULL, NULL, FALSE, 'cmrj3u6z70001v7n7bae4hqt9', '2026-07-13 22:46:16', '2026-07-15 21:38:19');
INSERT INTO KoperasiAnggota (id, nomorAnggota, nama, noKtp, noTelepon, alamat, foto, status, tanggalBergabung, tanggalKeluar, deletedAt, pinjamanDiblokir, userId, createdAt, updatedAt) VALUES ('cmrjtacwv0019v7fw7bpv4wvw', 'KP002', 'Budi Santoso (Test Pinjaman)', '3333333333333333', '083333333333', NULL, NULL, 'aktif', '2026-07-13 22:46:22', NULL, NULL, FALSE, 'cmrj45dtm0000v7u9ek78c9m3', '2026-07-13 22:46:22', '2026-07-15 22:45:38');
INSERT INTO KoperasiSimpananSaldo (id, koperasiAnggotaId, jenisSimpanan, saldo, createdAt, updatedAt) VALUES ('cmrjta85l0011v7fw7j8pyraw', 'cmrjta85h000zv7fws8azbcrb', 'pokok', 100000, '2026-07-13 22:46:16', '2026-07-14 01:59:56');
INSERT INTO KoperasiSimpananSaldo (id, koperasiAnggotaId, jenisSimpanan, saldo, createdAt, updatedAt) VALUES ('cmrjta85o0013v7fwlnec66x4', 'cmrjta85h000zv7fws8azbcrb', 'wajib', 150000, '2026-07-13 22:46:16', '2026-07-14 07:53:19');
INSERT INTO KoperasiSimpananSaldo (id, koperasiAnggotaId, jenisSimpanan, saldo, createdAt, updatedAt) VALUES ('cmrjta85p0015v7fw22i6ghne', 'cmrjta85h000zv7fws8azbcrb', 'sukarela', 0, '2026-07-13 22:46:16', '2026-07-13 22:46:16');
INSERT INTO KoperasiSimpananSaldo (id, koperasiAnggotaId, jenisSimpanan, saldo, createdAt, updatedAt) VALUES ('cmrjtacx6001bv7fwpcxpny29', 'cmrjtacwv0019v7fw7bpv4wvw', 'pokok', 100000, '2026-07-13 22:46:22', '2026-07-14 01:58:59');
INSERT INTO KoperasiSimpananSaldo (id, koperasiAnggotaId, jenisSimpanan, saldo, createdAt, updatedAt) VALUES ('cmrjtacxf001dv7fwbtzdgdpt', 'cmrjtacwv0019v7fw7bpv4wvw', 'wajib', 0, '2026-07-13 22:46:22', '2026-07-13 22:46:22');
INSERT INTO KoperasiSimpananSaldo (id, koperasiAnggotaId, jenisSimpanan, saldo, createdAt, updatedAt) VALUES ('cmrjtacxg001fv7fw4oagkxyo', 'cmrjtacwv0019v7fw7bpv4wvw', 'sukarela', 125000, '2026-07-13 22:46:22', '2026-07-14 07:48:51');
INSERT INTO KoperasiSetting (id, namaKoperasi, nominalSimpananPokok, nominalSimpananWajib, biayaAdminPinjaman, sukuBungaPinjaman, dendaTerlambatPerHari, minimalBulanAnggota, createdAt, updatedAt) VALUES ('cmrk05jh40012v7d5pm4s9d3u', 'Bank sampah sukamaju sejahtera', 100000, 50000, 0, 0, 0, 3, '2026-07-14 01:58:35', '2026-07-14 01:58:35');
INSERT INTO TokoSetting (id, tokoOnlineAktif, ongkirRatePerKg, ongkirRatePerKm, ongkirTetap, beratMinimumKg, originAddress, midtransServerKey, midtransClientKey, midtransIsProduction, stokRendahThreshold, createdAt, updatedAt) VALUES ('cmrjs4dh50000v7ik9brum92m', TRUE, 0, 0, 0, 1, NULL, NULL, NULL, FALSE, 5, '2026-07-13 22:13:43', '2026-07-13 22:20:41');
INSERT INTO Article (id, title, slug, excerpt, content, featuredImage, publishedAt, authorId, createdAt, updatedAt) VALUES ('cmrmlj1yx0001vqxwx8bv2zg4', 'Cara Memilah Sampah dengan Benar', 'cara-memilah-sampah-dengan-benar-mrmlj1yt', 'Pelajari langkah mudah memilah sampah organik, anorganik, dan B3 untuk pengelolaan yang lebih baik.', 'Memilah sampah adalah langkah pertama menuju lingkungan yang lebih bersih. Berikut panduan lengkapnya.

## Apa itu Pemilahan Sampah?

Pemilahan sampah adalah proses memisahkan sampah berdasarkan jenisnya sebelum dibuang atau didaur ulang. Ini sangat penting untuk memudahkan proses daur ulang dan mengurangi sampah yang berakhir di TPA.

## Jenis-Jenis Sampah

### 1. Sampah Organik
Sampah yang berasal dari makhluk hidup dan dapat terurai secara alami.
- Sisa makanan
- Daun kering
- Kulit buah
- Ranting pohon

### 2. Sampah Anorganik
Sampah yang tidak dapat terurai secara alami.
- Plastik
- Kertas
- Kaca
- Logam
- Kardus

### 3. Sampah B3 (Bahan Berbahaya dan Beracun)
Sampah yang mengandung bahan berbahaya.
- Baterai
- Lampu neon
- Obat-obatan kadaluarsa
- Cat dan thinner

## Cara Memilah yang Benar

1. Sediakan minimal 3 tempat sampah berbeda dengan warna yang jelas
2. Label setiap tempat sampah dengan jelas
3. Pisahkan sampah basah dan kering
4. Bersihkan kemasan sebelum dibuang
5. Kompres sampah plastik dan kardus untuk menghemat ruang

## Manfaat Memilah Sampah

- Memudahkan proses daur ulang
- Mengurangi volume sampah di TPA
- Menghasilkan kompos dari sampah organik
- Mendapatkan uang dari menjual sampah daur ulang
- Menjaga lingkungan tetap bersih dan sehat

Dengan memilah sampah, kita berkontribusi pada pelestarian lingkungan untuk generasi mendatang.', NULL, '2026-07-15 21:32:30', 'cmrivn4zl0000v7feteb5k5bh', '2026-07-15 21:32:30', '2026-07-15 21:32:30');
INSERT INTO Article (id, title, slug, excerpt, content, featuredImage, publishedAt, authorId, createdAt, updatedAt) VALUES ('cmrmlj1z20003vqxww9b3mh1z', 'Manfaat Menabung Sampah di Bank Sampah', 'manfaat-menabung-sampah-mrmlj1yt', 'Selain menjaga lingkungan, menabung sampah bisa menghasilkan saldo dan poin yang bermanfaat.', 'Bank sampah bukan sekadar tempat membuang sampah, tetapi juga tempat menabung yang menguntungkan.

## Apa itu Bank Sampah?

Bank sampah adalah tempat pengumpulan sampah yang dikelola secara terstruktur. Nasabah menabung sampah dan mendapatkan saldo sesuai dengan nilai sampah yang ditabungkan.

## Manfaat Menabung Sampah

### 1. Mendapat Saldo
Setiap sampah yang ditabungkan akan dihargai dengan uang. Nilai tergantung dari jenis dan berat sampah.

### 2. Mendapat Poin
Selain saldo, nasabah juga mendapat poin yang dapat ditukarkan dengan produk-produk menarik.

### 3. Lingkungan Bersih
Dengan menabung sampah, lingkungan rumah dan sekitar menjadi lebih bersih dan sehat.

### 4. Mendidik Anak
Mengajarkan anak-anak tentang pentingnya menjaga lingkungan dan nilai ekonomi dari sampah.

### 5. Dapat Sedekah
Sampah yang tidak ingin ditabung bisa disedekahkan. Sampah ini akan diolah menjadi aset bank sampah.

## Cara Mendaftar

1. Datang ke Bank Sampah Sukamaju Sejahtera
2. Bawa KTP dan KK
3. Isi formulir pendaftaran
4. Dapatkan kode nasabah
5. Mulai menabung sampah

Ayo mulai menabung sampah hari ini untuk masa depan yang lebih baik!', NULL, '2026-07-14 21:32:30', 'cmrivn4zl0000v7feteb5k5bh', '2026-07-15 21:32:30', '2026-07-15 21:32:30');
INSERT INTO Article (id, title, slug, excerpt, content, featuredImage, publishedAt, authorId, createdAt, updatedAt) VALUES ('cmrmlj1z30005vqxwetwyi56d', 'Kreasi Daur Ulang dari Sampah Plastik', 'kreasi-daur-ulang-plastik-mrmlj1yt', 'Ide kreatif mengubah sampah plastik menjadi produk bernilai jual tinggi.', 'Sampah plastik adalah salah satu jenis sampah paling sulit terurai. Tapi tahukah Anda bahwa plastik bisa diubah menjadi karya bernilai?

## Mengapa Daur Ulang Plastik?

Plastik membutuhkan ratusan tahun untuk terurai. Dengan mendaur ulang, kita mengurangi polusi dan menciptakan produk baru yang berguna.

## Ide Kreasi Daur Ulang Plastik

### 1. Pot Tanam dari Botol Plastik
Potong botol plastik menjadi dua, hias dengan cat warna-warni, jadikan pot tanam gantung yang cantik.

### 2. Tas Belanja dari Plastik Kresek
Anyam plastik kresek menjadi tas belanja yang kuat dan tahan lama.

### 3. Bros dari Tutup Botol
Tutup botol bisa dihias dengan kain flanel dan dijadikan bros atau gantungan kunci.

### 4. Vas Bunga dari Gelas Plastik
Gelas plastik bekas bisa dihias dan disusun menjadi vas bunga unik.

### 5. Celengan dari Botol Bekas
Botol plastik besar bisa dijadikan celengan lucu untuk anak-anak.

## Tips Daur Ulang

- Bersihkan plastik sebelum diolah
- Gunakan alat yang aman saat memotong
- Beri warna dengan cat yang ramah lingkungan
- Libatkan keluarga dalam proses kreatif

Daur ulang tidak hanya mengurangi sampah, tetapi juga melatih kreativitas dan bisa menjadi sumber penghasilan tambahan.', NULL, '2026-07-13 21:32:30', 'cmrivn4zl0000v7feteb5k5bh', '2026-07-15 21:32:30', '2026-07-15 21:32:30');
INSERT INTO Kegiatan (id, title, slug, description, activityDate, location, images, coverImage, publishedAt, authorId, createdAt, updatedAt) VALUES ('cmrmnb2zq0001vq3acr9po4hk', 'Kerja Bakti Bersih Sungai Cikapundun', 'kerja-bakti-sungai-mrmnb2zp', 'Kegiatan kerja bakti membersihkan sampah di sepanjang bantaran Sungai Cikapundun. Diikuti oleh 30 nasabah dan relawan lingkungan. Berhasil mengumpulkan 250 kg sampah plastik dalam satu hari.', '2026-07-08 22:22:17', 'Bantaran Sungai Cikapundun, Bandung', '[]', '/uploads/kegiatan/kerja-bakti-sungai.png', '2026-07-15 22:22:17', 'cmrivn4zl0000v7feteb5k5bh', '2026-07-15 22:22:17', '2026-07-15 23:05:09');
INSERT INTO Kegiatan (id, title, slug, description, activityDate, location, images, coverImage, publishedAt, authorId, createdAt, updatedAt) VALUES ('cmrmnb2zr0003vq3azj1tjtbo', 'Edukasi Daur Ulang di SD Sukamaju', 'edukasi-daur-ulang-sd-mrmnb2zp', 'Tim bank sampah mengadakan sosialisasi pentingnya daur ulang dan pemilahan sampah kepada siswa SD Sukamaju. Kegiatan ini bertujuan menanamkan kesadaran lingkungan sejak dini.', '2026-07-01 22:22:17', 'SDN Sukamaju, Bandung', '[]', NULL, '2026-07-15 22:22:17', 'cmrivn4zl0000v7feteb5k5bh', '2026-07-15 22:22:17', '2026-07-15 22:22:17');
INSERT INTO Kegiatan (id, title, slug, description, activityDate, location, images, coverImage, publishedAt, authorId, createdAt, updatedAt) VALUES ('cmrmnb2zs0005vq3axiyz4fhl', 'Penukaran Poin dengan Produk Olahan', 'penukaran-poin-produk-mrmnb2zp', 'Nasabah bank sampah menukarkan poin yang telah dikumpulkan dengan produk olahan daur ulang seperti tas dari plastik kresek dan pot tanam dari botol bekas.', '2026-06-15 22:22:17', 'Kantor Bank Sampah Sukamaju', '[]', NULL, '2026-07-15 22:22:17', 'cmrivn4zl0000v7feteb5k5bh', '2026-07-15 22:22:17', '2026-07-15 22:22:17');
INSERT INTO KoperasiPinjaman (id, nomorPinjaman, koperasiAnggotaId, jumlahPinjaman, tenorBulan, angsuranPerBulan, biayaAdmin, tanggalPengajuan, tanggalPencairan, status, sisaPinjaman, sukuBunga, keterangan, userId, createdAt, updatedAt) VALUES ('cmrjwr7620001v7ep0a4s15t8', 'KPN-2026-607241', 'cmrjta85h000zv7fws8azbcrb', 1000000, 10, 100000, 50000, '2026-04-29 00:23:27', '2026-04-30 00:23:27', 'berjalan', 900000, 6, 'Pinjaman test untuk jadwal bayar', NULL, '2026-07-14 00:23:27', '2026-07-14 00:23:27');

-- ==================== END OF DATABASE DUMP ====================
