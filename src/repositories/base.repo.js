import { db } from '../db'

/**
 * Repository generic untuk tabel Dexie.
 * Menyediakan operasi dasar CRUD + soft delete + filter.
 */
export function createRepo(tableName) {
  const table = () => db[tableName]

  return {
    tableName,

    async getAll() {
      return table().toArray()
    },

    async getAllActive() {
      return table().filter(r => !r.is_deleted).toArray()
    },

    async getById(id) {
      return table().get(id)
    },

    async getPending() {
      return table().filter(r => !!r._pending).toArray()
    },

    async put(row) {
      return table().put(row)
    },

    async bulkPut(rows) {
      return table().bulkPut(rows)
    },

    async update(id, changes) {
      return table().update(id, changes)
    },

    async delete(id) {
      return table().delete(id)
    },

    async softDelete(id, now = new Date().toISOString()) {
      return table().update(id, { is_deleted: true, updated_at: now, _pending: true })
    },

    async whereBy(index, value) {
      return table().where(index).equals(value).toArray()
    },

    async filterAll(predicate) {
      return table().filter(predicate).toArray()
    },

    async count() {
      return table().count()
    }
  }
}