const sql = require("mssql");

const config = {
  user: "sa",
  password: "123456",
  server: "localhost",
  database: "duan1",
  options: {
    trustServerCertificate: true
  }
};

const connectDB = async () => {
  try {
    await sql.connect(config);
    console.log("SQL Server connected");
  } catch (err) {
    console.error(err);
  }
};

module.exports = { sql, connectDB };
