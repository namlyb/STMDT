const { pool } = require("../config/db");

const Role = {
  getAll: async () => {
    const [rows] = await pool.query(`SELECT * FROM Roles`);
    return rows;
  }
};

module.exports = Role;
