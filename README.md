# Smart Parking Project

This project consists of a static frontend and a Hono + SQLite backend.

## Project Structure

- `frontend/`: Static HTML, CSS, and JavaScript files.
- `backend/`: Node.js backend using Hono and SQLite.

## Prerequisites

- Node.js (>= 20.0.0)
- npm

## Setup and Installation

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

> [!IMPORTANT]
> Make sure to configure the `.env` file in the `backend/` directory with the following variables for AWS SQS and database operations:
> - `AWS_ACCESS_KEY_ID`: Your AWS access key.
> - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key.
> - `AWS_REGION`: AWS region (e.g., `ap-south-1`).
> - `SQS_QUEUE_URL`: URL of the SQS queue for vehicle releases.

2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the database (Optional - seeds initial data):
   ```bash
   npm run seed
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

The backend will start at `http://localhost:3000`.

### 2. Frontend Setup

The frontend is served statically by the backend. Once the backend is running, you can access the application by visiting:
- [http://localhost:3000](http://localhost:3000)

## Features

- **Nearby Events**: Fetches events from a remote API and displays them based on your location.
- **Parking Dashboard**: Manage parking lots and view vehicle details.
- **Worker Process**: Background worker for polling SQS messages and updating the database.
