import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, '..', '..', 'frontend');

import parkingLots from './routes/parkingLots.js';
import vehicles from './routes/vehicles.js';
import auth from './routes/auth.js';
import release from './routes/release.js';
import { startWorker } from './worker.js';

const app = new Hono();

// CORS — allow frontend during development
app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));

// API routes
app.route('/api/parking-lots', parkingLots);
app.route('/api/vehicles', vehicles);
app.route('/api/auth', auth);
app.route('/api/release/parking', release);

// Serve frontend static files (path works from backend/ or EB bundle root)
app.use('/*', serveStatic({ root: frontendRoot }));

// Events dummy API
app.get('/api/events/nearby', (c) => {
    return c.json({
        "events": [
            {
                "id": "evt-abc-123",
                "title": "Electric Picnic",
                "category": "festival",
                "status": "published",
                "start_date": "2025-08-29T16:00:00Z",
                "end_date": "2025-08-31T23:59:00Z",
                "crowd_percentage": 87.5,
                "crowd_level": "busy",
                "max_capacity": 70000,
                "tickets_sold": 61250,
                "is_free": false,
                "venue": {
                    "name": "Stradbally Estate",
                    "city": "Laois",
                    "latitude": 53.0214,
                    "longitude": -7.1372
                }
            }
        ],
        "total": 1,
        "page": 1,
        "page_size": 20
    });
});

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

const port = Number(process.env.PORT) || 3000;

serve({
    fetch: app.fetch,
    port,
}, (info) => {
    console.log(`🚗 Smart Parking API running at http://localhost:${info.port}`);
    startWorker();
});
