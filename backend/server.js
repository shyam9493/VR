const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from the project root (one level up from backend)
app.use(express.static(path.join(__dirname, "..")));

// Route to serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});
 

app.get('/home',(req,res)=>{
    res.send("Backend server testing");
})

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
