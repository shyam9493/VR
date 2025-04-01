document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (email && password) {
        const response = await fetch("/login", {
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
    
    const email = document.getElementById("login-email-2").value;
    const otp = document.getElementById("login-otp").value;
    
    if (email && otp) {
        const response = await fetch("/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp })
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
    const email = document.getElementById("login-email-2").value;
    if (!email) return alert("Enter a valid email");

    const response = await fetch("/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });

    const data = await response.json();
    alert(data.message || "OTP sent!");
});
