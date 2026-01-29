const { pool } = require("../config/db");

const PaymentMethod = {
  // Lấy tất cả payment methods (active)
  getAll: async () => {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM PaymentMethods WHERE Status = 1 ORDER BY MethodId ASC"
      );
      return rows;
    } catch (error) {
      console.error("Error in PaymentMethod.getAll:", error);
      throw error;
    }
  },

  // Lấy payment method theo ID
  getById: async (id) => {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM PaymentMethods WHERE MethodId = ? AND Status = 1",
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error("Error in PaymentMethod.getById:", error);
      throw error;
    }
  },

  // Lấy payment method theo tên
  getByName: async (name) => {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM PaymentMethods WHERE MethodName = ? AND Status = 1",
        [name]
      );
      return rows[0];
    } catch (error) {
      console.error("Error in PaymentMethod.getByName:", error);
      throw error;
    }
  },
};

module.exports = PaymentMethod;