'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { Plus, X, Upload, Loader2, Image as ImageIcon, Star, Trash2, User } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { createProduct, updateProduct, uploadProductImage, createProductReview, deleteProductReview, getProductReviews } from '@/app/actions/admin'
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
  description?: string
  price: number
  sale_price: number | null
  images: string[]
  sizes: string[] | null
  is_active: boolean
  is_featured: boolean
  stock_quantity: number
  low_stock_threshold?: number
  show_stock_count?: boolean
  fake_viewers?: number
  fake_sold_count?: number
}

interface Review {
  id: string
  reviewer_name: string
  rating: number
  comment: string
  is_verified: boolean
  created_at: string
}

interface ProductFormProps {
  product?: Product | null
  categories: Category[]
  onSuccess: () => void
  onCancel: () => void
}

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']

export default function ProductForm({ product, categories, onSuccess, onCancel }: ProductFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form state
  const [title, setTitle] = useState(product?.title || '')
  const [description, setDescription] = useState(product?.description || '')
  const [category, setCategory] = useState(product?.category || '')
  const [customCategory, setCustomCategory] = useState('')
  const [price, setPrice] = useState(product ? (product.price / 100).toString() : '')
  const [salePrice, setSalePrice] = useState(
    product?.sale_price ? (product.sale_price / 100).toString() : ''
  )
  const [images, setImages] = useState<string[]>(product?.images || [])
  const [sizes, setSizes] = useState<string[]>(product?.sizes || [])
  const [isActive, setIsActive] = useState(product?.is_active ?? true)
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false)
  const [stockQuantity, setStockQuantity] = useState(
    product?.stock_quantity?.toString() || '100'
  )
  const [lowStockThreshold, setLowStockThreshold] = useState(
    product?.low_stock_threshold?.toString() || '5'
  )
  const [showStockCount, setShowStockCount] = useState(
    product?.show_stock_count ?? true
  )
  const [fakeViewers, setFakeViewers] = useState(
    product?.fake_viewers?.toString() || ''
  )
  const [fakeSoldCount, setFakeSoldCount] = useState(
    product?.fake_sold_count?.toString() || ''
  )
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewerName, setReviewerName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [isAddingReview, setIsAddingReview] = useState(false)

  // Load reviews if editing a product
  const loadReviews = useCallback(async () => {
    if (!product?.id) return
    setIsLoadingReviews(true)
    const result = await getProductReviews(product.id)
    if (result.data) {
      setReviews(result.data)
    }
    setIsLoadingReviews(false)
  }, [product?.id])

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      
      const result = await uploadProductImage(formData)
      
      if (result.error) {
        toast.error(result.error)
      } else if (result.url) {
        setImages(prev => [...prev, result.url!])
        toast.success('Image uploaded successfully!')
      }
    }
    
    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Add image URL
  const handleAddImageUrl = () => {
    if (!imageUrl.trim()) return
    
    try {
      new URL(imageUrl)
      setImages(prev => [...prev, imageUrl.trim()])
      setImageUrl('')
    } catch {
      toast.error('Please enter a valid URL')
    }
  }

  // Remove image
  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleCategoryChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomCategory(true)
      setCategory('')
    } else {
      setShowCustomCategory(false)
      setCategory(value)
    }
  }

  const toggleSize = (size: string) => {
    if (sizes.includes(size)) {
      setSizes(sizes.filter(s => s !== size))
    } else {
      setSizes([...sizes, size])
    }
  }

  // Add review
  const handleAddReview = async () => {
    if (!product?.id) {
      toast.error('Please save the product first before adding reviews')
      return
    }
    
    if (!reviewerName.trim() || !reviewComment.trim()) {
      toast.error('Please fill in all review fields')
      return
    }

    setIsAddingReview(true)
    
    const formData = new FormData()
    formData.append('product_id', product.id)
    formData.append('reviewer_name', reviewerName)
    formData.append('rating', reviewRating.toString())
    formData.append('comment', reviewComment)
    formData.append('is_verified', 'true')
    
    const result = await createProductReview(formData)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Review added!')
      setReviewerName('')
      setReviewComment('')
      setReviewRating(5)
      loadReviews()
    }
    
    setIsAddingReview(false)
  }

  // Delete review
  const handleDeleteReview = async (reviewId: string) => {
    const result = await deleteProductReview(reviewId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Review deleted')
      setReviews(prev => prev.filter(r => r.id !== reviewId))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    
    const finalCategory = showCustomCategory ? customCategory : category
    if (!finalCategory) {
      toast.error('Category is required')
      return
    }
    
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      toast.error('Valid price is required')
      return
    }
    
    if (images.length === 0) {
      toast.error('At least one image is required')
      return
    }

    const formData = new FormData()
    formData.append('title', title.trim())
    formData.append('description', description.trim())
    formData.append('category', finalCategory)
    formData.append('price', price)
    if (salePrice && !isNaN(Number(salePrice)) && Number(salePrice) > 0) {
      formData.append('sale_price', salePrice)
    }
    formData.append('images', JSON.stringify(images))
    if (sizes.length > 0) {
      formData.append('sizes', JSON.stringify(sizes))
    }
    formData.append('is_active', isActive.toString())
    formData.append('is_featured', isFeatured.toString())
    formData.append('stock_quantity', stockQuantity || '100')
    formData.append('low_stock_threshold', lowStockThreshold || '5')
    formData.append('show_stock_count', showStockCount.toString())
    if (fakeViewers) formData.append('fake_viewers', fakeViewers)
    if (fakeSoldCount) formData.append('fake_sold_count', fakeSoldCount)

    startTransition(async () => {
      let result
      
      if (product) {
        result = await updateProduct(product.id, formData)
      } else {
        result = await createProduct(formData)
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(product ? 'Product updated!' : 'Product created!')
        onSuccess()
      }
    })
  }

  return (
    <Tabs defaultValue="details" className="w-full" onValueChange={(tab) => {
      if (tab === 'reviews' && product?.id && reviews.length === 0) {
        loadReviews()
      }
    }}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="images">Images</TabsTrigger>
        <TabsTrigger value="reviews" disabled={!product?.id}>Reviews</TabsTrigger>
      </TabsList>

      <form onSubmit={handleSubmit}>
        <TabsContent value="details" className="space-y-6 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Gold Plated Necklace Set"
              disabled={isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beautiful handcrafted jewelry..."
              rows={3}
              disabled={isPending}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <div className="flex gap-2">
              <Select 
                value={showCustomCategory ? 'custom' : category} 
                onValueChange={handleCategoryChange}
                disabled={isPending}
              >
                <SelectTrigger className={showCustomCategory ? 'w-1/3' : 'w-full'}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">+ Add New Category</SelectItem>
                </SelectContent>
              </Select>
              
              {showCustomCategory && (
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter new category"
                  className="flex-1"
                  disabled={isPending}
                />
              )}
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="999"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Sale Price (₹)</Label>
              <Input
                id="salePrice"
                type="number"
                min="1"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="799"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Sizes (for clothing) */}
          <div className="space-y-2">
            <Label>Sizes (for dresses)</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SIZES.map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={sizes.includes(size) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSize(size)}
                  disabled={isPending}
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>

          {/* Stock Management */}
          <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50">
            <Label className="text-sm font-medium">Stock Management</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-xs text-muted-foreground">
                  Stock Quantity
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStock" className="text-xs text-muted-foreground">
                  Low Stock Threshold
                </Label>
                <Input
                  id="lowStock"
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  placeholder="5"
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label htmlFor="showStock" className="text-sm">Show Stock Count</Label>
                <p className="text-xs text-muted-foreground">Display low stock warning</p>
              </div>
              <Switch
                id="showStock"
                checked={showStockCount}
                onCheckedChange={setShowStockCount}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Urgency Triggers */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <Label className="text-sm font-medium">Urgency Triggers (Marketing)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fakeViewers" className="text-xs text-muted-foreground">
                  Fake Viewers Count
                </Label>
                <Input
                  id="fakeViewers"
                  type="number"
                  min="0"
                  value={fakeViewers}
                  onChange={(e) => setFakeViewers(e.target.value)}
                  placeholder="12"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fakeSold" className="text-xs text-muted-foreground">
                  Fake Sold Count
                </Label>
                <Input
                  id="fakeSold"
                  type="number"
                  min="0"
                  value={fakeSoldCount}
                  onChange={(e) => setFakeSoldCount(e.target.value)}
                  placeholder="234"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="active">Active</Label>
                <p className="text-sm text-muted-foreground">Product is visible on the store</p>
              </div>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isPending}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="featured">Featured</Label>
                <p className="text-sm text-muted-foreground">Show on homepage carousel</p>
              </div>
              <Switch
                id="featured"
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
                disabled={isPending}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="images" className="space-y-6 mt-4">
          {/* Upload from Local */}
          <div className="space-y-2">
            <Label>Upload from Computer</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading || isPending}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isPending}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                JPEG, PNG, WebP, GIF (max 5MB each)
              </p>
            </div>
          </div>

          {/* Add Image URL */}
          <div className="space-y-2">
            <Label>Or Add Image URL</Label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={isPending}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddImageUrl}
                disabled={!imageUrl.trim() || isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image Preview Grid */}
          <div className="space-y-2">
            <Label>Images ({images.length})</Label>
            {images.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No images added yet</p>
                <p className="text-sm">Upload or add URLs above</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {images.map((img, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                    <Image
                      src={img}
                      alt={`Product image ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {index === 0 && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                        Main
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length > 0 && (
              <p className="text-xs text-muted-foreground">
                First image will be used as the main product image
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6 mt-4">
          {/* Add Review Form */}
          <div className="space-y-4 p-4 border rounded-lg bg-green-50/50">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              Add Customer Review
            </Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Reviewer Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Priya Sharma"
                    className="pl-9"
                    disabled={isAddingReview}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Rating</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1"
                      disabled={isAddingReview}
                    >
                      <Star 
                        className={`h-6 w-6 ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Comment</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Amazing product! The quality is excellent..."
                rows={2}
                disabled={isAddingReview}
              />
            </div>
            
            <Button
              type="button"
              onClick={handleAddReview}
              disabled={isAddingReview || !reviewerName.trim() || !reviewComment.trim()}
              size="sm"
            >
              {isAddingReview ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Review
                </>
              )}
            </Button>
          </div>

          {/* Existing Reviews */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Existing Reviews ({reviews.length})</Label>
            
            {isLoadingReviews ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No reviews yet</p>
                <p className="text-sm">Add reviews to boost product credibility</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {reviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4 relative group">
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(review.id)}
                      className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{review.reviewer_name}</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t mt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || isUploading}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {product ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Tabs>
  )
}
