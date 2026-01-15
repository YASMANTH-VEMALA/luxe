import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // If already logged in, redirect
  if (user) {
    redirect(params.redirectTo || '/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Luxe</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>
        
        <div className="bg-white p-8 rounded-xl shadow-sm border">
          <GoogleSignInButton redirectTo={params.redirectTo || '/'} />
          
          <p className="text-xs text-gray-500 text-center mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
        
        <p className="text-center text-sm text-gray-500 mt-6">
          <a href="/" className="hover:underline">
            ← Back to shopping
          </a>
        </p>
      </div>
    </div>
  )
}
