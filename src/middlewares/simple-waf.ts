import { NextApiRequest, NextApiResponse } from 'next'
import { NextRequest } from 'next/server'

/**
 * Simple Web Application Firewall (WAF) middleware
 * Filtre les requêtes malveillantes basiques
 */

// Patterns de base pour détecter les attaques
const MALICIOUS_PATTERNS = [
  // SQL Injection
  /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
  // XSS
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/i,
  /on\w+\s*=/i,
  // Path Traversal
  /\.\.\/|\.\.\\|\%2e\%2e\%2f|\%2e\%2e\%5c/i,
  // Command Injection
  /(\||&|;|\`|\$\(|\$\{)/,
]

// Headers suspects
const SUSPICIOUS_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'x-originating-ip',
]

interface WAFResult {
  blocked: boolean
  reason?: string
  score: number
}

interface WAFConfig {
  mode: 'disabled' | 'monitoring' | 'blocking'
  rulesets: string[]
  customPatterns: RegExp[]
  rateLimit: {
    enabled: boolean
    requests: number
    window: number
  }
}

interface WAFStats {
  totalRequests: number
  blockedRequests: number
  detectedThreats: number
  lastUpdate: string
}

/**
 * Classe WAF avancée pour compatibilité
 */
export class AdvancedWAF {
  private static config: WAFConfig = {
    mode: 'monitoring',
    rulesets: ['basic', 'xss', 'sqli'],
    customPatterns: [],
    rateLimit: {
      enabled: true,
      requests: 100,
      window: 60000
    }
  }

  private static stats: WAFStats = {
    totalRequests: 0,
    blockedRequests: 0,
    detectedThreats: 0,
    lastUpdate: new Date().toISOString()
  }

  static getConfig(): WAFConfig {
    return { ...this.config }
  }

  static updateConfig(updates: Partial<WAFConfig>): void {
    this.config = { ...this.config, ...updates }
    this.stats.lastUpdate = new Date().toISOString()
  }

  static getStats(): WAFStats {
    return { ...this.stats }
  }

  static clearCache(): void {
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      detectedThreats: 0,
      lastUpdate: new Date().toISOString()
    }
  }

  static incrementRequest(): void {
    this.stats.totalRequests++
  }

  static incrementBlocked(): void {
    this.stats.blockedRequests++
  }

  static incrementThreat(): void {
    this.stats.detectedThreats++
  }
}

/**
 * Analyse une chaîne pour détecter des patterns malveillants
 */
export function analyzeString(input: string): WAFResult {
  let score = 0
  const reasons: string[] = []

  // Vérifier les patterns malveillants
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(input)) {
      score += 10
      reasons.push(`Malicious pattern detected: ${pattern.source}`)
    }
  }

  // Vérifier la longueur excessive
  if (input.length > 10000) {
    score += 5
    reasons.push('Excessive input length')
  }

  // Vérifier les caractères de contrôle
  if (/[\x00-\x1f\x7f-\x9f]/.test(input)) {
    score += 3
    reasons.push('Control characters detected')
  }

  return {
    blocked: score >= 10,
    reason: reasons.join(', '),
    score
  }
}

/**
 * Middleware WAF pour Next.js API routes
 */
export function simpleWAF(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  try {
    let totalScore = 0

    // Analyser les paramètres de requête
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        const keyResult = analyzeString(key)
        const valueResult = analyzeString(Array.isArray(value) ? value.join(',') : String(value))
        
        totalScore += keyResult.score + valueResult.score
        
        if (keyResult.blocked || valueResult.blocked) {
          return res.status(403).json({
            error: 'Request blocked by WAF',
            reason: `Query parameter analysis: ${keyResult.reason || valueResult.reason}`
          })
        }
      }
    }

    // Analyser le body
    if (req.body && typeof req.body === 'string') {
      const bodyResult = analyzeString(req.body)
      totalScore += bodyResult.score
      
      if (bodyResult.blocked) {
        return res.status(403).json({
          error: 'Request blocked by WAF',
          reason: `Body analysis: ${bodyResult.reason}`
        })
      }
    }

    // Analyser les headers
    for (const header of SUSPICIOUS_HEADERS) {
      const value = req.headers[header]
      if (value) {
        const headerResult = analyzeString(Array.isArray(value) ? value.join(',') : String(value))
        totalScore += headerResult.score
        
        if (headerResult.blocked) {
          return res.status(403).json({
            error: 'Request blocked by WAF',
            reason: `Header analysis: ${headerResult.reason}`
          })
        }
      }
    }

    // Bloquer si le score total est trop élevé
    if (totalScore >= 15) {
      return res.status(403).json({
        error: 'Request blocked by WAF',
        reason: 'High risk score detected'
      })
    }

    // Passer au middleware suivant
    next()
  } catch (error) {
    console.error('WAF Error:', error)
    // En cas d'erreur, laisser passer la requête mais logger l'erreur
    next()
  }
}

/**
 * Middleware WAF pour Next.js App Router
 */
export function simpleWAFAppRouter(request: NextRequest) {
  try {
    let totalScore = 0
    const url = new URL(request.url)

    // Analyser les paramètres de requête
    for (const [key, value] of url.searchParams.entries()) {
      const keyResult = analyzeString(key)
      const valueResult = analyzeString(value)
      
      totalScore += keyResult.score + valueResult.score
      
      if (keyResult.blocked || valueResult.blocked) {
        return new Response(JSON.stringify({
          error: 'Request blocked by WAF',
          reason: `Query parameter analysis: ${keyResult.reason || valueResult.reason}`
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Analyser les headers
    for (const header of SUSPICIOUS_HEADERS) {
      const value = request.headers.get(header)
      if (value) {
        const headerResult = analyzeString(value)
        totalScore += headerResult.score
        
        if (headerResult.blocked) {
          return new Response(JSON.stringify({
            error: 'Request blocked by WAF',
            reason: `Header analysis: ${headerResult.reason}`
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }
    }

    // Bloquer si le score total est trop élevé
    if (totalScore >= 15) {
      return new Response(JSON.stringify({
        error: 'Request blocked by WAF',
        reason: 'High risk score detected'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return null // Laisser passer
  } catch (error) {
    console.error('WAF Error:', error)
    return null // En cas d'erreur, laisser passer
  }
}

export default simpleWAF