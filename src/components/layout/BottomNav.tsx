'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, Film, Bell, MessageCircle } from 'lucide-react'

const navItems = [
  { href: '/feed', icon: Home, label: 'Home' },
  { href: '/explore', icon: Search, label: 'Explore' },
  { href: '/upload', icon: PlusSquare, label: 'Upload' },
  { href: '/reels', icon: Film, label: 'Reels' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-800 z-50 md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 p-2 ${active ? 'text-white' : 'text-zinc-500'}`}>
              <Icon size={24} strokeWidth={active ? 2.5 : 1.5} />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
