const Voucher = require("../models/Voucher");

const VoucherController = {
  create: async (req, res) => {
    try {
      const voucherId = await Voucher.create(req.body);
      res.status(201).json({
        message: "Tạo voucher thành công",
        VoucherId: voucherId
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  getBySeller: async (req, res) => {
    try {
      const vouchers = await Voucher.getBySeller(req.params.sellerId);
      res.json(vouchers);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  getById: async (req, res) => {
    const voucher = await Voucher.getById(req.params.id);
    res.json(voucher);
  },

  update: async (req, res) => {
    const { Quantity, EndTime } = req.body;
    const affected = await Voucher.update(req.params.id, Quantity, EndTime);

    if (!affected) {
      return res.status(404).json({ message: "Voucher không tồn tại" });
    }

    res.json({ message: "Cập nhật voucher thành công" });
  },
  
  getByAdmin: async (req, res) => {
  try {
    const vouchers = await Voucher.getByAdmin();
    res.status(200).json(vouchers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
},

getRandom: async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 8;
    const accountId = req.user?.AccountId || null;

    const vouchers = await Voucher.getRandom(limit, accountId);
    res.json(vouchers);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
},


};

module.exports = VoucherController;
