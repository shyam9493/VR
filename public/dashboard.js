document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/index.html";
        return;
    }

    try {
        const response = await fetch("/dashboard", {
            method: "GET",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch dashboard data");
        }

        const { user, donors } = await response.json();

        document.getElementById("user-name").textContent = user.fullName;
        document.getElementById("user-email").textContent = `Email: ${user.email}`;
        document.getElementById("user-location").textContent = `Location: ${user.city}`;
        document.getElementById("user-blood").textContent = `Blood Group: ${user.bloodGroup}`;
        const statusElement=document.getElementById("status");

        if (user.isActive) {
            statusElement.textContent = "Status: ACTIVE";
            statusElement.classList.add("status-active");
            
        } else {
            statusElement.textContent = "Status: INACTIVE";
            statusElement.classList.add("status-inactive");
        }

        statusElement.setAttribute("data-id", user._id);

        const donorList = document.getElementById("donor-list");
        const donors_inactive = document.getElementById("donor-inactive");

        donorList.innerHTML = "";
        donors_inactive.innerHTML = ""; 

        donors.forEach(donor => {
            const donorDiv = document.createElement("div");
            donorDiv.classList.add("donor");
        
            // Determine status indicator and contact info
            const statusColor = donor.isActive ? "green" : "red";
            const contactInfo = donor.isActive 
                ? `<button class="cta-button"  onClick="send_request('${donor.email}','${donor.fullName}','${user.email}')">Send Request</button>`
                : "";
        
                donorDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 12px; height: 12px; background-color: ${statusColor}; border-radius: 50%;"></div>
                    <h3 style="margin: 0; font-size: 18px;">${donor.fullName}</h3>
                </div>
                <p style="margin: 5px 0;">Blood Type: ${donor.bloodGroup || "N/A"}</p>
                <p style="margin: 5px 0;">Location: ${donor.city.toUpperCase() || "Unknown"}</p>
                ${contactInfo}
            `;

            
        
            if(donor.isActive){
                donorList.appendChild(donorDiv);
            }else{
                donors_inactive.appendChild(donorDiv);
            }
            
        });
        

        // Ensure logout button exists before adding an event listener
        const logoutButton = document.getElementById("logout-button");
        if (logoutButton) {
            logoutButton.addEventListener("click", () => {
                localStorage.removeItem("token");
                window.location.href = "/index.html";
            });
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
    
});

document.getElementById("status").addEventListener("click", function(event) {
    event.preventDefault(); // Prevent default link behavior

    const userConfirmed = confirm("Are you sure you want to change the status?");
    
    if (userConfirmed) {
        const donorId = this.getAttribute("data-id"); // Get donor _id from a data attribute

        if (!donorId) {
            alert("Donor ID is missing!");
            return;
        }

        fetch("/change", {
            method: "POST", // Change to GET if necessary
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ _id: donorId }) // Send the _id to the backend
        })
        .then(response => response.json())
        .then(data => {
            alert("Status changed successfully!");
            window.location.href = "/dashboard.html";
        })
        .catch(error => {
            alert("Error changing status. Please try again.");
            console.error("Error:", error);
        });
    }
});


function send_request(email,name,user) {
    if(confirm(`Do you want to send request to ${name}`)){
        fetch("/send_request", {
            method: "POST", 
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: email,user:user })
        })
        .then(response => {
            // console.log(response.status);
            if(response.status == 200){
                alert(`Request Sent to ${email}`);
            }else if(response.status == 400){
                alert('Your request is still pending acceptance.')
            }else{
                alert("some error occured..");
            }
        })
        // .then(data => {
        //     alert(`Request Sent to ${email}`);
        //     // window.location.href = "/dashboard.html";
        // })
        .catch(error => {
            alert("Error sending request. Please try again.");
            console.error("Error:", error);
        });
    }
}