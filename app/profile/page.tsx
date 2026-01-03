'use client'

import { Envelope, FileText, Lock, Phone, Shield, ShoppingBag, Trash, User, Warning } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../src/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import { Separator } from '../../src/components/ui/separator'
import { Switch } from '../../src/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../src/components/ui/tabs'
import { useApp } from '../../src/context/AppContext'

export default function ProfilePage() {
  const router = useRouter()
  const { currentUser, setCurrentUser, logout, isLoading } = useApp()
  const [activeTab, setActiveTab] = useState('info')
  
  const translateOrderStatus = (status: string): string => {
    const key = (status || '').toString().toUpperCase()
    const map: Record<string, string> = {
      PENDING: 'En attente',
      PROCESSING: 'En traitement',
      PAID: 'Payée',
      COMPLETED: 'Terminée',
      CANCELED: 'Annulée',
      CANCELLED: 'Annulée',
      REFUNDED: 'Remboursée',
      FAILED: 'Échouée',
    }
    return map[key] || status
  }

  // Edit information state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
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
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersLoaded, setOrdersLoaded] = useState(false)

  // Consent state for GDPR
  const [consents, setConsents] = useState({
    marketing: false,
    analytics: true,
    thirdParty: false,
  })
  const [consentsLoading, setConsentsLoading] = useState(false)
  const [consentsLoaded, setConsentsLoaded] = useState(false)
  const [showDataDeleteModal, setShowDataDeleteModal] = useState(false)
  const [dataDeleteConfirmation, setDataDeleteConfirmation] = useState('')

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login')
    }
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        city: currentUser.city || '',
        postalCode: currentUser.postalCode || '',
        country: currentUser.country || 'France',
      })
    }
  }, [currentUser, isLoading, router])

  // Fetch orders only when orders tab is active
  useEffect(() => {
    const fetchOrders = async () => {
      if (ordersLoaded) return; // Don't fetch if already loaded
      
      setOrdersLoading(true);
      try {
        const response = await fetch('/api/orders/my-orders')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setOrders(data.data || [])
            setOrdersLoaded(true);
          }
        }
      } catch (error) {
        console.error('Error loading orders:', error)
      } finally {
        setOrdersLoading(false);
      }
    }
    
    if (currentUser && activeTab === 'orders') {
      fetchOrders()
    }
  }, [currentUser, activeTab, ordersLoaded])

  // Fetch consent settings only when privacy tab is active
  useEffect(() => {
    const fetchConsents = async () => {
      if (consentsLoaded) return; // Don't fetch if already loaded
      
      setConsentsLoading(true);
      try {
        const response = await fetch('/api/user/consent')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setConsents({
              marketing: data.data.marketing || false,
              analytics: data.data.analytics !== false, // default true
              thirdParty: data.data.thirdParty || false,
            })
            setConsentsLoaded(true);
          }
        }
      } catch (error) {
        console.error('Error loading consents:', error)
      } finally {
        setConsentsLoading(false);
      }
    }
    
    if (currentUser && activeTab === 'privacy') {
      fetchConsents()
    }
  }, [currentUser, activeTab, consentsLoaded])

  const handleConsentChange = async (type: 'marketing' | 'analytics' | 'thirdParty', value: boolean) => {
    const newConsents = { ...consents, [type]: value }
    setConsents(newConsents)
    setConsentsLoading(true)
    
    try {
      const response = await fetch('/api/user/consent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConsents),
      })
      
      if (response.ok) {
        toast.success('Préférences mises à jour', {
          style: {
            background: 'rgb(34, 197, 94)',
            border: '1px solid rgb(22, 163, 74)',
            color: '#ffffff',
            width: 'fit-content',
          },
        })
      } else {
        // Revert on failure
        setConsents(consents)
        toast.error('Erreur lors de la mise à jour')
      }
    } catch (error) {
      setConsents(consents)
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setConsentsLoading(false)
    }
  }

  const handleDeleteAccountFromData = async () => {
    if (dataDeleteConfirmation !== 'SUPPRIMER') {
      toast.error('Veuillez saisir "SUPPRIMER" pour confirmer')
      return
    }

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast.success('Compte supprimé avec succès')
        await logout()
      } else {
        toast.error('Erreur lors de la suppression du compte')
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression du compte')
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setCurrentUser(data.data)
        }
        toast.success('Profil mis à jour avec succès', {
          style: {
            background: 'rgb(34, 197, 94)',
            border: '1px solid rgb(22, 163, 74)',
            color: '#ffffff',
            width: 'fit-content',
          },
        })
        
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Erreur lors de la mise à jour du profil')
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
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
        toast.success('Mot de passe modifié avec succès')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erreur lors du changement de mot de passe')
      }
    } catch (error) {
      toast.error('Erreur lors du changement de mot de passe')
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      toast.error('Veuillez saisir "SUPPRIMER" pour confirmer')
      return
    }

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast.success('Compte supprimé avec succès')
        await logout()
      } else {
        toast.error('Erreur lors de la suppression du compte')
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression du compte')
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
        toast.success('Données téléchargées')
      } else {
        toast.error('Erreur lors du téléchargement des données')
      }
    } catch (error) {
      toast.error('Erreur lors du téléchargement des données')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
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
                Mon profil
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg">Gérez vos informations personnelles et votre compte</p>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="w-full h-auto p-1.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-row">
            <TabsTrigger 
              value="info" 
              className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary/5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <User size={18} weight="duotone" className="shrink-0" />
              <span className="hidden sm:inline">Informations</span>
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:text-orange-500 hover:bg-orange-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <Lock size={18} weight="duotone" className="shrink-0" />
              <span className="hidden sm:inline">Sécurité</span>
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:text-green-500 hover:bg-green-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <ShoppingBag size={18} weight="duotone" className="shrink-0" />
              <span className="hidden sm:inline">Commandes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="data" 
              className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:text-purple-500 hover:bg-purple-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <FileText size={18} weight="duotone" className="shrink-0" />
              <span className="hidden sm:inline">Mes données</span>
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
                      <CardTitle className="text-lg sm:text-xl md:text-2xl">Informations personnelles</CardTitle>
                      <CardDescription className="text-xs sm:text-sm md:text-base">
                        Consultez et modifiez vos informations personnelles
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
                        {currentUser.name || 'Utilisateur'}
                      </h2>
                      <p className="text-muted-foreground text-base sm:text-lg mb-2">{currentUser.email}</p>
                      <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/30">
                        Compte vérifié
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <form 
                    onSubmit={handleUpdateProfile} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                        e.preventDefault()
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                          <User size={16} />
                          <span>Nom complet</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="bg-white/80 border-2 focus:border-primary transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                          <Envelope size={16} />
                          <span>E-mail</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-white/80 border-2 focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                        <Phone size={16} />
                        <span>Téléphone (optionnel)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+33 6 12 34 56 78"
                        className="bg-white/80 border-2 focus:border-primary transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                        <Shield size={16} />
                        <span>Adresse (optionnel)</span>
                      </Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 rue de la République"
                        className="bg-white/80 border-2 focus:border-primary transition-all"
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                          <Shield size={16} />
                          <span>Code postal</span>
                        </Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          placeholder="75001"
                          className="bg-white/80 border-2 focus:border-primary transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                          <Shield size={16} />
                          <span>Ville</span>
                        </Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Paris"
                          className="bg-white/80 border-2 focus:border-primary transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                          <Shield size={16} />
                          <span>Pays</span>
                        </Label>
                        <Input
                          id="country"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          placeholder="France"
                          className="bg-white/80 border-2 focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0 pt-4">
                      <Button 
                        type="submit" 
                        className="glass-button shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                        size="lg"
                      >
                        <User size={16} className="mr-2 sm:hidden" weight="duotone" />
                        <User size={18} className="mr-2 hidden sm:block" weight="duotone" />
                        💾 Enregistrer les modifications
                      </Button>
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
                      <CardTitle className="text-2xl">Changer le mot de passe</CardTitle>
                      <CardDescription className="text-base">
                        Modifiez votre mot de passe pour sécuriser votre compte
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                        <Lock size={16} />
                        <span>Mot de passe actuel</span>
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
                        <span>Nouveau mot de passe</span>
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
                        <span>8 caractères minimum</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                        <Lock size={16} />
                        <span>Confirmer le nouveau mot de passe</span>
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
                      Changer le mot de passe
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
                        <span>Zone de danger</span>
                      </CardTitle>
                      <CardDescription className="text-base text-red-600">
                        Actions irréversibles sur votre compte
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
                      Supprimer mon compte
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
                            ⚠️ Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                          </p>
                          <p className="text-sm text-red-700">
                            Pour confirmer la suppression, saisissez <strong className="font-bold text-red-900">SUPPRIMER</strong> dans le champ ci-dessous :
                          </p>
                        </div>
                      </div>
                      <Input
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="Tapez SUPPRIMER"
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
                          Confirmer la suppression
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
                          ✕ Annuler
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
                      <CardTitle className="text-2xl">Historique des commandes</CardTitle>
                      <CardDescription className="text-base">
                        Consultez vos achats et réservations
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {ordersLoading ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center animate-pulse">
                        <ShoppingBag size={48} className="text-green-600" weight="duotone" />
                      </div>
                      <p className="text-muted-foreground">Chargement de vos commandes...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                        <ShoppingBag size={48} className="text-green-600" weight="duotone" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Aucune commande</h3>
                      <p className="text-muted-foreground mb-6">Aucun achat effectué pour le moment</p>
                      <Button
                        onClick={() => router.push('/events')}
                        className="glass-button shadow-lg hover:shadow-xl transition-all"
                        size="lg"
                      >
                        🎉 Découvrir les événements
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
                                <span>Commande n° {order.id.slice(0, 8)}</span>
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                📅 {new Date(order.createdAt).toLocaleDateString('fr-FR', { 
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
                                ✓ {translateOrderStatus(order.status)}
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
                      <CardTitle className="text-2xl">Mes données personnelles</CardTitle>
                      <CardDescription className="text-base">
                        Conformément au RGPD, vous pouvez accéder à vos données et les gérer
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <div className="space-y-6">
                    {/* Section: Télécharger mes données */}
                    <div className="flex items-start space-x-4 p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 shadow-lg">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                        <FileText size={24} weight="duotone" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">Télécharger mes données</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Téléchargez une copie complète de vos données personnelles au format JSON (incluant vos commandes, avis, notifications et préférences)
                        </p>
                        <Button 
                          onClick={downloadMyData} 
                          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
                          size="lg"
                        >
                          <FileText size={18} className="mr-2" weight="duotone" />
                          Télécharger mes données
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Section: Gestion des consentements */}
                    <div className="space-y-4 p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-200">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg">
                          <Shield size={20} weight="duotone" />
                        </div>
                        <p className="font-bold text-lg">Gestion des consentements</p>
                      </div>
                      
                      {consentsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-pulse space-y-4">
                            <div className="h-16 bg-white/50 rounded-xl"></div>
                            <div className="h-16 bg-white/50 rounded-xl"></div>
                            <div className="h-16 bg-white/50 rounded-xl"></div>
                          </div>
                          <p className="text-muted-foreground mt-4 text-sm">Chargement de vos préférences...</p>
                        </div>
                      ) : (
                      <div className="space-y-4">
                        <div 
                          className="flex items-center justify-between p-4 bg-white rounded-xl border border-indigo-100 shadow-sm cursor-pointer hover:bg-indigo-50/50 transition-colors"
                          onClick={() => !consentsLoading && handleConsentChange('marketing', !consents.marketing)}
                        >
                          <div className="flex-1">
                            <p className="font-semibold">Communications marketing</p>
                            <p className="text-sm text-muted-foreground">Recevoir des offres et actualités par e-mail</p>
                          </div>
                          <Switch
                            checked={consents.marketing}
                            onCheckedChange={(checked) => handleConsentChange('marketing', checked)}
                            disabled={consentsLoading}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        
                        <div 
                          className="flex items-center justify-between p-4 bg-white rounded-xl border border-indigo-100 shadow-sm cursor-pointer hover:bg-indigo-50/50 transition-colors"
                          onClick={() => !consentsLoading && handleConsentChange('analytics', !consents.analytics)}
                        >
                          <div className="flex-1">
                            <p className="font-semibold">Cookies analytiques</p>
                            <p className="text-sm text-muted-foreground">Nous aider à améliorer notre service</p>
                          </div>
                          <Switch
                            checked={consents.analytics}
                            onCheckedChange={(checked) => handleConsentChange('analytics', checked)}
                            disabled={consentsLoading}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        
                        <div 
                          className="flex items-center justify-between p-4 bg-white rounded-xl border border-indigo-100 shadow-sm cursor-pointer hover:bg-indigo-50/50 transition-colors"
                          onClick={() => !consentsLoading && handleConsentChange('thirdParty', !consents.thirdParty)}
                        >
                          <div className="flex-1">
                            <p className="font-semibold">Partage avec des tiers</p>
                            <p className="text-sm text-muted-foreground">Partager vos données avec nos partenaires</p>
                          </div>
                          <Switch
                            checked={consents.thirdParty}
                            onCheckedChange={(checked) => handleConsentChange('thirdParty', checked)}
                            disabled={consentsLoading}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      )}
                      
                      <div className="mt-4 p-3 bg-indigo-100/50 rounded-lg border border-indigo-200">
                        <p className="text-xs text-indigo-700">
                          ℹ️ Vous pouvez modifier vos consentements à tout moment. Vos préférences sont enregistrées immédiatement.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Section: Données collectées */}
                    <div className="space-y-3 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-2xl">📊</span>
                        <p className="font-bold text-lg">Données collectées</p>
                      </div>
                      <ul className="space-y-2 ml-8">
                        <li className="flex items-start space-x-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span className="text-sm">Informations d&apos;identification (nom, e-mail)</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span className="text-sm">Historique des commandes et transactions</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span className="text-sm">Préférences et consentements</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span className="text-sm">Notifications et avis</span>
                        </li>
                      </ul>
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <Link 
                          href="/privacy" 
                          className="text-sm text-indigo-600 hover:text-indigo-800 underline font-medium"
                        >
                          📄 Consulter notre politique de confidentialité complète
                        </Link>
                      </div>
                    </div>

                    <Separator />

                    {/* Section: Vos droits RGPD */}
                    <div className="space-y-3 p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-2xl">⚖️</span>
                        <p className="font-bold text-lg">Vos droits RGPD</p>
                      </div>
                      <ul className="space-y-2 ml-8">
                        <li className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm">Droit d&apos;accès à vos données</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm">Droit de rectification</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm">Droit à l&apos;effacement (suppression du compte)</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm">Droit à la portabilité des données</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm">Droit d&apos;opposition au traitement</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm">Droit à la limitation du traitement</span>
                        </li>
                      </ul>
                      <div className="mt-4 p-3 bg-green-100/50 rounded-lg border border-green-200">
                        <p className="text-xs text-green-800">
                          <strong>📅 Délai de traitement :</strong> Vos demandes d&apos;export ou de suppression sont traitées sous 30 jours maximum.
                        </p>
                        <p className="text-xs text-green-800 mt-2">
                          <strong>🗂️ Conservation :</strong> Vos données personnelles sont conservées pendant 3 ans après votre dernière activité.
                        </p>
                        <p className="text-xs text-green-800 mt-2">
                          <strong>📧 Contact DPO :</strong> Pour toute question sur vos données :{' '}
                          <a href="mailto:dpo@billetterie.fr" className="underline font-semibold">dpo@billetterie.fr</a>
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Section: Suppression du compte */}
                    <div className="space-y-4 p-6 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
                          <Trash size={20} weight="duotone" />
                        </div>
                        <div>
                          <p className="font-bold text-lg text-red-800">Supprimer mon compte</p>
                          <p className="text-sm text-red-600">Exercez votre droit à l&apos;effacement (Art. 17 RGPD)</p>
                        </div>
                      </div>
                      
                      {!showDataDeleteModal ? (
                        <Button
                          variant="outline"
                          className="border-2 border-red-400 text-red-700 hover:bg-red-100 shadow-lg hover:shadow-xl transition-all"
                          onClick={() => setShowDataDeleteModal(true)}
                          size="lg"
                        >
                          <Trash size={18} className="mr-2" weight="duotone" />
                          Supprimer définitivement mon compte
                        </Button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-4 p-4 border-2 border-red-400 rounded-xl bg-red-100/50 shadow-inner"
                        >
                          <div className="flex items-start space-x-3">
                            <Warning size={24} className="text-red-700 flex-shrink-0 mt-1" weight="duotone" />
                            <div>
                              <p className="text-sm text-red-800 font-semibold mb-2">
                                ⚠️ Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                              </p>
                              <p className="text-sm text-red-700">
                                Pour confirmer la suppression, saisissez <strong className="font-bold text-red-900">SUPPRIMER</strong> ci-dessous :
                              </p>
                            </div>
                          </div>
                          <Input
                            value={dataDeleteConfirmation}
                            onChange={(e) => setDataDeleteConfirmation(e.target.value)}
                            placeholder="Tapez SUPPRIMER"
                            className="bg-white border-2 border-red-400 focus:border-red-600 text-center font-semibold"
                          />
                          <div className="flex space-x-4">
                            <Button
                              variant="destructive"
                              onClick={handleDeleteAccountFromData}
                              disabled={dataDeleteConfirmation !== 'SUPPRIMER'}
                              className="shadow-lg hover:shadow-xl transition-all"
                            >
                              <Trash size={18} className="mr-2" weight="duotone" />
                              Confirmer
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowDataDeleteModal(false)
                                setDataDeleteConfirmation('')
                              }}
                              className="border-2 shadow-lg hover:shadow-xl transition-all"
                            >
                              ✕ Annuler
                            </Button>
                          </div>
                        </motion.div>
                      )}
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
                    <h3 className="font-bold text-lg">Besoin d&apos;aide&nbsp;?</h3>
                    <p className="text-sm text-muted-foreground">
                      Notre équipe d&apos;assistance est là pour vous aider
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push('/contact')}
                  className="border-2 border-white/50 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  size="lg"
                >
                  📧 Nous contacter
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
