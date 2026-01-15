export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Authentication Error
        </h1>
        <p className="text-gray-600 mb-6">
          {searchParams.message || 'Something went wrong during authentication.'}
        </p>
        <a
          href="/login"
          className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Try Again
        </a>
      </div>
    </div>
  )
}
