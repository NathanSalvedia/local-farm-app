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
const { sendSignupOtpEmail } = require("./mailer");

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
    name:
      row.full_name ||
      `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
      row.username ||
      "User",
    fullName:
      row.full_name ||
      `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
      row.username ||
      "User",
    email: row.email,
    role: row.role || "user",
    username: row.username || "",
    phoneNumber: row.phone_number || "",
    gender: row.gender || "",
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    avatarUrl: row.avatar_url || "",
    bio: row.bio || "",
    about: row.bio || "",
    location: row.location || "Iligan City, Philippines",
    roleId: row.role_id || (row.role === "admin" ? 1 : 2),
  };
}

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// 0. Root & API landing page
app.get(["/", "/api"], (req, res) => {
  res.json({
    status: "ok",
    message: "Welcome to Local Farm PostgreSQL API Server",
    database: "localfarm (PostgreSQL)",
    endpoints: {
      health: "GET /api/health",
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      me: "GET /api/auth/me",
      updateProfile: "PUT /api/auth/profile",
      sendSignupOtp: "POST /api/auth/send-signup-otp",
      forgotPassword: "POST /api/auth/forgot-password",
      verifyOtp: "POST /api/auth/verify-otp",
      resetPassword: "POST /api/auth/reset-password",
      adminUsers: "GET /api/admin/users",
    },
  });
});

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Local Farm PostgreSQL API running" });
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
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const pool = getPool();

    // Check if email already exists
    const { rows: existing } = await pool.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email.trim().toLowerCase()],
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists." });
    }

    // Check if username already exists (if provided)
    if (username) {
      const { rows: existingUser } = await pool.query(
        "SELECT id FROM users WHERE username = $1 LIMIT 1",
        [username.trim()],
      );
      if (existingUser.length > 0) {
        return res
          .status(400)
          .json({ message: "This username is already taken." });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const fName = (firstName || name?.split(" ")[0] || "").trim();
    const lName = (lastName || name?.split(" ").slice(1).join(" ") || "").trim();
    const userRole =
      role === "admin" || email.toLowerCase().includes("admin")
        ? "admin"
        : "user";
    const userRoleId = userRole === "admin" ? 1 : 2;

    const { rows: result } = await pool.query(
      `INSERT INTO users (
        first_name, last_name, username, email, password_hash, 
        phone_number, gender, role, role_id, eula_accepted_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING id`,
      [
        fName,
        lName,
        username ? username.trim() : null,
        email.trim().toLowerCase(),
        hashedPassword,
        phoneNumber ? phoneNumber.trim() : null,
        gender || null,
        userRole,
        userRoleId,
      ],
    );

    const newUserId = result[0].id;

    // Mark signup OTP as used
    try {
      await pool.query(
        "UPDATE otps SET is_used = TRUE WHERE email = $1 AND type = 'signup'",
        [email.trim().toLowerCase()]
      );
    } catch {}

    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      newUserId,
    ]);
    const user = formatUser(rows[0]);
    const token = generateToken(user);

    res.status(201).json({
      message: "User registered successfully",
      user,
      token,
    });
  } catch (err) {
    console.error("[Register Error]", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to register user." });
  }
});

// 3. Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1 LIMIT 1",
      [email.trim().toLowerCase()],
    );

    if (rows.length === 0) {
      return res.status(400).json({
        message:
          "No account found with this email. Please check your email or sign up.",
      });
    }

    const userRow = rows[0];

    // Check password (supports bcrypt and plain text fallback for dev seeds)
    let isMatch = false;
    if (
      userRow.password_hash &&
      (userRow.password_hash.startsWith("$2a$") ||
        userRow.password_hash.startsWith("$2b$") ||
        userRow.password_hash.startsWith("$2y$"))
    ) {
      isMatch = await bcrypt.compare(password, userRow.password_hash);
    } else {
      isMatch = password === userRow.password_hash;
    }

    if (!isMatch) {
      return res.status(400).json({
        message:
          "Incorrect password. Please check your password and try again.",
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
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [req.user.id],
    );

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
      bio,
      about,
    } = req.body;

    const pool = getPool();
    const userId = req.user.id;

    // Check if username is being changed and if it's already taken by someone else
    if (username) {
      const { rows: existing } = await pool.query(
        "SELECT id FROM users WHERE username = $1 AND id != $2 LIMIT 1",
        [username.trim(), userId],
      );
      if (existing.length > 0) {
        return res
          .status(400)
          .json({ message: "This username is already taken by another user." });
      }
    }

    const { rows: currentRows } = await pool.query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [userId],
    );
    if (currentRows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const current = currentRows[0];
    const newFirstName =
      firstName !== undefined ? firstName.trim() : current.first_name;
    const newLastName =
      lastName !== undefined ? lastName.trim() : current.last_name;
    const newUsername =
      username !== undefined ? username.trim() : current.username;
    const newPhoneNumber =
      phoneNumber !== undefined ? phoneNumber.trim() : current.phone_number;
    const newGender = gender !== undefined ? gender : current.gender;
    const newAvatarUrl =
      avatarUrl !== undefined ? avatarUrl : current.avatar_url;
    const newBio =
      bio !== undefined ? bio : about !== undefined ? about : current.bio;

    try {
      await pool.query(
        `UPDATE users
         SET first_name = $1, last_name = $2, username = $3, phone_number = $4, gender = $5, avatar_url = $6, bio = $7
         WHERE id = $8`,
        [
          newFirstName,
          newLastName,
          newUsername,
          newPhoneNumber,
          newGender,
          newAvatarUrl,
          newBio,
          userId,
        ],
      );
    } catch {
      // Fallback if bio column does not exist yet
      await pool.query(
        `UPDATE users
         SET first_name = $1, last_name = $2, username = $3, phone_number = $4, gender = $5, avatar_url = $6
         WHERE id = $7`,
        [
          newFirstName,
          newLastName,
          newUsername,
          newPhoneNumber,
          newGender,
          newAvatarUrl,
          userId,
        ],
      );
    }

    const { rows: updatedRows } = await pool.query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [userId],
    );
    const updatedUser = formatUser(updatedRows[0]);

    res.json({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("[Update Profile Error]", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to update profile." });
  }
};

app.put(
  [
    "/api/auth/profile",
    "/api/user/profile",
    "/api/users/profile",
    "/auth/profile",
    "/user/profile",
  ],
  authenticateToken,
  profileUpdateHandler,
);
app.post(
  [
    "/api/auth/profile",
    "/api/user/profile",
    "/api/users/profile",
    "/auth/profile",
    "/user/profile",
  ],
  authenticateToken,
  profileUpdateHandler,
);

// 4b. Send Signup Verification OTP
app.post("/api/auth/send-signup-otp", async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const pool = getPool();

    // Check if email already exists
    const { rows: existingEmail } = await pool.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email.trim().toLowerCase()],
    );
    if (existingEmail.length > 0) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists." });
    }

    // Check if username already exists
    if (username) {
      const { rows: existingUser } = await pool.query(
        "SELECT id FROM users WHERE username = $1 LIMIT 1",
        [username.trim()],
      );
      if (existingUser.length > 0) {
        return res
          .status(400)
          .json({ message: "This username is already taken." });
      }
    }

    // Generate 6-digit random code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await pool.query(
      "INSERT INTO otps (email, otp, type, expires_at) VALUES ($1, $2, 'signup', $3)",
      [email.trim().toLowerCase(), otp, expiresAt],
    );

    console.log(`[Signup OTP Generated] Email: ${email}, OTP: ${otp}`);

    // Send verification email via Gmail
    try {
      await sendSignupOtpEmail(email.trim().toLowerCase(), otp);
    } catch (mailErr) {
      console.error(
        "[Mailer Error] Could not deliver OTP email:",
        mailErr.message,
      );
    }

    res.json({
      message: "Verification code sent to your email.",
      devOtp: otp,
    });
  } catch (err) {
    console.error("[Send Signup OTP Error]", err);
    res.status(500).json({
      message: err.message || "Failed to send signup verification code.",
    });
  }
});

// 5. Send Forgot Password OTP
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email.trim().toLowerCase()],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No account found with this email." });
    }

    // Generate 6-digit random code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await pool.query(
      "INSERT INTO otps (email, otp, type, expires_at) VALUES ($1, $2, 'recovery', $3)",
      [email.trim().toLowerCase(), otp, expiresAt],
    );

    console.log(`[OTP Generated] Email: ${email}, OTP: ${otp}`);

    res.json({
      message: "OTP code sent successfully.",
      devOtp: otp,
    });
  } catch (err) {
    console.error("[Forgot Password Error]", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to send reset code." });
  }
});

// 6. Verify OTP
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ message: "Email and OTP code are required." });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT * FROM otps WHERE email = $1 AND otp = $2 AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
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
      return res
        .status(400)
        .json({ message: "Email and new password are required." });
    }

    const pool = getPool();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2",
      [hashedPassword, email.trim().toLowerCase()],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("[Reset Password Error]", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to reset password." });
  }
});

// 8. Admin: List all users (Requires Admin)
app.get(
  "/api/admin/users",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        "SELECT id, first_name, last_name, username, email, phone_number, gender, role, created_at FROM users ORDER BY id DESC",
      );
      res.json({ users: rows });
    } catch (err) {
      console.error("[Admin Users Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch users." });
    }
  },
);

// 9. Admin: Update user role (Requires Admin)
app.put(
  "/api/admin/users/:id/role",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!["user", "admin"].includes(role)) {
        return res
          .status(400)
          .json({ message: "Invalid role. Must be 'user' or 'admin'." });
      }
      const pool = getPool();
      await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
      res.json({ message: `User ${id} role updated to ${role}` });
    } catch (err) {
      console.error("[Admin Update Role Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to update role." });
    }
  },
);

// 10. Change Password (Authenticated user - requires previous password verification)
const changePasswordHandler = async (req, res) => {
  try {
    const {
      currentPassword,
      previousPassword,
      oldPassword,
      newPassword,
      password,
    } = req.body;
    const currentPass = currentPassword || previousPassword || oldPassword;
    const targetPassword = newPassword || password;

    if (!currentPass) {
      return res
        .status(400)
        .json({ message: "Please enter your current password." });
    }

    if (!targetPassword || targetPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters long." });
    }

    const pool = getPool();
    const userId = req.user.id;

    // Fetch existing user to verify previous password
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [userId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const userRow = rows[0];

    // Check previous password
    let isMatch = false;
    if (
      userRow.password_hash &&
      (userRow.password_hash.startsWith("$2a$") ||
        userRow.password_hash.startsWith("$2b$") ||
        userRow.password_hash.startsWith("$2y$"))
    ) {
      isMatch = await bcrypt.compare(currentPass, userRow.password_hash);
    } else {
      isMatch = currentPass === userRow.password_hash;
    }

    if (!isMatch) {
      return res.status(400).json({
        message: "Incorrect current password. Please verify and try again.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(targetPassword, salt);

    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      hashedPassword,
      userId,
    ]);

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("[Change Password Error]", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to change password." });
  }
};

app.put(
  [
    "/api/auth/change-password",
    "/api/user/change-password",
    "/auth/change-password",
    "/user/change-password",
  ],
  authenticateToken,
  changePasswordHandler,
);
app.post(
  [
    "/api/auth/change-password",
    "/api/user/change-password",
    "/auth/change-password",
    "/user/change-password",
  ],
  authenticateToken,
  changePasswordHandler,
);

// -----------------------------------------------------------------------------
// 11. CONNECTIONS / FRIENDS API
// -----------------------------------------------------------------------------

function getCoordinatesForLocation(locStr) {
  if (!locStr) return { lat: 8.228, lng: 124.24 }; // Poblacion default
  const lower = locStr.toLowerCase();
  const barangays = [
    { name: "pala-o", lat: 8.2283, lng: 124.2452 },
    { name: "palao", lat: 8.2283, lng: 124.2452 },
    { name: "tubod", lat: 8.209, lng: 124.241 },
    { name: "tibanga", lat: 8.2386, lng: 124.2447 },
    { name: "san miguel", lat: 8.235, lng: 124.252 },
    { name: "hinaplanon", lat: 8.2523, lng: 124.2612 },
    { name: "suarez", lat: 8.1925, lng: 124.225 },
    { name: "tambacan", lat: 8.223, lng: 124.238 },
    { name: "poblacion", lat: 8.228, lng: 124.24 },
    { name: "kiwalan", lat: 8.281, lng: 124.269 },
    { name: "dalipuga", lat: 8.31, lng: 124.275 },
    { name: "buru-un", lat: 8.183, lng: 124.183 },
    { name: "ditucalan", lat: 8.187, lng: 124.195 },
    { name: "santa felomina", lat: 8.256, lng: 124.254 },
    { name: "sta. felomina", lat: 8.256, lng: 124.254 },
    { name: "saray", lat: 8.225, lng: 124.237 },
    { name: "del carmen", lat: 8.226, lng: 124.249 },
    { name: "mahayahay", lat: 8.224, lng: 124.251 },
    { name: "villa verde", lat: 8.231, lng: 124.255 },
    { name: "pugaan", lat: 8.215, lng: 124.27 },
  ];
  for (const b of barangays) {
    if (lower.includes(b.name)) return { lat: b.lat, lng: b.lng };
  }
  return { lat: 8.228, lng: 124.24 };
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km, userIdSeed = 0) {
  if (!km || km < 0.1) {
    const pseudoMeters = 250 + ((userIdSeed * 173) % 850);
    return `${pseudoMeters}m away`;
  }
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters}m away`;
  }
  return `${km.toFixed(1)}km away`;
}

// 11.1 Get Connection Requests (Incoming Pending Requests Only)
app.get(
  ["/api/connections/requests", "/api/friends/requests", "/api/connections"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const { rows } = await pool.query(
        `SELECT c.id AS connection_id, c.status, c.created_at,
                u.id AS user_id, u.first_name, u.last_name, u.username, u.avatar_url, u.role,
                (
                  SELECT COUNT(DISTINCT m.friend_id)
                  FROM (
                    SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS friend_id
                    FROM connections
                    WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'accepted'
                  ) m
                  JOIN (
                    SELECT CASE WHEN sender_id = u.id THEN receiver_id ELSE sender_id END AS friend_id
                    FROM connections
                    WHERE (sender_id = u.id OR receiver_id = u.id) AND status = 'accepted'
                  ) f ON m.friend_id = f.friend_id
                ) AS mutual_count
         FROM connections c
         JOIN users u ON c.sender_id = u.id
         WHERE c.receiver_id = $1 AND c.status = 'pending'
         ORDER BY c.id DESC`,
        [userId],
      );

      const requests = rows.map((row) => {
        const mutual = Number(row.mutual_count || 0);
        return {
          id: String(row.connection_id),
          userId: String(row.user_id),
          name:
            `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
            row.username ||
            "User",
          username: row.username || "",
          avatarUrl: row.avatar_url || "",
          mutualFriends:
            mutual > 0
              ? `${mutual} mutual friend${mutual === 1 ? "" : "s"}`
              : "Local Farm member",
          timeAgo: formatTimeAgo(row.created_at),
          status: row.status,
        };
      });

      res.json({ requests, count: requests.length });
    } catch (err) {
      console.error("[Get Requests Error]", err);
      res.status(500).json({
        message: err.message || "Failed to fetch connection requests.",
      });
    }
  },
);

// 11.1b Get Suggestions (Users not connected yet)
app.get(
  ["/api/connections/suggestions", "/api/friends/suggestions"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const { rows } = await pool.query(
        `SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url, u.role,
                (
                  SELECT COUNT(DISTINCT m.friend_id)
                  FROM (
                    SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS friend_id
                    FROM connections
                    WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'accepted'
                  ) m
                  JOIN (
                    SELECT CASE WHEN sender_id = u.id THEN receiver_id ELSE sender_id END AS friend_id
                    FROM connections
                    WHERE (sender_id = u.id OR receiver_id = u.id) AND status = 'accepted'
                  ) f ON m.friend_id = f.friend_id
                ) AS mutual_count
         FROM users u
         WHERE u.id != $1
           AND u.id NOT IN (
             SELECT CASE WHEN sender_id = $2 THEN receiver_id ELSE sender_id END
             FROM connections
             WHERE (sender_id = $3 OR receiver_id = $4) AND status IN ('pending', 'accepted', 'blocked')
           )
         ORDER BY mutual_count DESC, u.id DESC
         LIMIT 20`,
        [userId, userId, userId, userId],
      );

      const suggestions = rows.map((r) => {
        const mutual = Number(r.mutual_count || 0);
        return {
          id: String(r.id),
          name:
            `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
            r.username ||
            "User",
          username: r.username || "",
          avatarUrl: r.avatar_url || "",
          mutualFriends:
            mutual > 0
              ? `${mutual} mutual friend${mutual === 1 ? "" : "s"}`
              : "Local Farm member",
        };
      });

      res.json({ suggestions, count: suggestions.length });
    } catch (err) {
      console.error("[Get Suggestions Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch suggestions." });
    }
  },
);

// 11.1c Get Sent Pending Requests
app.get(
  ["/api/connections/sent", "/api/friends/sent"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const { rows } = await pool.query(
        `SELECT c.id AS connection_id, c.status, c.created_at,
                u.id AS user_id, u.first_name, u.last_name, u.username, u.avatar_url
         FROM connections c
         JOIN users u ON c.receiver_id = u.id
         WHERE c.sender_id = $1 AND c.status = 'pending'
         ORDER BY c.id DESC`,
        [userId],
      );

      const sentRequests = rows.map((row) => ({
        id: String(row.connection_id),
        userId: String(row.user_id),
        name:
          `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
          row.username ||
          "User",
        username: row.username || "",
        avatarUrl: row.avatar_url || "",
        friendsCount: "Local Farm member",
        timeAgo: formatTimeAgo(row.created_at),
      }));

      res.json({ sentRequests, count: sentRequests.length });
    } catch (err) {
      console.error("[Get Sent Requests Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch sent requests." });
    }
  },
);

// 11.1d Get Nearby Users (Calculates distance and fetches connection status)
app.get(
  ["/api/connections/nearby", "/api/friends/nearby"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      // 1. Fetch current user's profile to determine reference location
      const { rows: currentUserRows } = await pool.query(
        "SELECT id, location FROM users WHERE id = $1",
        [userId],
      );
      const currentUserLoc = currentUserRows[0]?.location || "";

      const reqLat = parseFloat(req.query.lat);
      const reqLng = parseFloat(req.query.lng);
      const myCoords =
        !isNaN(reqLat) && !isNaN(reqLng)
          ? { lat: reqLat, lng: reqLng }
          : getCoordinatesForLocation(currentUserLoc);

      // 2. Fetch all other registered users, joining their connection status with the requester
      const { rows } = await pool.query(
        `SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url, u.location, u.role,
                c.id AS connection_id, c.sender_id, c.receiver_id, c.status AS connection_status
         FROM users u
         LEFT JOIN connections c ON (
           (c.sender_id = $1 AND c.receiver_id = u.id) OR
           (c.receiver_id = $2 AND c.sender_id = u.id)
         )
         WHERE u.id != $3
           AND (c.status IS NULL OR c.status != 'blocked')
         ORDER BY u.id DESC`,
        [userId, userId, userId],
      );

      // 3. Compute distance and relationship for each user
      const users = rows
        .map((row) => {
          let relationship = "none";
          if (row.connection_status === "accepted") {
            relationship = "accepted";
          } else if (row.connection_status === "pending") {
            relationship =
              row.sender_id === userId ? "pending_sent" : "pending_received";
          } else if (row.connection_status === "declined") {
            relationship = "none";
          }

          const targetCoords = getCoordinatesForLocation(row.location);
          const distKm = calculateDistanceKm(
            myCoords.lat,
            myCoords.lng,
            targetCoords.lat,
            targetCoords.lng,
          );

          const distanceStr = formatDistance(distKm, row.id);

          return {
            id: String(row.id),
            connectionId: row.connection_id ? String(row.connection_id) : null,
            name:
              `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
              row.username ||
              "User",
            username: row.username || "",
            avatarUrl: row.avatar_url || "",
            location: row.location || "Iligan City",
            distance: distanceStr,
            distanceKm: distKm,
            relationship,
          };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);

      res.json({ users, count: users.length });
    } catch (err) {
      console.error("[Get Nearby Users Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch nearby users." });
    }
  },
);

// 11.2 Respond to Connection Request (Confirm / Decline)
app.post(
  [
    "/api/connections/respond",
    "/api/connections/:id/respond",
    "/api/friends/respond",
  ],
  authenticateToken,
  async (req, res) => {
    try {
      const connectionId =
        req.params.id || req.body.connectionId || req.body.id;
      const action = (
        req.body.action ||
        req.body.status ||
        "confirm"
      ).toLowerCase();
      const newStatus =
        action === "confirm" || action === "accepted" ? "accepted" : "declined";

      if (!connectionId) {
        return res.status(400).json({ message: "Connection ID is required." });
      }

      const pool = getPool();
      const userId = req.user.id;

      const result = await pool.query(
        "UPDATE connections SET status = $1 WHERE id = $2 AND receiver_id = $3",
        [newStatus, connectionId, userId],
      );

      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ message: "Connection request not found or unauthorized." });
      }

      if (newStatus === "accepted") {
        try {
          const { rows: connRows } = await pool.query(
            "SELECT sender_id FROM connections WHERE id = $1",
            [connectionId],
          );
          if (connRows.length > 0) {
            const requesterId = connRows[0].sender_id;
            const { rows: uRows } = await pool.query(
              "SELECT first_name, last_name, username FROM users WHERE id = $1",
              [userId],
            );
            const userName =
              `${uRows[0]?.first_name || ""} ${uRows[0]?.last_name || ""}`.trim() ||
              uRows[0]?.username ||
              "Someone";

            await pool.query(
              `INSERT INTO notifications (user_id, actor_id, actor_type, type, title, content, entity_name, target_id, is_read)
               VALUES ($1, $2, 'user', 'friend_accepted', 'Friend Request Accepted', $3, 'connection', $4, FALSE)`,
              [
                requesterId,
                userId,
                `${userName} accepted your friend request.`,
                connectionId,
              ],
            );
          }
        } catch (notifErr) {
          console.warn(
            "[Accept Connection Notification Warning]",
            notifErr.message,
          );
        }
      }

      res.json({
        message:
          newStatus === "accepted"
            ? "Connection request confirmed!"
            : "Connection request declined.",
        status: newStatus,
      });
    } catch (err) {
      console.error("[Respond Request Error]", err);
      res.status(500).json({
        message: err.message || "Failed to respond to connection request.",
      });
    }
  },
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
                u.id AS user_id, u.first_name, u.last_name, u.username, u.avatar_url
         FROM connections c
         JOIN users u ON (CASE WHEN c.sender_id = $1 THEN c.receiver_id = u.id ELSE c.sender_id = u.id END)
         WHERE (c.sender_id = $2 OR c.receiver_id = $3) AND c.status = 'accepted'`;
      const params = [userId, userId, userId];

      if (collectionFilter && collectionFilter !== "All Connections") {
        sql += ` AND c.collection_name = $4`;
        params.push(collectionFilter);
      }

      sql += ` ORDER BY c.updated_at DESC`;

      const { rows } = await pool.query(sql, params);

      const friends = rows.map((row) => ({
        id: String(row.user_id),
        connectionId: String(row.connection_id),
        name:
          `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
          row.username ||
          "User",
        username: row.username || "",
        avatarUrl: row.avatar_url || "",
        collectionName: row.collection_name || "All Connections",
        hasMutual: true,
      }));

      res.json({ friends, count: friends.length });
    } catch (err) {
      console.error("[Get Friends Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch friends." });
    }
  },
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
      const { rows } = await pool.query(
        `SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url, u.role,
                c.id AS connection_id, c.sender_id, c.receiver_id, c.status AS connection_status
         FROM users u
         LEFT JOIN connections c ON (
           (c.sender_id = $1 AND c.receiver_id = u.id) OR
           (c.receiver_id = $2 AND c.sender_id = u.id)
         )
         WHERE u.id != $3 AND (
           CONCAT(u.first_name, ' ', u.last_name) LIKE $4 OR
           u.first_name LIKE $5 OR
           u.last_name LIKE $6 OR
           u.username LIKE $7 OR
           u.email LIKE $8
         )
         ORDER BY u.first_name ASC
         LIMIT 20`,
        [
          userId,
          userId,
          userId,
          searchPattern,
          searchPattern,
          searchPattern,
          searchPattern,
          searchPattern,
        ],
      );

      const users = rows.map((row) => {
        let relationship = "none";
        if (row.connection_status === "accepted") {
          relationship = "accepted";
        } else if (row.connection_status === "pending") {
          relationship =
            row.sender_id === userId ? "pending_sent" : "pending_received";
        } else if (row.connection_status === "declined") {
          relationship = "none";
        }

        return {
          id: String(row.id),
          connectionId: row.connection_id ? String(row.connection_id) : null,
          name:
            `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
            row.username ||
            "User",
          username: row.username || "",
          avatarUrl: row.avatar_url || "",
          role: row.role || "user",
          relationship, // 'none' | 'pending_sent' | 'pending_received' | 'accepted'
        };
      });

      res.json({ users, count: users.length });
    } catch (err) {
      console.error("[Search Users Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to search users." });
    }
  },
);

// 11.5 Send Connection / Friend Request
app.post(
  ["/api/connections/send", "/api/connections/request", "/api/friends/request"],
  authenticateToken,
  async (req, res) => {
    try {
      const targetUserId =
        req.body.targetUserId || req.body.receiverId || req.body.userId;

      if (!targetUserId) {
        return res.status(400).json({ message: "Target user ID is required." });
      }

      const pool = getPool();
      const senderId = req.user.id;

      if (String(senderId) === String(targetUserId)) {
        return res
          .status(400)
          .json({ message: "You cannot send a friend request to yourself." });
      }

      // Check if connection already exists
      const { rows: existing } = await pool.query(
        "SELECT * FROM connections WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4)",
        [senderId, targetUserId, targetUserId, senderId],
      );

      if (existing.length > 0) {
        const conn = existing[0];
        if (conn.status === "accepted") {
          return res.status(400).json({ message: "You are already friends." });
        }
        if (conn.status === "pending") {
          return res
            .status(400)
            .json({ message: "Friend request is already pending." });
        }
        // Update to pending if it was previously declined
        await pool.query(
          "UPDATE connections SET sender_id = $1, receiver_id = $2, status = 'pending' WHERE id = $3",
          [senderId, targetUserId, conn.id],
        );

        // Fetch sender info for notification
        const { rows: sRows } = await pool.query(
          "SELECT first_name, last_name, username FROM users WHERE id = $1",
          [senderId],
        );
        const senderName =
          `${sRows[0]?.first_name || ""} ${sRows[0]?.last_name || ""}`.trim() ||
          sRows[0]?.username ||
          "Someone";

        await pool.query(
          `INSERT INTO notifications (user_id, actor_id, actor_type, type, title, content, entity_name, target_id, is_read)
           VALUES ($1, $2, 'user', 'friend_request', 'Friend Request', $3, 'connection', $4, FALSE)`,
          [
            targetUserId,
            senderId,
            `${senderName} sent you a friend request.`,
            conn.id,
          ],
        );

        return res.json({
          message: "Friend request sent!",
          connectionId: String(conn.id),
          relationship: "pending_sent",
        });
      }

      const { rows: insertRes } = await pool.query(
        "INSERT INTO connections (sender_id, receiver_id, status) VALUES ($1, $2, 'pending') RETURNING id",
        [senderId, targetUserId],
      );
      const newConnId = insertRes[0].id;

      // Fetch sender info for notification
      const { rows: sRows } = await pool.query(
        "SELECT first_name, last_name, username FROM users WHERE id = $1",
        [senderId],
      );
      const senderName =
        `${sRows[0]?.first_name || ""} ${sRows[0]?.last_name || ""}`.trim() ||
        sRows[0]?.username ||
        "Someone";

      await pool.query(
        `INSERT INTO notifications (user_id, actor_id, actor_type, type, title, content, entity_name, target_id, is_read)
         VALUES ($1, $2, 'user', 'friend_request', 'Friend Request', $3, 'connection', $4, FALSE)`,
        [
          targetUserId,
          senderId,
          `${senderName} sent you a friend request.`,
          newConnId,
        ],
      );

      res.json({
        message: "Friend request sent successfully!",
        connectionId: String(newConnId),
        relationship: "pending_sent",
      });
    } catch (err) {
      console.error("[Send Friend Request Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to send friend request." });
    }
  },
);

// 11.6 Cancel Sent Request
app.post(["/api/connections/cancel"], authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.userId;
    const connectionId = req.body.connectionId;

    const pool = getPool();
    const senderId = req.user.id;

    if (connectionId) {
      await pool.query(
        "DELETE FROM connections WHERE id = $1 AND sender_id = $2 AND status = 'pending'",
        [connectionId, senderId],
      );
    } else if (targetUserId) {
      await pool.query(
        "DELETE FROM connections WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'",
        [senderId, targetUserId],
      );
    }

    res.json({ message: "Friend request canceled.", relationship: "none" });
  } catch (err) {
    console.error("[Cancel Friend Request Error]", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to cancel request." });
  }
});

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

      const { rows } = await pool.query(
        `SELECT DISTINCT collection_name
         FROM connections
         WHERE (sender_id = $1 OR receiver_id = $2) AND status = 'accepted'
         ORDER BY collection_name ASC`,
        [userId, userId],
      );

      const collections = rows.map((r) => r.collection_name);
      if (!collections.includes("All Connections")) {
        collections.unshift("All Connections");
      }

      res.json({ collections });
    } catch (err) {
      console.error("[Get Connection Collections Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch collections." });
    }
  },
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
        return res
          .status(400)
          .json({ message: "Collection name is required." });
      }

      const trimmed = collectionName.trim();

      const { rows: existing } = await pool.query(
        `SELECT id FROM connections
         WHERE id = $1 AND (sender_id = $2 OR receiver_id = $3) AND status = 'accepted'`,
        [connectionId, userId, userId],
      );

      if (existing.length === 0) {
        return res
          .status(404)
          .json({ message: "Connection not found or not accepted." });
      }

      await pool.query(
        "UPDATE connections SET collection_name = $1 WHERE id = $2",
        [trimmed, connectionId],
      );

      res.json({
        message: `Categorized as "${trimmed}".`,
        collectionName: trimmed,
      });
    } catch (err) {
      console.error("[Update Connection Collection Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to update collection." });
    }
  },
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

      const { rows } = await pool.query(
        `SELECT DISTINCT u.id, u.first_name, u.last_name, u.username, u.avatar_url
         FROM connections c
         JOIN users u ON (CASE WHEN c.sender_id = $1 THEN c.receiver_id = u.id ELSE c.sender_id = u.id END)
         WHERE (c.sender_id = $2 OR c.receiver_id = $3) AND c.status = 'accepted'
         ORDER BY u.first_name ASC
         LIMIT 20`,
        [userId, userId, userId],
      );

      const users = rows.map((r) => ({
        id: String(r.id),
        name: (r.first_name || r.username || "User").split(" ")[0],
        fullName:
          `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
          r.username ||
          "User",
        avatarUrl: r.avatar_url || "",
        isOnline: true,
      }));

      res.json({ users });
    } catch (err) {
      console.error("[Active Users Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch active users." });
    }
  },
);

// 12.2 Get Conversations List (Based on conversation_id, user1_id, user2_id)
app.get(
  ["/api/chats/conversations", "/api/chats"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const { rows } = await pool.query(
        `SELECT c.id AS conversation_id, c.last_message, c.last_message_time,
                u.id AS other_user_id, u.first_name, u.last_name, u.username, u.avatar_url,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.receiver_id = $1 AND m.is_read = FALSE) AS unread_count,
                (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_sender_id
         FROM conversations c
         JOIN users u ON (CASE WHEN c.user1_id = $2 THEN c.user2_id = u.id ELSE c.user1_id = u.id END)
         WHERE c.user1_id = $3 OR c.user2_id = $4
         ORDER BY c.last_message_time DESC`,
        [userId, userId, userId, userId],
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
          name:
            `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
            row.username ||
            "User",
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
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch conversations." });
    }
  },
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
        const { rows: existing } = await pool.query(
          "SELECT id FROM conversations WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $3 AND user2_id = $4)",
          [u1, u2, u2, u1],
        );
        if (existing.length > 0) {
          convId = existing[0].id;
        }
      }

      // Mark incoming messages as read for this conversation or sender
      if (convId) {
        await pool.query(
          "UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND receiver_id = $2 AND is_read = FALSE",
          [convId, userId],
        );
      } else if (otherUserId) {
        await pool.query(
          "UPDATE messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE",
          [otherUserId, userId],
        );
      }

      let rows = [];
      if (convId) {
        const { rows: convRows } = await pool.query(
          `SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.message_text,
                  m.message_type, m.image_url, m.is_read, m.created_at,
                  u.avatar_url, u.first_name, u.last_name
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.conversation_id = $1
           ORDER BY m.id ASC`,
          [convId],
        );
        rows = convRows;
      } else if (otherUserId) {
        const { rows: otherRows } = await pool.query(
          `SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.message_text,
                  m.message_type, m.image_url, m.is_read, m.created_at,
                  u.avatar_url, u.first_name, u.last_name
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $3 AND m.receiver_id = $4)
           ORDER BY m.id ASC`,
          [userId, otherUserId, otherUserId, userId],
        );
        rows = otherRows;
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
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch messages." });
    }
  },
);

// 12.4 Send Message
app.post(
  ["/api/chats/messages", "/api/chats/send"],
  authenticateToken,
  async (req, res) => {
    try {
      const {
        receiverId,
        conversationId,
        messageText,
        messageType,
        imageUrl,
        autoReplyText,
        autoReplyType,
      } = req.body;
      const text = (messageText || "").trim();

      if (!text && !imageUrl && !autoReplyText) {
        return res
          .status(400)
          .json({ message: "Message content or image is required." });
      }

      const pool = getPool();
      const senderId = req.user.id;

      let targetReceiverId = receiverId;
      let convId = conversationId;

      if (!targetReceiverId && convId) {
        const { rows: convRows } = await pool.query(
          "SELECT user1_id, user2_id FROM conversations WHERE id = $1",
          [convId],
        );
        if (convRows.length > 0) {
          targetReceiverId =
            convRows[0].user1_id === senderId
              ? convRows[0].user2_id
              : convRows[0].user1_id;
        }
      }

      if (!targetReceiverId) {
        return res.status(400).json({ message: "Receiver ID is required." });
      }

      // Find or create conversation
      const u1 = Math.min(senderId, Number(targetReceiverId));
      const u2 = Math.max(senderId, Number(targetReceiverId));

      const { rows: convCheck } = await pool.query(
        "SELECT id FROM conversations WHERE user1_id = $1 AND user2_id = $2",
        [u1, u2],
      );

      if (convCheck.length > 0) {
        let lastSnippet = autoReplyText ? String(autoReplyText).trim() : text;
        if (messageType === "location") {
          try {
            const parsed = JSON.parse(text);
            lastSnippet = `📍 ${parsed.title || "Shared a location pin"}`;
          } catch {
            lastSnippet = "📍 Shared a location pin";
          }
        } else if (!text && imageUrl) {
          lastSnippet = "Sent an image";
        } else if (!text) {
          lastSnippet = "Sent a message";
        }

        convId = convCheck[0].id;
        await pool.query(
          "UPDATE conversations SET last_message = $1, last_message_time = NOW() WHERE id = $2",
          [lastSnippet, convId],
        );
      } else {
        let lastSnippet = autoReplyText ? String(autoReplyText).trim() : text;
        if (messageType === "location") {
          try {
            const parsed = JSON.parse(text);
            lastSnippet = `📍 ${parsed.title || "Shared a location pin"}`;
          } catch {
            lastSnippet = "📍 Shared a location pin";
          }
        } else if (!text && imageUrl) {
          lastSnippet = "Sent an image";
        } else if (!text) {
          lastSnippet = "Sent a message";
        }

        const { rows: cInsert } = await pool.query(
          "INSERT INTO conversations (user1_id, user2_id, last_message, last_message_time) VALUES ($1, $2, $3, NOW()) RETURNING id",
          [u1, u2, lastSnippet],
        );
        convId = cInsert[0].id;
      }

      // Insert message
      const { rows: mInsert } = await pool.query(
        "INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text, message_type, image_url, is_read) VALUES ($1, $2, $3, $4, $5, $6, FALSE) RETURNING id",
        [
          convId,
          senderId,
          targetReceiverId,
          text,
          messageType || "text",
          imageUrl || null,
        ],
      );

      const d = new Date();
      const hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12;
      const timeStr = `${formattedHours}:${minutes} ${ampm}`;

      const createdMessage = {
        id: String(mInsert[0].id),
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

      let createdAutoReply = null;
      if (autoReplyText) {
        const arText = String(autoReplyText).trim();
        const arType = autoReplyType || "auto_reply";
        const { rows: arInsert } = await pool.query(
          "INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text, message_type, image_url, is_read) VALUES ($1, $2, $3, $4, $5, NULL, FALSE) RETURNING id",
          [convId, targetReceiverId, senderId, arText, arType],
        );
        createdAutoReply = {
          id: String(arInsert[0].id),
          conversationId: String(convId),
          sender: "other",
          senderId: String(targetReceiverId),
          receiverId: String(senderId),
          type: arType,
          text: arText,
          time: timeStr,
          isSeen: false,
        };
      }

      res.status(201).json({
        message: "Message sent!",
        data: createdMessage,
        autoReply: createdAutoReply,
      });
    } catch (err) {
      console.error("[Send Message Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to send message." });
    }
  },
);

// -----------------------------------------------------------------------------
// 13. NOTIFICATIONS & BADGE COUNTS API
// -----------------------------------------------------------------------------
app.get(
  ["/api/notifications/badge-counts", "/api/badges"],
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      const { rows: connRows } = await pool.query(
        "SELECT COUNT(*) AS count FROM connections WHERE receiver_id = $1 AND status = 'pending'",
        [userId],
      );
      const connRes = connRows[0];

      const { rows: msgRows } = await pool.query(
        "SELECT COUNT(*) AS count FROM messages WHERE receiver_id = $1 AND is_read = FALSE",
        [userId],
      );
      const msgRes = msgRows[0];

      const { rows: notifRows } = await pool.query(
        "SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE",
        [userId],
      );
      const notifRes = notifRows[0];

      res.json({
        requestsCount: Number(connRes?.count) || 0,
        unreadMessagesCount: Number(msgRes?.count) || 0,
        unreadNotificationsCount: Number(notifRes?.count) || 0,
      });
    } catch (err) {
      console.error("[Badge Counts Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch badge counts." });
    }
  },
);

// 13.1 Get Notifications List
app.get("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT n.id, n.user_id, n.actor_id, n.actor_type, n.type, n.title, n.content,
              n.entity_name, n.target_id, n.is_read, n.created_at,
              u.first_name, u.last_name, u.username, u.avatar_url
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId],
    );

    const notifications = rows.map((r) => {
      const actorName = r.actor_id
        ? `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
          r.username ||
          "Someone"
        : r.title || "System";

      return {
        id: String(r.id),
        type: r.type || "system",
        title: r.title || "Notification",
        content: r.content || "",
        entityName: r.entity_name || "",
        targetId: r.target_id ? Number(r.target_id) : null,
        time: formatTimeAgo(r.created_at),
        createdAt: r.created_at,
        isUnread: !r.is_read,
        hasActionButtons:
          r.type === "friend_request" || r.type === "group_invite",
        user: {
          id: r.actor_id ? String(r.actor_id) : undefined,
          name: actorName,
          avatarUrl: r.avatar_url || "",
        },
      };
    });

    const unreadCount = notifications.filter((n) => n.isUnread).length;
    res.json({ notifications, count: notifications.length, unreadCount });
  } catch (err) {
    console.error("[Get Notifications Error]", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to fetch notifications." });
  }
});

// 13.2 Mark Single Notification as Read
app.put(
  "/api/notifications/:id/read",
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;
      const notificationId = req.params.id;

      await pool.query(
        "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
        [notificationId, userId],
      );

      res.json({
        message: "Notification marked as read.",
        id: String(notificationId),
        isRead: true,
      });
    } catch (err) {
      console.error("[Mark Notification Read Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to update notification." });
    }
  },
);

// 13.3 Mark All Notifications as Read
app.put(
  "/api/notifications/read-all",
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;

      await pool.query(
        "UPDATE notifications SET is_read = TRUE WHERE user_id = $1",
        [userId],
      );

      res.json({ message: "All notifications marked as read." });
    } catch (err) {
      console.error("[Mark All Notifications Read Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to update notifications." });
    }
  },
);

// 13.4 Delete Notification
app.delete(
  "/api/notifications/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getPool();
      const userId = req.user.id;
      const notificationId = req.params.id;

      await pool.query(
        "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
        [notificationId, userId],
      );

      res.json({
        message: "Notification deleted.",
        id: String(notificationId),
      });
    } catch (err) {
      console.error("[Delete Notification Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to delete notification." });
    }
  },
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

function sanitizePostLocation(loc) {
  if (!loc) return "";
  const trimmed = String(loc).trim();
  if (!trimmed || trimmed === "Iligan City, Philippines") return "";
  return trimmed;
}

async function ensureSamplePosts(pool) {
  try {
    // Migration: clear out any legacy hardcoded "Iligan City, Philippines" placeholder
    await pool.query(
      "UPDATE posts SET location = NULL WHERE location = 'Iligan City, Philippines'",
    );

    const { rows } = await pool.query("SELECT id FROM posts LIMIT 1");
    if (rows.length === 0) {
      const { rows: users } = await pool.query("SELECT id FROM users LIMIT 3");
      const u1 = users[0]?.id || 1;
      const u2 = users[1]?.id || u1;

      await pool.query(
        `INSERT INTO posts (user_id, content, image_url, category, privacy, location, likes_count, comments_count, shares_count)
         VALUES
         ($1, 'Mga suki! Naa tay presko ug tam-is nga apple karon.🍎 Puno sa vitamins ug perfect para sa tibuok pamilya!', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80', 'Wholesaler', 'Public', NULL, 142, 22, 55),
         ($2, 'Mga suki! Naa tay presko nga durian karon. Puno sa vitamins ug perfect para sa tibuok pamilya!', 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=800&q=80', 'Temporary', 'Public', NULL, 289, 41, 18)`,
        [u1, u2],
      );
    }
  } catch (e) {
    console.warn("ensureSamplePosts error:", e.message);
  }
}

// 14.1.0 Get Saved / Bookmarked Posts
app.get("/api/posts/saved", authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT sp.id AS saved_id, sp.collection_name, sp.created_at AS saved_at,
                p.id, p.user_id, p.original_post_id, p.content, p.image_url, p.category, p.privacy, p.location,
                p.likes_count, p.comments_count, p.shares_count, p.created_at,
                u.first_name, u.last_name, u.username, u.avatar_url, u.role,
                EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) AS is_liked,
                orig.id AS orig_id, orig.user_id AS orig_user_id, orig.content AS orig_content, orig.image_url AS orig_image_url,
                orig.category AS orig_category, orig.location AS orig_location, orig.created_at AS orig_created_at,
                orig_u.first_name AS orig_first_name, orig_u.last_name AS orig_last_name,
                orig_u.username AS orig_username, orig_u.avatar_url AS orig_avatar_url, orig_u.role AS orig_role
         FROM saved_posts sp
         JOIN posts p ON sp.post_id = p.id
         JOIN users u ON p.user_id = u.id
         LEFT JOIN posts orig ON p.original_post_id = orig.id
         LEFT JOIN users orig_u ON orig.user_id = orig_u.id
         WHERE sp.user_id = $2
         ORDER BY sp.created_at DESC`,
      [userId, userId],
    );

    const savedPosts = rows.map((r) => {
      const isShared = Boolean(r.original_post_id && r.orig_id);
      return {
        savedId: String(r.saved_id),
        collectionName: r.collection_name,
        savedAt: formatTimeAgo(r.saved_at),
        id: String(r.id),
        userId: String(r.user_id),
        authorName:
          `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
          r.username ||
          "Local Farmer",
        authorRole: r.category || (r.role === "admin" ? "Wholesaler" : "Field"),
        avatarUri: r.avatar_url || "",
        location: sanitizePostLocation(r.location),
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
              authorName:
                `${r.orig_first_name || ""} ${r.orig_last_name || ""}`.trim() ||
                r.orig_username ||
                "Local Farmer",
              authorRole:
                r.orig_category ||
                (r.orig_role === "admin" ? "Wholesaler" : "Field"),
              avatarUri: r.orig_avatar_url || "",
              location: sanitizePostLocation(r.orig_location),
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
    res
      .status(500)
      .json({ message: err.message || "Failed to fetch saved posts." });
  }
});

// 14.1 Get User's Saved Post Collections
app.get("/api/posts/saved/collections", authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT DISTINCT collection_name
         FROM saved_posts
         WHERE user_id = $1
         ORDER BY collection_name ASC`,
      [userId],
    );

    const collections = rows.map((r) => r.collection_name);
    if (!collections.includes("All Saved")) {
      collections.unshift("All Saved");
    }

    res.json({ collections });
  } catch (err) {
    console.error("[Get Saved Collections Error]", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to fetch collections." });
  }
});

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
               p.expires_at, p.likes_count, p.comments_count, p.shares_count, p.created_at,
               u.first_name, u.last_name, u.username, u.avatar_url, u.role,
               EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) AS is_liked,
               EXISTS(SELECT 1 FROM saved_posts sp WHERE sp.post_id = p.id AND sp.user_id = $2) AS is_saved,
               COALESCE(
                 (
                   SELECT json_agg(json_build_object(
                     'id', CAST(tu.user_id AS TEXT),
                     'name', COALESCE(NULLIF(TRIM(CONCAT(tu_u.first_name, ' ', tu_u.last_name)), ''), tu_u.username, 'User'),
                     'username', tu_u.username,
                     'avatarUrl', tu_u.avatar_url
                   ))
                   FROM tagged_users tu
                   JOIN users tu_u ON tu.user_id = tu_u.id
                   WHERE tu.post_id = p.id
                 ),
                 '[]'::json
               ) AS tagged_users,
               orig.id AS orig_id, orig.user_id AS orig_user_id, orig.content AS orig_content, orig.image_url AS orig_image_url,
               orig.category AS orig_category, orig.location AS orig_location, orig.created_at AS orig_created_at,
               orig_u.first_name AS orig_first_name, orig_u.last_name AS orig_last_name,
               orig_u.username AS orig_username, orig_u.avatar_url AS orig_avatar_url, orig_u.role AS orig_role
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN posts orig ON p.original_post_id = orig.id
        LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      `;

      let whereClauses = [
        // Privacy enforcement
        `(
          p.privacy = 'Public'
          OR p.user_id = $3
          OR EXISTS (SELECT 1 FROM tagged_users tu WHERE tu.post_id = p.id AND tu.user_id = $3)
          OR (
            p.privacy = 'Friends'
            AND EXISTS (
              SELECT 1 FROM connections c
              WHERE c.status = 'accepted'
                AND (
                  (c.sender_id = $4 AND c.receiver_id = p.user_id)
                  OR
                  (c.sender_id = p.user_id AND c.receiver_id = $5)
                )
            )
          )
        )`,
        // Exclude expired temporary posts
        `(p.category != 'Temporary' OR p.expires_at IS NULL OR p.expires_at > NOW())`,
      ];

      const params = [
        currentUserId, // for is_liked
        currentUserId, // for is_saved
        currentUserId, // for p.user_id = ? / tagged user check
        currentUserId, // for friend connection sender
        currentUserId, // for friend connection receiver
      ];

      let paramCounter = 6;
      if (
        category &&
        category.toLowerCase() !== "all" &&
        category.toLowerCase() !== "general"
      ) {
        whereClauses.push(`p.category = $${paramCounter}`);
        params.push(category);
        paramCounter++;
      }

      if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }

      query += " ORDER BY p.created_at DESC LIMIT 50";

      const { rows } = await pool.query(query, params);

      const posts = rows.map((r) => {
        const isShared = Boolean(r.original_post_id && r.orig_id);
        const taggedList = Array.isArray(r.tagged_users) ? r.tagged_users : [];
        return {
          id: String(r.id),
          userId: String(r.user_id),
          authorName:
            `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
            r.username ||
            "Local Farmer",
          authorRole:
            r.category || (r.role === "admin" ? "Wholesaler" : "Field"),
          avatarUri: r.avatar_url || "",
          location: sanitizePostLocation(r.location),
          timeAgo: formatTimeAgo(r.created_at),
          content: r.content,
          imageUrl: r.image_url || "",
          category: r.category,
          privacy: r.privacy,
          expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
          taggedUsers: taggedList,
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
                authorName:
                  `${r.orig_first_name || ""} ${r.orig_last_name || ""}`.trim() ||
                  r.orig_username ||
                  "Local Farmer",
                authorRole:
                  r.orig_category ||
                  (r.orig_role === "admin" ? "Wholesaler" : "Field"),
                avatarUri: r.orig_avatar_url || "",
                location: sanitizePostLocation(r.orig_location),
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
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch posts." });
    }
  },
);

// 14.2 Create New Post
app.post(
  ["/api/posts", "/api/posts/create"],
  authenticateToken,
  async (req, res) => {
    try {
      const {
        content,
        category,
        privacy,
        location,
        photos,
        imageUrl,
        taggedUserIds,
        expiresAt,
        temporaryDuration,
        durationLabel,
      } = req.body;
      const text = (content || "").trim();

      const chosenImage =
        imageUrl ||
        (Array.isArray(photos) && photos.length > 0 ? photos[0] : null);

      if (!text && !chosenImage) {
        return res
          .status(400)
          .json({ message: "Post content or photo is required." });
      }

      const pool = getPool();
      const userId = req.user.id;

      const validCategory = [
        "Field",
        "Wholesaler",
        "Temporary",
        "General",
      ].includes(category)
        ? category
        : "General";

      const validPrivacy = ["Public", "Friends", "Only me"].includes(privacy)
        ? privacy
        : "Public";

      const postLocation = sanitizePostLocation(location);

      // Determine expiration timestamp for Temporary category
      let postExpiresAt = null;
      if (validCategory === "Temporary") {
        if (expiresAt) {
          const d = new Date(expiresAt);
          postExpiresAt = isNaN(d.getTime())
            ? new Date(Date.now() + 24 * 3600 * 1000)
            : d;
        } else if (temporaryDuration) {
          const ms = Number(temporaryDuration) || 24 * 3600 * 1000;
          postExpiresAt = new Date(Date.now() + ms);
        } else {
          postExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);
        }
      }

      const { rows: insertRes } = await pool.query(
        `INSERT INTO posts (user_id, content, image_url, category, privacy, location, expires_at, likes_count, comments_count, shares_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0) RETURNING id`,
        [
          userId,
          text,
          chosenImage,
          validCategory,
          validPrivacy,
          postLocation || null,
          postExpiresAt,
        ],
      );

      const postId = insertRes[0].id;

      // Fetch user details to return complete post object
      const { rows: userRows } = await pool.query(
        "SELECT first_name, last_name, username, avatar_url, role FROM users WHERE id = $1",
        [userId],
      );
      const userRow = userRows[0];

      // Handle Tagged Users
      const normalizedTaggedIds = Array.isArray(taggedUserIds)
        ? [
            ...new Set(
              taggedUserIds
                .map((id) => Number(id))
                .filter((id) => !isNaN(id) && id > 0 && id !== Number(userId)),
            ),
          ]
        : [];

      const taggedUsersList = [];
      const authorDisplayName =
        `${userRow?.first_name || ""} ${userRow?.last_name || ""}`.trim() ||
        userRow?.username ||
        "Someone";

      for (const taggedId of normalizedTaggedIds) {
        try {
          await pool.query(
            "INSERT INTO tagged_users (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [postId, taggedId],
          );

          const { rows: tuRows } = await pool.query(
            "SELECT id, first_name, last_name, username, avatar_url FROM users WHERE id = $1",
            [taggedId],
          );
          if (tuRows.length > 0) {
            const tu = tuRows[0];
            taggedUsersList.push({
              id: String(tu.id),
              name:
                `${tu.first_name || ""} ${tu.last_name || ""}`.trim() ||
                tu.username ||
                "User",
              username: tu.username || "",
              avatarUrl: tu.avatar_url || "",
            });
          }

          // Send notification to tagged user
          await pool.query(
            `INSERT INTO notifications (user_id, actor_id, actor_type, type, title, content, entity_name, target_id, is_read)
             VALUES ($1, $2, 'user', 'tag', 'Tagged in a Post', $3, 'post', $4, FALSE)`,
            [
              taggedId,
              userId,
              `${authorDisplayName} tagged you in a post.`,
              postId,
            ],
          );
        } catch (tagErr) {
          console.warn(
            `[Tagging User Error] Could not tag user ${taggedId}:`,
            tagErr.message,
          );
        }
      }

      const newPost = {
        id: String(postId),
        userId: String(userId),
        authorName: authorDisplayName,
        authorRole:
          validCategory || (userRow?.role === "admin" ? "Wholesaler" : "Field"),
        avatarUri: userRow?.avatar_url || "",
        location: postLocation || "",
        timeAgo: "Just now",
        content: text,
        imageUrl: chosenImage || "",
        category: validCategory,
        privacy: validPrivacy,
        expiresAt: postExpiresAt ? postExpiresAt.toISOString() : null,
        durationLabel: durationLabel || undefined,
        taggedUsers: taggedUsersList,
        likes: 0,
        comments: 0,
        shares: 0,
        isLiked: false,
      };

      res
        .status(201)
        .json({ message: "Post created successfully!", post: newPost });
    } catch (err) {
      console.error("[Create Post Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to create post." });
    }
  },
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

      const { rows: existing } = await pool.query(
        "SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2",
        [postId, userId],
      );

      let isLiked = false;
      if (existing.length > 0) {
        // Unlike
        await pool.query(
          "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2",
          [postId, userId],
        );
        await pool.query(
          "UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1",
          [postId],
        );
        isLiked = false;
      } else {
        // Like
        await pool.query(
          "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)",
          [postId, userId],
        );
        await pool.query(
          "UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1",
          [postId],
        );
        isLiked = true;

        // Notify post author if different user
        try {
          const { rows: pRows } = await pool.query(
            "SELECT user_id FROM posts WHERE id = $1",
            [postId],
          );
          if (pRows.length > 0 && pRows[0].user_id !== userId) {
            const postAuthorId = pRows[0].user_id;
            const { rows: uRows } = await pool.query(
              "SELECT first_name, last_name, username FROM users WHERE id = $1",
              [userId],
            );
            const likerName =
              `${uRows[0]?.first_name || ""} ${uRows[0]?.last_name || ""}`.trim() ||
              uRows[0]?.username ||
              "Someone";

            await pool.query(
              `INSERT INTO notifications (user_id, actor_id, actor_type, type, title, content, entity_name, target_id, is_read)
               VALUES ($1, $2, 'user', 'like', 'Post Reaction', $3, 'post', $4, FALSE)`,
              [postAuthorId, userId, `${likerName} liked your post.`, postId],
            );
          }
        } catch (likeNotifErr) {
          console.warn("[Like Notification Warning]", likeNotifErr.message);
        }
      }

      const { rows: postRows } = await pool.query(
        "SELECT likes_count FROM posts WHERE id = $1",
        [postId],
      );
      const postRow = postRows[0];

      res.json({
        message: isLiked ? "Post liked!" : "Post unliked.",
        isLiked,
        likesCount: Number(postRow?.likes_count) || 0,
      });
    } catch (err) {
      console.error("[Like Post Error]", err);
      res.status(500).json({ message: err.message || "Failed to like post." });
    }
  },
);

// 14.2.1 Get Single Post
app.get("/api/posts/:id", optionalAuthenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const pool = getPool();
    const currentUserId = req.user?.id || 0;

    const query = `
        SELECT p.id, p.user_id, p.original_post_id, p.content, p.image_url, p.category, p.privacy, p.location,
               p.expires_at, p.likes_count, p.comments_count, p.shares_count, p.created_at,
               u.first_name, u.last_name, u.username, u.avatar_url, u.role,
               EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) AS is_liked,
               EXISTS(SELECT 1 FROM saved_posts sp WHERE sp.post_id = p.id AND sp.user_id = $2) AS is_saved,
               COALESCE(
                 (
                   SELECT json_agg(json_build_object(
                     'id', CAST(tu.user_id AS TEXT),
                     'name', COALESCE(NULLIF(TRIM(CONCAT(tu_u.first_name, ' ', tu_u.last_name)), ''), tu_u.username, 'User'),
                     'username', tu_u.username,
                     'avatarUrl', tu_u.avatar_url
                   ))
                   FROM tagged_users tu
                   JOIN users tu_u ON tu.user_id = tu_u.id
                   WHERE tu.post_id = p.id
                 ),
                 '[]'::json
               ) AS tagged_users
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $3
        LIMIT 1
      `;

    const { rows } = await pool.query(query, [
      currentUserId,
      currentUserId,
      postId,
    ]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Post not found." });
    }

    const r = rows[0];
    const taggedList = Array.isArray(r.tagged_users) ? r.tagged_users : [];
    const post = {
      id: String(r.id),
      userId: String(r.user_id),
      authorName:
        `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
        r.username ||
        "Local Farmer",
      authorRole: r.category || (r.role === "admin" ? "Wholesaler" : "Field"),
      avatarUri: r.avatar_url || "",
      location: sanitizePostLocation(r.location),
      timeAgo: formatTimeAgo(r.created_at),
      content: r.content,
      imageUrl: r.image_url || "",
      category: r.category,
      privacy: r.privacy,
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      taggedUsers: taggedList,
      likes: Number(r.likes_count) || 0,
      comments: Number(r.comments_count) || 0,
      shares: Number(r.shares_count) || 0,
      isLiked: Boolean(r.is_liked),
      isSaved: Boolean(r.is_saved),
    };

    res.json({ post });
  } catch (err) {
    console.error("[Get Post Error]", err);
    res.status(500).json({ message: err.message || "Failed to fetch post." });
  }
});

// 14.3.1 Edit Post / Update Privacy / Category / Content / Location / Photos
app.put(
  ["/api/posts/:id", "/api/posts/update"],
  authenticateToken,
  async (req, res) => {
    try {
      const postId = req.params.id || req.body.id || req.body.postId;
      const { content, category, privacy, location, imageUrl, photos } =
        req.body;
      const pool = getPool();
      const userId = req.user.id;
      const role = req.user.role;

      const { rows: postRows } = await pool.query(
        "SELECT * FROM posts WHERE id = $1",
        [postId],
      );
      const post = postRows[0];
      if (!post) {
        return res.status(404).json({ message: "Post not found." });
      }

      if (Number(post.user_id) !== Number(userId) && role !== "admin") {
        return res
          .status(403)
          .json({ message: "Unauthorized to modify this post." });
      }

      const validCategory =
        category &&
        ["Field", "Wholesaler", "Temporary", "General"].includes(category)
          ? category
          : post.category;

      const validPrivacy =
        privacy && ["Public", "Friends", "Only me"].includes(privacy)
          ? privacy
          : post.privacy;

      const updatedContent = content !== undefined ? content : post.content;
      const updatedLocation =
        location !== undefined ? sanitizePostLocation(location) : post.location;

      let updatedImage = post.image_url;
      if (imageUrl !== undefined) {
        updatedImage = imageUrl;
      } else if (Array.isArray(photos)) {
        updatedImage = photos.length > 0 ? photos[0] : null;
      }

      await pool.query(
        "UPDATE posts SET content = $1, category = $2, privacy = $3, location = $4, image_url = $5, updated_at = NOW() WHERE id = $6",
        [
          updatedContent,
          validCategory,
          validPrivacy,
          updatedLocation || null,
          updatedImage || null,
          postId,
        ],
      );

      res.json({
        message: "Post updated successfully!",
        post: {
          id: String(postId),
          content: updatedContent,
          category: validCategory,
          privacy: validPrivacy,
          location: updatedLocation || "",
          imageUrl: updatedImage || "",
        },
      });
    } catch (err) {
      console.error("[Update Post Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to update post." });
    }
  },
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

      const { rows: postRows } = await pool.query(
        "SELECT * FROM posts WHERE id = $1",
        [postId],
      );
      const post = postRows[0];
      if (!post) {
        return res.status(404).json({ message: "Post not found." });
      }

      if (Number(post.user_id) !== Number(userId) && role !== "admin") {
        return res
          .status(403)
          .json({ message: "Unauthorized to delete this post." });
      }

      // If this was a shared post, decrement the original post's shares_count
      if (post.original_post_id) {
        await pool.query(
          "UPDATE posts SET shares_count = GREATEST(0, shares_count - 1) WHERE id = $1",
          [post.original_post_id],
        );
      }

      await pool.query("DELETE FROM posts WHERE id = $1", [postId]);

      res.json({ message: "Post deleted successfully!" });
    } catch (err) {
      console.error("[Delete Post Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to delete post." });
    }
  },
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

      const { rows: existing } = await pool.query(
        "SELECT id FROM saved_posts WHERE user_id = $1 AND post_id = $2",
        [userId, postId],
      );

      let isSaved = false;
      if (collectionName) {
        // Moving/updating to a specific collection
        if (existing.length > 0) {
          await pool.query(
            "UPDATE saved_posts SET collection_name = $1 WHERE id = $2",
            [collectionName, existing[0].id],
          );
        } else {
          await pool.query(
            "INSERT INTO saved_posts (user_id, post_id, collection_name) VALUES ($1, $2, $3)",
            [userId, postId, collectionName],
          );
        }
        isSaved = true;
      } else {
        // Toggle save/unsave (no collection specified)
        if (existing.length > 0) {
          await pool.query("DELETE FROM saved_posts WHERE id = $1", [
            existing[0].id,
          ]);
          isSaved = false;
        } else {
          await pool.query(
            "INSERT INTO saved_posts (user_id, post_id, collection_name) VALUES ($1, $2, $3)",
            [userId, postId, "All Saved"],
          );
          isSaved = true;
        }
      }

      res.json({
        message: isSaved
          ? "Post saved to your collection!"
          : "Post removed from saved.",
        isSaved,
      });
    } catch (err) {
      console.error("[Save Post Error]", err);
      res.status(500).json({ message: err.message || "Failed to save post." });
    }
  },
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

      const { rows } = await pool.query(
        `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.likes_count, c.created_at,
                u.first_name, u.last_name, u.username, u.avatar_url,
                EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $1) AS is_liked
         FROM post_comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.post_id = $2
         ORDER BY c.created_at ASC`,
        [currentUserId, postId],
      );

      const comments = rows.map((r) => ({
        id: String(r.id),
        postId: String(r.post_id),
        userId: String(r.user_id),
        authorName:
          `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
          r.username ||
          "Local Farmer",
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
      res
        .status(500)
        .json({ message: err.message || "Failed to fetch comments." });
    }
  },
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
        return res
          .status(400)
          .json({ message: "Comment content is required." });
      }

      const pool = getPool();
      const userId = req.user.id;
      let parent =
        parentId && !isNaN(Number(parentId)) ? Number(parentId) : null;

      if (parent) {
        try {
          const { rows: parentRows } = await pool.query(
            "SELECT id FROM post_comments WHERE id = $1",
            [parent],
          );
          if (parentRows.length === 0) {
            parent = null;
          }
        } catch {
          parent = null;
        }
      }

      let postNum = postId && !isNaN(Number(postId)) ? Number(postId) : null;
      let commentId = Date.now();

      if (postNum) {
        try {
          const { rows: insertRes } = await pool.query(
            "INSERT INTO post_comments (post_id, user_id, parent_id, content, likes_count) VALUES ($1, $2, $3, $4, 0) RETURNING id",
            [postNum, userId, parent, text],
          );
          commentId = insertRes[0].id;

          // Increment comments_count on posts table
          await pool.query(
            "UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1",
            [postNum],
          );

          // Notify post author if different user
          try {
            const { rows: postAuthorRows } = await pool.query(
              "SELECT user_id FROM posts WHERE id = $1",
              [postNum],
            );
            if (
              postAuthorRows.length > 0 &&
              postAuthorRows[0].user_id !== userId
            ) {
              const postAuthorId = postAuthorRows[0].user_id;
              const { rows: commenterRows } = await pool.query(
                "SELECT first_name, last_name, username FROM users WHERE id = $1",
                [userId],
              );
              const commenterName =
                `${commenterRows[0]?.first_name || ""} ${commenterRows[0]?.last_name || ""}`.trim() ||
                commenterRows[0]?.username ||
                "Someone";

              await pool.query(
                `INSERT INTO notifications (user_id, actor_id, actor_type, type, title, content, entity_name, target_id, is_read)
                 VALUES ($1, $2, 'user', 'comment', 'Post Comment', $3, 'post', $4, FALSE)`,
                [
                  postAuthorId,
                  userId,
                  `${commenterName} commented on your post: "${text.substring(0, 40)}${text.length > 40 ? "..." : ""}"`,
                  postNum,
                ],
              );
            }
          } catch (commentNotifErr) {
            console.warn(
              "[Comment Notification Warning]",
              commentNotifErr.message,
            );
          }
        } catch (dbErr) {
          console.warn("[Add Comment DB Warning]", dbErr.message);
        }
      }

      // Fetch author info
      let userRow = null;
      try {
        const { rows: uRows } = await pool.query(
          "SELECT first_name, last_name, username, avatar_url FROM users WHERE id = $1",
          [userId],
        );
        userRow = uRows[0];
      } catch {}

      const newComment = {
        id: String(commentId),
        postId: String(postId),
        userId: String(userId),
        authorName:
          `${userRow?.first_name || ""} ${userRow?.last_name || ""}`.trim() ||
          userRow?.username ||
          req.user?.username ||
          "Local Farmer",
        avatarUri: userRow?.avatar_url || "",
        timeAgo: "Just now",
        content: text,
        likes: 0,
        isLiked: false,
        parentId: parentId ? String(parentId) : null,
      };

      res.status(201).json({ message: "Comment posted!", comment: newComment });
    } catch (err) {
      console.error("[Add Comment Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to post comment." });
    }
  },
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

      const { rows: existing } = await pool.query(
        "SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
        [commentId, userId],
      );

      let isLiked = false;
      if (existing.length > 0) {
        // Unlike
        await pool.query(
          "DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
          [commentId, userId],
        );
        await pool.query(
          "UPDATE post_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1",
          [commentId],
        );
        isLiked = false;
      } else {
        // Like
        await pool.query(
          "INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)",
          [commentId, userId],
        );
        await pool.query(
          "UPDATE post_comments SET likes_count = likes_count + 1 WHERE id = $1",
          [commentId],
        );
        isLiked = true;
      }

      const { rows: commentRows } = await pool.query(
        "SELECT likes_count FROM post_comments WHERE id = $1",
        [commentId],
      );
      const commentRow = commentRows[0];

      res.json({
        message: isLiked ? "Comment liked!" : "Comment unliked.",
        isLiked,
        likesCount: Number(commentRow?.likes_count) || 0,
      });
    } catch (err) {
      console.error("[Like Comment Error]", err);
      res
        .status(500)
        .json({ message: err.message || "Failed to like comment." });
    }
  },
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
      const { rows: targetRows } = await pool.query(
        "SELECT p.*, u.first_name, u.last_name, u.username, u.avatar_url, u.role FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1",
        [postId],
      );
      const targetPost = targetRows[0];

      if (!targetPost) {
        return res.status(404).json({ message: "Original post not found." });
      }

      const actualOriginalPostId = targetPost.original_post_id
        ? targetPost.original_post_id
        : targetPost.id;

      // 1. Record share in post_shares table
      await pool.query(
        "INSERT INTO post_shares (post_id, user_id, share_type) VALUES ($1, $2, $3)",
        [postId, userId, shareType || "public"],
      );

      // 2. Increment shares_count on original post
      await pool.query(
        "UPDATE posts SET shares_count = shares_count + 1 WHERE id = $1",
        [postId],
      );

      // 3. Create shared post in feed if public/feed share
      let createdSharedPost = null;
      if (!shareType || shareType === "public" || shareType === "feed") {
        const { rows: insertRes } = await pool.query(
          `INSERT INTO posts (user_id, original_post_id, content, image_url, category, privacy, location, likes_count, comments_count, shares_count)
           VALUES ($1, $2, $3, $4, $5, 'Public', $6, 0, 0, 0) RETURNING id`,
          [
            userId,
            actualOriginalPostId,
            (caption || "").trim(),
            null,
            targetPost.category || "General",
            sanitizePostLocation(targetPost.location) || null,
          ],
        );

        const newPostId = insertRes[0].id;

        const { rows: userRows } = await pool.query(
          "SELECT first_name, last_name, username, avatar_url, role FROM users WHERE id = $1",
          [userId],
        );
        const userRow = userRows[0];

        const { rows: origRows } = await pool.query(
          "SELECT p.*, u.first_name, u.last_name, u.username, u.avatar_url, u.role FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1",
          [actualOriginalPostId],
        );
        const origRow = origRows[0];

        createdSharedPost = {
          id: String(newPostId),
          userId: String(userId),
          authorName:
            `${userRow?.first_name || ""} ${userRow?.last_name || ""}`.trim() ||
            userRow?.username ||
            "Local Farmer",
          authorRole:
            targetPost.category ||
            (userRow?.role === "admin" ? "Wholesaler" : "Field"),
          avatarUri: userRow?.avatar_url || "",
          location: sanitizePostLocation(targetPost.location),
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
          originalPost: origRow
            ? {
                id: String(origRow.id),
                userId: String(origRow.user_id),
                authorName:
                  `${origRow.first_name || ""} ${origRow.last_name || ""}`.trim() ||
                  origRow.username ||
                  "Local Farmer",
                authorRole:
                  origRow.category ||
                  (origRow.role === "admin" ? "Wholesaler" : "Field"),
                avatarUri: origRow.avatar_url || "",
                location: sanitizePostLocation(origRow.location),
                timeAgo: formatTimeAgo(origRow.created_at),
                content: origRow.content,
                imageUrl: origRow.image_url || "",
                category: origRow.category,
              }
            : null,
        };
      }

      const { rows: postRows } = await pool.query(
        "SELECT shares_count FROM posts WHERE id = $1",
        [postId],
      );
      const postRow = postRows[0];

      res.json({
        message: "Post shared successfully to your feed!",
        sharesCount: Number(postRow?.shares_count) || 0,
        sharedPost: createdSharedPost,
      });
    } catch (err) {
      console.error("[Share Post Error]", err);
      res.status(500).json({ message: err.message || "Failed to share post." });
    }
  },
);

// ============================================================================
// SECTION 15: STORIES API
// ============================================================================

async function ensureSampleStories(pool) {
  try {
    const { rows } = await pool.query(
      "SELECT id FROM stories WHERE expired_at > NOW() LIMIT 1"
    );
    if (rows.length === 0) {
      const { rows: users } = await pool.query("SELECT id FROM users LIMIT 3");
      const u1 = users[0]?.id || 1;
      const u2 = users[1]?.id || u1;

      await pool.query(
        `INSERT INTO stories (user_id, media_type, media_url, text_content, background_color, privacy, created_at, expired_at)
         VALUES
         ($1, 'image', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80', 'Fresh harvest from our organic farm today! 🌿🍅', '#72AF5B', 'Public', NOW(), NOW() + INTERVAL '24 hours'),
         ($2, 'image', 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80', 'Organizing new seed packs for wholesale orders 🥕', '#4F46E5', 'Public', NOW(), NOW() + INTERVAL '24 hours')`,
        [u1, u2]
      );
    }
  } catch (e) {
    console.warn("ensureSampleStories error:", e.message);
  }
}

// 15.1 Get Active Stories
app.get("/api/stories", optionalAuthenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const currentUserId = req.user?.id || 0;

    await ensureSampleStories(pool);

    const query = `
      SELECT s.id, s.user_id, s.media_type, s.media_url, s.text_content, s.background_color,
             s.music_title, s.privacy, s.created_at, s.expired_at,
             u.first_name, u.last_name, u.username, u.avatar_url,
             EXISTS(SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = $1) AS is_seen
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.expired_at > NOW()
      ORDER BY s.user_id ASC, s.created_at ASC
    `;

    const { rows } = await pool.query(query, [currentUserId]);

    const userStoryMap = new Map();

    for (const r of rows) {
      const uId = String(r.user_id);
      if (!userStoryMap.has(uId)) {
        const userName =
          `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
          r.username ||
          "Local Farmer";
        userStoryMap.set(uId, {
          userId: uId,
          userName,
          userAvatar: r.avatar_url || "",
          color: r.background_color || "#72AF5B",
          stories: [],
        });
      }

      userStoryMap.get(uId).stories.push({
        id: String(r.id),
        imageUrl: r.media_url || "",
        content: r.text_content || "",
        isSeen: Boolean(r.is_seen),
        timeAgo: formatTimeAgo(r.created_at),
        backgroundColor: r.background_color,
        mediaType: r.media_type,
      });
    }

    const userStories = Array.from(userStoryMap.values());
    res.json({ stories: userStories, count: userStories.length });
  } catch (err) {
    console.error("[Get Stories Error]", err);
    res.status(500).json({ message: err.message || "Failed to fetch stories." });
  }
});

// 15.2 Create Story
app.post("/api/stories", authenticateToken, async (req, res) => {
  try {
    const { mediaUrl, textContent, backgroundColor, musicTitle, privacy, mediaType } = req.body;
    const userId = req.user.id;

    if (!mediaUrl && !textContent) {
      return res.status(400).json({ message: "Photo or story text is required." });
    }

    const pool = getPool();
    const validPrivacy = ["Public", "Friends", "Only me"].includes(privacy) ? privacy : "Public";
    const storyMediaType = mediaType || (mediaUrl ? "image" : "text");

    const { rows: insertRes } = await pool.query(
      `INSERT INTO stories (user_id, media_type, media_url, text_content, background_color, music_title, privacy, created_at, expired_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '24 hours')
       RETURNING id, created_at, expired_at`,
      [
        userId,
        storyMediaType,
        mediaUrl || null,
        textContent || null,
        backgroundColor || "#72AF5B",
        musicTitle || null,
        validPrivacy,
      ]
    );

    const newStory = insertRes[0];

    res.status(201).json({
      message: "Story created successfully!",
      story: {
        id: String(newStory.id),
        imageUrl: mediaUrl || "",
        content: textContent || "",
        isSeen: false,
        timeAgo: "Just now",
        backgroundColor: backgroundColor || "#72AF5B",
      },
    });
  } catch (err) {
    console.error("[Create Story Error]", err);
    res.status(500).json({ message: err.message || "Failed to create story." });
  }
});

// 15.3 Mark Story Viewed
app.post("/api/stories/:id/view", authenticateToken, async (req, res) => {
  try {
    const storyId = req.params.id;
    const viewerId = req.user.id;
    const pool = getPool();

    await pool.query(
      `INSERT INTO story_views (story_id, viewer_id, view_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (story_id, viewer_id) DO NOTHING`,
      [storyId, viewerId]
    );

    res.json({ message: "Story view recorded." });
  } catch (err) {
    console.error("[Story View Error]", err);
    res.status(500).json({ message: err.message || "Failed to record story view." });
  }
});

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
