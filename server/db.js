const mysql = require("mysql2/promise");
const fs = require("fs");
const { spawn } = require("child_process");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "localfarm",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool;

async function autoStartMySQLIfAvailable() {
  if (process.platform === "win32") {
    const xamppMysqld = "C:\\xampp\\mysql\\bin\\mysqld.exe";
    const xamppIni = "C:\\xampp\\mysql\\bin\\my.ini";
    if (fs.existsSync(xamppMysqld)) {
      console.log("[MySQL] Attempting to auto-start XAMPP MySQL daemon...");
      try {
        const subprocess = spawn(xamppMysqld, [`--defaults-file=${xamppIni}`, "--standalone"], {
          detached: true,
          stdio: "ignore",
        });
        subprocess.unref();
        await new Promise((resolve) => setTimeout(resolve, 3500));
        return true;
      } catch (spawnErr) {
        console.warn("[MySQL] Could not auto-start mysqld:", spawnErr.message);
      }
    }
  }
  return false;
}

async function initDB() {
  try {
    // 1. Connect without database to ensure DB exists (with retry and auto-start)
    let rootConn;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        rootConn = await mysql.createConnection({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password,
        });
        break;
      } catch (connErr) {
        if (connErr.code === "ECONNREFUSED" && attempt === 1) {
          const started = await autoStartMySQLIfAvailable();
          if (started) continue;
        }
        if (attempt === 3) throw connErr;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    );
    await rootConn.end();

    // 2. Create pool connected to database
    pool = mysql.createPool(dbConfig);

    // 3. Create users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`first_name\` VARCHAR(100) DEFAULT NULL,
        \`last_name\` VARCHAR(100) DEFAULT NULL,
        \`full_name\` VARCHAR(200) DEFAULT NULL,
        \`username\` VARCHAR(100) UNIQUE DEFAULT NULL,
        \`email\` VARCHAR(191) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`phone_number\` VARCHAR(50) DEFAULT NULL,
        \`gender\` ENUM('Male', 'Female', 'Other') DEFAULT NULL,
        \`role\` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        \`avatar_url\` LONGTEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure avatar_url column is LONGTEXT for Base64 / URL images
    try {
      await pool.query(`ALTER TABLE \`users\` MODIFY COLUMN \`avatar_url\` LONGTEXT DEFAULT NULL;`);
    } catch {}

    // Ensure bio column exists for user profile about/bio
    try {
      await pool.query(`ALTER TABLE \`users\` ADD COLUMN \`bio\` TEXT DEFAULT NULL;`);
    } catch {}

    // 4. Create password_resets / otps table for OTP verification
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`otps\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`email\` VARCHAR(191) NOT NULL,
        \`otp\` VARCHAR(10) NOT NULL,
        \`type\` ENUM('signup', 'recovery') NOT NULL DEFAULT 'signup',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`expires_at\` DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Create connections / friendships table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`connections\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`sender_id\` INT NOT NULL,
        \`receiver_id\` INT NOT NULL,
        \`status\` ENUM('pending', 'accepted', 'declined', 'blocked') NOT NULL DEFAULT 'pending',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`receiver_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        UNIQUE KEY \`unique_connection\` (\`sender_id\`, \`receiver_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safe migration: Add collection_name to connections if missing
    try {
      await pool.query(`
        ALTER TABLE \`connections\`
        ADD COLUMN \`collection_name\` VARCHAR(100) NOT NULL DEFAULT 'All Connections' AFTER \`status\`;
      `);
    } catch (e) {}

    // 6. Create conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`conversations\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user1_id\` INT NOT NULL,
        \`user2_id\` INT NOT NULL,
        \`last_message\` TEXT DEFAULT NULL,
        \`last_message_time\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user1_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`user2_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        UNIQUE KEY \`unique_pair\` (\`user1_id\`, \`user2_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`messages\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`conversation_id\` INT NOT NULL,
        \`sender_id\` INT NOT NULL,
        \`receiver_id\` INT NOT NULL,
        \`message_text\` LONGTEXT NOT NULL,
        \`message_type\` ENUM('text', 'image', 'file') NOT NULL DEFAULT 'text',
        \`image_url\` LONGTEXT DEFAULT NULL,
        \`is_read\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`receiver_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safe migration: Support location and extended message types
    try {
      await pool.query(`ALTER TABLE \`messages\` MODIFY COLUMN \`message_type\` VARCHAR(50) NOT NULL DEFAULT 'text';`);
    } catch (e) {}

    // 8. Create posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`posts\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`original_post_id\` INT DEFAULT NULL,
        \`content\` LONGTEXT NOT NULL,
        \`image_url\` LONGTEXT DEFAULT NULL,
        \`category\` ENUM('Field', 'Wholesaler', 'Temporary', 'General') NOT NULL DEFAULT 'General',
        \`privacy\` ENUM('Public', 'Friends', 'Only me') NOT NULL DEFAULT 'Public',
        \`location\` VARCHAR(255) DEFAULT 'Iligan City, Philippines',
        \`likes_count\` INT NOT NULL DEFAULT 0,
        \`comments_count\` INT NOT NULL DEFAULT 0,
        \`shares_count\` INT NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`original_post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safe migration: Add original_post_id if table was already created
    try {
      await pool.query(`
        ALTER TABLE \`posts\`
        ADD COLUMN \`original_post_id\` INT DEFAULT NULL AFTER \`user_id\`;
      `);
    } catch (e) {}

    // 9. Create post_likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`post_likes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`post_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        UNIQUE KEY \`unique_like\` (\`post_id\`, \`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Create post_comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`post_comments\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`post_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`parent_id\` INT DEFAULT NULL,
        \`content\` TEXT NOT NULL,
        \`likes_count\` INT NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`parent_id\`) REFERENCES \`post_comments\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Create comment_likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`comment_likes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`comment_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`comment_id\`) REFERENCES \`post_comments\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        UNIQUE KEY \`unique_comment_like\` (\`comment_id\`, \`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. Create post_shares table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`post_shares\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`post_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`share_type\` VARCHAR(50) NOT NULL DEFAULT 'public',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 13. Create saved_posts / bookmarks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`saved_posts\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`post_id\` INT NOT NULL,
        \`collection_name\` VARCHAR(100) NOT NULL DEFAULT 'All Saved',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE,
        UNIQUE KEY \`unique_user_saved_post\` (\`user_id\`, \`post_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log(`[MySQL] Connected successfully to database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
  } catch (err) {
    console.error("[MySQL] Connection error:", err.message);
    if (err.code === "ECONNREFUSED") {
      console.error(
        `[MySQL] Could not connect to MySQL at ${dbConfig.host}:${dbConfig.port}. ` +
          "Please ensure MySQL is running (e.g., via the XAMPP Control Panel or 'npm run mysql:start')."
      );
    }
  }
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

module.exports = {
  initDB,
  getPool,
};
