const API_BASE = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    // Redirect to login if not authenticated
    if (!token || !user) {
        alert("Please login first to register a vehicle.");
        window.location.href = "login.html";
        return;
    }

    // Get parking lot info from URL params
    const params = new URLSearchParams(window.location.search);
    const lotId = params.get("lotId");
    const lotName = params.get("lotName");

    let body = document.getElementById("form-box1");
    body.classList.add("form-box");

    let heading = document.createElement("h2");
    heading.textContent = "Vehicle Registration";

    // Show which parking lot if available
    if (lotName) {
        let lotInfo = document.createElement("p");
        lotInfo.textContent = `📍 Parking Lot: ${lotName}`;
        lotInfo.style.textAlign = "center";
        lotInfo.style.color = "#6366f1";
        lotInfo.style.fontWeight = "600";
        lotInfo.style.marginBottom = "15px";
        body.appendChild(heading);
        body.appendChild(lotInfo);
    } else {
        body.appendChild(heading);
    }

    // Show logged-in user
    let userInfo = document.createElement("p");
    userInfo.textContent = `👤 Registering as: ${user.username}`;
    userInfo.style.textAlign = "center";
    userInfo.style.color = "#4CAF50";
    userInfo.style.fontWeight = "600";
    userInfo.style.marginBottom = "15px";
    body.appendChild(userInfo);

    let formContainer = document.createElement("form");

    // Status message area
    let statusMsg = document.createElement("div");
    statusMsg.id = "statusMsg";
    statusMsg.style.textAlign = "center";
    statusMsg.style.padding = "10px";
    statusMsg.style.marginBottom = "10px";
    statusMsg.style.borderRadius = "8px";
    statusMsg.style.display = "none";
    formContainer.appendChild(statusMsg);

    function createInput(labelText, id, inputType) {
        let label = document.createElement("label");
        label.textContent = labelText;
        label.setAttribute("for", id);

        let input = document.createElement("input");
        input.type = inputType || "text";
        input.id = id;
        input.required = true;

        formContainer.appendChild(label);
        formContainer.appendChild(input);
    }

    createInput("Name", "name");
    createInput("Mobile Number", "mobile", "tel");

    // Vehicle dropdown
    let labelType = document.createElement("label");
    labelType.textContent = "Vehicle Type";

    let select = document.createElement("select");
    select.id = "vehicleType";
    select.required = true;

    ["Motorcycle", "Scooter", "Car"].forEach(v => {
        let option = document.createElement("option");
        option.textContent = v;
        option.value = v;
        select.appendChild(option);
    });

    formContainer.appendChild(labelType);
    formContainer.appendChild(select);

    createInput("Vehicle Name", "vname");
    createInput("Vehicle Number", "vnumber");

    // Buttons
    let buttonsContainer = document.createElement("div");
    buttonsContainer.classList.add("btn-group");

    let submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Submit";
    submit.classList.add("btn", "predict");

    let back = document.createElement("button");
    back.type = "button";
    back.textContent = "Back";
    back.classList.add("btn", "qr");
    back.onclick = () => window.location.href = "index.html";

    buttonsContainer.appendChild(back);
    buttonsContainer.appendChild(submit);
    formContainer.appendChild(buttonsContainer);

    // FORM SUBMIT HANDLER — POST to backend API with auth
    formContainer.addEventListener("submit", async function (e) {
        e.preventDefault();

        const payload = {
            name: document.getElementById("name").value.trim(),
            mobile: document.getElementById("mobile").value.trim(),
            vehicleType: document.getElementById("vehicleType").value,
            vehicleName: document.getElementById("vname").value.trim(),
            vehicleNumber: document.getElementById("vnumber").value.trim(),
            parkingLotId: lotId ? parseInt(lotId) : null,
        };

        try {
            const res = await fetch(`${API_BASE}/vehicles/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                alert("Session expired. Please login again.");
                window.location.href = "login.html";
                return;
            }

            if (res.ok) {
                statusMsg.style.display = "block";
                statusMsg.style.background = "#dcfce7";
                statusMsg.style.color = "#16a34a";
                statusMsg.textContent = data.message;
                formContainer.reset();
            } else {
                statusMsg.style.display = "block";
                statusMsg.style.background = "#fee2e2";
                statusMsg.style.color = "#dc2626";
                statusMsg.textContent = data.error || "Registration failed";
            }
        } catch (err) {
            statusMsg.style.display = "block";
            statusMsg.style.background = "#fee2e2";
            statusMsg.style.color = "#dc2626";
            statusMsg.textContent = "⚠️ Server error. Make sure backend is running.";
        }
    });

    body.appendChild(formContainer);
});
