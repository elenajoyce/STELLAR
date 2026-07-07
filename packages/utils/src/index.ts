import { Keypair } from '@stellar/stellar-sdk';

/**
 * Simple structured logger for microservices
 */
export const Logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), message, ...meta }));
  },
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error
    }));
  },
  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), message, ...meta }));
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify({ level: 'debug', timestamp: new Date().toISOString(), message, ...meta }));
    }
  }
};

/**
 * Stellar blockchain utility helpers
 */
export const StellarHelper = {
  /**
   * Generates a new random Keypair (Public Key and Secret Key)
   */
  generateKeypair(): { publicKey: string; secretKey: string } {
    const pair = Keypair.random();
    return {
      publicKey: pair.publicKey(),
      secretKey: pair.secret()
    };
  },

  /**
   * Validates if a string is a valid Stellar public key (G...)
   */
  isValidPublicKey(publicKey: string): boolean {
    try {
      Keypair.fromPublicKey(publicKey);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validates if a string is a valid Stellar secret key (S...)
   */
  isValidSecretKey(secretKey: string): boolean {
    try {
      Keypair.fromSecret(secretKey);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Signs a message using a Stellar secret key
   */
  signMessage(message: string, secretKey: string): string {
    const pair = Keypair.fromSecret(secretKey);
    const buffer = Buffer.from(message, 'utf-8');
    const signature = pair.sign(buffer);
    return signature.toString('hex');
  },

  /**
   * Verifies a signature using a Stellar public key
   */
  verifySignature(message: string, signatureHex: string, publicKey: string): boolean {
    try {
      const pair = Keypair.fromPublicKey(publicKey);
      const buffer = Buffer.from(message, 'utf-8');
      const signature = Buffer.from(signatureHex, 'hex');
      return pair.verify(buffer, signature);
    } catch {
      return false;
    }
  }
};

/**
 * Error handling helper
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
