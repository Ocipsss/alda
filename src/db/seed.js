import { db, uid } from './index'

const DEFAULT_CATEGORIES = [
  // Income
  { name: 'Penjualan', type: 'income', icon: 'Store' },
  { name: 'Gaji', type: 'income', icon: 'Briefcase' },
  { name: 'Bonus', type: 'income', icon: 'Gift' },
  { name: 'Investasi', type: 'income', icon: 'TrendingUp' },
  { name: 'Lainnya', type: 'income', icon: 'Sparkles' },

  // Expense
  { name: 'Makanan', type: 'expense', icon: 'Utensils' },
  { name: 'Transportasi', type: 'expense', icon: 'Car' },
  { name: 'Belanja', type: 'expense', icon: 'ShoppingCart' },
  { name: 'Tagihan', type: 'expense', icon: 'Receipt' },
  { name: 'Kesehatan', type: 'expense', icon: 'Heart' },
  { name: 'Pendidikan', type: 'expense', icon: 'GraduationCap' },
  { name: 'Hiburan', type: 'expense', icon: 'Gamepad2' },
  { name: 'Lainnya', type: 'expense', icon: 'Tag' }
]

export async function seedCategories(userId) {
  const existing = await db.categories
    .where({ user_id: userId })
    .filter(c => !c.is_deleted)
    .count()

  if (existing > 0) return

  const now = new Date().toISOString()
  const rows = DEFAULT_CATEGORIES.map(c => ({
    id: uid(),
    user_id: userId,
    name: c.name,
    type: c.type,
    icon: c.icon,
    is_deleted: false,
    created_at: now,
    updated_at: now,
    _pending: true
  }))

  await db.categories.bulkPut(rows)
}