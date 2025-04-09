const path = require("path");
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const nodemailer = require('nodemailer');


const server=process.env.SERVER ;


const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";


var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
    }
  });


app.use(express.json());
app.use(
    cors({
        origin: "*", // Allow all origins
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Allow all methods
        allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
        credentials: true // Allow cookies if needed
    })
);



mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));




const UserSchema = new mongoose.Schema({
    fullName: String,
    gender: String,
    email: String,
    city: String,
    phone:String,
    bloodGroup: String,
    password: String ,
    donated:String,
    isActive: { type: Boolean, default: false },
});
const User = mongoose.model("User", UserSchema);

const requestSchema = new mongoose.Schema({
    requesterEmail: { type: String, required: true }, // sender
    receiverEmail: { type: String, required: true }, // receiver
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    createdAt: { type: Date, default: Date.now }
  });

const Request= mongoose.model("Request", requestSchema);

app.use(express.static(path.join(__dirname, "..", "public")));



app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});


app.post("/register", async (req, res) => {
    const { fullName,gender,email,city,phone,bloodGroup,password,donated } = req.body;

    if (!fullName || !email || !password || !bloodGroup || !city || !gender || !phone) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ fullName, email, password: hashedPassword, bloodGroup, city ,phone,donated });
        await newUser.save();
        res.json({ success:true,message: "User registered successfully" });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Temporary OTP Storage (Use Redis/DB in production)
const otpStore = {};

// 📌 **Login with Email & Password**
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ success: true, token });
});

// 📌 **Send OTP for Phone Login**
app.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Phone number is required" });

    // const user = await User.findOne({ phone });
    // if (!user) return res.status(400).json({ error: "Phone number not registered" });

    const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
    otpStore[email] = otp; // Store OTP temporarily
    console.log(otp);
    

    try {
        var mailOptions = {
            from:  process.env.EMAIL,
            to: email,
            subject: "Blood Sync OTP",
            text: `Your OTP is ${otp}`
          };
          
          
        transporter.sendMail(mailOptions)
        .then((message) => {
            res.json({ success: true, message: "OTP sent successfully" });
        })
        .catch((err)=>{
            res.json({ success: false, message: `error ${err}` });
        });
       
    } catch (error) {
        res.status(500).json({ error: "Failed to send OTP", details: error.message });
    }
});

// 📌 **Verify OTP and Login**
app.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Phone and OTP are required" });

    if (otpStore[email] && otpStore[email] == otp) {
        delete otpStore[email]; // Remove OTP after successful verification
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: "User not found" });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });
        res.json({ success: true, token });
    } else {
        res.status(400).json({ error: "Invalid OTP" });
    }
});
app.post("/reg/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Phone and OTP are required" });

    if (otpStore[email] && otpStore[email] == otp) {
        delete otpStore[email];
        res.json({success:true});
    } else {
        res.status(400).json({ error: "Invalid OTP" });
    }
});
// 📌 **Protected Dashboard Route**
app.get("/dashboard", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Access denied" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const bloodCompatibility = {
            "O+": ["O+", "O-"],
            "O-": ["O-"],
            "A+": ["A+", "A-", "O+", "O-"],
            "A-": ["A-", "O-"],
            "B+": ["B+", "B-", "O+", "O-"],
            "B-": ["B-", "O-"],
            "AB+": ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], // Universal recipient
            "AB-": ["AB-", "A-", "B-", "O-"]
        };
        
        const user = await User.findById(decoded.userId).select("-password");
        
        const compatibleBloodGroups = bloodCompatibility[user.bloodGroup] || []; // Get matching blood groups
        
        const donors = await User.find({
            _id: { $ne: user._id }, // Exclude current user
            city: { $regex: new RegExp("^" + user.city.toLowerCase() + "$", "i") }, // Match city (case insensitive)
            bloodGroup: { $in: compatibleBloodGroups } // Filter by compatible blood groups
        }).select("-password");
        res.json({ success:true,user, donors });
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
});


app.post('/change' , async (req,res)=>{
    const { _id }=req.body;
    try{
        const user = await User.findById(_id);

    if (!user) {
         throw new Error("User not found");
        }

        user.isActive = !user.isActive; // Toggle the isActive status

        await user.save(); // Save the updated status

        // console.log(`User status updated: ${user.isActive}`);
        res.status(200).json({data:true});

    }catch(err){
        res.status(401).json({ error: "Invalid action.." });
    }
    
})

app.post('/send_request', async (req, res) => {
    const { email, user } = req.body;
  
    const Userdetails = await User.findOne({ email: user });
  
    try {
      const existing = await Request.findOne({
        requesterEmail: user,
        receiverEmail: email,
        status: "pending"
      });
  
      if (existing) {
        return res.status(400).json({ message: "Your request is still pending acceptance." });
      }
  
      const newRequest = await Request.create({
        requesterEmail: user,
        receiverEmail: email,
        status: "pending"
      });
  
      const revealLink = `${server}/accept-request/${newRequest._id}`;
      const rejectLink = `${server}/reject-request/${newRequest._id}`;
  
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "New Blood Donation Request - Blood Sync",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>Hello,</p>
            <p>You have received a new <strong>blood donation request</strong> via <strong>Blood Sync</strong>.</p>
  
            <h3>Requester Information:</h3>
            <ul>
              <li><strong>Full Name:</strong> ${Userdetails.fullName}</li>
              <li><strong>Email:</strong> ${Userdetails.email}</li>
              <li><strong>Blood Group:</strong> ${Userdetails.bloodGroup}</li>
              <li><strong>Phone:</strong> ${Userdetails.phone}</li>
              <li><strong>Location:</strong> ${Userdetails.city}</li>
            </ul>
  
            <p>If you're willing to help, please choose an action below:</p>
  
            <p>
              <a href="${revealLink}" style="display:inline-block; padding:12px 24px; background-color:#28a745; color:white; text-decoration:none; border-radius:6px; font-weight:bold; margin-right:10px;">
                Accept Request
              </a>
              <a href="${rejectLink}" style="display:inline-block; padding:12px 24px; background-color:#dc3545; color:white; text-decoration:none; border-radius:6px; font-weight:bold;">
                Reject Request
              </a>
            </p>
  
            <p>If you weren't expecting this request, you can safely ignore this email.</p>
            <p>Thank you for being a part of Blood Sync.</p>
          </div>
        `
      };
  
      transporter.sendMail(mailOptions)
        .then(() => {
          res.json({ success: true, message: "Request sent successfully." });
        })
        .catch((err) => {
          res.json({ success: false, message: `Error sending email: ${err}` });
        });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Something went wrong." });
    }
  });

  
app.get('/accept-request/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const request = await Request.findById(id);
      if (!request || request.status !== 'pending') {
        return res.status(400).send("Invalid or already processed request.");
      }
  
      request.status = "accepted";
      await request.save();
      const donor = await User.findOne({email:request.receiverEmail})
      console.log(donor);
      await notifyRequester(request.requesterEmail, "accepted",donor);

  
  
      res.redirect(`${server}/request-accepted`);
    } catch (error) {
      res.status(500).send("Something went wrong.");
    }
  });
  
  app.get('/reject-request/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const request = await Request.findById(id);
      if (!request || request.status !== 'pending') {
        return res.status(400).send("Invalid or already processed request.");
      }
  
      request.status = "rejected";
      await request.save();
      await notifyRequester(request.requesterEmail, "rejected","");

  
      // Optionally notify the requester here
  
      res.redirect(`${server}/request-rejected`);
    } catch (error) {
      res.status(500).send("Something went wrong.");
    }
  });


  // Assuming you have nodemailer set up
const notifyRequester = async (email, status,donor) => {
    let donorDetails = "";

if (status === "accepted") {
  donorDetails = `
    <h3>Donor Information:</h3>
    <ul>
      <li><strong>Full Name:</strong> ${donor.fullName}</li>
      <li><strong>Email:</strong> ${donor.email}</li>
      <li><strong>Blood Group:</strong> ${donor.bloodGroup}</li>
      <li><strong>Phone:</strong> ${donor.phone}</li>
      <li><strong>Location:</strong> ${donor.city}</li>
    </ul>
  `;
}

const mailOptions = {
  from: process.env.EMAIL,
  to: email, // requesterEmail
  subject: `Your Blood Request was ${status === "accepted" ? "Accepted" : "Rejected"}`,
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>Hello,</p>
      <p>Your blood donation request has been <strong>${status}</strong> by the Donor.</p>
      ${donorDetails}
      <p>Thank you for using <strong>Blood Sync</strong>.</p>
    </div>
  `
};

  
    await transporter.sendMail(mailOptions);
  };
  
  app.get('/request-accepted', (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "request-accepted.html"));
  });
  
  app.get('/request-rejected', (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "request-rejected.html"));
  });
  

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
