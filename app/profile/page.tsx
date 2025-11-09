'use client'

import { Envelope, FileText, Lock, Phone, ShoppingBag, Trash, User, Warning } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../src/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import { Separator } from '../../src/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../src/components/ui/tabs'
import { useApp } from '../../src/context/AppContext'

export default function ProfilePage() {
  const router = useRouter()
  const { currentUser, logout, isLoading } = useApp()
  const [activeTab, setActiveTab] = useState('info')
  
  // Edit information state
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Account deletion state
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Order history state
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login')
    }
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: '',
      })
    }
  }, [currentUser, isLoading, router])

  useEffect(() => {
    // Fetch orders from API
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders/my-orders')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setOrders(data.data || [])
          }
        }
      } catch (error) {
        console.error('Error loading orders:', error)
      }
    }
    if (currentUser) {
      fetchOrders()
    }
  }, [currentUser])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        toast.success('Profile updated successfully')
        setIsEditing(false)
      } else {
        toast.error('Error updating profile')
      }
    } catch (error) {
      toast.error('Error updating profile')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must contain at least 8 characters')
      return
    }

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })
      
      if (response.ok) {
        toast.success('Password changed successfully')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        const data = await response.json()
        toast.error(data.message || 'Error changing password')
      }
    } catch (error) {
      toast.error('Error changing password')
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      toast.error('Please type "SUPPRIMER" to confirm')
      return
    }

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast.success('Account deleted successfully')
        await logout()
      } else {
        toast.error('Error deleting account')
      }
    } catch (error) {
      toast.error('Error deleting account')
    }
  }

  const downloadMyData = async () => {
    try {
      const response = await fetch('/api/user/export-data')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mes-donnees-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Data downloaded')
      } else {
        toast.error('Error downloading data')
      }
    } catch (error) {
      toast.error('Error downloading data')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center space-x-3 sm:space-x-4 mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <User size={28} className="sm:hidden" weight="duotone" />
              <User size={32} className="hidden sm:block" weight="duotone" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                My Profile
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg">Manage your personal information and account</p>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="glass-card p-1 sm:p-1.5 shadow-lg border-2 border-white/50 w-full grid grid-cols-4 gap-1">
            <TabsTrigger 
              value="info" 
              className="flex items-center justify-center sm:space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <User size={20} className="sm:hidden" weight="duotone" />
              <User size={18} className="hidden sm:block" weight="duotone" />
              <span className="font-medium hidden sm:inline">Information</span>
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex items-center justify-center sm:space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Lock size={20} className="sm:hidden" weight="duotone" />
              <Lock size={18} className="hidden sm:block" weight="duotone" />
              <span className="font-medium hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="flex items-center justify-center sm:space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <ShoppingBag size={20} className="sm:hidden" weight="duotone" />
              <ShoppingBag size={18} className="hidden sm:block" weight="duotone" />
              <span className="font-medium hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger 
              value="data" 
              className="flex items-center justify-center sm:space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <FileText size={20} className="sm:hidden" weight="duotone" />
              <FileText size={18} className="hidden sm:block" weight="duotone" />
              <span className="font-medium hidden sm:inline">My Data</span>
            </TabsTrigger>
          </TabsList>

          {/* Personal information tab */}
          <TabsContent value="info">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card border-2 border-white/50 shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-purple-600/10 rounded-full blur-3xl -z-10 transform translate-x-32 -translate-y-32"></div>
                <CardHeader className="bg-gradient-to-r from-primary/5 to-blue-600/5 border-b border-white/20">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg">
                      <User size={20} className="sm:hidden" weight="duotone" />
                      <User size={24} className="hidden sm:block" weight="duotone" />
                    </div>
                    <div>
                      <CardTitle className="text-lg sm:text-xl md:text-2xl">Personal Information</CardTitle>
                      <CardDescription className="text-xs sm:text-sm md:text-base">
                        View and edit your personal information
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-blue-500/5 to-purple-500/5 border border-white/30 shadow-inner">
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-2xl shadow-primary/40 ring-4 ring-white/50">
                        {currentUser.name?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-500 border-4 border-white flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                        {currentUser.name || 'User'}
                      </h2>
                      <p className="text-muted-foreground text-base sm:text-lg mb-2">{currentUser.email}</p>
                      <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/30">
                        Verified Account
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                          <User size={16} />
                          <span>Full Name</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          disabled={!isEditing}
                          className="bg-white/80 border-2 focus:border-primary transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                          <Envelope size={16} />
                          <span>Email</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          disabled={!isEditing}
                          className="bg-white/80 border-2 focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                        <Phone size={16} />
                        <span>Phone (optional)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!isEditing}
                        placeholder="+33 6 12 34 56 78"
                        className="bg-white/80 border-2 focus:border-primary transition-all"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0 pt-4">
                      {!isEditing ? (
                        <Button 
                          type="button" 
                          onClick={() => setIsEditing(true)} 
                          className="glass-button shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                          size="lg"
                        >
                          <User size={16} className="mr-2 sm:hidden" weight="duotone" />
                          <User size={18} className="mr-2 hidden sm:block" weight="duotone" />
                          Edit my information
                        </Button>
                      ) : (
                        <>
                          <Button 
                            type="submit" 
                            className="glass-button shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                            size="lg"
                          >
                            💾 Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            className="border-2 border-white/50 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                            size="lg"
                          >
                            ✕ Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Security tab */}
          <TabsContent value="security">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="glass-card border-2 border-white/50 shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/10 to-red-600/10 rounded-full blur-3xl -z-10 transform translate-x-32 -translate-y-32"></div>
                <CardHeader className="bg-gradient-to-r from-orange-500/5 to-red-600/5 border-b border-white/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg">
                      <Lock size={24} weight="duotone" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Change Password</CardTitle>
                      <CardDescription className="text-base">
                        Change your password to secure your account
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                        <Lock size={16} />
                        <span>Current Password</span>
                      </Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        required
                        className="bg-white/80 border-2 focus:border-orange-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                        <Lock size={16} />
                        <span>New Password</span>
                      </Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                        minLength={8}
                        className="bg-white/80 border-2 focus:border-orange-500 transition-all"
                      />
                      <p className="text-xs text-muted-foreground flex items-center space-x-1">
                        <span>🔒</span>
                        <span>Minimum 8 characters</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                        <Lock size={16} />
                        <span>Confirm New Password</span>
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required
                        className="bg-white/80 border-2 focus:border-orange-500 transition-all"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
                      size="lg"
                    >
                      <Lock size={18} className="mr-2" weight="duotone" />
                      Change Password
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="glass-card border-2 border-red-300 shadow-xl overflow-hidden bg-red-50/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-500/10 to-pink-600/10 rounded-full blur-3xl -z-10 transform translate-x-32 -translate-y-32"></div>
                <CardHeader className="bg-gradient-to-r from-red-500/10 to-pink-600/10 border-b border-red-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                      <Warning size={24} weight="duotone" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-red-700 flex items-center space-x-2">
                        <span>Danger Zone</span>
                      </CardTitle>
                      <CardDescription className="text-base text-red-600">
                        Irreversible actions on your account
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {!showDeleteModal ? (
                    <Button
                      variant="outline"
                      className="border-2 border-red-400 text-red-700 hover:bg-red-100 shadow-lg hover:shadow-xl transition-all"
                      onClick={() => setShowDeleteModal(true)}
                      size="lg"
                    >
                      <Trash size={18} className="mr-2" weight="duotone" />
                      Delete my account
                    </Button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4 p-6 border-2 border-red-400 rounded-2xl bg-red-100/50 shadow-inner"
                    >
                      <div className="flex items-start space-x-3">
                        <Warning size={24} className="text-red-700 flex-shrink-0 mt-1" weight="duotone" />
                        <div>
                          <p className="text-sm text-red-800 font-semibold mb-2">
                            ⚠️ This action is irreversible. All your data will be permanently deleted.
                          </p>
                          <p className="text-sm text-red-700">
                            To confirm deletion, type <strong className="font-bold text-red-900">SUPPRIMER</strong> in the field below:
                          </p>
                        </div>
                      </div>
                      <Input
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="Type SUPPRIMER"
                        className="bg-white border-2 border-red-400 focus:border-red-600 text-center font-semibold text-lg"
                      />
                      <div className="flex space-x-4">
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirmation !== 'SUPPRIMER'}
                          className="shadow-lg hover:shadow-xl transition-all"
                          size="lg"
                        >
                          <Trash size={18} className="mr-2" weight="duotone" />
                          Confirm Deletion
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDeleteModal(false)
                            setDeleteConfirmation('')
                          }}
                          className="border-2 shadow-lg hover:shadow-xl transition-all"
                          size="lg"
                        >
                          ✕ Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Orders tab */}
          <TabsContent value="orders">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card border-2 border-white/50 shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-full blur-3xl -z-10 transform translate-x-32 -translate-y-32"></div>
                <CardHeader className="bg-gradient-to-r from-green-500/5 to-emerald-600/5 border-b border-white/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                      <ShoppingBag size={24} weight="duotone" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Order History</CardTitle>
                      <CardDescription className="text-base">
                        View your purchase and reservation history
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {orders.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                        <ShoppingBag size={48} className="text-green-600" weight="duotone" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No Orders</h3>
                      <p className="text-muted-foreground mb-6">You haven't made any purchases yet</p>
                      <Button
                        onClick={() => router.push('/events')}
                        className="glass-button shadow-lg hover:shadow-xl transition-all"
                        size="lg"
                      >
                        🎉 Discover Events
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order, index) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-6 border-2 border-white/50 rounded-2xl bg-gradient-to-br from-white/50 to-green-50/30 shadow-lg hover:shadow-xl transition-all space-y-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-lg flex items-center space-x-2">
                                <span>📦</span>
                                <span>Order #{order.id.slice(0, 8)}</span>
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                📅 {new Date(order.createdAt).toLocaleDateString('en-US', { 
                                  day: 'numeric', 
                                  month: 'long', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-2xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                {order.totalPrice}€
                              </p>
                              <span className="inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg mt-2">
                                ✓ {order.status}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* My Data tab (GDPR) */}
          <TabsContent value="data">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card border-2 border-white/50 shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-full blur-3xl -z-10 transform translate-x-32 -translate-y-32"></div>
                <CardHeader className="bg-gradient-to-r from-purple-500/5 to-pink-600/5 border-b border-white/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                      <FileText size={24} weight="duotone" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">My Personal Data</CardTitle>
                      <CardDescription className="text-base">
                        In accordance with GDPR, you can access and manage your data
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <div className="space-y-6">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="flex items-start space-x-4 p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 shadow-lg"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                        <FileText size={24} weight="duotone" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">Download My Data</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Download a complete copy of all your personal data in JSON format
                        </p>
                        <Button 
                          onClick={downloadMyData} 
                          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
                          size="lg"
                        >
                          <FileText size={18} className="mr-2" weight="duotone" />
                          Download My Data
                        </Button>
                      </div>
                    </motion.div>

                    <Separator />

                    <div className="space-y-3 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-2xl">📊</span>
                        <p className="font-bold text-lg">Data Collected</p>
                      </div>
                      <ul className="space-y-2 ml-8">
                        <li className="flex items-start space-x-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span className="text-sm">Identification information (name, email)</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span className="text-sm">Order and transaction history</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span className="text-sm">Preferences and favorites</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span className="text-sm">Browsing data (cookies)</span>
                        </li>
                      </ul>
                    </div>

                    <Separator />

                    <div className="space-y-3 p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-2xl">⚖️</span>
                        <p className="font-bold text-lg">Your GDPR Rights</p>
                      </div>
                      <ul className="space-y-2 ml-8">
                        <li className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm">Right of access to your data</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm">Right to rectification</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm">Right to erasure (account deletion)</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm">Right to data portability</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm">Right to object to processing</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card className="glass-card border-2 border-white/50 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-full blur-3xl -z-10 transform translate-x-24 -translate-y-24"></div>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg">
                    💬
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Need Help?</h3>
                    <p className="text-sm text-muted-foreground">
                      Our support team is here to help you
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push('/contact')}
                  className="border-2 border-white/50 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  size="lg"
                >
                  📧 Contact Us
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
