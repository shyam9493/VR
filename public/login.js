document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (email && password) {
        const response = await fetch("http://localhost:8000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (data.success) {
            localStorage.setItem("token", data.token);
            alert("Login successful!");
            window.location.href = "dashboard.html";
        } else {
            alert("Invalid credentials");
        }
    }
});
document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const phone = document.getElementById("login-phone").value;
    const otp = document.getElementById("login-otp").value;
    
    if (phone && otp) {
        const response = await fetch("http://localhost:8000/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, otp })
        });

        const data = await response.json();
        if (data.success) {
            localStorage.setItem("token", data.token); // Store JWT
            alert("Login successful!");
            window.location.href = "dashboard.html"; // Redirect
        } else {
            alert("Login failed!");
        }
    }
});
document.querySelector(".otp-button").addEventListener("click", async () => {
    const phone = document.getElementById("login-phone").value;
    if (!phone) return alert("Enter a valid phone number");

    const response = await fetch("/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
    });

    const data = await response.json();
    alert(data.message || "OTP sent!");
});
