// Modal functionality
window.showLoginForm = () => {
  document.getElementById('loginModal').style.display = 'block';
};

window.showRegisterForm = () => {
  document.getElementById('registerModal').style.display = 'block';
};

window.closeModal = (modalId) => {
  document.getElementById(modalId).style.display = 'none';
};

// Close modal when clicking outside
window.onclick = (event) => {
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  if (event.target === loginModal) {
    loginModal.style.display = 'none';
  }
  if (event.target === registerModal) {
    registerModal.style.display = 'none';
  }
};

// Handle Login
window.handleLogin = async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const email = formData.get('email');
  const password = formData.get('password');

  console.log("Login attempt with:", email, password); // Debugging
  
  try {
    const response = await fetch("http://localhost:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    // console.log("Server response:", data); // Debugging
    

    if (response.ok) {
      localStorage.setItem("token", data.token);
      window.location.href = "dashboard.html";
    }else {
      alert(data.error);
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("An error occurred during login.");
  }
};


// Handle Register
window.handleRegister = async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const userData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    bloodGroup: formData.get("bloodGroup"),
    location: formData.get("location"),
  };

  console.log("Sending registration data:", userData); // Debugging

  try {
    const response = await fetch("http://localhost:8000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    console.log("Server response:", data); // Debugging

    if (response.ok) {
      alert("Registration successful! Please log in.");
      window.closeModal("registerModal");
    } else {
      alert(data.error);
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("An error occurred during registration.");
  }
};



// Redirect to dashboard if already logged in
window.onload = () => {
  const token = localStorage.getItem("token");
  if (token && window.location.pathname === "/") {
    window.location.href = "dashboard.html";
  }
};
