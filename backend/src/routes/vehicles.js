import { Hono } from 'hono';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const vehicles = new Hono();

// POST /api/vehicles/register — register a vehicle (requires login)
vehicles.post('/register', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { name, mobile, vehicleType, vehicleName, vehicleNumber, parkingLotId } = body;

    if (!name || !mobile || !vehicleType || !vehicleName || !vehicleNumber) {
        return c.json({ error: 'All fields are required' }, 400);
    }

    // Check if vehicle number already registered
    const existing = db.prepare('SELECT id FROM vehicles WHERE vehicle_number = ?').get(vehicleNumber);
    if (existing) {
        return c.json({ error: 'Vehicle number already registered' }, 409);
    }

    // If parking lot specified, check availability and decrement
    if (parkingLotId) {
        const lot = db.prepare('SELECT * FROM parking_lots WHERE id = ?').get(parkingLotId);
        if (!lot) {
            return c.json({ error: 'Parking lot not found' }, 404);
        }
        if (lot.available <= 0) {
            return c.json({ error: 'No available spots in this parking lot' }, 400);
        }

        // Decrement available count
        db.prepare('UPDATE parking_lots SET available = available - 1 WHERE id = ?').run(parkingLotId);
    }

    const result = db.prepare(`
        INSERT INTO vehicles (name, mobile, vehicle_type, vehicle_name, vehicle_number, parking_lot_id, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, mobile, vehicleType, vehicleName, vehicleNumber, parkingLotId || null, user.id);

    return c.json({ id: Number(result.lastInsertRowid), message: '✅ Vehicle registered successfully!' }, 201);
});

// GET /api/vehicles/my-vehicles — get current user's vehicles
vehicles.get('/my-vehicles', authMiddleware, (c) => {
    const user = c.get('user');
    const rows = db.prepare(`
        SELECT v.*, p.place_name AS parking_lot_name
        FROM vehicles v
        LEFT JOIN parking_lots p ON v.parking_lot_id = p.id
        WHERE v.user_id = ?
        ORDER BY v.created_at DESC
    `).all(user.id);

    return c.json(rows);
});

// GET /api/vehicles — list all registered vehicles (admin)
vehicles.get('/', authMiddleware, (c) => {
    const user = c.get('user');
    if (user.role !== 'ADMIN') {
        return c.json({ error: 'Access denied' }, 403);
    }

    const rows = db.prepare(`
        SELECT v.*, p.place_name AS parking_lot_name, u.username AS owner
        FROM vehicles v
        LEFT JOIN parking_lots p ON v.parking_lot_id = p.id
        LEFT JOIN users u ON v.user_id = u.id
        ORDER BY v.created_at DESC
    `).all();

    return c.json(rows);
});

export default vehicles;
