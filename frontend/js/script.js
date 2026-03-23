const API_BASE = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", async function () {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    // Dynamic navbar based on auth state
    const navButtons = document.getElementById("navButtons");
    if (token && user) {
        navButtons.innerHTML = `
            <span style="color:#4CAF50;font-weight:600;">👤 ${user.username}</span>
            <button class="login-btn" onclick="window.location.href='events.html'">Events</button>
            <button class="login-btn" onclick="window.location.href='my-vehicles.html'">My Vehicles</button>
            ${user.role === 'ADMIN' ? '<button class="signup-btn" onclick="window.location.href=\'admin.html\'">Admin Panel</button>' : ''}
            <button class="signup-btn" style="background:#ef4444;" onclick="logout()">Logout</button>
        `;
    } else {
        navButtons.innerHTML = `
            <button class="login-btn" onclick="window.location.href='events.html'">Events</button>
            <button class="login-btn" onclick="openLogin()">Login</button>
            <button class="signup-btn" onclick="openRegister()">Register</button>
        `;
    }

    // Filter controls
    const filterType = document.getElementById("filterType");
    const radiusContainer = document.getElementById("radiusContainer");
    const radiusInput = document.getElementById("radiusInput");
    const loadingIndicator = document.getElementById("loadingIndicator");

    filterType.addEventListener("change", () => {
        if (filterType.value === "km") {
            radiusContainer.style.display = "flex";
            loadNearby();
        } else {
            radiusContainer.style.display = "none";
            loadAll();
        }
    });

    radiusInput.addEventListener("input", debounce(() => {
        if (filterType.value === "km") loadNearby();
    }, 500));

    // Load initial data
    await loadStats();
    await loadAll();

    async function loadStats() {
        try {
            const statsResponse = await fetch(`${API_BASE}/parking-lots/stats`);
            const stats = await statsResponse.json();
            document.getElementById("TotalParkingSlots").textContent = stats.totalLots;
            document.getElementById("totalAvailableSlots").textContent = stats.availableSpots;
            document.getElementById("totalCapacity").textContent = stats.totalCapacity;
            document.getElementById("occupancyRate").textContent = stats.occupancyRate + "%";
        } catch (e) {
            console.error("Stats load failed", e);
        }
    }

    async function loadAll() {
        showLoading(true);
        try {
            const response = await fetch(`${API_BASE}/parking-lots`);
            const lots = await response.json();
            renderLots(lots);
        } catch (error) {
            handleError(error);
        } finally {
            showLoading(false);
        }
    }

    async function loadNearby() {
        const radius = radiusInput.value || 10;
        showLoading(true);

        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            filterType.value = "all";
            radiusContainer.style.display = "none";
            showLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const response = await fetch(`${API_BASE}/parking-lots/nearby?lat=${latitude}&long=${longitude}&radius=${radius}`);
                const lots = await response.json();
                renderLots(lots);
            } catch (error) {
                handleError(error);
            } finally {
                showLoading(false);
            }
        }, (err) => {
            alert("Unable to retrieve your location. " + err.message);
            filterType.value = "all";
            radiusContainer.style.display = "none";
            showLoading(false);
        });
    }

    function renderLots(lots) {
        let body = document.getElementById("cardsSection");
        body.innerHTML = "";
        
        let CardContainer = document.createElement("div");
        CardContainer.classList.add("cards");

        if (lots.length === 0) {
            CardContainer.innerHTML = `<p style="text-align:center;color:#64748b;width:100%;grid-column: 1 / -1;">No parking lots found in this area.</p>`;
            body.appendChild(CardContainer);
            return;
        }

        lots.forEach(parking => {
            let { placeName, locationmater, total_Available, available, hourlyRate, mapLink, distance } = parking;

            let ChildCardContainer = document.createElement("div");
            ChildCardContainer.classList.add("parking-card");

            let Name_Status_container = document.createElement("div");
            Name_Status_container.classList.add("card-header");

            let CityNameElement = document.createElement("h3");
            CityNameElement.textContent = placeName;
            CityNameElement.style.fontWeight = "bold";

            let Status = document.createElement("span");
            Status.classList.add("badge");
            Status.textContent = available > 0 ? "Available" : "Not Available";
            Status.style.color = "white";
            Status.style.backgroundColor = available > 0 ? "green" : "red";

            let DistTag = "";
            if (distance !== undefined) {
                DistTag = `<div style="color: #6366f1; font-size: 0.9rem; margin-bottom: 5px; font-weight: 600;">📍 ${distance} km away</div>`;
            }

            const location = document.createElement("a");
            location.classList.add("location");
            location.href = mapLink;
            location.textContent = "Location :" + locationmater;
            location.style.fontWeight = "bold";

            let Total_Available_slots = document.createElement("p");
            Total_Available_slots.textContent = "Available : ";
            Total_Available_slots.style.fontWeight = "bold";

            let Avilable_slots = document.createElement("span");
            Avilable_slots.textContent = available + " / ";
            Avilable_slots.style.fontWeight = "bold";

            let total_slots = document.createElement("span");
            total_slots.textContent = total_Available;

            let Hourly_pay = document.createElement("p");
            Hourly_pay.textContent = "Hourly Rate: " + hourlyRate;
            Hourly_pay.style.fontWeight = "bold";

            let progressbarContainer = document.createElement("div");
            progressbarContainer.classList.add("progress");

            let progressbar = document.createElement("div");
            let occupiedPercent = ((total_Available - available) / total_Available) * 100;
            progressbar.classList.add("progress-bar", occupiedPercent > 80 ? "red" : "orange");
            progressbar.style.width = occupiedPercent + "%";
            progressbar.textContent = Math.round(occupiedPercent) + "% Occupied";

            let buttonContainer = document.createElement("div");
            buttonContainer.classList.add("btn-group");

            let RegisterButton = document.createElement("button");
            RegisterButton.classList.add("btn", "predict");
            RegisterButton.textContent = "Register Vehicle";
            RegisterButton.onclick = () => {
                if (!token || !user) {
                    alert("Please login first to register a vehicle.");
                    window.location.href = "login.html";
                    return;
                }
                window.location.href = `form.html?lotId=${parking.id}&lotName=${encodeURIComponent(placeName)}`;
            };

            let qrButton = document.createElement("button");
            qrButton.classList.add("btn", "qr");
            qrButton.textContent = "QR Code";

            ChildCardContainer.innerHTML = `
                <div class="card-header">
                    <h3 style="font-weight:bold;">${placeName}</h3>
                    <span class="badge" style="color:white; background-color:${available > 0 ? 'green' : 'red'};">${available > 0 ? 'Available' : 'Not Available'}</span>
                </div>
                ${DistTag}
                <a class="location" href="${mapLink}" style="font-weight:bold;">Location :${locationmater}</a>
                <p style="font-weight:bold;">Available : <span>${available} / </span><span>${total_Available}</span></p>
                <p style="font-weight:bold;">Hourly Rate: ${hourlyRate}</p>
                <div class="progress">
                    <div class="progress-bar ${occupiedPercent > 80 ? 'red' : 'orange'}" style="width:${occupiedPercent}%;">${Math.round(occupiedPercent)}% Occupied</div>
                </div>
                <div class="btn-group">
                    <button class="btn predict" onclick="window.location.href='form.html?lotId=${parking.id}&lotName=${encodeURIComponent(placeName)}'">Register Vehicle</button>
                    <button class="btn qr">QR Code</button>
                </div>
            `;

            CardContainer.appendChild(ChildCardContainer);
        });
        body.appendChild(CardContainer);
    }

    function showLoading(show) {
        loadingIndicator.style.display = show ? "flex" : "none";
        if (show) {
            document.getElementById("cardsSection").style.opacity = "0.5";
            document.getElementById("cardsSection").style.pointerEvents = "none";
        } else {
            document.getElementById("cardsSection").style.opacity = "1";
            document.getElementById("cardsSection").style.pointerEvents = "all";
        }
    }

    function handleError(error) {
        console.error("API Error:", error);
        document.getElementById("cardsSection").innerHTML = `
            <p style="text-align:center;color:red;font-size:18px;width:100%;grid-column: 1 / -1;">
                ⚠️ Failed to load parking data. Make sure the backend is running.
            </p>`;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Dark theme toggle
    const btn = document.getElementById("darkTheme");
    btn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        btn.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    });

    // Search
    const searchInput = document.getElementById("searchBox");
    searchInput.addEventListener("input", () => {
        const searchValue = searchInput.value.trim().toLowerCase();
        const cards = document.querySelectorAll(".parking-card");
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(searchValue) ? "" : "none";
        });
    });
});

function openLogin() { window.location.href = "login.html"; }
function openRegister() { window.location.href = "register.html"; }
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

window.openLogin = openLogin;
window.openRegister = openRegister;
window.logout = logout;
