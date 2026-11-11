import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Login from '../views/Login.vue'
import Debts from '../views/Debts.vue'
import Categories from '../views/Categories.vue'
import SplitBills from '../views/SplitBills.vue'
import Transactions from '../views/Transactions.vue'
import Reports from '../views/Reports.vue'
import Settings from '../views/Settings.vue'
import Wallets from '../views/Wallets.vue'
import WalletDetail from '../views/WalletDetail.vue'

const routes = [
  { path: '/', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: Login },
  { path: '/debts', name: 'debts', component: Debts, meta: { requiresAuth: true } },
  { path: '/categories', name: 'categories', component: Categories, meta: { requiresAuth: true } },
  { path: '/split-bills', name: 'split-bills', component: SplitBills, meta: { requiresAuth: true } },
  { path: '/transactions', name: 'transactions', component: Transactions, meta: { requiresAuth: true } },
  { path: '/reports', name: 'reports', component: Reports, meta: { requiresAuth: true } },
  { path: '/settings', name: 'settings', component: Settings, meta: { requiresAuth: true } },
  { path: '/wallets', name: 'wallets', component: Wallets, meta: { requiresAuth: true } },
  { path: '/wallets/:id', name: 'wallet-detail', component: WalletDetail, meta: { requiresAuth: true } }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})