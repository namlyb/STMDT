const PaymentMethod = require("../models/PaymentMethod");
const sepayConfig = require('../config/sepay');

const PaymentMethodController = {
  // Lấy tất cả payment methods (active)
  getAll: async (req, res) => {
    try {
      const methods = await PaymentMethod.getAll();
      res.json(methods);
    } catch (error) {
      console.error("Error in PaymentMethodController.getAll:", error);
      res.status(500).json({ 
        message: "Lỗi server khi lấy danh sách phương thức thanh toán",
        error: error.message 
      });
    }
  },

  // Lấy payment method theo ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const method = await PaymentMethod.getById(id);
      
      if (!method) {
        return res.status(404).json({ 
          message: "Không tìm thấy phương thức thanh toán" 
        });
      }
      
      res.json(method);
    } catch (error) {
      console.error("Error in PaymentMethodController.getById:", error);
      res.status(500).json({ 
        message: "Lỗi server khi lấy thông tin phương thức thanh toán",
        error: error.message 
      });
    }
  }
};

module.exports = PaymentMethodController;