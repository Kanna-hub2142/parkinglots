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

// Events API - Fetch from external EventPark API
app.get('/api/events/nearby', async (c) => {
    const { latitude, longitude, radius, page, page_size } = c.req.query();
    
    const params = new URLSearchParams({
        latitude: latitude || '12.971322',
        longitude: longitude || '77.706048',
        radius: radius || '5000',
        page: page || '1',
        page_size: page_size || '20'
    });

    try {
        const response = await fetch(`http://eventpark-api-alb-1390290683.us-east-1.elb.amazonaws.com:8001/api/v1/events/nearby?${params}`, {
            headers: {
                'accept': 'application/json',
                'x-api-key': 'key_eventpark'
            }
        });

        if (!response.ok) {
            console.error(`EventPark API error: ${response.status} ${response.statusText}`);
            return c.json({ error: 'Failed to fetch events from external API' }, response.status);
        }

        const data = await response.json();
        return c.json(data);
    } catch (error) {
        console.error('Fetch error:', error);
        return c.json({ error: 'Internal Server Error', details: error.message }, 500);
    }
});

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

const port = Number(process.env.PORT) || 8080;

serve({
    fetch: app.fetch,
    port,
}, (info) => {
    console.log(`🚗 Smart Parking API running at http://localhost:${info.port}`);
    startWorker();
});
