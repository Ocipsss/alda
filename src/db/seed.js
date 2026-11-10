import { categoryService } from '../services/category.service'

/**
 * Seed kategori default untuk user baru.
 * Return true jika seeding dilakukan, false jika sudah ada.
 */
export async function seedCategories(userId) {
  return categoryService.seedDefaults(userId)
}