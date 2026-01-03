'use client'

import { useMemo } from 'react'

export interface PasswordRequirement {
  id: string
  label: string
  validator: (password: string) => boolean
  met: boolean
}

export interface PasswordValidationResult {
  isValid: boolean
  requirements: PasswordRequirement[]
  strength: 'none' | 'weak' | 'medium' | 'strong' | 'very-strong'
  strengthLabel: string
  strengthColor: string
  strengthPercent: number
}

// Icônes inline
const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const XIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

/**
 * Valide un mot de passe selon les critères de sécurité
 */
export function validatePassword(password: string, userInfo?: {
  email?: string
  firstName?: string
  lastName?: string
}): PasswordValidationResult {
  const requirements: PasswordRequirement[] = [
    {
      id: 'length',
      label: 'Au moins 12 caractères',
      validator: (p) => p.length >= 12,
      met: password.length >= 12
    },
    {
      id: 'uppercase',
      label: 'Au moins une majuscule (A-Z)',
      validator: (p) => /[A-Z]/.test(p),
      met: /[A-Z]/.test(password)
    },
    {
      id: 'lowercase',
      label: 'Au moins une minuscule (a-z)',
      validator: (p) => /[a-z]/.test(p),
      met: /[a-z]/.test(password)
    },
    {
      id: 'number',
      label: 'Au moins un chiffre (0-9)',
      validator: (p) => /\d/.test(p),
      met: /\d/.test(password)
    },
    {
      id: 'special',
      label: 'Au moins un caractère spécial (!@#$%^&*...)',
      validator: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(p),
      met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password)
    },
    {
      id: 'noSequence',
      label: 'Pas de séquences évidentes (123, abc...)',
      validator: (p) => !/123|234|345|456|567|678|789|890|abc|bcd|cde|def|qwe|wer|ert|rty/i.test(p),
      met: !/123|234|345|456|567|678|789|890|abc|bcd|cde|def|qwe|wer|ert|rty/i.test(password)
    },
    {
      id: 'noRepeat',
      label: 'Pas plus de 2 caractères identiques consécutifs',
      validator: (p) => !/(.)\1{2,}/.test(p),
      met: !/(.)\1{2,}/.test(password)
    }
  ]

  // Vérification des informations personnelles
  if (userInfo) {
    const personalInfo = [
      userInfo.email?.split('@')[0],
      userInfo.firstName,
      userInfo.lastName
    ].filter(Boolean)

    const containsPersonalInfo = personalInfo.some(
      info => info && password.toLowerCase().includes(info.toLowerCase()) && info.length >= 3
    )

    requirements.push({
      id: 'noPersonal',
      label: 'Ne contient pas d\'informations personnelles',
      validator: () => !containsPersonalInfo,
      met: !containsPersonalInfo
    })
  }

  // Vérification des mots de passe courants
  const commonPasswords = [
    'password', '123456', 'qwerty', 'admin', 'user',
    'password123', '123456789', '12345678', 'azerty',
    'motdepasse', 'bonjour', 'welcome', 'login'
  ]
  
  const isCommonPassword = commonPasswords.some(
    common => password.toLowerCase().includes(common)
  )

  requirements.push({
    id: 'noCommon',
    label: 'N\'est pas un mot de passe courant',
    validator: () => !isCommonPassword,
    met: !isCommonPassword
  })

  // Calcul du nombre de critères remplis
  const metCount = requirements.filter(r => r.met).length
  const totalCount = requirements.length
  const metPercent = password.length === 0 ? 0 : Math.round((metCount / totalCount) * 100)

  // Les 5 premiers critères sont obligatoires (longueur, majuscule, minuscule, chiffre, spécial)
  const mandatoryRequirements = requirements.slice(0, 5)
  const allMandatoryMet = mandatoryRequirements.every(r => r.met)
  const allMet = requirements.every(r => r.met)

  // Détermination de la force
  let strength: 'none' | 'weak' | 'medium' | 'strong' | 'very-strong' = 'none'
  let strengthLabel = ''
  let strengthColor = ''

  if (password.length === 0) {
    strength = 'none'
    strengthLabel = ''
    strengthColor = 'bg-gray-200'
  } else if (metCount <= 3) {
    strength = 'weak'
    strengthLabel = 'Faible'
    strengthColor = 'bg-red-500'
  } else if (metCount <= 5) {
    strength = 'medium'
    strengthLabel = 'Moyen'
    strengthColor = 'bg-yellow-500'
  } else if (metCount <= 7) {
    strength = 'strong'
    strengthLabel = 'Fort'
    strengthColor = 'bg-green-500'
  } else {
    strength = 'very-strong'
    strengthLabel = 'Très fort'
    strengthColor = 'bg-emerald-600'
  }

  return {
    isValid: allMandatoryMet && password.length >= 12,
    requirements,
    strength,
    strengthLabel,
    strengthColor,
    strengthPercent: metPercent
  }
}

interface PasswordStrengthIndicatorProps {
  password: string
  userInfo?: {
    email?: string
    firstName?: string
    lastName?: string
  }
  showRequirements?: boolean
  className?: string
}

export function PasswordStrengthIndicator({
  password,
  userInfo,
  showRequirements = true,
  className = ''
}: PasswordStrengthIndicatorProps) {
  const validation = useMemo(
    () => validatePassword(password, userInfo),
    [password, userInfo]
  )

  if (!password) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <ShieldIcon />
            <span className="font-medium">Force du mot de passe</span>
          </div>
          {validation.strengthLabel && (
            <span className={`font-medium ${
              validation.strength === 'weak' ? 'text-red-500' :
              validation.strength === 'medium' ? 'text-yellow-600' :
              validation.strength === 'strong' ? 'text-green-500' :
              validation.strength === 'very-strong' ? 'text-emerald-600' :
              'text-gray-500'
            }`}>
              {validation.strengthLabel}
            </span>
          )}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${validation.strengthColor}`}
            style={{ width: `${validation.strengthPercent}%` }}
          />
        </div>
      </div>

      {/* Liste des exigences */}
      {showRequirements && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-600 mb-2">Exigences du mot de passe :</p>
          <ul className="grid grid-cols-1 gap-1">
            {validation.requirements.map((req) => (
              <li
                key={req.id}
                className={`flex items-center gap-2 text-xs transition-colors ${
                  req.met ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {req.met ? <CheckIcon /> : <XIcon />}
                <span>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Message de validation */}
      {validation.isValid && (
        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
          <CheckIcon />
          Mot de passe conforme aux exigences de sécurité
        </p>
      )}
    </div>
  )
}

export default PasswordStrengthIndicator
