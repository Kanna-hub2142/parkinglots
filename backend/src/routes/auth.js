import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { JWT_SECRET, authMiddleware } from '../middleware/auth.js';

const auth = new Hono();

// POST /api/auth/register — user sign up
auth.post('/register', async (c) => {
    const body = await c.req.json();
    const { username, email, password, role } = body;

    if (!username || !email || !password) {
        return c.json({ error: 'Username, email, and password are required' }, 400);
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
        return c.json({ error: 'User with this email or username already exists' }, 409);
    }

    // Only allow ADMIN role if explicitly set (default is USER)
    const userRole = (role === 'ADMIN') ? 'ADMIN' : 'USER';
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db.prepare(`
        INSERT INTO users (username, email, password, role)
        VALUES (?, ?, ?, ?)
    `).run(username, email, hashedPassword, userRole);

    const userId = Number(result.lastInsertRowid);

    // Generate JWT token
    const token = jwt.sign(
        { id: userId, username, email, role: userRole },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    return c.json({
        id: userId,
        username,
        email,
        role: userRole,
        token,
        message: '✅ User registered successfully!',
    }, 201);
});

// POST /api/auth/login — user login
auth.post('/login', async (c) => {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400);
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        return c.json({ error: 'Invalid email or password' }, 401);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Generate JWT token
    const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    return c.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        token,
        message: '✅ Login successful!',
    });
});

// GET /api/auth/me — get current user from token
auth.get('/me', authMiddleware, (c) => {
    const user = c.get('user');
    return c.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
    });
});

export default auth;
