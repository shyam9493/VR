document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("registration-form");
    const otpButton = document.querySelector(".otp-button");


    // 📌 **Send OTP on Click**
    otpButton.addEventListener("click", async function () {
        const email = document.getElementById("email").value;
        if (!email) return alert("Please enter your phone number");

        try {
            const response = await fetch(`/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            alert(data.message || "OTP sent successfully!");
        } catch (error) {
            console.error("Error sending OTP:", error);
            alert("Failed to send OTP. Please try again.");
        }
    });

    // 📌 **Submit Registration Form**
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const fullName = document.getElementById("full-name").value;
        const gender = document.getElementById("gender").value;
        const email = document.getElementById("email").value;
        const phone = document.getElementById("phone-number").value;
        const otp = document.getElementById("otp").value;
        const city = document.getElementById("city").value;
        const bloodGroup = document.getElementById("blood-group").value;
        const password = document.getElementById("password").value;
        const donated = document.getElementById("donated").checked ? "Yes" : "No";

        if (!fullName || !gender || !email || !phone || !otp || !city || !bloodGroup || !password) {
            return alert("Please fill all required fields");
        }

        try {
            // 📌 **Verify OTP First**
            const verifyResponse = await fetch(`/reg/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });

            const verifyData = await verifyResponse.json();
            if (!verifyData.success) return alert("Invalid OTP");

            // 📌 **Register User After OTP Verification**
            const registerResponse = await fetch(`/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName,
                    gender,
                    email,
                    phone,
                    city,
                    bloodGroup,
                    password,
                    donated,
                }),
            });

            const registerData = await registerResponse.json();
            if (registerData.success) {
                alert("Registration successful!");
                window.location.href = "login.html"; // Redirect to login
            } else {
                alert(registerData.error || "Registration failed");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Something went wrong. Please try again.");
        }
    });
});
