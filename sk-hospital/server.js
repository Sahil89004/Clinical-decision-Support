require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");

require("./config/passport");

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/sk-hospital")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Session middleware
app.use(
  session({
    secret: "skhospitalsecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// 🔵 Route: Home
app.get("/", (req, res) => {
  res.send('<a href="/auth/google"><button>Login with Google</button></a>');
});

// 🔵 Google Auth Start
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// 🔵 Google Callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
  }),
  (req, res) => {
    res.redirect("/profile");
  }
);

// 🔵 Profile Route
app.get("/profile", (req, res) => {
  if (!req.user) {
    return res.redirect("/");
  }

  res.send(`
    <h1>Welcome ${req.user.name}</h1>
    <p>Email: ${req.user.email}</p>
    <img src="${req.user.profilePic}" width="100"/>
    <br><br>
    <a href="/logout">Logout</a>
  `);
});

// 🔵 Logout
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
