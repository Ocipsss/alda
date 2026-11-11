export const WALLET_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#ef4444', '#f97316', '#f59e0b',
  '#eab308', '#84cc16', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#64748b', '#0f172a'
]

export const CURATED_WALLET_ICONS = [
  'Wallet', 'PiggyBank', 'CreditCard', 'Banknote', 'Coins', 'Landmark',
  'ShoppingCart', 'ShoppingBag', 'Utensils', 'Coffee', 'Car', 'Bike', 'Bus',
  'Plane', 'Home', 'Building2', 'Zap', 'Wifi', 'Smartphone', 'Laptop',
  'Heart', 'Stethoscope', 'GraduationCap', 'BookOpen', 'Gamepad2',
  'Gift', 'Music', 'Film', 'Dumbbell', 'Shirt', 'Sparkles', 'Star',
  'Briefcase', 'Store', 'Package', 'Truck', 'Fuel', 'Receipt', 'Percent',
  'TrendingUp', 'TrendingDown', 'HandCoins', 'HandHeart', 'ClipboardList'
]

export const DEFAULT_WALLET = {
  name: '',
  initial_balance: 0,
  color: '#3b82f6',
  icon: 'Wallet'
}

// ============ TEMPORARY WALLETS (Pihak Luar) ============

/**
 * Tipe wallet temporer untuk pihak eksternal (utang/piutang).
 * - debtor   = kita berutang ke pihak ini
 * - creditor = pihak ini berutang ke kita
 */
export const TEMPORARY_TYPE = {
  DEBTOR: 'debtor',
  CREDITOR: 'creditor'
}

/**
 * Warna default wallet temporer berdasarkan tipe:
 * - debtor   → oranye (peringatan: kita berutang)
 * - creditor → hijau (positif: ada yang berutang ke kita)
 */
export const TEMPORARY_COLORS = {
  [TEMPORARY_TYPE.DEBTOR]: '#f97316',
  [TEMPORARY_TYPE.CREDITOR]: '#10b981'
}

/**
 * Template default wallet temporer (belum ada nama).
 * Nama wajib diisi user saat create.
 */
export const DEFAULT_TEMPORARY_WALLET = {
  name: '',
  initial_balance: 0,
  color: '#f97316',
  icon: 'User',
  is_temporary: true,
  temporary_type: TEMPORARY_TYPE.DEBTOR
}