import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

interface JwtPayload {
  sub: string;
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET!, { expiresIn: '15m' });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET!, { expiresIn: '7d' });
}

export function verifyToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, SECRET!) as JwtPayload;
    return decoded.sub;
  } catch {
    return null;
  }
}
