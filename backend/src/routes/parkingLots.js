import { Hono } from 'hono';
import db from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const parkingLots = new Hono();

// GET /api/parking-lots — list all (public, with optional ?search= filter)
parkingLots.get('/', (c) => {
    const search = c.req.query('search');

    let lots;
    if (search) {
        lots = db.prepare(
            `SELECT * FROM parking_lots
             WHERE place_name LIKE ? OR location LIKE ?
             ORDER BY id`
        ).all(`%${search}%`, `%${search}%`);
    } else {
        lots = db.prepare('SELECT * FROM parking_lots ORDER BY id').all();
    }

    // Map DB columns to frontend-friendly keys
    const mapped = lots.map((lot) => ({
        id: lot.id,
        placeName: lot.place_name,
        locationmater: lot.location,
        mapLink: lot.map_link,
        total_Available: lot.total_capacity,
        available: lot.available,
        hourlyRate: lot.hourly_rate,
        lat: lot.lat,
        long: lot.long,
    }));

    return c.json(mapped);
});

// GET /api/parking-lots/nearby?lat={}&long={}&radius={}
parkingLots.get('/nearby', (c) => {
    const lat = parseFloat(c.req.query('lat'));
    const lon = parseFloat(c.req.query('long'));
    const radius = parseFloat(c.req.query('radius')) || 10; // Default 10km

    if (isNaN(lat) || isNaN(lon)) {
        return c.json({ error: 'Valid lat and long are required' }, 400);
    }

    const lots = db.prepare('SELECT * FROM parking_lots').all();

    // Haversine formula to calculate distance in KM
    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const nearbyLots = lots.filter(lot => {
        if (lot.lat === null || lot.long === null) return false;
        const dist = getDistance(lat, lon, lot.lat, lot.long);
        return dist <= radius;
    }).map(lot => ({
        id: lot.id,
        placeName: lot.place_name,
        locationmater: lot.location,
        mapLink: lot.map_link,
        total_Available: lot.total_capacity,
        available: lot.available,
        hourlyRate: lot.hourly_rate,
        lat: lot.lat,
        long: lot.long,
        distance: Math.round(getDistance(lat, lon, lot.lat, lot.long) * 10) / 10
    }));

    return c.json(nearbyLots);
});

// GET /api/parking-lots/stats — dashboard summary (public)
parkingLots.get('/stats', (c) => {
    const row = db.prepare(`
        SELECT
          COUNT(*) AS totalLots,
          COALESCE(SUM(available), 0) AS availableSpots,
          COALESCE(SUM(total_capacity), 0) AS totalCapacity
        FROM parking_lots
    `).get();

    const occupancyRate = row.totalCapacity > 0
        ? Math.round(((row.totalCapacity - row.availableSpots) / row.totalCapacity) * 100)
        : 0;

    return c.json({
        totalLots: row.totalLots,
        availableSpots: row.availableSpots,
        totalCapacity: row.totalCapacity,
        occupancyRate,
    });
});

// POST /api/parking-lots — create (admin only)
parkingLots.post('/', authMiddleware, adminOnly, async (c) => {
    const body = await c.req.json();
    const { placeName, location, mapLink, totalCapacity, available, hourlyRate, lat, long } = body;

    if (!placeName || !location || !mapLink || totalCapacity == null || available == null || !hourlyRate) {
        return c.json({ error: 'All fields are required' }, 400);
    }

    const result = db.prepare(`
        INSERT INTO parking_lots (place_name, location, map_link, total_capacity, available, hourly_rate, lat, long)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(placeName, location, mapLink, totalCapacity, available, hourlyRate, lat, long);

    return c.json({ id: result.lastInsertRowid, message: 'Parking lot created' }, 201);
});

// PUT /api/parking-lots/:id — update (admin only)
parkingLots.put('/:id', authMiddleware, adminOnly, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { placeName, location, mapLink, totalCapacity, available, hourlyRate, lat, long } = body;

    const existing = db.prepare('SELECT id FROM parking_lots WHERE id = ?').get(id);
    if (!existing) {
        return c.json({ error: 'Parking lot not found' }, 404);
    }

    db.prepare(`
        UPDATE parking_lots
        SET place_name = ?, location = ?, map_link = ?, total_capacity = ?, available = ?, hourly_rate = ?, lat = ?, long = ?
        WHERE id = ?
    `).run(placeName, location, mapLink, totalCapacity, available, hourlyRate, lat, long, id);

    return c.json({ message: 'Parking lot updated successfully' });
});

// DELETE /api/parking-lots/:id — delete (admin only)
// ON DELETE CASCADE in vehicles table auto-deletes linked vehicles
parkingLots.delete('/:id', authMiddleware, adminOnly, async (c) => {
    const id = c.req.param('id');

    const existing = db.prepare('SELECT id FROM parking_lots WHERE id = ?').get(id);
    if (!existing) {
        return c.json({ error: 'Parking lot not found' }, 404);
    }

    db.prepare('DELETE FROM parking_lots WHERE id = ?').run(id);
    return c.json({ message: 'Parking lot deleted successfully' });
});

export default parkingLots;
