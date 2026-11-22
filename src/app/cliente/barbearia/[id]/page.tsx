import ShopProfile from '@/components/customer/ShopProfile'
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ShopProfile id={(await params).id} /> }
