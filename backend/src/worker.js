import { sqsClient, ReceiveMessageCommand, DeleteMessageCommand } from './utils/sqsClient.js';
import db from './db.js';
import dotenv from "dotenv";
dotenv.config();

const POLL_INTERVAL = Number(process.env.POLL_INTERVAL) || 5000;

async function processMessage(message) {
    try {
        const body = JSON.parse(message.Body);
        const { vehicleId } = body;

        console.log(`Processing release for vehicle ID: ${vehicleId}`);

        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
        
        if (!vehicle) {
            console.warn(`Vehicle with ID ${vehicleId} not found, already released or invalid.`);
            return true; // Return true to delete the message since it's not actionable
        }

        // Increment available count if vehicle was in a parking lot
        if (vehicle.parking_lot_id) {
            db.prepare('UPDATE parking_lots SET available = available + 1 WHERE id = ?').run(vehicle.parking_lot_id);
            console.log(`Freed up spot in lot ID: ${vehicle.parking_lot_id}`);
        }

        // Delete the vehicle record
        db.prepare('DELETE FROM vehicles WHERE id = ?').run(vehicleId);
        console.log(`Vehicle ${vehicleId} successfully released from database.`);

        return true; 
    } catch (err) {
        console.error("Error processing message:", err);
        return false;
    }
}

async function pollSQS() {
    console.log("Polling SQS for messages...");
    try {
        const command = new ReceiveMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20, // Long polling
        });

        const response = await sqsClient.send(command);

        if (response.Messages && response.Messages.length > 0) {
            for (const message of response.Messages) {
                const success = await processMessage(message);

                if (success) {
                    const deleteCommand = new DeleteMessageCommand({
                        QueueUrl: process.env.SQS_QUEUE_URL,
                        ReceiptHandle: message.ReceiptHandle,
                    });
                    await sqsClient.send(deleteCommand);
                    console.log(`Message deleted from SQS: ${message.MessageId}`);
                }
            }
        }
    } catch (error) {
        console.error("Error polling SQS:", error);
    }

    setTimeout(pollSQS, POLL_INTERVAL);
}

export function startWorker() {
    console.log("Worker started. Listening for SQS messages.");
    pollSQS();
}

// Auto-start if executed directly (e.g. node src/worker.js)
if (process.argv[1] && process.argv[1].endsWith('worker.js')) {
    startWorker();
}
