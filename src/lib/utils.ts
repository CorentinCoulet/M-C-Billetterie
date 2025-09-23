import bcrypt from 'bcryptjs';
import { clsx, type ClassValue } from "clsx";
import { createHash, randomBytes } from 'crypto';
import { twMerge } from "tailwind-merge";

// UI Utilities
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// String Utilities
export function generateRandomString(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateRandomEmail(): string {
  const randomString = randomBytes(8).toString('hex');
  return `test-${randomString}@example.com`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Hash and Encryption Utilities
export async function hashPassword(password: string, saltRounds: number = 10): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSecureHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}
