import './portal.css'
import { CustomerPortal } from '@/components/customer/CustomerPortal'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Portal do cliente', robots: { index: false, follow: false } }
export default function Layout({ children }: { children: React.ReactNode }) { return <CustomerPortal>{children}</CustomerPortal> }
