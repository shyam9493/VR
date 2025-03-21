// Fetch user info & donor data on page load
window.onload = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html"; // Redirect if not logged in
        return;
    }

    try {

const userRes = await fetch("http://localhost:8000/dashboard", {
  method: "GET",
  headers: { Authorization: token }
});

        const userData = await userRes.json();
        // console.log(userData);

        if (!userRes.ok) throw new Error(userData.error);

        // Set user info
        document.getElementById("userName").textContent = userData.user.name;
        document.getElementById("userEmail").textContent = userData.user.email;
        document.getElementById("userBloodGroup").textContent = userData.user.bloodGroup;
        document.getElementById("userLocation").textContent = userData.user.location;

        // Fetch donors
        // const donorRes = await fetch("http://localhost:8000/donors", {
        //     headers: { Authorization: `Bearer ${token}` }
        // });
        // const donors = await donorRes.json();

        // if (!donorRes.ok) throw new Error(donors.error);

        // displayDonors(donors);
    } catch (error) {
        console.error("Error fetching data:", error);
        alert("Failed to fetch data. Please try again.");
        localStorage.removeItem("token");
        window.location.href = "index.html";
    }
};

// Display donors grouped by location
// function displayDonors(donors) {
//     const donorList = document.getElementById("donorList");
//     donorList.innerHTML = "";

//     const groupedDonors = donors.reduce((acc, donor) => {
//         acc[donor.location] = acc[donor.location] || [];
//         acc[donor.location].push(donor);
//         return acc;
//     }, {});

//     for (const [location, donorArray] of Object.entries(groupedDonors)) {
//         const section = document.createElement("div");
//         section.classList.add("donor-section");
//         section.innerHTML = `<h3>${location}</h3>`;

//         donorArray.forEach(donor => {
//             const donorCard = document.createElement("div");
//             donorCard.classList.add("donor-card");
//             donorCard.innerHTML = `
//                 <p><strong>Name:</strong> ${donor.name}</p>
//                 <p><strong>Blood Group:</strong> ${donor.bloodGroup}</p>
//                 <p><strong>Contact:</strong> ${donor.email}</p>
//             `;
//             section.appendChild(donorCard);
//         });

//         donorList.appendChild(section);
//     }
// }

// // Filter donors by location
// function filterDonors() {
//     const searchValue = document.getElementById("searchBox").value.toLowerCase();
//     const sections = document.querySelectorAll(".donor-section");

//     sections.forEach(section => {
//         const location = section.querySelector("h3").textContent.toLowerCase();
//         section.style.display = location.includes(searchValue) ? "block" : "none";
//     });
// }

// Logout function
function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}
