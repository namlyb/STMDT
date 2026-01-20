const Stall = require("../models/Stall");

const StallController = {
  getStallByAccount: async (req, res) => {
    try {
      const accountId = Number(req.params.accountId); // cast sang số
      const stall = await Stall.getByAccountId(accountId);

      //console.log("Stall fetch result:", stall);

      if (!stall) return res.status(404).json({ message: "Gian hàng không tồn tại" });

      res.json(stall);
    } catch (err) {
      console.error("getStallByAccount error:", err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },
};

module.exports = StallController;
