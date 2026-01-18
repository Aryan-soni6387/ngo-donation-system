const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv").config();

const User = require("./models/User");
const Donation = require("./models/Donation");

const app = express();

// ✅ Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");

// ✅ Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret123",
    resave: false,
    saveUninitialized: false,
  })
);

// ✅ Static folder
app.use(express.static("public"));

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

/* ==========================================================
   ✅ AUTH MIDDLEWARES
   ========================================================== */

function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function isUser(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  if (req.session.user.role !== "user") return res.send("❌ Access denied");
  next();
}

function isAdminOrSuper(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  if (!["admin", "superadmin"].includes(req.session.user.role))
    return res.send("❌ Access denied");
  next();
}

function isSuperAdmin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  if (req.session.user.role !== "superadmin")
    return res.send("❌ Only SuperAdmin can do this!");
  next();
}

/* ==========================================================
   ✅ ROUTES
   ========================================================== */

app.get("/", (req, res) => {
  res.redirect("/login");
});

// ✅ Register page
app.get("/register", (req, res) => {
  res.render("register");
});

// ✅ Register POST
app.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.send("❌ Email already registered. Go back and login.");

    const hashedPass = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPass,
      role: "user",
    });

    await newUser.save();
     return res.redirect("/login");
  } catch (error) {
    console.log(error);
    res.send("❌ Error in Register");
  }
});

// ✅ Login page
app.get("/login", (req, res) => {
  res.render("login");
});

// ✅ Login POST
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.send("❌ User not found. Please register first.");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send("❌ Wrong password!");

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // ✅ Redirect based on role
    if (user.role === "user") {
      return res.redirect("/user/dashboard");
    } else {
      return res.redirect("/admin/dashboard");
    }
  } catch (error) {
    console.log(error);
    res.send("❌ Error in Login");
  }
});

// ✅ USER DASHBOARD
app.get("/user/dashboard", isUser, async (req, res) => {
  const userData = await User.findById(req.session.user.id);
  res.render("user_dashboard", { user: userData });
});

// ✅ DONATE PAGE
app.get("/donate", isUser, (req, res) => {
  res.render("donate");
});

/* ==========================================================
   ✅ PAYHERE PAYMENT ROUTES (FIXED)
   ========================================================== */

// ✅ Create PayHere Payment Object (creates PENDING donation + returns payment JSON)
app.post("/payment/create-payment", isUser, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.json({ success: false, message: "Invalid amount" });
    }

    const user = await User.findById(req.session.user.id);

    const merchant_id = process.env.PAYHERE_MERCHANT_ID;
    const merchant_secret = process.env.PAYHERE_MERCHANT_SECRET;

    if (!merchant_id || !merchant_secret) {
      return res.json({
        success: false,
        message: "PayHere Merchant ID/Secret missing in .env",
      });
    }

    const orderId = "ORDER_" + Date.now();
    const currency = "LKR";
    const items = "NGO Donation";

    // ✅ Create donation entry as PENDING
    await Donation.create({
      userId: user._id,
      orderId: orderId,
      amount: amount,
      currency: currency,
      status: "PENDING",
    });

    const amountFormatted = amount.toFixed(2);

    // ✅ PayHere Hash generation
    const secretHash = crypto
      .createHash("md5")
      .update(merchant_secret)
      .digest("hex")
      .toUpperCase();

    const rawHashString =
      merchant_id + orderId + amountFormatted + currency + secretHash;

    const hash = crypto
      .createHash("md5")
      .update(rawHashString)
      .digest("hex")
      .toUpperCase();

    const payment = {
      sandbox: true,
      merchant_id: merchant_id,

      return_url: "http://localhost:5000/donations",
      cancel_url: "http://localhost:5000/donations",
      notify_url: "http://localhost:5000/payment/notify",

      order_id: orderId,
      items: items,
      amount: amountFormatted,
      currency: currency,

      hash: hash,

      first_name: user.name,
      last_name: "",
      email: user.email,
      phone: user.phone,
      address: "N/A",
      city: "N/A",
      country: "Sri Lanka",
    };

    return res.json({ success: true, payment });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Server error" });
  }
});

// ✅ Mark as PENDING (dismiss/error/decline case)
app.post("/payment/mark-pending", isLoggedIn, async (req, res) => {
  try {
    const { orderId } = req.body;

    await Donation.findOneAndUpdate(
      { orderId },
      { status: "PENDING" }
    );

    res.json({ success: true });
  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
});

// ✅ PayHere notify URL (ONLY confirm SUCCESS here)
app.post("/payment/notify", async (req, res) => {
  try {
    console.log("✅ PayHere Notify:", req.body);

    const orderId = req.body.order_id;
    const statusCode = req.body.status_code; // 2 means SUCCESS in PayHere

    // ✅ Only confirm SUCCESS if PayHere says status_code == 2
    if (String(statusCode) === "2") {
      await Donation.findOneAndUpdate(
        { orderId },
        { status: "SUCCESS" }
      );
    }

    // ✅ Otherwise keep PENDING (do nothing)
    return res.sendStatus(200);
  } catch (err) {
    console.log("❌ Notify error:", err);
    return res.sendStatus(200);
  }
});

// ✅ USER DONATION HISTORY
app.get("/donations", isUser, async (req, res) => {
  const donations = await Donation.find({ userId: req.session.user.id }).sort({
    createdAt: -1,
  });

  res.render("donation_history", { donations });
});

/* ==========================================================
   ✅ ADMIN PANEL ROUTES (Admin + SuperAdmin)
   ========================================================== */

app.get("/admin/dashboard", isAdminOrSuper, async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalDonations = await Donation.countDocuments();

  const successAgg = await Donation.aggregate([
    { $match: { status: "SUCCESS" } },
    { $group: { _id: null, sum: { $sum: "$amount" } } },
  ]);

  const successAmount = successAgg[0]?.sum || 0;

  const adminData = await User.findById(req.session.user.id);

  res.render("admin_dashboard", {
    admin: adminData,
    totalUsers,
    totalDonations,
    successAmount,
  });
});

// ✅ ADMIN USERS LIST + SEARCH
app.get("/admin/users", isAdminOrSuper, async (req, res) => {
  const q = req.query.q || "";

  let filter = {};
  if (q.trim() !== "") {
    filter = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ],
    };
  }

  const users = await User.find(filter).sort({ createdAt: -1 });

  res.render("admin_users", {
    users,
    currentRole: req.session.user.role,
    q,
  });
});

// ✅ SUPERADMIN: Make Admin
app.post("/admin/make-admin/:id", isSuperAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    if (String(req.session.user.id) === String(userId)) {
      return res.send("❌ You cannot change your own role.");
    }

    const user = await User.findById(userId);
    if (!user) return res.send("❌ User not found");

    if (user.role === "superadmin") {
      return res.send("❌ Cannot change SuperAdmin role.");
    }

    user.role = "admin";
    await user.save();

    res.redirect("/admin/users");
  } catch (err) {
    console.log(err);
    res.send("❌ Error making admin");
  }
});

// ✅ SUPERADMIN: Remove Admin
app.post("/admin/remove-admin/:id", isSuperAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    if (String(req.session.user.id) === String(userId)) {
      return res.send("❌ You cannot change your own role.");
    }

    const user = await User.findById(userId);
    if (!user) return res.send("❌ User not found");

    if (user.role === "superadmin") {
      return res.send("❌ Cannot change SuperAdmin role.");
    }

    user.role = "user";
    await user.save();

    res.redirect("/admin/users");
  } catch (err) {
    console.log(err);
    res.send("❌ Error removing admin");
  }
});

// ✅ ADMIN DONATIONS LIST + FILTER
app.get("/admin/donations", isAdminOrSuper, async (req, res) => {
  const status = req.query.status || "ALL";

  let filter = {};
  if (status !== "ALL") {
    filter.status = status;
  }

  const donations = await Donation.find(filter)
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  res.render("admin_donations", {
    donations,
    selectedStatus: status,
  });
});

// ✅ ADMIN CHARTS
app.get("/admin/charts", isAdminOrSuper, async (req, res) => {
  const adminData = await User.findById(req.session.user.id);

  function getStartDate(days) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async function getDailyTotals(days) {
    const startDate = getStartDate(days);

    const data = await Donation.aggregate([
      { $match: { status: "SUCCESS", createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const labels = [];
    const totalsMap = {};

    data.forEach((x) => {
      totalsMap[x._id] = x.total;
    });

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");

      labels.push(`${yyyy}-${mm}-${dd}`);
    }

    const totals = labels.map((day) => totalsMap[day] || 0);
    return { labels, totals };
  }

  const last7 = await getDailyTotals(7);
  const last30 = await getDailyTotals(30);

  res.render("admin_charts", {
    admin: adminData,
    last7,
    last30,
  });
});

/* ==========================================================
   ✅ CSV EXPORT ROUTES
   ========================================================== */

app.get("/admin/export/users", isAdminOrSuper, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });

  let csv = "Name,Email,Phone,Role,CreatedAt\n";

  users.forEach((u) => {
    csv += `"${u.name}","${u.email}","${u.phone}","${u.role}","${u.createdAt}"\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=users.csv");
  res.send(csv);
});

app.get("/admin/export/donations", isAdminOrSuper, async (req, res) => {
  const donations = await Donation.find()
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  let csv = "OrderID,UserEmail,Amount,Currency,Status,CreatedAt\n";

  donations.forEach((d) => {
    const email = d.userId?.email || "Unknown";
    csv += `"${d.orderId}","${email}","${d.amount}","${d.currency}","${d.status}","${d.createdAt}"\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=donations.csv");
  res.send(csv);
});

// ✅ Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ✅ Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
