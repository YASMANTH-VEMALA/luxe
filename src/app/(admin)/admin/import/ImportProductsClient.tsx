'use client'

import { useState, useEffect } from 'react'
import { 
  Download, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Package,
  RefreshCw,
  Database
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ImportProductsClient() {
  const [isImporting, setIsImporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [result, setResult] = useState<{
    success?: boolean
    imported?: number
    deleted?: number
    errors?: string[]
    message?: string
  } | null>(null)
  const [progress, setProgress] = useState(0)

  // Fetch current count on load
  useEffect(() => {
    fetchCount()
  }, [])

  const fetchCount = async () => {
    try {
      const response = await fetch('/api/admin/seed-products')
      const data = await response.json()
      if (data.count !== undefined) {
        setImportedCount(data.count)
      }
    } catch (error) {
      console.error('Failed to fetch count:', error)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    setResult(null)
    setProgress(10)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 1000)

      const response = await fetch('/api/admin/seed-products', {
        method: 'POST',
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data = await response.json()
      
      if (response.ok) {
        setResult({
          success: true,
          imported: data.imported,
          errors: data.errors,
          message: `Successfully imported ${data.imported} products!`
        })
        fetchCount()
      } else {
        setResult({
          success: false,
          message: data.error || 'Import failed'
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Import failed. Please try again.'
      })
    } finally {
      setIsImporting(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const handleClear = async () => {
    if (!confirm('Are you sure you want to delete all imported products?')) return

    setIsClearing(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/seed-products', {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (response.ok) {
        setResult({
          success: true,
          deleted: data.deleted,
          message: `Deleted ${data.deleted} imported products`
        })
        fetchCount()
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to clear products'
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to clear products'
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Import Products</h1>
        <p className="text-muted-foreground">
          Import products from external APIs to populate your store
        </p>
      </div>

      {/* Current Status */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{importedCount}</p>
                <p className="text-sm text-muted-foreground">Imported Products</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCount}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Sources Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>
            Products will be imported from these free APIs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-1">DummyJSON</h3>
              <p className="text-sm text-muted-foreground mb-2">
                ~100 products with multiple images per product
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Electronics</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Fashion</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Home</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-1">FakeStore API</h3>
              <p className="text-sm text-muted-foreground mb-2">
                ~20 products including jewelry & clothing
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Jewelry</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Clothing</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Electronics</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-1">Escuela API</h3>
              <p className="text-sm text-muted-foreground mb-2">
                ~50 products with varied categories
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Furniture</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Shoes</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Misc</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {isImporting && (
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing products...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Fetching from DummyJSON, FakeStore, and Escuela APIs...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Message */}
      {result && (
        <Card className={`mb-6 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.message}
                </p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 text-sm text-orange-700">
                    <p className="font-medium">Warnings:</p>
                    <ul className="list-disc list-inside">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button 
          onClick={handleImport} 
          disabled={isImporting || isClearing}
          size="lg"
          className="flex-1 md:flex-none"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Import All Products
            </>
          )}
        </Button>

        {importedCount > 0 && (
          <Button 
            variant="destructive" 
            onClick={handleClear}
            disabled={isImporting || isClearing}
            size="lg"
          >
            {isClearing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Imported
              </>
            )}
          </Button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Package className="w-4 h-4" />
          How it works
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Click "Import All Products" to fetch products from all 3 APIs</li>
          <li>• Products are automatically converted to INR pricing</li>
          <li>• Multiple images per product are preserved (where available)</li>
          <li>• Bad/placeholder images are automatically filtered out</li>
          <li>• You can clear imported products anytime and import again</li>
          <li>• Imported products are marked and won&apos;t affect your manually added products</li>
        </ul>
      </div>
    </div>
  )
}
