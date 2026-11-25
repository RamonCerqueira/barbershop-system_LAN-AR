import './portal.css'
import { CustomerPortal } from '@/components/customer/CustomerPortal'
import type { Metadata, Viewport } from 'next'
export const metadata: Metadata = { title: 'Portal do cliente', robots: { index: false, follow: false } }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#101211' }
export default function Layout({ children }: { children: React.ReactNode }) { return <CustomerPortal>{children}</CustomerPortal> }
