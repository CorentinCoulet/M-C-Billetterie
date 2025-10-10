/**
 * Secrets Management Configuration
 * Production-ready secrets management with external providers support
 * 
 * Optional Dependencies (install as needed):
 * - Azure Key Vault: yarn add @azure/identity @azure/keyvault-secrets
 * - AWS Secrets Manager: yarn add @aws-sdk/client-secrets-manager
 * - HashiCorp Vault: yarn add node-vault
 * 
 * Environment Variables:
 * - AZURE_KEY_VAULT_URL: Azure Key Vault URL
 * - AWS_ACCESS_KEY_ID: AWS credentials
 * - AWS_REGION: AWS region (default: us-east-1)
 * - VAULT_TOKEN: HashiCorp Vault token
 * - VAULT_ENDPOINT: HashiCorp Vault endpoint (default: http://127.0.0.1:8200)
 */

import { safeLogger } from '../lib/logger';

export interface SecretsProvider {
  name: string;
  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

/**
 * Environment Variables Provider (fallback)
 */
class EnvSecretsProvider implements SecretsProvider {
  name = 'environment';

  async getSecret(key: string): Promise<string | null> {
    return process.env[key] || null;
  }

  async setSecret(key: string, value: string): Promise<void> {
    // Environment variables are read-only at runtime
    throw new Error('Cannot set environment variables at runtime');
  }

  async deleteSecret(key: string): Promise<void> {
    // Environment variables are read-only at runtime
    throw new Error('Cannot delete environment variables at runtime');
  }
}

/**
 * Azure Key Vault Provider
 */
class AzureKeyVaultProvider implements SecretsProvider {
  name = 'azure-keyvault';

  private async importAzureDependencies() {
    try {
      const [identity, keyVault] = await Promise.all([
        eval(`import('@azure/identity')`).catch(() => null),
        eval(`import('@azure/keyvault-secrets')`).catch(() => null)
      ]);
      
      if (!identity || !keyVault) {
        throw new Error('Azure SDK packages not installed. Install @azure/identity and @azure/keyvault-secrets');
      }
      
      return {
        DefaultAzureCredential: identity.DefaultAzureCredential,
        SecretClient: keyVault.SecretClient
      };
    } catch (error) {
      safeLogger.warn({ error }, 'Azure Key Vault dependencies not available');
      throw new Error('Azure Key Vault provider requires @azure/identity and @azure/keyvault-secrets packages');
    }
  }

  async getSecret(key: string): Promise<string | null> {
    try {
      const { DefaultAzureCredential, SecretClient } = await this.importAzureDependencies();

      const credential = new DefaultAzureCredential();
      const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
      
      if (!vaultUrl) {
        throw new Error('AZURE_KEY_VAULT_URL not configured');
      }

      const client = new SecretClient(vaultUrl, credential);
      const secret = await client.getSecret(key);
      
      return secret.value || null;
    } catch (error) {
      safeLogger.error({ error, key }, `Azure Key Vault error for key ${key}`);
      return null;
    }
  }

  async setSecret(key: string, value: string): Promise<void> {
    try {
      const { DefaultAzureCredential, SecretClient } = await this.importAzureDependencies();

      const credential = new DefaultAzureCredential();
      const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
      
      if (!vaultUrl) {
        throw new Error('AZURE_KEY_VAULT_URL not configured');
      }

      const client = new SecretClient(vaultUrl, credential);
      await client.setSecret(key, value);
      
      safeLogger.info({ key }, `Secret ${key} stored in Azure Key Vault`);
    } catch (error) {
      safeLogger.error({ error, key }, `Failed to store secret ${key} in Azure Key Vault`);
      throw error;
    }
  }

  async deleteSecret(key: string): Promise<void> {
    try {
      const { DefaultAzureCredential, SecretClient } = await this.importAzureDependencies();

      const credential = new DefaultAzureCredential();
      const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
      
      if (!vaultUrl) {
        throw new Error('AZURE_KEY_VAULT_URL not configured');
      }

      const client = new SecretClient(vaultUrl, credential);
      await client.beginDeleteSecret(key);
      
      safeLogger.info({ key }, `Secret ${key} deleted from Azure Key Vault`);
    } catch (error) {
      safeLogger.error({ error, key }, `Failed to delete secret ${key} from Azure Key Vault`);
      throw error;
    }
  }
}

/**
 * AWS Secrets Manager Provider
 */
class AWSSecretsProvider implements SecretsProvider {
  name = 'aws-secrets';

  private async importAWSDependencies() {
    try {
      const awsSecrets = await eval(`import('@aws-sdk/client-secrets-manager')`).catch(() => null);
      
      if (!awsSecrets) {
        throw new Error('AWS SDK package not installed. Install @aws-sdk/client-secrets-manager');
      }
      
      return {
        SecretsManagerClient: awsSecrets.SecretsManagerClient,
        GetSecretValueCommand: awsSecrets.GetSecretValueCommand,
        UpdateSecretCommand: awsSecrets.UpdateSecretCommand,
        CreateSecretCommand: awsSecrets.CreateSecretCommand,
        DeleteSecretCommand: awsSecrets.DeleteSecretCommand
      };
    } catch (error) {
      safeLogger.warn({ error }, 'AWS Secrets Manager dependencies not available');
      throw new Error('AWS Secrets Manager provider requires @aws-sdk/client-secrets-manager package');
    }
  }

  async getSecret(key: string): Promise<string | null> {
    try {
      const { SecretsManagerClient, GetSecretValueCommand } = await this.importAWSDependencies();
      
      const client = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-1'
      });

      const command = new GetSecretValueCommand({
        SecretId: key
      });

      const response = await client.send(command);
      return response.SecretString || null;
    } catch (error) {
      safeLogger.error({ error, key }, `AWS Secrets Manager error for key ${key}`);
      return null;
    }
  }

  async setSecret(key: string, value: string): Promise<void> {
    try {
      const { SecretsManagerClient, UpdateSecretCommand, CreateSecretCommand } = await this.importAWSDependencies();
      
      const client = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-1'
      });

      try {
        // Try to update existing secret
        const updateCommand = new UpdateSecretCommand({
          SecretId: key,
          SecretString: value
        });
        
        await client.send(updateCommand);
      } catch (updateError) {
        // If secret doesn't exist, create it
        const createCommand = new CreateSecretCommand({
          Name: key,
          SecretString: value
        });
        
        await client.send(createCommand);
      }
      
      safeLogger.info({ key }, `Secret ${key} stored in AWS Secrets Manager`);
    } catch (error) {
      safeLogger.error({ error, key }, `Failed to store secret ${key} in AWS Secrets Manager`);
      throw error;
    }
  }

  async deleteSecret(key: string): Promise<void> {
    try {
      const { SecretsManagerClient, DeleteSecretCommand } = await this.importAWSDependencies();
      
      const client = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-1'
      });

      const command = new DeleteSecretCommand({
        SecretId: key,
        ForceDeleteWithoutRecovery: true
      });

      await client.send(command);
      safeLogger.info({ key }, `Secret ${key} deleted from AWS Secrets Manager`);
    } catch (error) {
      safeLogger.error({ error, key }, `Failed to delete secret ${key} from AWS Secrets Manager`);
      throw error;
    }
  }
}

/**
 * HashiCorp Vault Provider
 */
class HashiCorpVaultProvider implements SecretsProvider {
  name = 'hashicorp-vault';

  private async importVaultDependencies() {
    try {
      const nodeVault = await eval(`import('node-vault')`).catch(() => null);
      
      if (!nodeVault) {
        throw new Error('node-vault package not installed. Install node-vault');
      }
      
      return nodeVault.default || nodeVault;
    } catch (error) {
      safeLogger.warn({ error }, 'HashiCorp Vault dependencies not available');
      throw new Error('HashiCorp Vault provider requires node-vault package');
    }
  }

  async getSecret(key: string): Promise<string | null> {
    try {
      const nodeVault = await this.importVaultDependencies();
      
      const vault = nodeVault({
        apiVersion: 'v1',
        endpoint: process.env.VAULT_ENDPOINT || 'http://127.0.0.1:8200',
        token: process.env.VAULT_TOKEN
      });

      const result = await vault.read(`secret/data/${key}`);
      return result.data?.data?.value || null;
    } catch (error) {
      safeLogger.error({ error, key }, `HashiCorp Vault error for key ${key}`);
      return null;
    }
  }

  async setSecret(key: string, value: string): Promise<void> {
    try {
      const nodeVault = await this.importVaultDependencies();
      
      const vault = nodeVault({
        apiVersion: 'v1',
        endpoint: process.env.VAULT_ENDPOINT || 'http://127.0.0.1:8200',
        token: process.env.VAULT_TOKEN
      });

      await vault.write(`secret/data/${key}`, {
        data: { value }
      });
      
      safeLogger.info({ key }, `Secret ${key} stored in HashiCorp Vault`);
    } catch (error) {
      safeLogger.error({ error, key }, `Failed to store secret ${key} in HashiCorp Vault`);
      throw error;
    }
  }

  async deleteSecret(key: string): Promise<void> {
    try {
      const nodeVault = await this.importVaultDependencies();
      
      const vault = nodeVault({
        apiVersion: 'v1',
        endpoint: process.env.VAULT_ENDPOINT || 'http://127.0.0.1:8200',
        token: process.env.VAULT_TOKEN
      });

      await vault.delete(`secret/data/${key}`);
      safeLogger.info({ key }, `Secret ${key} deleted from HashiCorp Vault`);
    } catch (error) {
      safeLogger.error({ error, key }, `Failed to delete secret ${key} from HashiCorp Vault`);
      throw error;
    }
  }
}

/**
 * Secrets Manager Class
 */
class SecretsManager {
  private providers: SecretsProvider[] = [];
  private cache = new Map<string, { value: string; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Add providers based on configuration and availability
    if (process.env.AZURE_KEY_VAULT_URL) {
      try {
        this.providers.push(new AzureKeyVaultProvider());
        safeLogger.info('Azure Key Vault provider initialized');
      } catch (error) {
        safeLogger.warn({ error }, 'Failed to initialize Azure Key Vault provider');
      }
    }
    
    if (process.env.AWS_ACCESS_KEY_ID) {
      try {
        this.providers.push(new AWSSecretsProvider());
        safeLogger.info('AWS Secrets Manager provider initialized');
      } catch (error) {
        safeLogger.warn({ error }, 'Failed to initialize AWS Secrets Manager provider');
      }
    }
    
    if (process.env.VAULT_TOKEN) {
      try {
        this.providers.push(new HashiCorpVaultProvider());
        safeLogger.info('HashiCorp Vault provider initialized');
      } catch (error) {
        safeLogger.warn({ error }, 'Failed to initialize HashiCorp Vault provider');
      }
    }
    
    // Always add environment provider as fallback
    this.providers.push(new EnvSecretsProvider());
    safeLogger.info(`Secrets manager initialized with providers: ${this.providers.map(p => p.name).join(', ')}`);
  }

  async getSecret(key: string): Promise<string | null> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }

    // Try providers in order
    for (const provider of this.providers) {
      try {
        const value = await provider.getSecret(key);
        if (value !== null) {
          // Cache the result
          this.cache.set(key, { value, timestamp: Date.now() });
          safeLogger.debug(`Secret ${key} retrieved from ${provider.name}`);
          return value;
        }
      } catch (error) {
        safeLogger.warn({ error, key, provider: provider.name }, `Provider ${provider.name} failed for key ${key}`);
        continue;
      }
    }

    safeLogger.warn(`Secret ${key} not found in any provider`);
    return null;
  }

  async setSecret(key: string, value: string): Promise<void> {
    const primaryProvider = this.providers[0];
    
    if (!primaryProvider || primaryProvider.name === 'environment') {
      throw new Error('No writable secrets provider configured');
    }

    await primaryProvider.setSecret(key, value);
    
    // Update cache
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  async deleteSecret(key: string): Promise<void> {
    const primaryProvider = this.providers[0];
    
    if (!primaryProvider || primaryProvider.name === 'environment') {
      throw new Error('No writable secrets provider configured');
    }

    await primaryProvider.deleteSecret(key);
    
    // Remove from cache
    this.cache.delete(key);
  }

  clearCache() {
    this.cache.clear();
  }

  getProviderNames(): string[] {
    return this.providers.map(p => p.name);
  }
}

// Singleton instance
const secretsManager = new SecretsManager();

// Critical secrets that must be present
export const CRITICAL_SECRETS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY'
] as const;

// Secret rotation configuration
export const SECRET_ROTATION_CONFIG = {
  JWT_SECRET: {
    rotateEvery: 30 * 24 * 60 * 60 * 1000, // 30 days
    notifyBefore: 7 * 24 * 60 * 60 * 1000   // 7 days
  },
  STRIPE_SECRET_KEY: {
    rotateEvery: 90 * 24 * 60 * 60 * 1000,  // 90 days
    notifyBefore: 14 * 24 * 60 * 60 * 1000  // 14 days
  }
};

/**
 * Get a secret value with fallback handling
 */
export async function getSecret(key: string, defaultValue?: string): Promise<string> {
  if (!key || typeof key !== 'string') {
    throw new Error('Secret key must be a non-empty string');
  }

  try {
    const value = await secretsManager.getSecret(key);
    
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }

    if (defaultValue !== undefined) {
      safeLogger.warn(`Using default value for secret ${key}`);
      return defaultValue;
    }

    // Check if it's a critical secret
    if (CRITICAL_SECRETS.includes(key as any)) {
      throw new Error(`Critical secret ${key} is missing`);
    }

    throw new Error(`Secret ${key} not found and no default provided`);
  } catch (error) {
    safeLogger.error({ error, key }, `Failed to get secret ${key}`);
    
    if (CRITICAL_SECRETS.includes(key as any)) {
      throw new Error(`Critical secret ${key} is required for production`);
    }
    
    if (defaultValue !== undefined) {
      safeLogger.warn(`Using default value for secret ${key} due to error`);
      return defaultValue;
    }
    
    throw error;
  }
}

/**
 * Store a secret
 */
export async function setSecret(key: string, value: string): Promise<void> {
  if (!key || typeof key !== 'string') {
    throw new Error('Secret key must be a non-empty string');
  }
  
  if (!value || typeof value !== 'string') {
    throw new Error('Secret value must be a non-empty string');
  }
  
  return secretsManager.setSecret(key, value);
}

/**
 * Delete a secret
 */
export async function deleteSecret(key: string): Promise<void> {
  if (!key || typeof key !== 'string') {
    throw new Error('Secret key must be a non-empty string');
  }
  
  return secretsManager.deleteSecret(key);
}

/**
 * Validate all critical secrets are present
 */
export async function validateCriticalSecrets(): Promise<{
  valid: boolean;
  missing: string[];
  errors: string[];
}> {
  const missing: string[] = [];
  const errors: string[] = [];

  for (const key of CRITICAL_SECRETS) {
    try {
      const value = await getSecret(key);
      if (!value) {
        missing.push(key);
      }
    } catch (error) {
      missing.push(key);
      errors.push(`${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    errors
  };
}

/**
 * Get secrets provider information
 */
export function getSecretsProviderInfo() {
  return {
    providers: secretsManager.getProviderNames(),
    hasPrimaryProvider: secretsManager.getProviderNames()[0] !== 'environment'
  };
}

/**
 * Clear secrets cache (for testing)
 */
export function clearSecretsCache() {
  secretsManager.clearCache();
}

export default secretsManager;
