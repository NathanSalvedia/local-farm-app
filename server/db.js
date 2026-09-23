const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "local-farm",
  max: 10, // max number of connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

let pool;

async function initDB() {
  try {
    // 1. Create pool connected to database
    pool = new Pool(dbConfig);

    // 2. Test connection and run minor migrations
    const client = await pool.connect();
    try {
      await client.query(
        "ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN NOT NULL DEFAULT FALSE;"
      );
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_conversation_settings (
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          is_spam BOOLEAN NOT NULL DEFAULT FALSE,
          is_muted BOOLEAN NOT NULL DEFAULT FALSE,
          is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (user_id, conversation_id)
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS restricted_users (
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          restricted_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (user_id, restricted_user_id)
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id SERIAL PRIMARY KEY,
          reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reported_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
          reason VARCHAR(255) NOT NULL,
          statement TEXT NOT NULL,
          attachment_url TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } catch (migErr) {
      console.warn("[PostgreSQL] Migration notice:", migErr.message);
    } finally {
      client.release();
    }

    console.log(
      `[PostgreSQL] Connected successfully to database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`
    );
  } catch (err) {
    console.error("[PostgreSQL] Connection error:", err.message);
    if (err.code === "ECONNREFUSED") {
      console.error(
        `[PostgreSQL] Could not connect to PostgreSQL at ${dbConfig.host}:${dbConfig.port}. ` +
          "Please ensure PostgreSQL is running."
      );
    }
    if (err.code === "3D000") {
      console.error(
        `[PostgreSQL] Database "${dbConfig.database}" does not exist. ` +
          "Please create it in pgAdmin 4."
      );
    }
  }
}

function getPool() {
  if (!pool) {
    pool = new Pool(dbConfig);
  }
  return pool;
}

module.exports = {
  initDB,
  getPool,
};
