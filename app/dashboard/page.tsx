"use client"

// Import direct du composant client depuis une page Client Component
// pour éviter l'usage interdit de next/dynamic({ ssr: false }) côté Server Component
import DashboardHome from '../../src/components/dashboard/DashboardHome'

export default function DashboardPage() {
  // L’authentification et les rôles sont gérés par le middleware et par DashboardHome
  // On affiche simplement le composant de dashboard unifié qui correspond à la billetterie
  return <DashboardHome />
}
