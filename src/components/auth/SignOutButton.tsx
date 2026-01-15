'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface SignOutButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
}

export function SignOutButton({ className, variant = 'ghost' }: SignOutButtonProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/')
  }

  return (
    <Button
      onClick={handleSignOut}
      variant={variant}
      className={className}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Sign Out
    </Button>
  )
}
