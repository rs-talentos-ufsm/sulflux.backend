import jwt from 'jsonwebtoken';

function getSecret(): string {
  return (
    process.env.JWT_SECRET || 'Ct/oeyjXrXmSimQRqmGzR4m3l6Jq2G2dZixgzsbH8vM='
  );
}

interface JwtPayload {
  sub: string;
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: '15m' });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as JwtPayload;
    return decoded.sub;
  } catch {
    return null;
  }
}
