'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Search, MapPin, Loader2, Truck, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createPincode, deletePincode } from '@/app/actions/admin'
import { toast } from 'sonner'

interface Pincode {
  id: string
  pincode: string
  city: string | null
  state: string | null
  delivery_days: number
  is_cod_available: boolean
  created_at: string
}

interface PincodesClientProps {
  initialPincodes: Pincode[]
}

export default function PincodesClient({ initialPincodes }: PincodesClientProps) {
  const [pincodes, setPincodes] = useState(initialPincodes)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deletingPincode, setDeletingPincode] = useState<Pincode | null>(null)
  const [isPending, startTransition] = useTransition()
  
  // Form state
  const [pincode, setPincode] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [deliveryDays, setDeliveryDays] = useState('5')
  const [isCodAvailable, setIsCodAvailable] = useState(true)

  // Filter pincodes
  const filteredPincodes = pincodes.filter(p => 
    p.pincode.includes(searchQuery) ||
    p.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.state?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setPincode('')
    setCity('')
    setState('')
    setDeliveryDays('5')
    setIsCodAvailable(true)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!pincode.trim() || pincode.length !== 6) {
      toast.error('Please enter a valid 6-digit pincode')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('pincode', pincode.trim())
      formData.append('city', city.trim())
      formData.append('state', state.trim())
      formData.append('deliveryDays', deliveryDays)
      formData.append('isCodAvailable', isCodAvailable.toString())
      
      const result = await createPincode(formData)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Pincode added!')
        setPincodes(prev => [...prev, result.data].sort((a, b) => a.pincode.localeCompare(b.pincode)))
        resetForm()
        setIsFormOpen(false)
      }
    })
  }

  const handleDelete = () => {
    if (!deletingPincode) return

    startTransition(async () => {
      const result = await deletePincode(deletingPincode.id)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Pincode deleted')
        setPincodes(prev => prev.filter(p => p.id !== deletingPincode.id))
      }
      setDeletingPincode(null)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pincodes</h1>
          <p className="text-muted-foreground">Manage deliverable areas and COD availability</p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Pincode
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Serviceable Pincode</DialogTitle>
              <DialogDescription>
                Add a new pincode where you can deliver orders.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="500001"
                  maxLength={6}
                  disabled={isPending}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Hyderabad"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Telangana"
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDays">Delivery Days</Label>
                <Input
                  id="deliveryDays"
                  type="number"
                  min="1"
                  max="30"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="cod">COD Available</Label>
                  <p className="text-sm text-muted-foreground">Allow cash on delivery</p>
                </div>
                <Switch
                  id="cod"
                  checked={isCodAvailable}
                  onCheckedChange={setIsCodAvailable}
                  disabled={isPending}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsFormOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Pincode
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search pincodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">Total Pincodes</span>
          </div>
          <p className="text-2xl font-bold mt-1">{pincodes.length}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Banknote className="h-4 w-4" />
            <span className="text-sm">COD Enabled</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {pincodes.filter(p => p.is_cod_available).length}
          </p>
        </div>
        <div className="p-4 border rounded-lg hidden sm:block">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span className="text-sm">Avg Delivery</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {pincodes.length > 0 
              ? Math.round(pincodes.reduce((acc, p) => acc + p.delivery_days, 0) / pincodes.length)
              : 0} days
          </p>
        </div>
      </div>

      {/* Pincodes Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pincode</TableHead>
              <TableHead className="hidden sm:table-cell">City</TableHead>
              <TableHead className="hidden md:table-cell">State</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>COD</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPincodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No pincodes found' : 'No pincodes added yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPincodes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono font-medium">{p.pincode}</span>
                      <span className="text-sm text-muted-foreground sm:hidden">
                        {p.city || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {p.city || '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.state || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <Truck className="h-3 w-3 mr-1" />
                      {p.delivery_days} days
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.is_cod_available ? (
                      <Badge className="bg-green-100 text-green-800">
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingPincode(p)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPincode} onOpenChange={() => setDeletingPincode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pincode</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove pincode "{deletingPincode?.pincode}"? 
              Customers from this area will not be able to place orders.
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
