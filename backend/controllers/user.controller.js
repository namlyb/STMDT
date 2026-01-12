const { sql } = require("../config/db");

exports.getUsers = async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM Accounts`;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
