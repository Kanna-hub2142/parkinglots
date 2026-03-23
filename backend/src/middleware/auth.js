import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-parking-secret-key-2024';

// Middleware: verify JWT token and set user on context
export function authMiddleware(c, next) {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Authentication required. Please login.' }, 401);
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        c.set('user', decoded);
        return next();
    } catch (err) {
        return c.json({ error: 'Invalid or expired token. Please login again.' }, 401);
    }
}

// Middleware: check if user has ADMIN role
export function adminOnly(c, next) {
    const user = c.get('user');
    if (!user || user.role !== 'ADMIN') {
        return c.json({ error: 'Access denied. Admin privileges required.' }, 403);
    }
    return next();
}

export { JWT_SECRET };
