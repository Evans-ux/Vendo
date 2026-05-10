import { redirect } from 'next/navigation'
import { getUser, getSupplier } from '@/app/actions/auth'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const user = await getUser()

  if (!user) {
    redirect('/supplier/login')
  }

  const supplier = await getSupplier()

  return <DashboardClient supplier={supplier} />
}
