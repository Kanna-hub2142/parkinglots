const API_BASE = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", async function () {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    // Redirect if not admin
    if (!token || !user || user.role !== "ADMIN") {
        window.location.href = "index.html";
        return;
    }

    // Setup navbar
    const navButtons = document.getElementById("navButtons");
    navButtons.innerHTML = `
        <span style="color:#4CAF50;font-weight:600;">👤 ${user.username} (Admin)</span>
        <button class="login-btn" onclick="window.location.href='index.html'">Dashboard</button>
        <button class="login-btn" onclick="window.location.href='events.html'">Events</button>
        <button class="login-btn" onclick="window.location.href='my-vehicles.html'">My Vehicles</button>
        <button class="signup-btn" style="background:#ef4444;" onclick="logout()">Logout</button>
    `;

    // Dark theme toggle
    const darkBtn = document.getElementById("darkTheme");
    darkBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        darkBtn.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    });

    // Load data
    await loadStats();
    await loadLots();
    await loadVehicles();

    // Form submit handler
    const form = document.getElementById("lotForm");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const editId = document.getElementById("editId").value;
        const payload = {
            placeName: document.getElementById("placeName").value.trim(),
            location: document.getElementById("location").value.trim(),
            mapLink: document.getElementById("mapLink").value.trim(),
            totalCapacity: parseInt(document.getElementById("totalCapacity").value),
            available: parseInt(document.getElementById("available").value),
            hourlyRate: document.getElementById("hourlyRate").value.trim(),
            lat: parseFloat(document.getElementById("lat").value),
            long: parseFloat(document.getElementById("long").value),
        };

        const formStatus = document.getElementById("formStatus");

        try {
            let res;
            if (editId) {
                res = await fetch(`${API_BASE}/parking-lots/${editId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch(`${API_BASE}/parking-lots`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify(payload),
                });
            }

            const data = await res.json();
            if (res.ok) {
                formStatus.style.display = "block";
                formStatus.style.background = "#dcfce7";
                formStatus.style.color = "#16a34a";
                formStatus.textContent = data.message;
                form.reset();
                document.getElementById("editId").value = "";
                cancelEdit();
                await loadStats();
                await loadLots();
                setTimeout(() => { formStatus.style.display = "none"; }, 2000);
            } else {
                formStatus.style.display = "block";
                formStatus.style.background = "#fee2e2";
                formStatus.style.color = "#dc2626";
                formStatus.textContent = data.error;
            }
        } catch (err) {
            formStatus.style.display = "block";
            formStatus.style.background = "#fee2e2";
            formStatus.style.color = "#dc2626";
            formStatus.textContent = "⚠️ Server error.";
        }
    });
});

async function loadStats() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE}/parking-lots/stats`);
        const stats = await res.json();
        document.getElementById("statLots").textContent = stats.totalLots;
        document.getElementById("statAvailable").textContent = stats.availableSpots;
        document.getElementById("statCapacity").textContent = stats.totalCapacity;
        document.getElementById("statOccupancy").textContent = stats.occupancyRate + "%";
    } catch (e) { /* silent */ }
}

async function loadLots() {
    const token = localStorage.getItem("token");
    const container = document.getElementById("lotsTableContainer");

    try {
        const res = await fetch(`${API_BASE}/parking-lots`);
        const lots = await res.json();

        if (lots.length === 0) {
            container.innerHTML = `<p style="text-align:center;color:#64748b;">No parking lots found.</p>`;
            return;
        }

        let html = `
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
            <thead style="background:linear-gradient(to right,#6366f1,#4f46e5);color:white;">
                <tr>
                    <th style="padding:12px 15px;text-align:left;">ID</th>
                    <th style="padding:12px 15px;text-align:left;">Place Name</th>
                    <th style="padding:12px 15px;text-align:left;">Location</th>
                    <th style="padding:12px 15px;text-align:center;">Capacity</th>
                    <th style="padding:12px 15px;text-align:center;">Available</th>
                    <th style="padding:12px 15px;text-align:center;">Rate</th>
                    <th style="padding:12px 15px;text-align:center;">Actions</th>
                </tr>
            </thead>
            <tbody>
        `;

        lots.forEach((lot, i) => {
            const bg = i % 2 === 0 ? "#f8fafc" : "white";
            html += `
                <tr style="background:${bg};border-bottom:1px solid #e2e8f0;">
                    <td style="padding:10px 15px;">${lot.id}</td>
                    <td style="padding:10px 15px;font-weight:600;">${lot.placeName}</td>
                    <td style="padding:10px 15px;color:#64748b;">${lot.locationmater}</td>
                    <td style="padding:10px 15px;text-align:center;">${lot.total_Available}</td>
                    <td style="padding:10px 15px;text-align:center;color:${lot.available > 0 ? '#16a34a' : '#dc2626'};font-weight:600;">${lot.available}</td>
                    <td style="padding:10px 15px;text-align:center;">${lot.hourlyRate}</td>
                    <td style="padding:10px 15px;text-align:center;">
                        <button onclick="editLot(${lot.id}, '${lot.placeName.replace(/'/g, "\\'")}', '${lot.locationmater.replace(/'/g, "\\'")}', '${lot.mapLink}', ${lot.total_Available}, ${lot.available}, '${lot.hourlyRate}', ${lot.lat}, ${lot.long})" style="padding:6px 14px;border:none;border-radius:8px;background:#6366f1;color:white;cursor:pointer;font-size:13px;margin-right:5px;">Edit</button>
                        <button onclick="deleteLot(${lot.id})" style="padding:6px 14px;border:none;border-radius:8px;background:#ef4444;color:white;cursor:pointer;font-size:13px;">Delete</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<p style="color:red;text-align:center;">⚠️ Failed to load parking lots.</p>`;
    }
}

async function loadVehicles() {
    const token = localStorage.getItem("token");
    const container = document.getElementById("vehiclesTableContainer");

    try {
        const res = await fetch(`${API_BASE}/vehicles`, {
            headers: { "Authorization": `Bearer ${token}` },
        });

        const vehicles = await res.json();

        if (!Array.isArray(vehicles) || vehicles.length === 0) {
            container.innerHTML = `<p style="text-align:center;color:#64748b;">No vehicles registered yet.</p>`;
            return;
        }

        let html = `
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
            <thead style="background:linear-gradient(to right,#10b981,#059669);color:white;">
                <tr>
                    <th style="padding:12px 15px;text-align:left;">ID</th>
                    <th style="padding:12px 15px;text-align:left;">Owner</th>
                    <th style="padding:12px 15px;text-align:left;">Name</th>
                    <th style="padding:12px 15px;text-align:left;">Mobile</th>
                    <th style="padding:12px 15px;text-align:left;">Vehicle</th>
                    <th style="padding:12px 15px;text-align:left;">Number</th>
                    <th style="padding:12px 15px;text-align:left;">Type</th>
                    <th style="padding:12px 15px;text-align:left;">Parking Lot</th>
                </tr>
            </thead>
            <tbody>
        `;

        vehicles.forEach((v, i) => {
            const bg = i % 2 === 0 ? "#f8fafc" : "white";
            html += `
                <tr style="background:${bg};border-bottom:1px solid #e2e8f0;">
                    <td style="padding:10px 15px;">${v.id}</td>
                    <td style="padding:10px 15px;font-weight:600;color:#6366f1;">${v.owner || '-'}</td>
                    <td style="padding:10px 15px;">${v.name}</td>
                    <td style="padding:10px 15px;">${v.mobile}</td>
                    <td style="padding:10px 15px;font-weight:600;">${v.vehicle_name}</td>
                    <td style="padding:10px 15px;">${v.vehicle_number}</td>
                    <td style="padding:10px 15px;">${v.vehicle_type}</td>
                    <td style="padding:10px 15px;">${v.parking_lot_name || '-'}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<p style="color:red;text-align:center;">⚠️ Failed to load vehicles.</p>`;
    }
}

function editLot(id, placeName, location, mapLink, totalCapacity, available, hourlyRate, lat, long) {
    document.getElementById("editId").value = id;
    document.getElementById("placeName").value = placeName;
    document.getElementById("location").value = location;
    document.getElementById("mapLink").value = mapLink;
    document.getElementById("totalCapacity").value = totalCapacity;
    document.getElementById("available").value = available;
    document.getElementById("hourlyRate").value = hourlyRate;
    document.getElementById("lat").value = lat || "";
    document.getElementById("long").value = long || "";

    document.getElementById("formTitle").textContent = "✏️ Edit Parking Lot";
    document.getElementById("submitBtn").textContent = "Update Parking Lot";
    document.getElementById("cancelBtn").style.display = "block";

    // Scroll to form
    document.getElementById("lotFormBox").scrollIntoView({ behavior: "smooth" });
}

async function deleteLot(id) {
    if (!confirm("Are you sure you want to delete this parking lot?")) return;

    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE}/parking-lots/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` },
        });

        if (res.ok) {
            await loadStats();
            await loadLots();
        } else {
            const data = await res.json();
            alert(data.error || "Failed to delete");
        }
    } catch (e) {
        alert("⚠️ Server error.");
    }
}

function cancelEdit() {
    document.getElementById("editId").value = "";
    document.getElementById("lotForm").reset();
    document.getElementById("formTitle").textContent = "➕ Add Parking Lot";
    document.getElementById("submitBtn").textContent = "Add Parking Lot";
    document.getElementById("cancelBtn").style.display = "none";
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

// Make functions available globally
window.editLot = editLot;
window.deleteLot = deleteLot;
window.cancelEdit = cancelEdit;
window.logout = logout;
