import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'default-32-byte-encryption-key!!';
  return Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf-8');
}

function getIV(): Buffer {
  const iv = process.env.ENCRYPTION_IV || 'default-16-iv!!!';
  return Buffer.from(iv.padEnd(16, '0').slice(0, 16), 'utf-8');
}

export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), getIV());
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(encryptedText: string): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), getIV());
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
