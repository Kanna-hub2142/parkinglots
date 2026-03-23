const API_BASE = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", async function () {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    // Redirect to login if not authenticated
    if (!token || !user) {
        window.location.href = "login.html";
        return;
    }

    // Setup navbar
    const navButtons = document.getElementById("navButtons");
    navButtons.innerHTML = `
        <span style="color:#4CAF50;font-weight:600;">👤 ${user.username}</span>
        <button class="login-btn" onclick="window.location.href='index.html'">Dashboard</button>
        ${user.role === 'ADMIN' ? '<button class="signup-btn" onclick="window.location.href=\'admin.html\'">Admin</button>' : ''}
        <button class="signup-btn" style="background:#ef4444;" onclick="logout()">Logout</button>
    `;

    // Dark theme toggle
    const btn = document.getElementById("darkTheme");
    btn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        btn.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    });

    // Load user's vehicles
    await loadVehicles();
});

async function loadVehicles() {
    const token = localStorage.getItem("token");
    const container = document.getElementById("vehiclesContainer");
    container.innerHTML = "";

    try {
        const res = await fetch(`${API_BASE}/vehicles/my-vehicles`, {
            headers: { "Authorization": `Bearer ${token}` },
        });

        if (res.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
            return;
        }

        const vehicles = await res.json();

        if (vehicles.length === 0) {
            container.innerHTML = `
                <div class="stat-card" style="text-align:center;padding:40px;">
                    <h3>No vehicles registered yet</h3>
                    <p style="color:#64748b;margin-top:10px;">Go to the dashboard and register a vehicle at any parking lot.</p>
                    <button class="btn predict" style="margin-top:15px;max-width:200px;" onclick="window.location.href='index.html'">Go to Dashboard</button>
                </div>
            `;
            return;
        }

        // Create a cards grid for vehicles
        const grid = document.createElement("div");
        grid.classList.add("cards");

        vehicles.forEach(v => {
            const releaseUrl = `${window.location.origin}/api/release/parking/${v.id}`;

            const card = document.createElement("div");
            card.classList.add("parking-card");
            card.innerHTML = `
                <div class="card-header">
                    <h3 style="font-weight:bold;">${v.vehicle_name}</h3>
                    <span class="badge" style="background:#6366f1;color:white;">${v.vehicle_type}</span>
                </div>
                <p style="font-weight:600;margin:5px 0;">🔢 ${v.vehicle_number}</p>
                <p style="color:#64748b;">👤 ${v.name} &nbsp;|&nbsp; 📱 ${v.mobile}</p>
                ${v.parking_lot_name ? `<p style="color:#4CAF50;font-weight:600;">📍 ${v.parking_lot_name}</p>` : ''}
                <p style="color:#94a3b8;font-size:13px;margin-top:8px;">Registered: ${new Date(v.created_at).toLocaleDateString()}</p>

                <!-- QR Code Section -->
                <div id="qr-section-${v.id}" style="margin-top:15px;text-align:center;display:none;">
                    <p style="font-size:13px;color:#64748b;margin-bottom:8px;">Scan to release parking</p>
                    <div id="qr-${v.id}" style="display:inline-block;"></div>
                    <p style="font-size:11px;color:#94a3b8;margin-top:5px;word-break:break-all;">${releaseUrl}</p>
                </div>

                <div class="btn-group" style="margin-top:12px;">
                    <button class="btn qr" onclick="toggleQR(${v.id}, '${releaseUrl}')">📱 QR Code</button>
                    <button class="btn predict" style="background:linear-gradient(to right,#ef4444,#dc2626);" onclick="releaseVehicle(${v.id})">🔓 Release</button>
                </div>
            `;
            grid.appendChild(card);
        });

        container.appendChild(grid);

    } catch (err) {
        container.innerHTML = `<p style="text-align:center;color:red;">⚠️ Failed to load vehicles. Make sure backend is running.</p>`;
    }
}

function toggleQR(vehicleId, releaseUrl) {
    const section = document.getElementById(`qr-section-${vehicleId}`);
    const qrContainer = document.getElementById(`qr-${vehicleId}`);

    if (section.style.display === "none") {
        section.style.display = "block";
        // Generate QR code if not already generated
        if (!qrContainer.hasChildNodes()) {
            new QRCode(qrContainer, {
                text: releaseUrl,
                width: 180,
                height: 180,
                colorDark: "#1e293b",
                colorLight: "#ffffff",
            });
        }
    } else {
        section.style.display = "none";
    }
}

function releaseVehicle(vehicleId) {
    if (window.confirm("Are you sure you want to release this vehicle and free the parking spot?")) {
        const releaseUrl = `${window.location.origin}/api/release/parking/${vehicleId}`;
        window.location.href = releaseUrl;
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

// Make functions available globally
window.toggleQR = toggleQR;
window.releaseVehicle = releaseVehicle;
window.logout = logout;
