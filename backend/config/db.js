const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "stmdt",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  dateStrings: true,
  timezone: "+07:00" 
});

const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL connected to STMDT");
    connection.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };
