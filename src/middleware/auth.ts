import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifySessionToken } from '../server/security.ts';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role: string;
  authProvider: 'session' | 'firebase';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

async function resolveTokenToUser(token: string): Promise<AuthenticatedUser | null> {
  // 1. Primary: verify server-signed HMAC-SHA256 session token
  const sessionPayload = verifySessionToken(token);
  if (sessionPayload) {
    return {
      uid: sessionPayload.uid,
      email: sessionPayload.email,
      role: sessionPayload.role,
      authProvider: 'session',
    };
  }

  // 2. Fallback: verify Firebase ID token if token looks like an RS256 JWT (non-HS256)
  try {
    const headerPart = token.split('.')[0];
    if (headerPart) {
      const padded = headerPart + '='.repeat((4 - (headerPart.length % 4)) % 4);
      const parsedHeader = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
      if (parsedHeader?.alg && parsedHeader.alg !== 'HS256') {
        const decoded = await adminAuth.verifyIdToken(token);
        return {
          uid: decoded.uid,
          email: decoded.email,
          role: (decoded as any).role || 'MEMBER',
          authProvider: 'firebase',
        };
      }
    }
  } catch {
    // Reject invalid Firebase tokens cleanly
  }

  return null;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé : jeton d\'authentification manquant.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const resolved = await resolveTokenToUser(token);
  if (!resolved) {
    return res.status(401).json({ error: 'Non autorisé : jeton invalide ou expiré.' });
  }

  req.user = resolved;
  next();
};

export const requireManagerRole = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Non autorisé : authentification requise.' });
  }
  if (req.user.role !== 'MANAGER') {
    return res.status(403).json({
      error: 'Accès refusé : cette opération financière est réservée aux gestionnaires.',
    });
  }
  next();
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const resolved = await resolveTokenToUser(token);
    if (resolved) {
      req.user = resolved;
    }
  }
  next();
};
