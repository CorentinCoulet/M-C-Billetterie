'use client'

import { Minus, Plus, ShoppingCart, Trash, X } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../src/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card'
import { Separator } from '../../src/components/ui/separator'
import { useApp } from '../../src/context/AppContext'

export default function CartPage() {
  const router = useRouter()
  const { cart, removeFromCart, updateCartQuantity, clearCart, currentUser } = useApp()
  const [isProcessing, setIsProcessing] = useState(false)

  // Calculate total
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleQuantityChange = (eventId: string, delta: number) => {
    const item = cart.find((i) => i.eventId === eventId)
    if (!item) return

    const newQuantity = item.quantity + delta
    if (newQuantity < 1) {
      handleRemoveItem(eventId)
      return
    }
    if (newQuantity > 10) {
      toast.error('Maximum 10 billets par événement')
      return
    }

    updateCartQuantity(eventId, newQuantity)
  }

  const handleRemoveItem = (eventId: string) => {
    removeFromCart(eventId)
    toast.success('Article retiré du panier')
  }

  const handleClearCart = () => {
    if (cart.length === 0) return
    clearCart()
    toast.success('Panier vidé')
  }

  const handleCheckout = async () => {
    if (!currentUser) {
      toast.error('Veuillez vous connecter pour continuer')
      router.push('/login')
      return
    }

    if (cart.length === 0) {
      toast.error('Votre panier est vide')
      return
    }

    setIsProcessing(true)
    try {
      // TODO: Implement actual checkout API
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success('Commande passée avec succès !')
      clearCart()
      router.push('/profile?tab=orders')
    } catch (error) {
      toast.error('Erreur lors du traitement de la commande')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-primary/30">
                  <ShoppingCart size={32} className="sm:hidden" weight="duotone" />
                  <ShoppingCart size={40} className="hidden sm:block" weight="duotone" />
                </div>
                {cart.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-500 border-4 border-white flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs sm:text-sm font-bold">{cart.length}</span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                  Mon Panier
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg md:text-xl">
                  {cart.length} {cart.length === 1 ? 'article' : 'articles'}
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearCart}
                className="border-2 border-red-300 text-red-700 hover:bg-red-50 shadow-lg w-full sm:w-auto"
                size="lg"
              >
                <Trash size={18} className="mr-2" weight="duotone" />
                Vider le panier
              </Button>
            )}
          </div>
        </motion.div>

        {cart.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <Card className="glass-card border-2 border-white/50 shadow-xl">
              <CardContent className="pt-16 pb-16">
                <div className="w-32 h-32 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <ShoppingCart size={64} className="text-blue-600" weight="duotone" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Votre panier est vide</h3>
                <p className="text-muted-foreground mb-8 text-lg">
                  Parcourez les événements et ajoutez des billets pour commencer
                </p>
                <Button
                  onClick={() => router.push('/events')}
                  className="glass-button shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                >
                  🎉 Découvrir les événements
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item, index) => (
                <motion.div
                  key={item.eventId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-card border-2 border-white/50 shadow-lg hover:shadow-xl transition-all overflow-hidden">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg sm:text-xl font-bold mb-2 text-foreground line-clamp-2">
                            {item.eventName}
                          </h3>
                          <p className="text-base sm:text-lg font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                            {item.price}€ <span className="text-xs sm:text-sm text-muted-foreground">par billet</span>
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.eventId)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 w-9 sm:h-10 sm:w-10 self-end sm:self-start"
                        >
                          <X size={18} className="sm:hidden" weight="bold" />
                          <X size={20} className="hidden sm:block" weight="bold" />
                        </Button>
                      </div>

                      <Separator className="my-3 sm:my-4" />

                      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 sm:gap-4">
                        <div className="flex items-center justify-center xs:justify-start space-x-2 sm:space-x-3">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleQuantityChange(item.eventId, -1)}
                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5"
                          >
                            <Minus size={16} className="sm:hidden" weight="bold" />
                            <Minus size={18} className="hidden sm:block" weight="bold" />
                          </Button>

                          <div className="w-14 h-9 sm:w-16 sm:h-10 rounded-xl bg-gradient-to-br from-primary/10 to-blue-600/10 border-2 border-primary/20 flex items-center justify-center">
                            <span className="text-base sm:text-lg font-bold text-primary">{item.quantity}</span>
                          </div>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleQuantityChange(item.eventId, 1)}
                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5"
                          >
                            <Plus size={16} className="sm:hidden" weight="bold" />
                            <Plus size={18} className="hidden sm:block" weight="bold" />
                          </Button>
                        </div>

                        <div className="text-center xs:text-right">
                          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Sous-total</p>
                          <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                            {(item.price * item.quantity).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:sticky lg:top-24"
              >
                <Card className="glass-card border-2 border-white/50 shadow-xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-purple-600/10 rounded-full blur-3xl -z-10 transform translate-x-24 -translate-y-24"></div>
                  
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-blue-600/5 border-b border-white/20">
                    <CardTitle className="text-xl sm:text-2xl">Récapitulatif</CardTitle>
                    <CardDescription className="text-sm sm:text-base">Vérifiez vos articles</CardDescription>
                  </CardHeader>

                  <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
                    <div className="space-y-2 sm:space-y-3">
                      {cart.map((item) => (
                        <div key={item.eventId} className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground line-clamp-1 pr-2">
                            {item.eventName} × {item.quantity}
                          </span>
                          <span className="font-semibold whitespace-nowrap">{(item.price * item.quantity).toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Sous-total</span>
                        <span className="font-semibold">{total.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Frais de service</span>
                        <span className="font-semibold">{(total * 0.05).toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">TVA (20%)</span>
                        <span className="font-semibold">{(total * 0.2).toFixed(2)}€</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center py-2">
                      <span className="text-lg sm:text-xl font-bold">Total</span>
                      <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {(total * 1.25).toFixed(2)}€
                      </span>
                    </div>

                    <Button
                      onClick={handleCheckout}
                      disabled={isProcessing || cart.length === 0}
                      className="w-full glass-button shadow-lg hover:shadow-xl transition-all h-11 sm:h-12 text-base sm:text-lg"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                          Traitement en cours...
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={18} className="mr-2 sm:hidden" weight="duotone" />
                          <ShoppingCart size={20} className="mr-2 hidden sm:block" weight="duotone" />
                          Passer la commande
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground mt-3 sm:mt-4">
                      🔒 Paiement sécurisé par Stripe
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-2 border-white/50 shadow-lg mt-6 overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-start space-x-2">
                        <span className="text-primary">✓</span>
                        <span>Annulation gratuite jusqu&#39;à 24h avant l&#39;événement</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-primary">✓</span>
                        <span>Livraison instantanée des billets par email</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-primary">✓</span>
                        <span>Support client 24/7</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
