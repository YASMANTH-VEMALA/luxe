'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  MapPin, 
  CreditCard, 
  Truck,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

interface CheckoutDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'contact' | 'address' | 'payment' | 'confirm'

interface ContactInfo {
  name: string
  phone: string
  email: string
}

interface AddressInfo {
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
}

interface PincodeData {
  city: string | null
  state: string | null
  is_cod_available: boolean
  delivery_days: number
}

const COD_CHARGE = 30000 // ₹300 in paise
const MIN_ORDER_FOR_COD = 50000 // ₹500 in paise
const FREE_SHIPPING_MIN = 49900 // ₹499 in paise
const SHIPPING_CHARGE = 4900 // ₹49 in paise

export function CheckoutDrawer({ isOpen, onClose }: CheckoutDrawerProps) {
  const router = useRouter()
  const { items, getSubtotal, clearCart } = useCartStore()
  const [step, setStep] = useState<Step>('contact')
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingPincode, setIsCheckingPincode] = useState(false)
  
  const [contact, setContact] = useState<ContactInfo>({
    name: '',
    phone: '',
    email: '',
  })
  
  const [address, setAddress] = useState<AddressInfo>({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  })
  
  const [pincodeData, setPincodeData] = useState<PincodeData | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay')
  
  const subtotal = getSubtotal()
  const shippingCharge = subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_CHARGE
  const codCharge = paymentMethod === 'cod' ? COD_CHARGE : 0
  const total = subtotal + shippingCharge + codCharge
  
  const canUseCOD = subtotal >= MIN_ORDER_FOR_COD && pincodeData?.is_cod_available

  // Check user session
  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        setContact(prev => ({
          ...prev,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        }))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        setContact(prev => ({
          ...prev,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || prev.name,
        }))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check pincode - We deliver all over India
  const checkPincode = async (pincode: string) => {
    if (pincode.length !== 6) {
      setPincodeData(null)
      return
    }
    
    setIsCheckingPincode(true)
    const supabase = createClient()
    
    const { data } = await supabase
      .from('pincodes')
      .select('city, state, is_cod_available, delivery_days')
      .eq('pincode', pincode)
      .eq('is_active', true)
      .single()
    
    if (data) {
      setPincodeData(data)
      setAddress(prev => ({
        ...prev,
        city: data.city || prev.city,
        state: data.state || prev.state,
      }))
    } else {
      // Default: We deliver everywhere in India with COD available
      setPincodeData({
        city: null,
        state: null,
        is_cod_available: true,
        delivery_days: 5
      })
    }
    
    setIsCheckingPincode(false)
  }

  // Validate steps
  const isContactValid = contact.name.length >= 2 && contact.phone.length === 10
  const isAddressValid = 
    address.addressLine1.length >= 5 &&
    address.city.length >= 2 &&
    address.state.length >= 2 &&
    address.pincode.length === 6

  // Handle step navigation
  const goToNext = () => {
    if (step === 'contact' && isContactValid) setStep('address')
    else if (step === 'address' && isAddressValid) setStep('payment')
    else if (step === 'payment') setStep('confirm')
  }

  const goToPrevious = () => {
    if (step === 'address') setStep('contact')
    else if (step === 'payment') setStep('address')
    else if (step === 'confirm') setStep('payment')
  }

  // Load Razorpay script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true)
        return
      }
      
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  // Handle payment
  const handlePayment = async () => {
    setIsLoading(true)
    
    try {
      if (paymentMethod === 'razorpay') {
        // Load Razorpay script first
        const scriptLoaded = await loadRazorpayScript()
        if (!scriptLoaded) {
          throw new Error('Failed to load payment gateway. Please try again.')
        }

        // Create Razorpay order
        const response = await fetch('/api/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            userId: user?.id || null,
            contact,
            address,
            items,
          }),
        })
        
        const data = await response.json()
        
        if (!response.ok || data.error) {
          throw new Error(data.error || 'Failed to create payment order')
        }

        console.log('Razorpay order created:', data)
        
        // Open Razorpay checkout
        const options = {
          key: data.key, // Use key from server response
          amount: data.amount,
          currency: data.currency || 'INR',
          name: 'Luxe',
          description: `Order #${data.orderNumber}`,
          order_id: data.orderId,
          handler: async function (response: any) {
            console.log('Payment successful:', response)
            
            // Verify payment on server
            try {
              const verifyResponse = await fetch('/api/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  dbOrderId: data.dbOrderId,
                }),
              })
              
              const verifyData = await verifyResponse.json()
              
              if (verifyData.success) {
                toast.success('Payment successful! 🎉')
                clearCart()
                onClose()
                router.push(`/order-success?orderId=${data.dbOrderId}`)
              } else {
                toast.error(verifyData.error || 'Payment verification failed')
              }
            } catch (verifyError) {
              console.error('Verification error:', verifyError)
              toast.error('Payment verification failed. Please contact support.')
            }
          },
          prefill: {
            name: contact.name,
            email: contact.email || '',
            contact: contact.phone,
          },
          notes: {
            orderNumber: data.orderNumber,
          },
          theme: {
            color: '#000000',
          },
          modal: {
            ondismiss: async function() {
              setIsLoading(false)
              toast.info('Payment cancelled')
              // Update order status to failed/cancelled when user dismisses
              try {
                await fetch('/api/razorpay/update-status', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    dbOrderId: data.dbOrderId,
                    status: 'cancelled',
                    razorpayOrderId: data.orderId,
                  }),
                })
              } catch (e) {
                console.error('Failed to update cancelled order status:', e)
              }
            }
          }
        }
        
        const razorpay = new (window as any).Razorpay(options)
        razorpay.on('payment.failed', async function (response: any) {
          console.error('Payment failed:', response.error)
          toast.error(response.error.description || 'Payment failed')
          setIsLoading(false)
          
          // Update order status to failed in database
          try {
            await fetch('/api/razorpay/update-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dbOrderId: data.dbOrderId,
                status: 'failed',
                razorpayOrderId: data.orderId,
                errorCode: response.error.code,
                errorDescription: response.error.description,
              }),
            })
          } catch (e) {
            console.error('Failed to update failed order status:', e)
          }
        })
        razorpay.open()
        return // Don't set loading to false here, it will be handled by callbacks
      } else {
        // COD order
        const response = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact,
            address,
            items,
            paymentMethod: 'cod',
            subtotal,
            shippingCharge,
            codCharge,
            total,
            userId: user?.id,
          }),
        })
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        clearCart()
        onClose()
        router.push(`/order-success?orderId=${data.orderId}`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('contact')
    }
  }, [isOpen])

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center gap-4">
              {step !== 'contact' && (
                <button onClick={goToPrevious} className="p-1">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <SheetTitle className="flex-1">
                {step === 'contact' && 'Contact Details'}
                {step === 'address' && 'Shipping Address'}
                {step === 'payment' && 'Payment Method'}
                {step === 'confirm' && 'Confirm Order'}
              </SheetTitle>
            </div>
            
            {/* Progress */}
            <div className="flex gap-1 mt-3">
              {['contact', 'address', 'payment', 'confirm'].map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full ${
                    ['contact', 'address', 'payment', 'confirm'].indexOf(step) >= i
                      ? 'bg-black'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Contact Step */}
            {step === 'contact' && (
              <div className="space-y-6">
                {!user && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-3">
                      Sign in for faster checkout and order tracking
                    </p>
                    <GoogleSignInButton redirectTo="/cart" />
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={contact.name}
                      onChange={(e) => setContact(c => ({ ...c, name: e.target.value }))}
                      placeholder="Enter your full name"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => setContact(c => ({ ...c, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      placeholder="10-digit mobile number"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={contact.email}
                      onChange={(e) => setContact(c => ({ ...c, email: e.target.value }))}
                      placeholder="For order updates"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Address Step */}
            {step === 'address' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pincode">Pincode *</Label>
                  <div className="relative mt-1">
                    <Input
                      id="pincode"
                      value={address.pincode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setAddress(a => ({ ...a, pincode: value }))
                        checkPincode(value)
                      }}
                      placeholder="6-digit pincode"
                    />
                    {isCheckingPincode && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                    )}
                  </div>
                  {address.pincode.length === 6 && !isCheckingPincode && pincodeData && (
                    <p className="text-sm mt-1 text-green-600">
                      {pincodeData.city && pincodeData.state
                        ? `✓ Delivers to ${pincodeData.city}, ${pincodeData.state} in ${pincodeData.delivery_days} days`
                        : `✓ We deliver to this pincode in ${pincodeData.delivery_days}-7 business days`
                      }
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    value={address.addressLine1}
                    onChange={(e) => setAddress(a => ({ ...a, addressLine1: e.target.value }))}
                    placeholder="House no., Building, Street"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={address.addressLine2}
                    onChange={(e) => setAddress(a => ({ ...a, addressLine2: e.target.value }))}
                    placeholder="Area, Landmark (Optional)"
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={address.city}
                      onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))}
                      placeholder="City"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={address.state}
                      onChange={(e) => setAddress(a => ({ ...a, state: e.target.value }))}
                      placeholder="State"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <div className="space-y-4">
                {/* Razorpay Option */}
                <button
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    paymentMethod === 'razorpay' ? 'border-black bg-gray-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Pay Online</p>
                        <p className="text-sm text-gray-500">
                          UPI, Cards, Net Banking
                        </p>
                      </div>
                    </div>
                    {paymentMethod === 'razorpay' && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </button>

                {/* COD Option */}
                <button
                  onClick={() => canUseCOD && setPaymentMethod('cod')}
                  disabled={!canUseCOD}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    paymentMethod === 'cod' ? 'border-black bg-gray-50' : 'border-gray-200'
                  } ${!canUseCOD ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Cash on Delivery</p>
                        <p className="text-sm text-gray-500">
                          +₹300 COD charges
                        </p>
                      </div>
                    </div>
                    {paymentMethod === 'cod' && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </button>
                
                {!canUseCOD && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-800">
                      {subtotal < MIN_ORDER_FOR_COD
                        ? `COD is available for orders above ${formatPrice(MIN_ORDER_FOR_COD)}`
                        : 'COD is not available for your pincode'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Step */}
            {step === 'confirm' && (
              <div className="space-y-6">
                {/* Contact Summary */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Contact</h3>
                    <button 
                      onClick={() => setStep('contact')}
                      className="text-sm text-blue-600"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">{contact.name}</p>
                  <p className="text-sm text-gray-600">{contact.phone}</p>
                  {contact.email && (
                    <p className="text-sm text-gray-600">{contact.email}</p>
                  )}
                </div>

                {/* Address Summary */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Delivery Address
                    </h3>
                    <button 
                      onClick={() => setStep('address')}
                      className="text-sm text-blue-600"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {address.addressLine1}
                    {address.addressLine2 && `, ${address.addressLine2}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  {pincodeData && (
                    <Badge variant="secondary" className="mt-2">
                      Delivery in {pincodeData.delivery_days} days
                    </Badge>
                  )}
                </div>

                {/* Payment Summary */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Payment Method</h3>
                    <button 
                      onClick={() => setStep('payment')}
                      className="text-sm text-blue-600"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {paymentMethod === 'razorpay' ? 'Pay Online (UPI/Cards)' : 'Cash on Delivery'}
                  </p>
                </div>

                {/* Order Summary */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Subtotal ({items.length} items)
                      </span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span className={shippingCharge === 0 ? 'text-green-600' : ''}>
                        {shippingCharge === 0 ? 'FREE' : formatPrice(shippingCharge)}
                      </span>
                    </div>
                    {codCharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">COD Charges</span>
                        <span>{formatPrice(codCharge)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-white">
            {step !== 'confirm' ? (
              <Button 
                size="lg" 
                className="w-full"
                onClick={goToNext}
                disabled={
                  (step === 'contact' && !isContactValid) ||
                  (step === 'address' && (!isAddressValid || !pincodeData))
                }
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                size="lg" 
                className="w-full"
                onClick={handlePayment}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {paymentMethod === 'razorpay' ? 'Pay' : 'Place Order'} {formatPrice(total)}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
