const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./db");
const { User, Leave } = require("./user");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

connectDB();

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Register an employee
app.post("/api/users", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required"
      });
    }

    const user = await User.create({ name, email });

    res.status(201).json({
      message: "Employee registered successfully",
      user
    });
  } catch (error) {
    res.status(400).json({
      message: error.code === 11000
        ? "Email already registered"
        : error.message
    });
  }
});

// Get all employees
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Apply for leave
app.post("/api/leaves", async (req, res) => {
  try {
    const { userId, leaveType, startDate, endDate, reason } = req.body;

    if (!userId || !leaveType || !startDate ||
        !endDate || !reason) {
      return res.status(400).json({
        message: "Please fill in all fields"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      return res.status(400).json({
        message: "Please enter valid leave dates"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "Employee not found"
      });
    }

    const leave = await Leave.create({
      user: userId,
      leaveType,
      startDate: start,
      endDate: end,
      reason
    });

    res.status(201).json({
      message: "Leave application submitted successfully",
      leave
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// View all leave applications
app.get("/api/leaves", async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve or reject a leave application
app.patch("/api/leaves/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Approved or Rejected"
      });
    }

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate("user", "name email");

    if (!leave) {
      return res.status(404).json({
        message: "Leave application not found"
      });
    }

    res.json({
      message: `Leave ${status.toLowerCase()} successfully`,
      leave
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
