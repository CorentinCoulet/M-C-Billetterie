// Jest Global Setup
import { config } from 'dotenv';
import { join } from 'path';

export default async function() {
  const envTestPath = join(process.cwd(), '.env.test');
  config({ path: envTestPath });
  
  console.log('🔧 Jest Global Setup - Environment loaded from .env.test');
  console.log('📍 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Loaded' : '❌ Missing');
}
