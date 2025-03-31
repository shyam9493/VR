const path = require("path");
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");


const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = require("twilio")(accountSid, authToken);        



app.use(express.json());
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
    allowedHeaders: ["Content-Type", "Authorization"] 
  }));



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
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    // const user = await User.findOne({ phone });
    // if (!user) return res.status(400).json({ error: "Phone number not registered" });

    const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
    otpStore[phone] = otp; // Store OTP temporarily
    console.log(otp);
    

    try {
        await client.messages
        .create({
          body: `Your OTP for BloodSync is ${otp}`,
          to: phone,
          from: twilioPhone, 
        })
        .then((message) => {
            console.log(message.sid);
            res.json({ success: true, message: "OTP sent successfully" });
        })
        .catch((err)=>{
            res.json({ success: false, message: `twilio error ${err}` });
        });
       
    } catch (error) {
        res.status(500).json({ error: "Failed to send OTP", details: error.message });
    }
});

// 📌 **Verify OTP and Login**
app.post("/verify-otp", async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP are required" });

    if (otpStore[phone] && otpStore[phone] == otp) {
        delete otpStore[phone]; // Remove OTP after successful verification
        const user = await User.findOne({ phone });

        if (!user) return res.status(400).json({ error: "User not found" });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });
        res.json({ success: true, token });
    } else {
        res.status(400).json({ error: "Invalid OTP" });
    }
});
app.post("/reg/verify-otp", async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP are required" });

    if (otpStore[phone] && otpStore[phone] == otp) {
        delete otpStore[phone];
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
        const user = await User.findById(decoded.userId).select("-password");
        const donors = await User.find({
            _id: { $ne: user._id }, 
            city: { $regex: new RegExp("^" + user.city.toLowerCase() + "$", "i") } 
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
