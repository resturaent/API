const express = require("express");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const dotenv = require("dotenv");

// ==================== IMPORT EXISTING ROUTES ====================
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const contactMessageRoutes = require("./routes/contactMessageRoutes");
const termsRoutes = require("./routes/termsAndConditionsRoutes");
const privacyRoutes = require("./routes/privacyPolicyRoutes");

// ==================== IMPORT RESTAURANT MANAGEMENT ROUTES ====================
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const tableRoutes = require("./routes/tableRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const reportRoutes = require("./routes/reportRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  process.env.CLIENT_URL,
  process.env.DASHBOARD_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ==================== SESSION CONFIGURATION ====================
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ==================== EXISTING ROUTES ====================
app.use("/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api", contactMessageRoutes);
app.use("/api/terms", termsRoutes);
app.use("/api/privacy-policy", privacyRoutes);

// ==================== RESTAURANT MANAGEMENT ROUTES ====================
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reports", reportRoutes);

// ==================== ROOT ROUTE ====================
app.get("/", (req, res) => {
  res.json({
    message: "🍽️ Restaurant Management System API",
    status: "Server is running!",
    version: "1.0.0",
    endpoints: {
      // Authentication & User Management
      auth: "/auth",
      users: "/api/users",
      contact: "/api/create/contact-messages",
      terms: "/api/terms",
      privacy: "/api/privacy-policy",

      // Restaurant Management System
      categories: "/api/categories",
      products: "/api/products",
      tables: "/api/tables",
      orders: "/api/orders",
      payments: "/api/payments",
      employees: "/api/employees",
      inventory: "/api/inventory",
      reports: "/api/reports",
    },
    documentation: {
      categories: "GET /api/categories - List all categories",
      products: "GET /api/products - List all products",
      tables: "GET /api/tables - List all tables",
      orders: "GET /api/orders - List all orders",
      payments: "GET /api/payments - List all payments",
      employees: "GET /api/employees - List all employees",
      inventory: "GET /api/inventory/logs - View inventory logs",
      reports: "GET /api/reports/daily-sales - Daily sales report",
    },
  });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    requestedPath: req.path,
  });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);

  // CORS errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy: This origin is not allowed",
    });
  }

  // General errors
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📍 API Documentation: http://localhost:${PORT}/`);
  console.log(`\n✅ Available Routes:`);
  console.log(`   - Authentication: http://localhost:${PORT}/auth`);
  console.log(`   - Categories:     http://localhost:${PORT}/api/categories`);
  console.log(`   - Products:       http://localhost:${PORT}/api/products`);
  console.log(`   - Tables:         http://localhost:${PORT}/api/tables`);
  console.log(`   - Orders:         http://localhost:${PORT}/api/orders`);
  console.log(`   - Payments:       http://localhost:${PORT}/api/payments`);
  console.log(`   - Employees:      http://localhost:${PORT}/api/employees`);
  console.log(`   - Inventory:      http://localhost:${PORT}/api/inventory`);
  console.log(`   - Reports:        http://localhost:${PORT}/api/reports`);
});

module.exports = app;
