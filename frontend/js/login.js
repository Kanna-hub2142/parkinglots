const API_BASE = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", function () {
    // If already logged in, redirect
    const token = localStorage.getItem("token");
    if (token) {
        window.location.href = "index.html";
        return;
    }

    const form = document.getElementById("loginForm");
    const statusMsg = document.getElementById("statusMsg");

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                // Store token and user info
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify({
                    id: data.id,
                    username: data.username,
                    email: data.email,
                    role: data.role,
                }));

                statusMsg.style.display = "block";
                statusMsg.style.background = "#dcfce7";
                statusMsg.style.color = "#16a34a";
                statusMsg.textContent = data.message;

                // Redirect based on role
                setTimeout(() => {
                    if (data.role === "ADMIN") {
                        window.location.href = "admin.html";
                    } else {
                        window.location.href = "index.html";
                    }
                }, 800);
            } else {
                statusMsg.style.display = "block";
                statusMsg.style.background = "#fee2e2";
                statusMsg.style.color = "#dc2626";
                statusMsg.textContent = data.error || "Login failed";
            }
        } catch (err) {
            statusMsg.style.display = "block";
            statusMsg.style.background = "#fee2e2";
            statusMsg.style.color = "#dc2626";
            statusMsg.textContent = "⚠️ Server error. Make sure backend is running.";
        }
    });
});
