import { Hono } from 'hono';
import db from '../db.js';
import { sqsClient, SendMessageCommand } from '../utils/sqsClient.js';

const release = new Hono();

// GET /api/release/parking/:vehicleId — release a vehicle (public link for QR)
release.get('/:vehicleId', async (c) => {
    const vehicleId = c.req.param('vehicleId');

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
    if (!vehicle) {
        return c.html(`
            <!DOCTYPE html>
            <html><head><title>Release Failed</title>
            <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fee2e2;}
            .box{background:white;padding:40px;border-radius:16px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.1);}
            </style></head>
            <body><div class="box"><h1>❌ Vehicle Not Found</h1><p>This vehicle has already been released or does not exist.</p>
            <a href="/index.html" style="color:#6366f1;font-weight:600;">Go to Dashboard</a></div></body></html>
        `, 404);
    }

    // Get lot name
    const lot = vehicle.parking_lot_id
        ? db.prepare('SELECT place_name FROM parking_lots WHERE id = ?').get(vehicle.parking_lot_id)
        : null;

    try {
        const command = new SendMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MessageBody: JSON.stringify({ vehicleId: vehicleId }),
        });
        await sqsClient.send(command);
    } catch (err) {
        console.error("Error sending release message to SQS:", err);
        return c.text("Error processing release", 500);
    }

    return c.html(`
        <!DOCTYPE html>
        <html><head><title>Release Initiated</title>
        <style>
            body{font-family:'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;
                 background:linear-gradient(135deg,#eef2ff,#e2e8f0);}
            .box{background:white;padding:50px;border-radius:20px;text-align:center;
                 box-shadow:0 25px 60px rgba(0,0,0,0.15);max-width:500px;animation:fadeIn .5s ease;}
            @keyframes fadeIn{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
            h1{color:#3b82f6;font-size:28px;} p{color:#64748b;margin:10px 0;}
            .detail{background:#eff6ff;padding:15px;border-radius:12px;margin:15px 0;}
            a{display:inline-block;margin-top:20px;padding:12px 24px;background:#6366f1;color:white;
              border-radius:10px;text-decoration:none;font-weight:600;}
        </style></head>
        <body>
            <div class="box">
                <h1>⏳ Release Initiated!</h1>
                <div class="detail">
                    <p><strong>🚗 ${vehicle.vehicle_name}</strong> (${vehicle.vehicle_number})</p>
                    <p>Type: ${vehicle.vehicle_type}</p>
                    ${lot ? `<p>📍 Releasing from: <strong>${lot.place_name}</strong></p>` : ''}
                </div>
                <p>The vehicle release process has started and will be completed shortly.</p>
                <a href="/index.html">Go to Dashboard</a>
            </div>
        </body></html>
    `);
});

export default release;
