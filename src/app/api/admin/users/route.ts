import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

// GET - List all admins (super_admin only)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is super_admin
    const adminClient = createAdminClient()
    const { data: currentAdmin } = await adminClient
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can view admin list' }, { status: 403 })
    }

    // Get all admins
    const { data: admins, error } = await adminClient
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching admins:', error)
      return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 })
    }

    return NextResponse.json({ admins })
  } catch (error) {
    console.error('Admin list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add new admin (super_admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is super_admin
    const adminClient = createAdminClient()
    const { data: currentAdmin } = await adminClient
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can add admins' }, { status: 403 })
    }

    const { email, role = 'admin' } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if user exists in auth.users
    const { data: authUsers } = await adminClient.auth.admin.listUsers()
    const targetUser = authUsers?.users?.find(u => u.email === email)

    if (!targetUser) {
      return NextResponse.json({ 
        error: 'User not found. They must sign up first before being made admin.' 
      }, { status: 404 })
    }

    // Check if already an admin
    const { data: existingAdmin } = await adminClient
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingAdmin) {
      return NextResponse.json({ error: 'User is already an admin' }, { status: 400 })
    }

    // Add as admin
    const { data: newAdmin, error } = await adminClient
      .from('admin_users')
      .insert({
        user_id: targetUser.id,
        email: email,
        role: role,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding admin:', error)
      return NextResponse.json({ error: 'Failed to add admin' }, { status: 500 })
    }

    return NextResponse.json({ admin: newAdmin })
  } catch (error) {
    console.error('Add admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove admin (super_admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is super_admin
    const adminClient = createAdminClient()
    const { data: currentAdmin } = await adminClient
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can remove admins' }, { status: 403 })
    }

    const { adminId } = await request.json()

    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 })
    }

    // Check if trying to remove self
    const { data: targetAdmin } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('id', adminId)
      .single()

    if (targetAdmin?.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
    }

    // Remove admin
    const { error } = await adminClient
      .from('admin_users')
      .delete()
      .eq('id', adminId)

    if (error) {
      console.error('Error removing admin:', error)
      return NextResponse.json({ error: 'Failed to remove admin' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update admin role (super_admin only)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is super_admin
    const adminClient = createAdminClient()
    const { data: currentAdmin } = await adminClient
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can update admin roles' }, { status: 403 })
    }

    const { adminId, role } = await request.json()

    if (!adminId || !role) {
      return NextResponse.json({ error: 'Admin ID and role are required' }, { status: 400 })
    }

    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if trying to demote self
    const { data: targetAdmin } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('id', adminId)
      .single()

    if (targetAdmin?.user_id === user.id && role !== 'super_admin') {
      return NextResponse.json({ error: 'You cannot demote yourself' }, { status: 400 })
    }

    // Update role
    const { data: updatedAdmin, error } = await adminClient
      .from('admin_users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', adminId)
      .select()
      .single()

    if (error) {
      console.error('Error updating admin:', error)
      return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 })
    }

    return NextResponse.json({ admin: updatedAdmin })
  } catch (error) {
    console.error('Update admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
