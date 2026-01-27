const ShipType = require("../models/ShipType");

const ShipTypeController = {
  getAll: async (req, res) => {
    try {
      const shipTypes = await ShipType.getAll();
      res.status(200).json(shipTypes);
    } catch (err) {
      console.error("Get ship types error:", err);
      res.status(500).json({ message: "Không thể lấy kiểu vận chuyển" });
    }
  }
};

module.exports = ShipTypeController;
