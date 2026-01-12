exports.register = async (req, res) => {
  res.json({
    message: "Register API OK",
    data: req.body
  });
};

const { sql } = require("../config/db");

exports.getUsers = async (req, res) => {
  const result = await sql.query`SELECT * FROM Accounts`;
  res.json(result.recordset);
};
