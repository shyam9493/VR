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

// Handle form submissions
window.handleLogin = (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const email = formData.get('email');
  const password = formData.get('password');
  
  // Here you would typically make an API call to authenticate
  console.log('Login attempt:', { email, password });
  alert('Login functionality will be implemented soon!');
};

window.handleRegister = (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData);
  
  // Here you would typically make an API call to register
  console.log('Registration data:', data);
  alert('Registration functionality will be implemented soon!');
};