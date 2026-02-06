const Stall = require("../models/Stall");
const Product = require("../models/Product");
const Feedback = require("../models/Feedback");

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

  getStallDetail: async (req, res) => {
  try {
    const { id } = req.params;

    const stall = await Stall.getByStallId(id);
    if (!stall) {
      return res.status(404).json({ message: "Không tìm thấy gian hàng" });
    }

    const products = await Product.getByStallId(id);

    res.json({
      stall,
      products
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
},

getStallFeedbacks: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Lấy feedbacks của stall thông qua các sản phẩm
      const feedbacks = await Feedback.getByStallId(id);
      
      res.json(feedbacks);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },
};

module.exports = StallController;
