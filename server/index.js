const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { initDB, getPool } = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const {
  JWT_SECRET,
  authenticateToken,
  requireAdmin,
  requestLogger,
} = require("./middleware/auth");

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(requestLogger);

// Helper: Generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "30d" },
  );
}

// Helper: Format User object for client
function formatUser(row) {
  return {
    id: String(row.id),
    name: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.username || "User",
    fullName: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.username || "User",
    email: row.email,
    role: row.role || "user",
    username: row.username || "",
    phoneNumber: row.phone_number || "",
    gender: row.gender || "",
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    avatarUrl: row.avatar_url || "",
  };
}

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// 0. Root & API landing page
app.get(["/", "/api"], (req, res) => {
  res.json({
    status: "ok",
    message: "Welcome to Local Farm MySQL API Server",
    database: "localfarm (MySQL)",
    endpoints: {
      health: "GET /api/health",
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      me: "GET /api/auth/me",
      updateProfile: "PUT /api/auth/profile",
      forgotPassword: "POST /api/auth/forgot-password",
      verifyOtp: "POST /api/auth/verify-otp",
      resetPassword: "POST /api/auth/reset-password",
      adminUsers: "GET /api/admin/users",
    },
  });
});

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Local Farm MySQL API running" });
});

// 2. Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      name,
      username,
      phoneNumber,
      gender,
      role,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const pool = getPool();

    // Check if email already exists
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()],
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "An account with this email already exists." });
    }

    // Check if username already exists (if provided)
    if (username) {
      const [existingUser] = await pool.query(
        "SELECT id FROM users WHERE username = ? LIMIT 1",
        [username.trim()],
      );
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "This username is already taken." });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const fName = (firstName || "").trim();
    const lName = (lastName || "").trim();
    const fullName = (name || `${fName} ${lName}`.trim() || username || "").trim();
    const userRole = role === "admin" || email.toLowerCase().includes("admin") ? "admin" : "user";

    const [result] = await pool.query(
      `INSERT INTO users (first_name, last_name, full_name, username, email, password, phone_number, gender, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fName,
        lName,
        fullName,
        username ? username.trim() : null,
        email.trim().toLowerCase(),
        hashedPassword,
        phoneNumber ? phoneNumber.trim() : null,
        gender || null,
        userRole,
      ],
    );

    const newUserId = result.insertId;
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [newUserId]);
    const user = formatUser(rows[0]);
    const token = generateToken(user);

    res.status(201).json({
      message: "User registered successfully",
      user,
      token,
    });
  } catch (err) {
    console.error("[Register Error]", err);
    res.status(500).json({ message: err.message || "Failed to register user." });
  }
});

// 3. Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()],
    );

    if (rows.length === 0) {
      return res.status(400).json({
        message: "No account found with this email. Please check your email or sign up.",
      });
    }

    const userRow = rows[0];

    // Check password (supports bcrypt and plain text fallback for dev seeds)
    let isMatch = false;
    if (userRow.password.startsWith("$2a$") || userRow.password.startsWith("$2b$") || userRow.password.startsWith("$2y$")) {
      isMatch = await bcrypt.compare(password, userRow.password);
    } else {
      isMatch = password === userRow.password;
    }

    if (!isMatch) {
      return res.status(400).json({
        message: "Incorrect password. Please check your password and try again.",
      });
    }

    const user = formatUser(userRow);
    const token = generateToken(user);

    res.json({
      message: "Login successful",
      user,
      token,
    });
  } catch (err) {
    console.error("[Login Error]", err);
    res.status(500).json({ message: err.message || "Failed to sign in." });
  }
});

// 4. Get Current User Profile (Me)
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({
      user: formatUser(rows[0]),
    });
  } catch (err) {
    console.error("[Me Error]", err);
    res.status(500).json({ message: err.message || "Failed to fetch user." });
  }
});

// 4.5 Update User Profile (Logged in user - supports PUT and POST)
const profileUpdateHandler = async (req, res) => {
  try {
    const {
      name,
      fullName,
      firstName,
      lastName,
      username,
      phoneNumber,
      gender,
      avatarUrl,
    } = req.body;

    const pool = getPool();
    const userId = req.user.id;

    // Check if username is being changed and if it's already taken by someone else
    if (username) {
      const [existing] = await pool.query(
        "SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1",
        [username.trim(), userId]
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: "This username is already taken by another user." });
      }
    }

    const [currentRows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
    if (currentRows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const current = currentRows[0];
    const newFullName = (fullName || name || `${firstName || current.first_name || ""} ${lastName || current.last_name || ""}`).trim() || current.full_name;
    const newFirstName = firstName !== undefined ? firstName.trim() : current.first_name;
    const newLastName = lastName !== undefined ? lastName.trim() : current.last_name;
    const newUsername = username !== undefined ? username.trim() : current.username;
    const newPhoneNumber = phoneNumber !== undefined ? phoneNumber.trim() : current.phone_number;
    const newGender = gender !== undefined ? gender : current.gender;
    const newAvatarUrl = avatarUrl !== undefined ? avatarUrl : current.avatar_url;

    await pool.query(
      `UPDATE users
       SET full_name = ?, first_name = ?, last_name = ?, username = ?, phone_number = ?, gender = ?, avatar_url = ?
       WHERE id = ?`,
      [
        newFullName,
        newFirstName,
        newLastName,
        newUsername,
        newPhoneNumber,
        newGender,
        newAvatarUrl,
        userId,
      ]
    );

    const [updatedRows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
    const updatedUser = formatUser(updatedRows[0]);

    res.json({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("[Update Profile Error]", err);
    res.status(500).json({ message: err.message || "Failed to update profile." });
  }
};

app.put(["/api/auth/profile", "/api/user/profile", "/api/users/profile", "/auth/profile", "/user/profile"], authenticateToken, profileUpdateHandler);
app.post(["/api/auth/profile", "/api/user/profile", "/api/users/profile", "/auth/profile", "/user/profile"], authenticateToken, profileUpdateHandler);

// 5. Send Forgot Password OTP
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const pool = getPool();
    const [rows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email.trim().toLowerCase()]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No account found with this email." });
    }

    // Generate 6-digit random code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await pool.query(
      "INSERT INTO otps (email, otp, type, expires_at) VALUES (?, ?, 'recovery', ?)",
      [email.trim().toLowerCase(), otp, expiresAt],
    );

    console.log(`[OTP Generated] Email: ${email}, OTP: ${otp}`);

    res.json({
      message: "OTP code sent successfully.",
      devOtp: otp,
    });
  } catch (err) {
    console.error("[Forgot Password Error]", err);
    res.status(500).json({ message: err.message || "Failed to send reset code." });
  }
});

// 6. Verify OTP
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP code are required." });
    }

    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT * FROM otps WHERE email = ? AND otp = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
      [email.trim().toLowerCase(), otp.trim()],
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP code." });
    }

    res.json({ message: "OTP verified successfully." });
  } catch (err) {
    console.error("[Verify OTP Error]", err);
    res.status(500).json({ message: err.message || "Failed to verify OTP." });
  }
});

// 7. Reset Password
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and new password are required." });
    }

    const pool = getPool();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      "UPDATE users SET password = ? WHERE email = ?",
      [hashedPassword, email.trim().toLowerCase()],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("[Reset Password Error]", err);
    res.status(500).json({ message: err.message || "Failed to reset password." });
  }
});

// 8. Admin: List all users (Requires Admin)
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, first_name, last_name, full_name, username, email, phone_number, gender, role, created_at FROM users ORDER BY id DESC"
    );
    res.json({ users: rows });
  } catch (err) {
    console.error("[Admin Users Error]", err);
    res.status(500).json({ message: err.message || "Failed to fetch users." });
  }
});

// 9. Admin: Update user role (Requires Admin)
app.put("/api/admin/users/:id/role", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'user' or 'admin'." });
    }
    const pool = getPool();
    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    res.json({ message: `User ${id} role updated to ${role}` });
  } catch (err) {
    console.error("[Admin Update Role Error]", err);
    res.status(500).json({ message: err.message || "Failed to update role." });
  }
});

// 10. Change Password (Authenticated user - requires previous password verification)
const changePasswordHandler = async (req, res) => {
  try {
    const { currentPassword, previousPassword, oldPassword, newPassword, password } = req.body;
    const currentPass = currentPassword || previousPassword || oldPassword;
    const targetPassword = newPassword || password;

    if (!currentPass) {
      return res.status(400).json({ message: "Please enter your current password." });
    }

    if (!targetPassword || targetPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long." });
    }

    const pool = getPool();
    const userId = req.user.id;

    // Fetch existing user to verify previous password
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const userRow = rows[0];

    // Check previous password
    let isMatch = false;
    if (userRow.password.startsWith("$2a$") || userRow.password.startsWith("$2b$") || userRow.password.startsWith("$2y$")) {
      isMatch = await bcrypt.compare(currentPass, userRow.password);
    } else {
      isMatch = currentPass === userRow.password;
    }

    if (!isMatch) {
      return res.status(400).json({
        message: "Incorrect current password. Please verify and try again.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(targetPassword, salt);

    await pool.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, userId]
    );

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("[Change Password Error]", err);
    res.status(500).json({ message: err.message || "Failed to change password." });
  }
};

app.put(["/api/auth/change-password", "/api/user/change-password", "/auth/change-password", "/user/change-password"], authenticateToken, changePasswordHandler);
app.post(["/api/auth/change-password", "/api/user/change-password", "/auth/change-password", "/user/change-password"], authenticateToken, changePasswordHandler);

// -----------------------------------------------------------------------------
// 11. CONNECTIONS / FRIENDS API
// -----------------------------------------------------------------------------

// 11.1 Get Connection Requests (Incoming Pending Requests Only)
app.get(
  ["/api/connections/requests", "/api/friends/requests", "/api/connections"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const [rows] = await pool.query(
        `SELECT c.id AS connection_id, c.status, c.created_at,
                u.id AS user_id, u.full_name, u.first_name, u.last_name, u.username, u.avatar_url, u.role
         FROM connections c
         JOIN users u ON c.sender_id = u.id
         WHERE c.receiver_id = ? AND c.status = 'pending'
         ORDER BY c.id DESC`,
        [userId]
      );

      const requests = rows.map((row) => ({
        id: String(row.connection_id),
        userId: String(row.user_id),
        name: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.username || "User",
        username: row.username || "",
        avatarUrl: row.avatar_url || "",
        mutualFriends: "12 mutual friends",
        timeAgo: "1hr",
        status: row.status,
      }));

      res.json({ requests, count: requests.length });
    } catch (err) {
      console.error("[Get Requests Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch connection requests." });
    }
  }
);

// 11.1b Get Suggestions (Users not connected yet)
app.get(
  ["/api/connections/suggestions", "/api/friends/suggestions"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const [rows] = await pool.query(
        `SELECT u.id, u.full_name, u.first_name, u.last_name, u.username, u.avatar_url, u.role
         FROM users u
         WHERE u.id != ?
           AND u.id NOT IN (
             SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
             FROM connections
             WHERE (sender_id = ? OR receiver_id = ?) AND status IN ('pending', 'accepted', 'blocked')
           )
         ORDER BY u.id DESC
         LIMIT 20`,
        [userId, userId, userId, userId]
      );

      const suggestions = rows.map((r) => ({
        id: String(r.id),
        name: r.full_name || `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.username || "User",
        username: r.username || "",
        avatarUrl: r.avatar_url || "",
        mutualFriends: "Local Farm member",
      }));

      res.json({ suggestions, count: suggestions.length });
    } catch (err) {
      console.error("[Get Suggestions Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch suggestions." });
    }
  }
);

// 11.1c Get Sent Pending Requests
app.get(
  ["/api/connections/sent", "/api/friends/sent"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const [rows] = await pool.query(
        `SELECT c.id AS connection_id, c.status, c.created_at,
                u.id AS user_id, u.full_name, u.first_name, u.last_name, u.username, u.avatar_url
         FROM connections c
         JOIN users u ON c.receiver_id = u.id
         WHERE c.sender_id = ? AND c.status = 'pending'
         ORDER BY c.id DESC`,
        [userId]
      );

      const sentRequests = rows.map((row) => ({
        id: String(row.connection_id),
        userId: String(row.user_id),
        name: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.username || "User",
        username: row.username || "",
        avatarUrl: row.avatar_url || "",
        friendsCount: "Local Farm member",
        timeAgo: "Recently",
      }));

      res.json({ sentRequests, count: sentRequests.length });
    } catch (err) {
      console.error("[Get Sent Requests Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch sent requests." });
    }
  }
);

// 11.2 Respond to Connection Request (Confirm / Decline)
app.post(
  ["/api/connections/respond", "/api/connections/:id/respond", "/api/friends/respond"],
  authenticateToken,
  async (req, res) => {
    try {
      const connectionId = req.params.id || req.body.connectionId || req.body.id;
      const action = (req.body.action || req.body.status || "confirm").toLowerCase();
      const newStatus = action === "confirm" || action === "accepted" ? "accepted" : "declined";

      if (!connectionId) {
        return res.status(400).json({ message: "Connection ID is required." });
      }

      const pool = getPool();
      const userId = req.user.id;

      const [result] = await pool.query(
        "UPDATE connections SET status = ? WHERE id = ? AND receiver_id = ?",
        [newStatus, connectionId, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Connection request not found or unauthorized." });
      }

      res.json({
        message: newStatus === "accepted" ? "Connection request confirmed!" : "Connection request declined.",
        status: newStatus,
      });
    } catch (err) {
      console.error("[Respond Request Error]", err);
      res.status(500).json({ message: err.message || "Failed to respond to connection request." });
    }
  }
);

// 11.3 Get Confirmed Friends
app.get(
  ["/api/connections/friends", "/api/friends"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const collectionFilter = (req.query.collection || "").trim();

      let sql = `SELECT c.id AS connection_id, c.created_at, c.collection_name,
                u.id AS user_id, u.full_name, u.first_name, u.last_name, u.username, u.avatar_url
         FROM connections c
         JOIN users u ON (CASE WHEN c.sender_id = ? THEN c.receiver_id = u.id ELSE c.sender_id = u.id END)
         WHERE (c.sender_id = ? OR c.receiver_id = ?) AND c.status = 'accepted'`;
      const params = [userId, userId, userId];

      if (collectionFilter && collectionFilter !== "All Connections") {
        sql += ` AND c.collection_name = ?`;
        params.push(collectionFilter);
      }

      sql += ` ORDER BY c.updated_at DESC`;

      const [rows] = await pool.query(sql, params);

      const friends = rows.map((row) => ({
        id: String(row.user_id),
        connectionId: String(row.connection_id),
        name: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.username || "User",
        username: row.username || "",
        avatarUrl: row.avatar_url || "",
        collectionName: row.collection_name || "All Connections",
        hasMutual: true,
      }));

      res.json({ friends, count: friends.length });
    } catch (err) {
      console.error("[Get Friends Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch friends." });
    }
  }
);

// 11.4 Search Users to Connect with Status
app.get(
  ["/api/connections/search", "/api/users/search"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;
      const query = (req.query.q || req.query.query || "").trim();

      if (!query) {
        return res.json({ users: [] });
      }

      const searchPattern = `%${query}%`;
      const [rows] = await pool.query(
        `SELECT u.id, u.first_name, u.last_name, u.full_name, u.username, u.avatar_url, u.role,
                c.id AS connection_id, c.sender_id, c.receiver_id, c.status AS connection_status
         FROM users u
         LEFT JOIN connections c ON (
           (c.sender_id = ? AND c.receiver_id = u.id) OR
           (c.receiver_id = ? AND c.sender_id = u.id)
         )
         WHERE u.id != ? AND (
           u.full_name LIKE ? OR
           u.first_name LIKE ? OR
           u.last_name LIKE ? OR
           u.username LIKE ? OR
           u.email LIKE ?
         )
         ORDER BY u.full_name ASC
         LIMIT 20`,
        [userId, userId, userId, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]
      );

      const users = rows.map((row) => {
        let relationship = "none";
        if (row.connection_status === "accepted") {
          relationship = "accepted";
        } else if (row.connection_status === "pending") {
          relationship = row.sender_id === userId ? "pending_sent" : "pending_received";
        } else if (row.connection_status === "declined") {
          relationship = "none";
        }

        return {
          id: String(row.id),
          connectionId: row.connection_id ? String(row.connection_id) : null,
          name: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.username || "User",
          username: row.username || "",
          avatarUrl: row.avatar_url || "",
          role: row.role || "user",
          relationship, // 'none' | 'pending_sent' | 'pending_received' | 'accepted'
        };
      });

      res.json({ users, count: users.length });
    } catch (err) {
      console.error("[Search Users Error]", err);
      res.status(500).json({ message: err.message || "Failed to search users." });
    }
  }
);

// 11.5 Send Connection / Friend Request
app.post(
  ["/api/connections/send", "/api/connections/request", "/api/friends/request"],
  authenticateToken,
  async (req, res) => {
    try {
      const targetUserId = req.body.targetUserId || req.body.receiverId || req.body.userId;

      if (!targetUserId) {
        return res.status(400).json({ message: "Target user ID is required." });
      }

      const pool = getPool();
      const senderId = req.user.id;

      if (String(senderId) === String(targetUserId)) {
        return res.status(400).json({ message: "You cannot send a friend request to yourself." });
      }

      // Check if connection already exists
      const [existing] = await pool.query(
        "SELECT * FROM connections WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
        [senderId, targetUserId, targetUserId, senderId]
      );

      if (existing.length > 0) {
        const conn = existing[0];
        if (conn.status === "accepted") {
          return res.status(400).json({ message: "You are already friends." });
        }
        if (conn.status === "pending") {
          return res.status(400).json({ message: "Friend request is already pending." });
        }
        // Update to pending if it was previously declined
        await pool.query(
          "UPDATE connections SET sender_id = ?, receiver_id = ?, status = 'pending' WHERE id = ?",
          [senderId, targetUserId, conn.id]
        );
        return res.json({ message: "Friend request sent!", connectionId: String(conn.id), relationship: "pending_sent" });
      }

      const [insertRes] = await pool.query(
        "INSERT INTO connections (sender_id, receiver_id, status) VALUES (?, ?, 'pending')",
        [senderId, targetUserId]
      );

      res.json({
        message: "Friend request sent successfully!",
        connectionId: String(insertRes.insertId),
        relationship: "pending_sent",
      });
    } catch (err) {
      console.error("[Send Friend Request Error]", err);
      res.status(500).json({ message: err.message || "Failed to send friend request." });
    }
  }
);

// 11.6 Cancel Sent Request
app.post(
  ["/api/connections/cancel"],
  authenticateToken,
  async (req, res) => {
    try {
      const targetUserId = req.body.targetUserId || req.body.userId;
      const connectionId = req.body.connectionId;

      const pool = getPool();
      const senderId = req.user.id;

      if (connectionId) {
        await pool.query(
          "DELETE FROM connections WHERE id = ? AND sender_id = ? AND status = 'pending'",
          [connectionId, senderId]
        );
      } else if (targetUserId) {
        await pool.query(
          "DELETE FROM connections WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'",
          [senderId, targetUserId]
        );
      }

      res.json({ message: "Friend request canceled.", relationship: "none" });
    } catch (err) {
      console.error("[Cancel Friend Request Error]", err);
      res.status(500).json({ message: err.message || "Failed to cancel request." });
    }
  }
);

// -----------------------------------------------------------------------------
// 11.7 GET Connection Collections (unique collection names for user)
// -----------------------------------------------------------------------------
app.get(
  ["/api/connections/collections"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const [rows] = await pool.query(
        `SELECT DISTINCT collection_name
         FROM connections
         WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'
         ORDER BY collection_name ASC`,
        [userId, userId]
      );

      const collections = rows.map((r) => r.collection_name);
      if (!collections.includes("All Connections")) {
        collections.unshift("All Connections");
      }

      res.json({ collections });
    } catch (err) {
      console.error("[Get Connection Collections Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch collections." });
    }
  }
);

// -----------------------------------------------------------------------------
// 11.8 PUT Update Connection Collection (categorize a friend)
// -----------------------------------------------------------------------------
app.put(
  ["/api/connections/:id/collection"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;
      const connectionId = req.params.id;
      const { collectionName } = req.body;

      if (!collectionName || !collectionName.trim()) {
        return res.status(400).json({ message: "Collection name is required." });
      }

      const trimmed = collectionName.trim();

      const [existing] = await pool.query(
        `SELECT id FROM connections
         WHERE id = ? AND (sender_id = ? OR receiver_id = ?) AND status = 'accepted'`,
        [connectionId, userId, userId]
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: "Connection not found or not accepted." });
      }

      await pool.query(
        "UPDATE connections SET collection_name = ? WHERE id = ?",
        [trimmed, connectionId]
      );

      res.json({ message: `Categorized as "${trimmed}".`, collectionName: trimmed });
    } catch (err) {
      console.error("[Update Connection Collection Error]", err);
      res.status(500).json({ message: err.message || "Failed to update collection." });
    }
  }
);

// -----------------------------------------------------------------------------
// 12. CHATS / MESSAGING API
// -----------------------------------------------------------------------------

// 12.1 Get Active Users for top story carousel (Only accepted friends)
app.get(
  ["/api/chats/active-users", "/api/users/active"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const [rows] = await pool.query(
        `SELECT DISTINCT u.id, u.full_name, u.first_name, u.last_name, u.username, u.avatar_url
         FROM connections c
         JOIN users u ON (CASE WHEN c.sender_id = ? THEN c.receiver_id = u.id ELSE c.sender_id = u.id END)
         WHERE (c.sender_id = ? OR c.receiver_id = ?) AND c.status = 'accepted'
         ORDER BY u.full_name ASC
         LIMIT 20`,
        [userId, userId, userId]
      );

      const users = rows.map((r) => ({
        id: String(r.id),
        name: (r.first_name || r.full_name || r.username || "User").split(" ")[0],
        fullName: r.full_name || `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.username || "User",
        avatarUrl: r.avatar_url || "",
        isOnline: true,
      }));

      res.json({ users });
    } catch (err) {
      console.error("[Active Users Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch active users." });
    }
  }
);

// 12.2 Get Conversations List (Based on conversation_id, user1_id, user2_id)
app.get(
  ["/api/chats/conversations", "/api/chats"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const [rows] = await pool.query(
        `SELECT c.id AS conversation_id, c.last_message, c.last_message_time,
                u.id AS other_user_id, u.full_name, u.first_name, u.last_name, u.username, u.avatar_url,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.receiver_id = ? AND m.is_read = 0) AS unread_count,
                (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_sender_id
         FROM conversations c
         JOIN users u ON (CASE WHEN c.user1_id = ? THEN c.user2_id = u.id ELSE c.user1_id = u.id END)
         WHERE c.user1_id = ? OR c.user2_id = ?
         ORDER BY c.last_message_time DESC`,
        [userId, userId, userId, userId]
      );

      const conversations = rows.map((row) => {
        const isMeSender = row.last_sender_id === userId;
        let snippet = row.last_message || "";
        if (isMeSender && snippet) {
          snippet = `You: ${snippet}`;
        }

        // Format time
        let timeStr = "Now";
        if (row.last_message_time) {
          const d = new Date(row.last_message_time);
          const hours = d.getHours();
          const minutes = d.getMinutes().toString().padStart(2, "0");
          const ampm = hours >= 12 ? "PM" : "AM";
          const formattedHours = hours % 12 || 12;
          timeStr = `${formattedHours}:${minutes} ${ampm}`;
        }

        return {
          id: String(row.conversation_id),
          otherUserId: String(row.other_user_id),
          name: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.username || "User",
          username: row.username || "",
          avatarUrl: row.avatar_url || "",
          snippet,
          time: timeStr,
          unread: Number(row.unread_count) || 0,
          online: true,
        };
      });

      res.json({ conversations, count: conversations.length });
    } catch (err) {
      console.error("[Get Conversations Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch conversations." });
    }
  }
);

// 12.3 Get Messages (Strictly based on conversation_id, sender_id, receiver_id)
app.get(
  ["/api/chats/messages", "/api/chats/conversations/:id/messages"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;
      const conversationId = req.params.id || req.query.conversationId;
      const otherUserId = req.query.userId || req.query.otherUserId;

      let convId = conversationId;

      if (!convId && otherUserId) {
        const u1 = Math.min(userId, Number(otherUserId));
        const u2 = Math.max(userId, Number(otherUserId));
        const [existing] = await pool.query(
          "SELECT id FROM conversations WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)",
          [u1, u2, u2, u1]
        );
        if (existing.length > 0) {
          convId = existing[0].id;
        }
      }

      // Mark incoming messages as read for this conversation or sender
      if (convId) {
        await pool.query(
          "UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0",
          [convId, userId]
        );
      } else if (otherUserId) {
        await pool.query(
          "UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0",
          [otherUserId, userId]
        );
      }

      let rows = [];
      if (convId) {
        [rows] = await pool.query(
          `SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.message_text,
                  m.message_type, m.image_url, m.is_read, m.created_at,
                  u.avatar_url, u.full_name
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.conversation_id = ?
           ORDER BY m.id ASC`,
          [convId]
        );
      } else if (otherUserId) {
        [rows] = await pool.query(
          `SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.message_text,
                  m.message_type, m.image_url, m.is_read, m.created_at,
                  u.avatar_url, u.full_name
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
           ORDER BY m.id ASC`,
          [userId, otherUserId, otherUserId, userId]
        );
      }

      const messages = rows.map((m) => {
        const isUser = Number(m.sender_id) === Number(userId);
        const d = new Date(m.created_at);
        const hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 || 12;
        const timeStr = `${formattedHours}:${minutes} ${ampm}`;

        return {
          id: String(m.id),
          conversationId: String(m.conversation_id || convId || ""),
          sender: isUser ? "user" : "other",
          senderId: String(m.sender_id),
          receiverId: String(m.receiver_id),
          type: m.message_type || "text",
          text: m.message_text,
          imageUrl: m.image_url,
          avatarUrl: m.avatar_url,
          time: timeStr,
          isSeen: Boolean(m.is_read),
        };
      });

      res.json({ messages, conversationId: convId ? String(convId) : null });
    } catch (err) {
      console.error("[Get Messages Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch messages." });
    }
  }
);

// 12.4 Send Message
app.post(
  ["/api/chats/messages", "/api/chats/send"],
  authenticateToken,
  async (req, res) => {
    try {
      const { receiverId, conversationId, messageText, messageType, imageUrl } = req.body;
      const text = (messageText || "").trim();

      if (!text && !imageUrl) {
        return res.status(400).json({ message: "Message content or image is required." });
      }

      const pool = getPool();
      const senderId = req.user.id;

      let targetReceiverId = receiverId;
      let convId = conversationId;

      if (!targetReceiverId && convId) {
        const [convRows] = await pool.query(
          "SELECT user1_id, user2_id FROM conversations WHERE id = ?",
          [convId]
        );
        if (convRows.length > 0) {
          targetReceiverId = convRows[0].user1_id === senderId ? convRows[0].user2_id : convRows[0].user1_id;
        }
      }

      if (!targetReceiverId) {
        return res.status(400).json({ message: "Receiver ID is required." });
      }

      // Find or create conversation
      const u1 = Math.min(senderId, Number(targetReceiverId));
      const u2 = Math.max(senderId, Number(targetReceiverId));

      const [convCheck] = await pool.query(
        "SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?",
        [u1, u2]
      );

      if (convCheck.length > 0) {
        convId = convCheck[0].id;
        await pool.query(
          "UPDATE conversations SET last_message = ?, last_message_time = NOW() WHERE id = ?",
          [text || (imageUrl ? "Sent an image" : "Sent a message"), convId]
        );
      } else {
        const [cInsert] = await pool.query(
          "INSERT INTO conversations (user1_id, user2_id, last_message, last_message_time) VALUES (?, ?, ?, NOW())",
          [u1, u2, text || (imageUrl ? "Sent an image" : "Sent a message")]
        );
        convId = cInsert.insertId;
      }

      // Insert message
      const [mInsert] = await pool.query(
        "INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text, message_type, image_url, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)",
        [convId, senderId, targetReceiverId, text, messageType || "text", imageUrl || null]
      );

      const d = new Date();
      const hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12;
      const timeStr = `${formattedHours}:${minutes} ${ampm}`;

      const createdMessage = {
        id: String(mInsert.insertId),
        conversationId: String(convId),
        sender: "user",
        senderId: String(senderId),
        receiverId: String(targetReceiverId),
        type: messageType || "text",
        text,
        imageUrl: imageUrl || null,
        time: timeStr,
        isSeen: false,
      };

      res.status(201).json({ message: "Message sent!", data: createdMessage });
    } catch (err) {
      console.error("[Send Message Error]", err);
      res.status(500).json({ message: err.message || "Failed to send message." });
    }
  }
);

// -----------------------------------------------------------------------------
// 13. BADGE COUNTS API
// -----------------------------------------------------------------------------
app.get(
  ["/api/notifications/badge-counts", "/api/badges"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const [[connRes]] = await pool.query(
        "SELECT COUNT(*) AS count FROM connections WHERE receiver_id = ? AND status = 'pending'",
        [userId]
      );

      const [[msgRes]] = await pool.query(
        "SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND is_read = 0",
        [userId]
      );

      res.json({
        requestsCount: Number(connRes?.count) || 0,
        unreadMessagesCount: Number(msgRes?.count) || 0,
      });
    } catch (err) {
      console.error("[Badge Counts Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch badge counts." });
    }
  }
);

// -----------------------------------------------------------------------------
// 14. POSTS & NEWSFEED API
// -----------------------------------------------------------------------------

function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    req.user = err ? null : user;
    next();
  });
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return "Just now";
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

async function ensureSamplePosts(pool) {
  try {
    const [rows] = await pool.query("SELECT id FROM posts LIMIT 1");
    if (rows.length === 0) {
      const [users] = await pool.query("SELECT id FROM users LIMIT 3");
      const u1 = users[0]?.id || 1;
      const u2 = users[1]?.id || u1;

      await pool.query(
        `INSERT INTO posts (user_id, content, image_url, category, privacy, location, likes_count, comments_count, shares_count)
         VALUES
         (?, 'Mga suki! Naa tay presko ug tam-is nga apple karon.🍎 Puno sa vitamins ug perfect para sa tibuok pamilya!', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80', 'Wholesaler', 'Public', 'Iligan City, Philippines', 142, 22, 55),
         (?, 'Mga suki! Naa tay presko nga durian karon. Puno sa vitamins ug perfect para sa tibuok pamilya!', 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=800&q=80', 'Temporary', 'Public', 'Iligan City, Philippines', 289, 41, 18)`,
        [u1, u2]
      );
    }
  } catch (e) {
    console.warn("ensureSamplePosts error:", e.message);
  }
}

// 14.1.0 Get Saved / Bookmarked Posts
app.get(
  "/api/posts/saved",
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const [rows] = await pool.query(
        `SELECT sp.id AS saved_id, sp.collection_name, sp.created_at AS saved_at,
                p.id, p.user_id, p.original_post_id, p.content, p.image_url, p.category, p.privacy, p.location,
                p.likes_count, p.comments_count, p.shares_count, p.created_at,
                u.full_name, u.first_name, u.last_name, u.username, u.avatar_url, u.role,
                EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS is_liked,
                orig.id AS orig_id, orig.user_id AS orig_user_id, orig.content AS orig_content, orig.image_url AS orig_image_url,
                orig.category AS orig_category, orig.location AS orig_location, orig.created_at AS orig_created_at,
                orig_u.full_name AS orig_author_name, orig_u.first_name AS orig_first_name, orig_u.last_name AS orig_last_name,
                orig_u.username AS orig_username, orig_u.avatar_url AS orig_avatar_url, orig_u.role AS orig_role
         FROM saved_posts sp
         JOIN posts p ON sp.post_id = p.id
         JOIN users u ON p.user_id = u.id
         LEFT JOIN posts orig ON p.original_post_id = orig.id
         LEFT JOIN users orig_u ON orig.user_id = orig_u.id
         WHERE sp.user_id = ?
         ORDER BY sp.created_at DESC`,
        [userId, userId]
      );

      const savedPosts = rows.map((r) => {
        const isShared = Boolean(r.original_post_id && r.orig_id);
        return {
          savedId: String(r.saved_id),
          collectionName: r.collection_name,
          savedAt: formatTimeAgo(r.saved_at),
          id: String(r.id),
          userId: String(r.user_id),
          authorName: r.full_name || `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.username || "Local Farmer",
          authorRole: r.category || (r.role === "admin" ? "Wholesaler" : "Field"),
          avatarUri: r.avatar_url || "",
          location: r.location || "Iligan City, Philippines",
          timeAgo: formatTimeAgo(r.created_at),
          content: r.content,
          imageUrl: r.image_url || "",
          category: r.category,
          privacy: r.privacy,
          likes: Number(r.likes_count) || 0,
          comments: Number(r.comments_count) || 0,
          shares: Number(r.shares_count) || 0,
          isLiked: Boolean(r.is_liked),
          isSaved: true,
          isShared,
          originalPost: isShared
            ? {
                id: String(r.orig_id),
                userId: String(r.orig_user_id),
                authorName: r.orig_author_name || `${r.orig_first_name || ""} ${r.orig_last_name || ""}`.trim() || r.orig_username || "Local Farmer",
                authorRole: r.orig_category || (r.orig_role === "admin" ? "Wholesaler" : "Field"),
                avatarUri: r.orig_avatar_url || "",
                location: r.orig_location || "Iligan City, Philippines",
                timeAgo: formatTimeAgo(r.orig_created_at),
                content: r.orig_content,
                imageUrl: r.orig_image_url || "",
                category: r.orig_category,
              }
            : null,
        };
      });

      res.json({ savedPosts, count: savedPosts.length });
    } catch (err) {
      console.error("[Get Saved Posts Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch saved posts." });
    }
  }
);

// 14.1 Get User's Saved Post Collections
app.get(
  "/api/posts/saved/collections",
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const [rows] = await pool.query(
        `SELECT DISTINCT collection_name
         FROM saved_posts
         WHERE user_id = ?
         ORDER BY collection_name ASC`,
        [userId]
      );

      const collections = rows.map((r) => r.collection_name);
      if (!collections.includes("All Saved")) {
        collections.unshift("All Saved");
      }

      res.json({ collections });
    } catch (err) {
      console.error("[Get Saved Collections Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch collections." });
    }
  }
);

// 14.2 Get News Feed Posts (with category and privacy filtering)
app.get(
  ["/api/posts", "/api/posts/feed"],
  optionalAuthenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const currentUserId = req.user?.id || 0;
      const category = req.query.category;

      await ensureSamplePosts(pool);

      let query = `
        SELECT p.id, p.user_id, p.original_post_id, p.content, p.image_url, p.category, p.privacy, p.location,
               p.likes_count, p.comments_count, p.shares_count, p.created_at,
               u.full_name, u.first_name, u.last_name, u.username, u.avatar_url, u.role,
               EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS is_liked,
               EXISTS(SELECT 1 FROM saved_posts sp WHERE sp.post_id = p.id AND sp.user_id = ?) AS is_saved,
               orig.id AS orig_id, orig.user_id AS orig_user_id, orig.content AS orig_content, orig.image_url AS orig_image_url,
               orig.category AS orig_category, orig.location AS orig_location, orig.created_at AS orig_created_at,
               orig_u.full_name AS orig_author_name, orig_u.first_name AS orig_first_name, orig_u.last_name AS orig_last_name,
               orig_u.username AS orig_username, orig_u.avatar_url AS orig_avatar_url, orig_u.role AS orig_role
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN posts orig ON p.original_post_id = orig.id
        LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      `;

      let whereClauses = [
        `(
          p.privacy = 'Public'
          OR p.user_id = ?
          OR (
            p.privacy = 'Friends'
            AND EXISTS (
              SELECT 1 FROM connections c
              WHERE c.status = 'accepted'
                AND (
                  (c.sender_id = ? AND c.receiver_id = p.user_id)
                  OR
                  (c.sender_id = p.user_id AND c.receiver_id = ?)
                )
            )
          )
        )`
      ];

      const params = [
        currentUserId, // for is_liked
        currentUserId, // for is_saved
        currentUserId, // for p.user_id = ?
        currentUserId, // for friend connection sender
        currentUserId  // for friend connection receiver
      ];

      if (category && category.toLowerCase() !== "all" && category.toLowerCase() !== "general") {
        whereClauses.push("p.category = ?");
        params.push(category);
      }

      if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }

      query += " ORDER BY p.created_at DESC LIMIT 50";

      const [rows] = await pool.query(query, params);

      const posts = rows.map((r) => {
        const isShared = Boolean(r.original_post_id && r.orig_id);
        return {
          id: String(r.id),
          userId: String(r.user_id),
          authorName: r.full_name || `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.username || "Local Farmer",
          authorRole: r.category || (r.role === "admin" ? "Wholesaler" : "Field"),
          avatarUri: r.avatar_url || "",
          location: r.location || "Iligan City, Philippines",
          timeAgo: formatTimeAgo(r.created_at),
          content: r.content,
          imageUrl: r.image_url || "",
          category: r.category,
          privacy: r.privacy,
          likes: Number(r.likes_count) || 0,
          comments: Number(r.comments_count) || 0,
          shares: Number(r.shares_count) || 0,
          isLiked: Boolean(r.is_liked),
          isSaved: Boolean(r.is_saved),
          isShared,
          originalPost: isShared
            ? {
                id: String(r.orig_id),
                userId: String(r.orig_user_id),
                authorName: r.orig_author_name || `${r.orig_first_name || ""} ${r.orig_last_name || ""}`.trim() || r.orig_username || "Local Farmer",
                authorRole: r.orig_category || (r.orig_role === "admin" ? "Wholesaler" : "Field"),
                avatarUri: r.orig_avatar_url || "",
                location: r.orig_location || "Iligan City, Philippines",
                timeAgo: formatTimeAgo(r.orig_created_at),
                content: r.orig_content,
                imageUrl: r.orig_image_url || "",
                category: r.orig_category,
              }
            : null,
        };
      });

      res.json({ posts, count: posts.length });
    } catch (err) {
      console.error("[Get Posts Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch posts." });
    }
  }
);

// 14.2 Create New Post
app.post(
  ["/api/posts", "/api/posts/create"],
  authenticateToken,
  async (req, res) => {
    try {
      const { content, category, privacy, location, photos, imageUrl } = req.body;
      const text = (content || "").trim();

      const chosenImage = imageUrl || (Array.isArray(photos) && photos.length > 0 ? photos[0] : null);

      if (!text && !chosenImage) {
        return res.status(400).json({ message: "Post content or photo is required." });
      }

      const pool = getPool();
      const userId = req.user.id;

      const validCategory = ["Field", "Wholesaler", "Temporary", "General"].includes(category)
        ? category
        : "General";

      const validPrivacy = ["Public", "Friends", "Only me"].includes(privacy)
        ? privacy
        : "Public";

      const postLocation = location || "Iligan City, Philippines";

      const [insertRes] = await pool.query(
        `INSERT INTO posts (user_id, content, image_url, category, privacy, location, likes_count, comments_count, shares_count)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)`,
        [userId, text, chosenImage, validCategory, validPrivacy, postLocation]
      );

      const postId = insertRes.insertId;

      // Fetch user details to return complete post object
      const [[userRow]] = await pool.query(
        "SELECT full_name, first_name, last_name, username, avatar_url, role FROM users WHERE id = ?",
        [userId]
      );

      const newPost = {
        id: String(postId),
        userId: String(userId),
        authorName: userRow?.full_name || `${userRow?.first_name || ""} ${userRow?.last_name || ""}`.trim() || userRow?.username || "Local Farmer",
        authorRole: validCategory || (userRow?.role === "admin" ? "Wholesaler" : "Field"),
        avatarUri: userRow?.avatar_url || "",
        location: postLocation,
        timeAgo: "Just now",
        content: text,
        imageUrl: chosenImage || "",
        category: validCategory,
        privacy: validPrivacy,
        likes: 0,
        comments: 0,
        shares: 0,
        isLiked: false,
      };

      res.status(201).json({ message: "Post created successfully!", post: newPost });
    } catch (err) {
      console.error("[Create Post Error]", err);
      res.status(500).json({ message: err.message || "Failed to create post." });
    }
  }
);

// 14.3 Like / Unlike Post
app.post(
  ["/api/posts/:id/like", "/api/posts/like"],
  authenticateToken,
  async (req, res) => {
    try {
      const postId = req.params.id || req.body.postId || req.body.id;
      if (!postId) {
        return res.status(400).json({ message: "Post ID is required." });
      }

      const pool = getPool();
      const userId = req.user.id;

      const [existing] = await pool.query(
        "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
        [postId, userId]
      );

      let isLiked = false;
      if (existing.length > 0) {
        // Unlike
        await pool.query("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", [postId, userId]);
        await pool.query("UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?", [postId]);
        isLiked = false;
      } else {
        // Like
        await pool.query("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)", [postId, userId]);
        await pool.query("UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?", [postId]);
        isLiked = true;
      }

      const [[postRow]] = await pool.query("SELECT likes_count FROM posts WHERE id = ?", [postId]);

      res.json({
        message: isLiked ? "Post liked!" : "Post unliked.",
        isLiked,
        likesCount: Number(postRow?.likes_count) || 0,
      });
    } catch (err) {
      console.error("[Like Post Error]", err);
      res.status(500).json({ message: err.message || "Failed to like post." });
    }
  }
);

// 14.3.1 Edit Post / Update Privacy / Category
app.put(
  ["/api/posts/:id", "/api/posts/update"],
  authenticateToken,
  async (req, res) => {
    try {
      const postId = req.params.id || req.body.id || req.body.postId;
      const { content, category, privacy } = req.body;
      const pool = getPool();
      const userId = req.user.id;
      const role = req.user.role;

      const [[post]] = await pool.query("SELECT * FROM posts WHERE id = ?", [postId]);
      if (!post) {
        return res.status(404).json({ message: "Post not found." });
      }

      if (Number(post.user_id) !== Number(userId) && role !== "admin") {
        return res.status(403).json({ message: "Unauthorized to modify this post." });
      }

      const validCategory = category && ["Field", "Wholesaler", "Temporary", "General"].includes(category)
        ? category
        : post.category;

      const validPrivacy = privacy && ["Public", "Friends", "Only me"].includes(privacy)
        ? privacy
        : post.privacy;

      const updatedContent = content !== undefined ? content : post.content;

      await pool.query(
        "UPDATE posts SET content = ?, category = ?, privacy = ?, updated_at = NOW() WHERE id = ?",
        [updatedContent, validCategory, validPrivacy, postId]
      );

      res.json({
        message: "Post updated successfully!",
        post: {
          id: String(postId),
          content: updatedContent,
          category: validCategory,
          privacy: validPrivacy,
        },
      });
    } catch (err) {
      console.error("[Update Post Error]", err);
      res.status(500).json({ message: err.message || "Failed to update post." });
    }
  }
);

// 14.3.2 Delete Post or Shared Post
app.delete(
  ["/api/posts/:id", "/api/posts/delete"],
  authenticateToken,
  async (req, res) => {
    try {
      const postId = req.params.id || req.body.id || req.body.postId;
      const pool = getPool();
      const userId = req.user.id;
      const role = req.user.role;

      const [[post]] = await pool.query("SELECT * FROM posts WHERE id = ?", [postId]);
      if (!post) {
        return res.status(404).json({ message: "Post not found." });
      }

      if (Number(post.user_id) !== Number(userId) && role !== "admin") {
        return res.status(403).json({ message: "Unauthorized to delete this post." });
      }

      // If this was a shared post, decrement the original post's shares_count
      if (post.original_post_id) {
        await pool.query(
          "UPDATE posts SET shares_count = GREATEST(0, shares_count - 1) WHERE id = ?",
          [post.original_post_id]
        );
      }

      await pool.query("DELETE FROM posts WHERE id = ?", [postId]);

      res.json({ message: "Post deleted successfully!" });
    } catch (err) {
      console.error("[Delete Post Error]", err);
      res.status(500).json({ message: err.message || "Failed to delete post." });
    }
  }
);

// 14.3.3 Save / Bookmark Post
app.post(
  ["/api/posts/:id/save", "/api/posts/save"],
  authenticateToken,
  async (req, res) => {
    try {
      const postId = req.params.id || req.body.postId || req.body.id;
      const { collectionName } = req.body;
      const pool = getPool();
      const userId = req.user.id;

      const [existing] = await pool.query(
        "SELECT id FROM saved_posts WHERE user_id = ? AND post_id = ?",
        [userId, postId]
      );

      let isSaved = false;
      if (collectionName) {
        // Moving/updating to a specific collection
        if (existing.length > 0) {
          await pool.query(
            "UPDATE saved_posts SET collection_name = ? WHERE id = ?",
            [collectionName, existing[0].id]
          );
        } else {
          await pool.query(
            "INSERT INTO saved_posts (user_id, post_id, collection_name) VALUES (?, ?, ?)",
            [userId, postId, collectionName]
          );
        }
        isSaved = true;
      } else {
        // Toggle save/unsave (no collection specified)
        if (existing.length > 0) {
          await pool.query("DELETE FROM saved_posts WHERE id = ?", [existing[0].id]);
          isSaved = false;
        } else {
          await pool.query(
            "INSERT INTO saved_posts (user_id, post_id, collection_name) VALUES (?, ?, ?)",
            [userId, postId, "All Saved"]
          );
          isSaved = true;
        }
      }

      res.json({
        message: isSaved ? "Post saved to your collection!" : "Post removed from saved.",
        isSaved,
      });
    } catch (err) {
      console.error("[Save Post Error]", err);
      res.status(500).json({ message: err.message || "Failed to save post." });
    }
  }
);

// 14.4 Get Post Comments
app.get(
  ["/api/posts/:id/comments", "/api/comments"],
  optionalAuthenticateToken,
  async (req, res) => {
    try {
      const postId = req.params.id || req.query.postId;
      if (!postId) {
        return res.status(400).json({ message: "Post ID is required." });
      }

      const pool = getPool();
      const currentUserId = req.user?.id || 0;

      const [rows] = await pool.query(
        `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.likes_count, c.created_at,
                u.full_name, u.first_name, u.last_name, u.username, u.avatar_url,
                EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ?) AS is_liked
         FROM post_comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC`,
        [currentUserId, postId]
      );

      const comments = rows.map((r) => ({
        id: String(r.id),
        postId: String(r.post_id),
        userId: String(r.user_id),
        authorName: r.full_name || `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.username || "Local Farmer",
        avatarUri: r.avatar_url || "",
        timeAgo: formatTimeAgo(r.created_at),
        content: r.content,
        likes: Number(r.likes_count) || 0,
        isLiked: Boolean(r.is_liked),
        parentId: r.parent_id ? String(r.parent_id) : null,
      }));

      res.json({ comments, count: comments.length });
    } catch (err) {
      console.error("[Get Comments Error]", err);
      res.status(500).json({ message: err.message || "Failed to fetch comments." });
    }
  }
);

// 14.5 Add Comment to Post
app.post(
  ["/api/posts/:id/comments", "/api/comments"],
  authenticateToken,
  async (req, res) => {
    try {
      const postId = req.params.id || req.body.postId;
      const { content, parentId } = req.body;
      const text = (content || "").trim();

      if (!postId) {
        return res.status(400).json({ message: "Post ID is required." });
      }
      if (!text) {
        return res.status(400).json({ message: "Comment content is required." });
      }

      const pool = getPool();
      const userId = req.user.id;
      const parent = parentId ? Number(parentId) : null;

      const [insertRes] = await pool.query(
        "INSERT INTO post_comments (post_id, user_id, parent_id, content, likes_count) VALUES (?, ?, ?, ?, 0)",
        [postId, userId, parent, text]
      );

      const commentId = insertRes.insertId;

      // Increment comments_count on posts table
      await pool.query(
        "UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?",
        [postId]
      );

      // Fetch author info
      const [[userRow]] = await pool.query(
        "SELECT full_name, first_name, last_name, username, avatar_url FROM users WHERE id = ?",
        [userId]
      );

      const newComment = {
        id: String(commentId),
        postId: String(postId),
        userId: String(userId),
        authorName: userRow?.full_name || `${userRow?.first_name || ""} ${userRow?.last_name || ""}`.trim() || userRow?.username || "Local Farmer",
        avatarUri: userRow?.avatar_url || "",
        timeAgo: "Just now",
        content: text,
        likes: 0,
        isLiked: false,
        parentId: parent ? String(parent) : null,
      };

      res.status(201).json({ message: "Comment posted!", comment: newComment });
    } catch (err) {
      console.error("[Add Comment Error]", err);
      res.status(500).json({ message: err.message || "Failed to post comment." });
    }
  }
);

// 14.6 Like / Unlike Comment
app.post(
  ["/api/comments/:id/like", "/api/comments/like"],
  authenticateToken,
  async (req, res) => {
    try {
      const commentId = req.params.id || req.body.commentId || req.body.id;
      if (!commentId) {
        return res.status(400).json({ message: "Comment ID is required." });
      }

      const pool = getPool();
      const userId = req.user.id;

      const [existing] = await pool.query(
        "SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?",
        [commentId, userId]
      );

      let isLiked = false;
      if (existing.length > 0) {
        // Unlike
        await pool.query("DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?", [commentId, userId]);
        await pool.query("UPDATE post_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?", [commentId]);
        isLiked = false;
      } else {
        // Like
        await pool.query("INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)", [commentId, userId]);
        await pool.query("UPDATE post_comments SET likes_count = likes_count + 1 WHERE id = ?", [commentId]);
        isLiked = true;
      }

      const [[commentRow]] = await pool.query("SELECT likes_count FROM post_comments WHERE id = ?", [commentId]);

      res.json({
        message: isLiked ? "Comment liked!" : "Comment unliked.",
        isLiked,
        likesCount: Number(commentRow?.likes_count) || 0,
      });
    } catch (err) {
      console.error("[Like Comment Error]", err);
      res.status(500).json({ message: err.message || "Failed to like comment." });
    }
  }
);

// 14.7 Share Post
app.post(
  ["/api/posts/:id/share", "/api/posts/share"],
  authenticateToken,
  async (req, res) => {
    try {
      const postId = req.params.id || req.body.postId || req.body.id;
      const { shareType, caption } = req.body;
      if (!postId) {
        return res.status(400).json({ message: "Post ID is required." });
      }

      const pool = getPool();
      const userId = req.user.id;

      // Check original post
      const [[targetPost]] = await pool.query(
        "SELECT p.*, u.full_name, u.first_name, u.last_name, u.username, u.avatar_url, u.role FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?",
        [postId]
      );

      if (!targetPost) {
        return res.status(404).json({ message: "Original post not found." });
      }

      const actualOriginalPostId = targetPost.original_post_id ? targetPost.original_post_id : targetPost.id;

      // 1. Record share in post_shares table
      await pool.query(
        "INSERT INTO post_shares (post_id, user_id, share_type) VALUES (?, ?, ?)",
        [postId, userId, shareType || "public"]
      );

      // 2. Increment shares_count on original post
      await pool.query(
        "UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?",
        [postId]
      );

      // 3. Create shared post in feed if public/feed share
      let createdSharedPost = null;
      if (!shareType || shareType === "public" || shareType === "feed") {
        const [insertRes] = await pool.query(
          `INSERT INTO posts (user_id, original_post_id, content, image_url, category, privacy, location, likes_count, comments_count, shares_count)
           VALUES (?, ?, ?, ?, ?, 'Public', ?, 0, 0, 0)`,
          [
            userId,
            actualOriginalPostId,
            (caption || "").trim(),
            null,
            targetPost.category || "General",
            targetPost.location || "Iligan City, Philippines"
          ]
        );

        const newPostId = insertRes.insertId;

        const [[userRow]] = await pool.query(
          "SELECT full_name, first_name, last_name, username, avatar_url, role FROM users WHERE id = ?",
          [userId]
        );

        const [[origRow]] = await pool.query(
          "SELECT p.*, u.full_name, u.first_name, u.last_name, u.username, u.avatar_url, u.role FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?",
          [actualOriginalPostId]
        );

        createdSharedPost = {
          id: String(newPostId),
          userId: String(userId),
          authorName: userRow?.full_name || `${userRow?.first_name || ""} ${userRow?.last_name || ""}`.trim() || userRow?.username || "Local Farmer",
          authorRole: targetPost.category || (userRow?.role === "admin" ? "Wholesaler" : "Field"),
          avatarUri: userRow?.avatar_url || "",
          location: targetPost.location || "Iligan City, Philippines",
          timeAgo: "Just now",
          content: (caption || "").trim(),
          imageUrl: "",
          category: targetPost.category || "General",
          privacy: "Public",
          likes: 0,
          comments: 0,
          shares: 0,
          isLiked: false,
          isShared: true,
          originalPost: origRow ? {
            id: String(origRow.id),
            userId: String(origRow.user_id),
            authorName: origRow.full_name || `${origRow.first_name || ""} ${origRow.last_name || ""}`.trim() || origRow.username || "Local Farmer",
            authorRole: origRow.category || (origRow.role === "admin" ? "Wholesaler" : "Field"),
            avatarUri: origRow.avatar_url || "",
            location: origRow.location || "Iligan City, Philippines",
            timeAgo: formatTimeAgo(origRow.created_at),
            content: origRow.content,
            imageUrl: origRow.image_url || "",
            category: origRow.category,
          } : null,
        };
      }

      const [[postRow]] = await pool.query("SELECT shares_count FROM posts WHERE id = ?", [postId]);

      res.json({
        message: "Post shared successfully to your feed!",
        sharesCount: Number(postRow?.shares_count) || 0,
        sharedPost: createdSharedPost,
      });
    } catch (err) {
      console.error("[Share Post Error]", err);
      res.status(500).json({ message: err.message || "Failed to share post." });
    }
  }
);

// Start server
initDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=======================================================`);
    console.log(`Local Farm API Server running on port ${PORT}`);
    console.log(`Local:    http://localhost:${PORT}/api`);
    console.log(`Health:   http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
});
