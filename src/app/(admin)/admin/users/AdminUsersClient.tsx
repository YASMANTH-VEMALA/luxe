'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  Trash2, 
  Mail,
  Calendar,
  AlertCircle,
  Loader2,
  Crown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface Admin {
  id: string
  user_id: string
  email: string
  role: 'admin' | 'super_admin'
  created_at: string
  updated_at: string
}

export default function AdminUsersClient() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Add admin form
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'super_admin'>('admin')
  const [isAdding, setIsAdding] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  
  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (response.ok) {
        setAdmins(data.admins || [])
        setError('')
      } else {
        setError(data.error || 'Failed to fetch admins')
      }
    } catch {
      setError('Failed to fetch admins')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  const handleAddAdmin = async () => {
    if (!newEmail.trim()) {
      setError('Email is required')
      return
    }

    setIsAdding(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), role: newRole }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`${newEmail} has been added as ${newRole}`)
        setNewEmail('')
        setNewRole('admin')
        setAddDialogOpen(false)
        fetchAdmins()
      } else {
        setError(data.error || 'Failed to add admin')
      }
    } catch {
      setError('Failed to add admin')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: deleteTarget.id }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`${deleteTarget.email} has been removed as admin`)
        setDeleteTarget(null)
        fetchAdmins()
      } else {
        setError(data.error || 'Failed to remove admin')
      }
    } catch {
      setError('Failed to remove admin')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRoleChange = async (admin: Admin, newRole: 'admin' | 'super_admin') => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: admin.id, role: newRole }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`${admin.email}'s role updated to ${newRole}`)
        fetchAdmins()
      } else {
        setError(data.error || 'Failed to update role')
      }
    } catch {
      setError('Failed to update role')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Users</h1>
          <p className="text-muted-foreground">Manage who has access to the admin panel</p>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
              <DialogDescription>
                Add a user as an admin. They must have already signed up on the website.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as 'admin' | 'super_admin')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="super_admin">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Super Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Super Admins can add/remove other admins
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAdmin} disabled={isAdding}>
                {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 rounded-lg border border-green-200 bg-green-50 text-green-800">
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Role Legend */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
              <span className="text-sm text-muted-foreground">Can manage admins & all features</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
              <span className="text-sm text-muted-foreground">Can manage products, orders & content</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Admin List */}
      {!isLoading && admins.length > 0 && (
        <div className="space-y-3">
          {admins.map((admin) => (
            <Card key={admin.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      admin.role === 'super_admin' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {admin.role === 'super_admin' ? (
                        <Crown className="w-5 h-5" />
                      ) : (
                        <Shield className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{admin.email}</p>
                        <Badge 
                          variant="outline" 
                          className={admin.role === 'super_admin' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                          }
                        >
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Added {format(new Date(admin.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Role Selector */}
                    <Select 
                      value={admin.role} 
                      onValueChange={(v) => handleRoleChange(admin, v as 'admin' | 'super_admin')}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Delete Button */}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteTarget(admin)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && admins.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No admins found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Only super admins can view and manage admin users
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Admin</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.email}</strong> as an admin? 
              They will lose access to the admin panel immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAdmin}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
