const API_BASE = "http://44.204.99.2:8001/api/v1";
const API_KEY = "key_eventpark";

document.addEventListener("DOMContentLoaded", async function () {
    // Dark theme toggle
    const themeBtn = document.getElementById("darkTheme");
    themeBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        themeBtn.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    });

    const eventsContainer = document.getElementById("eventsContainer");
    const locationStatus = document.getElementById("locationStatus");

    if (!navigator.geolocation) {
        handleError("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const radius = 5000;
        locationStatus.textContent = `📍 Showing events within ${radius/1000}km of your location`;
        
        try {
            const res = await fetch(`${API_BASE}/events/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}&page=1&page_size=20`, {
                headers: {
                    'accept': 'application/json',
                    'x-api-key': API_KEY
                }
            });
            const data = await res.json();
            renderEvents(data.events);
        } catch (error) {
            handleError("Failed to fetch event data.");
        }
    }, (err) => {
        handleError("Unable to retrieve your location. Using default view.");
        fetchDefaultEvents();
    });

    async function fetchDefaultEvents() {
        const defaultLat = 12.97135;
        const defaultLong = 77.70599;
        const radius = 5000;
        
        try {
            const res = await fetch(`${API_BASE}/events/nearby?latitude=${defaultLat}&longitude=${defaultLong}&radius=${radius}&page=1&page_size=20`, {
                headers: {
                    'accept': 'application/json',
                    'x-api-key': API_KEY
                }
            });
            const data = await res.json();
            renderEvents(data.events);
        } catch (error) {
            handleError("Failed to fetch event data.");
        }
    }

    function renderEvents(events) {
        eventsContainer.innerHTML = "";
        
        if (!events || events.length === 0) {
            eventsContainer.innerHTML = `<p class="text-center">No upcoming events found nearby.</p>`;
            return;
        }

        events.forEach(event => {
            const startDate = new Date(event.start_date).toLocaleDateString('en-IE', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
            });

            const card = document.createElement("div");
            card.className = "event-card";
            
            const crowdColor = event.crowd_percentage > 80 ? "#ef4444" : "#f59e0b";
            
            card.innerHTML = `
                <div class="event-header">
                    <h3 style="margin:0;">${event.title}</h3>
                    <span class="badge" style="background:${event.is_free ? '#10b981' : '#6366f1'}; color:white;">
                        ${event.is_free ? 'FREE' : 'TICKETED'}
                    </span>
                </div>
                <p style="color:#64748b; margin-bottom:5px;">📅 ${startDate}</p>
                <p style="font-weight:600; margin-bottom:10px;">📍 ${event.venue.name}, ${event.venue.city}</p>
                
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>Crowd Level: <strong>${event.crowd_level.toUpperCase()}</strong></span>
                    <span>${event.crowd_percentage}% Full</span>
                </div>
                <div class="crowd-meter">
                    <div class="crowd-fill" style="width:${event.crowd_percentage}%; background:${crowdColor};"></div>
                </div>
                <div style="margin-top:15px; font-size:0.9rem; color:#64748b;">
                    Tickets Sold: ${event.tickets_sold.toLocaleString()} / ${event.max_capacity.toLocaleString()}
                </div>
            `;
            eventsContainer.appendChild(card);
        });
    }

    function handleError(msg) {
        console.error(msg);
        eventsContainer.innerHTML = `<p style="color:red; text-align:center;">⚠️ ${msg}</p>`;
    }
});
