const path = require("path");
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const nodemailer = require('nodemailer');



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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
