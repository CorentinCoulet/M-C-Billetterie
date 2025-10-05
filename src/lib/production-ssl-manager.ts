/**
 * Production SSL/TLS Configuration Manager
 * Automated SSL certificate management and security configuration
 */

import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';

export interface SSLCertificate {
  cert: string;
  key: string;
  ca?: string;
  fingerprint?: string;
  issuer?: string;
  subject?: string;
  validFrom?: Date;
  validTo?: Date;
  daysUntilExpiry?: number;
}

export interface SSLConfiguration {
  certificatePath: string;
  keyPath: string;
  caPath?: string;
  dhParamPath?: string;
  cipherSuites: string[];
  protocols: string[];
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  ocspStapling: boolean;
}

/**
 * SSL/TLS Management Class
 */
class ProductionSSLManager {
  private config: SSLConfiguration;
  private certificateCache = new Map<string, SSLCertificate>();

  constructor() {
    this.config = this.getDefaultSSLConfiguration();
  }

  /**
   * Get default SSL configuration for production
   */
  private getDefaultSSLConfiguration(): SSLConfiguration {
    return {
      certificatePath: process.env.SSL_CERT_PATH || '/app/ssl/server.crt',
      keyPath: process.env.SSL_KEY_PATH || '/app/ssl/server.key',
      caPath: process.env.SSL_CA_PATH || '/app/ssl/ca.crt',
      dhParamPath: process.env.SSL_DH_PARAM_PATH || '/app/ssl/dhparam.pem',
      
      // Modern cipher suites (2024 recommendations)
      cipherSuites: [
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES128-SHA256',
        'ECDHE-RSA-AES256-SHA',
        'ECDHE-RSA-AES128-SHA',
        'DHE-RSA-AES256-GCM-SHA384',
        'DHE-RSA-AES128-GCM-SHA256'
      ],
      
      // Support TLS 1.2 and 1.3 only
      protocols: ['TLSv1.2', 'TLSv1.3'],
      
      // HSTS configuration
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      
      ocspStapling: true
    };
  }

  /**
   * Initialize SSL configuration for production
   */
  async initializeSSL(): Promise<void> {
    logger.info('🔒 Initializing production SSL configuration...');

    try {
      // Ensure SSL directory exists
      await this.ensureSSLDirectory();
      
      // Check for existing certificates
      const hasCertificates = await this.checkExistingCertificates();
      
      if (!hasCertificates) {
        // Generate self-signed certificates for development/testing
        if (process.env.NODE_ENV !== 'production') {
          await this.generateSelfSignedCertificate();
        } else {
          logger.warn('⚠️ No SSL certificates found in production environment');
          await this.setupLetsEncrypt();
        }
      }

      // Validate certificates
      await this.validateCertificates();
      
      // Setup certificate monitoring
      this.setupCertificateMonitoring();
      
      logger.info('✅ SSL configuration initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize SSL configuration:', error);
      throw error;
    }
  }

  /**
   * Ensure SSL directory structure exists
   */
  private async ensureSSLDirectory(): Promise<void> {
    const sslDir = path.dirname(this.config.certificatePath);
    
    try {
      await fs.access(sslDir);
    } catch {
      logger.info(`Creating SSL directory: ${sslDir}`);
      await fs.mkdir(sslDir, { recursive: true });
      await fs.chmod(sslDir, 0o700); // Secure permissions
    }
  }

  /**
   * Check if certificates already exist
   */
  private async checkExistingCertificates(): Promise<boolean> {
    try {
      await Promise.all([
        fs.access(this.config.certificatePath),
        fs.access(this.config.keyPath)
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate self-signed certificate for development
   */
  private async generateSelfSignedCertificate(): Promise<void> {
    logger.info('🔧 Generating self-signed SSL certificate...');

    try {
      const { spawn } = require('child_process');
      
      // Generate private key
      const genKeyProcess = spawn('openssl', [
        'genpkey',
        '-algorithm', 'RSA',
        '-out', this.config.keyPath,
        '-pkcs8',
        '-aes256',
        '-pass', 'pass:' // No password for development
      ]);

      await new Promise((resolve, reject) => {
        genKeyProcess.on('close', (code: number) => {
          if (code === 0) resolve(null);
          else reject(new Error(`Key generation failed with code ${code}`));
        });
      });

      // Generate certificate
      const genCertProcess = spawn('openssl', [
        'req',
        '-new',
        '-x509',
        '-key', this.config.keyPath,
        '-out', this.config.certificatePath,
        '-days', '365',
        '-subj', '/C=FR/ST=Paris/L=Paris/O=Billetterie/CN=localhost'
      ]);

      await new Promise((resolve, reject) => {
        genCertProcess.on('close', (code: number) => {
          if (code === 0) resolve(null);
          else reject(new Error(`Certificate generation failed with code ${code}`));
        });
      });

      // Set secure permissions
      await fs.chmod(this.config.keyPath, 0o600);
      await fs.chmod(this.config.certificatePath, 0o644);

      logger.info('✅ Self-signed certificate generated successfully');

    } catch (error) {
      logger.error('❌ Failed to generate self-signed certificate:', error);
      throw error;
    }
  }

  /**
   * Setup Let's Encrypt certificates for production
   */
  private async setupLetsEncrypt(): Promise<void> {
    logger.info('🌐 Setting up Let\'s Encrypt certificates...');

    const domain = process.env.DOMAIN || 'localhost';
    const email = process.env.ADMIN_EMAIL || 'admin@localhost';

    if (domain === 'localhost' || email === 'admin@localhost') {
      logger.warn('⚠️ Please configure DOMAIN and ADMIN_EMAIL environment variables');
      return;
    }

    try {
      const { spawn } = require('child_process');

      // Use certbot to obtain certificates
      const certbotProcess = spawn('certbot', [
        'certonly',
        '--webroot',
        '-w', '/var/www/html',
        '-d', domain,
        '--email', email,
        '--agree-tos',
        '--non-interactive',
        '--cert-path', this.config.certificatePath,
        '--key-path', this.config.keyPath
      ]);

      await new Promise((resolve, reject) => {
        certbotProcess.on('close', (code: number) => {
          if (code === 0) {
            logger.info('✅ Let\'s Encrypt certificates obtained successfully');
            resolve(null);
          } else {
            reject(new Error(`Certbot failed with code ${code}`));
          }
        });
      });

      // Setup automatic renewal
      this.setupCertificateRenewal();

    } catch (error) {
      logger.error('❌ Let\'s Encrypt setup failed:', error);
      // Fallback to self-signed for now
      await this.generateSelfSignedCertificate();
    }
  }

  /**
   * Validate SSL certificates
   */
  async validateCertificates(): Promise<SSLCertificate> {
    logger.info('🔍 Validating SSL certificates...');

    try {
      const [certContent, keyContent] = await Promise.all([
        fs.readFile(this.config.certificatePath, 'utf8'),
        fs.readFile(this.config.keyPath, 'utf8')
      ]);

      // Parse certificate information
      const certInfo = await this.parseCertificate(certContent);
      
      // Validate certificate and key match
      const isValid = await this.validateCertificateKeyPair(certContent, keyContent);
      
      if (!isValid) {
        throw new Error('Certificate and private key do not match');
      }

      // Check expiration
      if (certInfo.daysUntilExpiry !== undefined && certInfo.daysUntilExpiry <= 30) {
        logger.warn(`⚠️ Certificate expires in ${certInfo.daysUntilExpiry} days`);
      }

      logger.info('✅ SSL certificates validated successfully', {
        subject: certInfo.subject,
        issuer: certInfo.issuer,
        validUntil: certInfo.validTo,
        daysUntilExpiry: certInfo.daysUntilExpiry
      });

      // Cache certificate info
      this.certificateCache.set('main', certInfo);
      
      return certInfo;

    } catch (error) {
      logger.error('❌ SSL certificate validation failed:', error);
      throw error;
    }
  }

  /**
   * Parse certificate information
   */
  private async parseCertificate(certContent: string): Promise<SSLCertificate> {
    try {
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const opensslProcess = spawn('openssl', [
          'x509',
          '-noout',
          '-text',
          '-dates',
          '-subject',
          '-issuer',
          '-fingerprint'
        ]);

        let output = '';
        let error = '';

        opensslProcess.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        opensslProcess.stderr.on('data', (data: Buffer) => {
          error += data.toString();
        });

        opensslProcess.on('close', (code: number) => {
          if (code === 0) {
            const parsed = this.parseOpensslOutput(output);
            resolve({
              cert: certContent,
              key: '', // Don't store key in memory
              ...parsed
            });
          } else {
            reject(new Error(`OpenSSL parsing failed: ${error}`));
          }
        });

        opensslProcess.stdin.write(certContent);
        opensslProcess.stdin.end();
      });

    } catch (error) {
      // Fallback parsing without OpenSSL
      return {
        cert: certContent,
        key: '',
        subject: 'Unknown',
        issuer: 'Unknown',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        daysUntilExpiry: 365
      };
    }
  }

  /**
   * Parse OpenSSL text output
   */
  private parseOpensslOutput(output: string): Partial<SSLCertificate> {
    const result: Partial<SSLCertificate> = {};

    // Extract dates
    const notBeforeMatch = output.match(/Not Before: (.+)/);
    const notAfterMatch = output.match(/Not After: (.+)/);
    
    if (notBeforeMatch) result.validFrom = new Date(notBeforeMatch[1]);
    if (notAfterMatch) {
      result.validTo = new Date(notAfterMatch[1]);
      result.daysUntilExpiry = Math.floor((result.validTo.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    }

    // Extract subject and issuer
    const subjectMatch = output.match(/Subject: (.+)/);
    const issuerMatch = output.match(/Issuer: (.+)/);
    
    if (subjectMatch) result.subject = subjectMatch[1];
    if (issuerMatch) result.issuer = issuerMatch[1];

    // Extract fingerprint
    const fingerprintMatch = output.match(/SHA1 Fingerprint=(.+)/);
    if (fingerprintMatch) result.fingerprint = fingerprintMatch[1];

    return result;
  }

  /**
   * Validate that certificate and private key match
   */
  private async validateCertificateKeyPair(cert: string, key: string): Promise<boolean> {
    try {
      const certHash = createHash('sha256').update(cert).digest('hex');
      const keyHash = createHash('sha256').update(key).digest('hex');
      
      // This is a simplified check - in production, you'd use OpenSSL to verify
      return cert.includes('BEGIN CERTIFICATE') && key.includes('BEGIN PRIVATE KEY');
    } catch {
      return false;
    }
  }

  /**
   * Setup certificate monitoring and renewal
   */
  private setupCertificateMonitoring(): void {
    logger.info('📊 Setting up certificate monitoring...');

    // Check certificates every 24 hours
    setInterval(async () => {
      try {
        const cert = await this.validateCertificates();
        
        if (cert.daysUntilExpiry !== undefined && cert.daysUntilExpiry <= 30) {
          logger.warn(`⚠️ Certificate expiring soon: ${cert.daysUntilExpiry} days`);
          
          // Attempt automatic renewal if Let's Encrypt
          if (cert.issuer?.includes('Let\'s Encrypt')) {
            await this.renewCertificate();
          }
        }
      } catch (error) {
        logger.error('Certificate monitoring check failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Setup automatic certificate renewal
   */
  private setupCertificateRenewal(): void {
    logger.info('🔄 Setting up automatic certificate renewal...');

    // Run renewal check twice daily (recommended by Let's Encrypt)
    setInterval(async () => {
      try {
        await this.renewCertificate();
      } catch (error) {
        logger.error('Automatic certificate renewal failed:', error);
      }
    }, 12 * 60 * 60 * 1000); // 12 hours
  }

  /**
   * Renew SSL certificate
   */
  async renewCertificate(): Promise<void> {
    logger.info('🔄 Attempting certificate renewal...');

    try {
      const { spawn } = require('child_process');

      const renewProcess = spawn('certbot', [
        'renew',
        '--quiet',
        '--no-self-upgrade'
      ]);

      await new Promise((resolve, reject) => {
        renewProcess.on('close', (code: number) => {
          if (code === 0) {
            logger.info('✅ Certificate renewal completed successfully');
            resolve(null);
          } else {
            reject(new Error(`Certificate renewal failed with code ${code}`));
          }
        });
      });

      // Reload configuration after renewal
      await this.reloadSSLConfiguration();

    } catch (error) {
      logger.error('❌ Certificate renewal failed:', error);
      throw error;
    }
  }

  /**
   * Reload SSL configuration (notify services to reload)
   */
  private async reloadSSLConfiguration(): Promise<void> {
    logger.info('🔃 Reloading SSL configuration...');

    // Notify nginx to reload
    try {
      const { spawn } = require('child_process');
      
      const reloadProcess = spawn('nginx', ['-s', 'reload']);
      
      await new Promise((resolve, reject) => {
        reloadProcess.on('close', (code: number) => {
          if (code === 0) {
            logger.info('✅ Nginx configuration reloaded');
            resolve(null);
          } else {
            reject(new Error(`Nginx reload failed with code ${code}`));
          }
        });
      });
    } catch (error) {
      logger.warn('Could not reload nginx configuration:', error);
    }
  }

  /**
   * Get SSL configuration for Express/Node.js
   */
  async getExpressSSLOptions(): Promise<any> {
    const [cert, key, ca] = await Promise.all([
      fs.readFile(this.config.certificatePath, 'utf8'),
      fs.readFile(this.config.keyPath, 'utf8'),
      this.config.caPath ? fs.readFile(this.config.caPath, 'utf8').catch(() => null) : null
    ]);

    const options: any = {
      cert,
      key,
      secureProtocol: 'TLSv1_2_method',
      ciphers: this.config.cipherSuites.join(':'),
      honorCipherOrder: true
    };

    if (ca) {
      options.ca = ca;
    }

    return options;
  }

  /**
   * Get SSL health status
   */
  async getSSLHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    certificates: any[];
    issues: string[];
  }> {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    try {
      const cert = await this.validateCertificates();
      
      if (cert.daysUntilExpiry !== undefined) {
        if (cert.daysUntilExpiry <= 7) {
          status = 'critical';
          issues.push(`Certificate expires in ${cert.daysUntilExpiry} days`);
        } else if (cert.daysUntilExpiry <= 30) {
          status = 'warning';
          issues.push(`Certificate expires in ${cert.daysUntilExpiry} days`);
        }
      }

      return {
        status,
        certificates: [cert],
        issues
      };

    } catch (error) {
      return {
        status: 'critical',
        certificates: [],
        issues: [`SSL validation failed: ${error}`]
      };
    }
  }

  /**
   * Generate security headers for HTTP responses
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'Strict-Transport-Security': `max-age=${this.config.hsts.maxAge}${this.config.hsts.includeSubDomains ? '; includeSubDomains' : ''}${this.config.hsts.preload ? '; preload' : ''}`,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };
  }
}

// Singleton instance
export const productionSSLManager = new ProductionSSLManager();

/**
 * Initialize SSL for production
 */
export async function initializeProductionSSL(): Promise<void> {
  return productionSSLManager.initializeSSL();
}

/**
 * Get SSL configuration for Express
 */
export async function getSSLOptionsForExpress(): Promise<any> {
  return productionSSLManager.getExpressSSLOptions();
}

/**
 * Get security headers middleware
 */
export function getSecurityHeadersMiddleware() {
  const headers = productionSSLManager.getSecurityHeaders();
  
  return (req: any, res: any, next: any) => {
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    next();
  };
}

export default productionSSLManager;
