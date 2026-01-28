const ShipType = require("../models/ShipType");

const ShipTypeController = {
  getAll: async (req, res) => {
    try {
      const shipTypes = await ShipType.getAll();
      res.json(shipTypes);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  create: async (req, res) => {
    try {
      const { content, shipFee } = req.body;
      const shipTypeId = await ShipType.create(content, shipFee);
      res.status(201).json({ 
        message: "Tạo loại ship thành công",
        shipTypeId 
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  }
};

module.exports = ShipTypeController;