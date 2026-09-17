const { Pool } = require("pg");
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

    // 2. Test connection
    const client = await pool.connect();
    client.release();

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
