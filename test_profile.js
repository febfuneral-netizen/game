const http = require("http");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "/data/quiz-miniapp/server/.env" });

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) { console.log("NO JWT_SECRET"); process.exit(1); }

// Connect to MongoDB and find a user
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/quiz-miniapp").then(async () => {
  const User = require("./dist/models/User").default;
  const user = await User.findOne();
  if (!user) { console.log("NO USER"); process.exit(0); }
  
  const token = jwt.sign({ userId: user._id.toString() }, jwtSecret, { expiresIn: "1h" });
  
  const opts = {
    hostname: "127.0.0.1", port: 3001,
    path: "/api/user/profile", method: "GET",
    headers: { Authorization: "Bearer " + token }
  };
  
  http.get(opts, (res) => {
    let body = "";
    res.on("data", d => body += d);
    res.on("end", () => {
      const resp = JSON.parse(body);
      console.log("Status:", res.statusCode);
      console.log("Title:", JSON.stringify(resp.title));
      console.log("Achievements:", resp.achievements?.length || 0);
      console.log("Unlocked:", resp.achievements?.filter(a => a.unlocked).map(a => a.id).join(", ") || "none");
      console.log("Subjects:");
      for (const [k, v] of Object.entries(resp.subjects || {})) {
        console.log("  " + k + ": " + JSON.stringify(v));
      }
      mongoose.disconnect();
    });
  });
});
