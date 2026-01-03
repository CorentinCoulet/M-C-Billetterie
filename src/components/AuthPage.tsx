'use client'

import { useState } from 'react'
import { useApp } from '../context/AppContext'

// Icones inline pour éviter l'import de lucide-react
const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const BuildingIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
)

// Imports optimisés - un seul par composant
import { ArrowLeft } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'
import { Input } from '../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { PrivacyModal, TermsModal } from './LegalModal'
import { PasswordStrengthIndicator, validatePassword } from './PasswordStrengthIndicator'

interface AuthPageProps {
  navigate: (page: string) => void
  currentUser?: any
  users?: any[]
  setUsers?: (users: any[]) => void
  setCurrentUser?: (user: any) => void
  logout?: () => void
}

export function AuthPage({ navigate }: AuthPageProps) {
  const { currentUser, setCurrentUser, logout, checkAuth } = useApp()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [userType, setUserType] = useState<'user' | 'organizer'>('user')
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
    companyName: '',
    siret: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    website: '',
    description: '',
    acceptTerms: false,
    acceptPrivacy: false,
    acceptAge: false,
    acceptMarketing: false // optionnel
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        setCurrentUser(data.data.user)
        await checkAuth()
        
        // Si un paramètre redirect est présent et sûr, on le privilégie
        try {
          const params = new URLSearchParams(window.location.search)
          const redirect = params.get('redirect') || ''
          const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('/api')
          if (safeRedirect) {
            window.location.replace(redirect)
            return
          }
        } catch {}

        // Sinon, redirection selon le rôle
        const role = data.data.user.role
        if (role === 'ADMIN') {
          window.location.replace('/admin')
        } else if (role === 'ORGANIZER') {
          window.location.replace('/dashboard')
        } else {
          window.location.replace('/')
        }
      } else {
        alert(data.message || 'Identifiant ou mot de passe incorrect')
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      alert('Une erreur est survenue lors de la connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validation du mot de passe avec le nouveau système
    const passwordValidation = validatePassword(registerData.password, {
      email: registerData.email,
      firstName: registerData.firstName,
      lastName: registerData.lastName
    })

    if (!passwordValidation.isValid) {
      const unmetRequirements = passwordValidation.requirements
        .filter(r => !r.met)
        .map(r => `• ${r.label}`)
        .join('\n')
      alert(`Votre mot de passe ne respecte pas les exigences de sécurité :\n\n${unmetRequirements}`)
      setLoading(false)
      return
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }
    
    // Validation des consentements obligatoires
    if (!registerData.acceptTerms) {
      alert('Vous devez accepter les conditions générales d\'utilisation')
      setLoading(false)
      return
    }

    if (!registerData.acceptPrivacy) {
      alert('Vous devez accepter la politique de confidentialité')
      setLoading(false)
      return
    }

    if (!registerData.acceptAge) {
      alert('Vous devez certifier avoir au moins 16 ans')
      setLoading(false)
      return
    }

    if (userType === 'organizer' && (!registerData.companyName || !registerData.siret)) {
      alert('Veuillez remplir les informations de votre entreprise')
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password,
          confirmPassword: registerData.confirmPassword,
          name: `${registerData.firstName} ${registerData.lastName}`.trim() || undefined,
          consents: {
            terms: registerData.acceptTerms,
            privacy: registerData.acceptPrivacy,
            ageVerification: registerData.acceptAge,
            marketing: registerData.acceptMarketing,
            consentDate: new Date().toISOString()
          }
        }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        setCurrentUser(data.data.user)
        await checkAuth()
        alert('Inscription réussie ! Bienvenue sur notre plateforme.')
        window.location.replace('/')
      } else {
        alert(data.message || 'Erreur lors de l\'inscription')
      }
    } catch (error) {
      console.error('Erreur d\'inscription:', error)
      alert('Une erreur est survenue lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  const updateRegisterData = (field: string, value: any) => {
    setRegisterData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <Button 
          onClick={() => navigate('home')}
          variant="outline" 
          className="mb-6 border-white/40 hover:bg-white/20"
        >
          <ArrowLeft size={16} className="mr-2" />
          Retour à l&#39;accueil
        </Button>
        
        <Card className="glass-card w-full border-2 border-white/40">
          <CardHeader>
            <CardTitle className="text-center bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Authentification
            </CardTitle>
          </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="register">Inscription</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full glass-button" disabled={loading}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <div className="space-y-6">
                {/* Sélecteur de type d'utilisateur */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <Button
                    type="button"
                    variant={userType === 'user' ? 'default' : 'ghost'}
                    className="flex-1 h-12"
                    onClick={() => setUserType('user')}
                  >
                    <UserIcon />
                    <span className="ml-2">Particulier</span>
                  </Button>
                  <Button
                    type="button"
                    variant={userType === 'organizer' ? 'default' : 'ghost'}
                    className="flex-1 h-12"
                    onClick={() => setUserType('organizer')}
                  >
                    <BuildingIcon />
                    <span className="ml-2">Entreprise</span>
                  </Button>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                  {/* Informations personnelles */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                        Informations personnelles
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Prénom <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="firstName"
                          type="text"
                          value={registerData.firstName}
                          onChange={(e) => updateRegisterData('firstName', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lastName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Nom <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="lastName"
                          type="text"
                          value={registerData.lastName}
                          onChange={(e) => updateRegisterData('lastName', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="registerEmail" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="registerEmail"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => updateRegisterData('email', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="phone" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Téléphone
                      </label>
                      <Input
                        id="phone"
                        type="tel"
                        value={registerData.phone}
                        onChange={(e) => updateRegisterData('phone', e.target.value)}
                        placeholder="+33 6 12 34 56 78"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="dateOfBirth" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Date de naissance
                      </label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={registerData.dateOfBirth}
                        onChange={(e) => updateRegisterData('dateOfBirth', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Informations entreprise (si organisateur) */}
                  {userType === 'organizer' && (
                    <div className="space-y-5 border-t pt-6">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium">
                          Informations entreprise
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="companyName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Nom de l&#39;entreprise <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="companyName"
                          type="text"
                          value={registerData.companyName}
                          onChange={(e) => updateRegisterData('companyName', e.target.value)}
                          required={userType === 'organizer'}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="siret" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          SIRET <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="siret"
                          type="text"
                          value={registerData.siret}
                          onChange={(e) => updateRegisterData('siret', e.target.value)}
                          placeholder="14 chiffres"
                          required={userType === 'organizer'}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="address" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Adresse
                        </label>
                        <Input
                          id="address"
                          type="text"
                          value={registerData.address}
                          onChange={(e) => updateRegisterData('address', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="city" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Ville
                          </label>
                          <Input
                            id="city"
                            type="text"
                            value={registerData.city}
                            onChange={(e) => updateRegisterData('city', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="postalCode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Code postal
                          </label>
                          <Input
                            id="postalCode"
                            type="text"
                            value={registerData.postalCode}
                            onChange={(e) => updateRegisterData('postalCode', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="website" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Site web
                        </label>
                        <Input
                          id="website"
                          type="url"
                          value={registerData.website}
                          onChange={(e) => updateRegisterData('website', e.target.value)}
                          placeholder="https://www.exemple.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Description de l&#39;activité
                        </label>
                        <textarea
                          id="description"
                          value={registerData.description}
                          onChange={(e) => updateRegisterData('description', e.target.value)}
                          placeholder="Décrivez brièvement votre activité..."
                          rows={3}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )}

                  {/* Mots de passe */}
                  <div className="space-y-5 border-t pt-6">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                        Sécurité
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="registerPassword" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Mot de passe <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          id="registerPassword"
                          type={showRegisterPassword ? "text" : "password"}
                          value={registerData.password}
                          onChange={(e) => updateRegisterData('password', e.target.value)}
                          required
                          minLength={12}
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showRegisterPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showRegisterPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      {/* Indicateur de force du mot de passe */}
                      <PasswordStrengthIndicator
                        password={registerData.password}
                        userInfo={{
                          email: registerData.email,
                          firstName: registerData.firstName,
                          lastName: registerData.lastName
                        }}
                        showRequirements={true}
                        className="mt-3"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Confirmer le mot de passe <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={registerData.confirmPassword}
                          onChange={(e) => updateRegisterData('confirmPassword', e.target.value)}
                          required
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      {registerData.confirmPassword && registerData.password !== registerData.confirmPassword && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Les mots de passe ne correspondent pas
                        </p>
                      )}
                      {registerData.confirmPassword && registerData.password === registerData.confirmPassword && (
                        <p className="text-xs text-green-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Les mots de passe correspondent
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Consentements légaux obligatoires */}
                  <div className="space-y-5 border-t pt-6">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                        Consentements obligatoires
                      </span>
                    </div>

                    {/* Acceptation des CGU */}
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="acceptTerms"
                        checked={registerData.acceptTerms}
                        onCheckedChange={(checked) => updateRegisterData('acceptTerms', checked === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="acceptTerms" className="text-sm leading-relaxed cursor-pointer">
                        <span className="text-red-500">*</span> J&#39;ai lu et j&#39;accepte les{' '}
                        <TermsModal 
                          trigger={
                            <button 
                              type="button" 
                              className="text-primary underline hover:text-primary/80 cursor-pointer font-medium"
                            >
                              Conditions Générales d&#39;Utilisation
                            </button>
                          }
                        />
                      </label>
                    </div>

                    {/* Acceptation de la politique de confidentialité */}
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="acceptPrivacy"
                        checked={registerData.acceptPrivacy}
                        onCheckedChange={(checked) => updateRegisterData('acceptPrivacy', checked === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="acceptPrivacy" className="text-sm leading-relaxed cursor-pointer">
                        <span className="text-red-500">*</span> J&#39;ai lu et j&#39;accepte la{' '}
                        <PrivacyModal 
                          trigger={
                            <button 
                              type="button" 
                              className="text-primary underline hover:text-primary/80 cursor-pointer font-medium"
                            >
                              Politique de Confidentialité
                            </button>
                          }
                        />
                        {' '}et le traitement de mes données personnelles conformément au RGPD
                      </label>
                    </div>

                    {/* Certification d'âge (RGPD - 16 ans minimum) */}
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="acceptAge"
                        checked={registerData.acceptAge}
                        onCheckedChange={(checked) => updateRegisterData('acceptAge', checked === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="acceptAge" className="text-sm leading-relaxed cursor-pointer">
                        <span className="text-red-500">*</span> Je certifie avoir au moins 16 ans, ou avoir l&#39;autorisation d&#39;un représentant légal
                      </label>
                    </div>

                    {/* Information légale */}
                    <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                      <p className="mb-1">
                        <strong>Responsable du traitement :</strong> L&#39;équipe Billetterie
                      </p>
                      <p className="mb-1">
                        <strong>Finalités :</strong> Gestion de votre compte, traitement de vos commandes, envoi de communications liées à vos achats
                      </p>
                      <p>
                        <strong>Droits :</strong> Vous disposez de droits d&#39;accès, de rectification, d&#39;effacement et de portabilité sur vos données. Contact : dpo@billetterie.com
                      </p>
                    </div>
                  </div>

                  {/* Consentement optionnel - Marketing (commenté pour le moment)
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground">
                        Optionnel
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="acceptMarketing"
                        checked={registerData.acceptMarketing}
                        onCheckedChange={(checked) => updateRegisterData('acceptMarketing', checked === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="acceptMarketing" className="text-sm leading-relaxed text-muted-foreground cursor-pointer">
                        J&#39;accepte de recevoir des communications commerciales personnalisées (événements, promotions, newsletters). Vous pouvez vous désabonner à tout moment.
                      </label>
                    </div>
                  </div>
                  */}

                  <Button 
                    type="submit" 
                    className="w-full h-12 mt-6 glass-button" 
                    disabled={
                      loading || 
                      !registerData.acceptTerms || 
                      !registerData.acceptPrivacy || 
                      !registerData.acceptAge ||
                      !validatePassword(registerData.password).isValid ||
                      registerData.password !== registerData.confirmPassword
                    }
                  >
                    {loading ? 'Inscription en cours...' : `Créer mon compte ${userType === 'user' ? 'particulier' : 'organisateur'}`}
                  </Button>

                  {/* Message d'aide si le bouton est désactivé */}
                  {(!registerData.acceptTerms || !registerData.acceptPrivacy || !registerData.acceptAge) && (
                    <p className="text-xs text-amber-600 text-center mt-2">
                      ⚠️ Veuillez accepter tous les consentements obligatoires pour continuer
                    </p>
                  )}
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}