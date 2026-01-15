'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Search, MoreHorizontal, Eye, EyeOff, Star } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import ProductForm from './ProductForm'
import { deleteProduct } from '@/app/actions/admin'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  slug: string
}

interface Product {
  id: string
  title: string
  slug: string
  category: string
  price: number
  sale_price: number | null
  images: string[]
  sizes: string[] | null
  is_active: boolean
  is_featured: boolean
  stock_quantity: number
  created_at: string
}

interface ProductsClientProps {
  initialProducts: Product[]
  categories: Category[]
}

export default function ProductsClient({ initialProducts, categories }: ProductsClientProps) {
  const [products, setProducts] = useState(initialProducts)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter products by search
  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price / 100)
  }

  const handleDelete = () => {
    if (!deletingProduct) return

    startTransition(async () => {
      const result = await deleteProduct(deletingProduct.id)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Product deleted successfully')
        setProducts(prev => prev.filter(p => p.id !== deletingProduct.id))
      }
      setDeletingProduct(null)
    })
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    setEditingProduct(null)
    // Refresh will happen through revalidatePath in server action
    window.location.reload()
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const openCreate = () => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              <DialogDescription>
                {editingProduct 
                  ? 'Update the product details below.' 
                  : 'Fill in the details to add a new product.'}
              </DialogDescription>
            </DialogHeader>
            <ProductForm 
              product={editingProduct}
              categories={categories}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsFormOpen(false)
                setEditingProduct(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Products Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="hidden sm:table-cell">Stock</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No products found' : 'No products yet. Add your first product!'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted">
                      {product.images[0] && (
                        <Image
                          src={product.images[0]}
                          alt={product.title}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium line-clamp-1">{product.title}</span>
                      <span className="text-sm text-muted-foreground md:hidden">
                        {product.category}
                      </span>
                      {product.is_featured && (
                        <Badge variant="secondary" className="w-fit mt-1 text-xs">
                          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                          Featured
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {product.sale_price ? (
                        <>
                          <span className="font-medium text-green-600">
                            {formatPrice(product.sale_price)}
                          </span>
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(product.price)}
                          </span>
                        </>
                      ) : (
                        <span className="font-medium">{formatPrice(product.price)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge 
                      variant={product.stock_quantity > 10 ? 'default' : product.stock_quantity > 0 ? 'secondary' : 'destructive'}
                    >
                      {product.stock_quantity}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {product.is_active ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Eye className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hidden
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(product)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => window.open(`/products/${product.slug}`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeletingProduct(product)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
