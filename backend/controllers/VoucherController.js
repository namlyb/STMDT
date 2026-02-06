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

  // Hàm tạo voucher dành riêng cho seller với validation
  createForSeller: async (req, res) => {
    try {
      // Kiểm tra role - chỉ seller mới được dùng hàm này
      if (req.user.RoleId !== 3) {
        return res.status(403).json({ message: "Chỉ seller mới được tạo voucher với validation này" });
      }

      // Gán CreatedBy từ thông tin người dùng đăng nhập
      const voucherData = {
        ...req.body,
        CreatedBy: req.user.AccountId
      };

      const voucherId = await Voucher.createForSeller(voucherData);
      res.status(201).json({
        message: "Tạo voucher thành công",
        VoucherId: voucherId
      });
    } catch (err) {
      console.error(err);
      res.status(400).json({ 
        message: err.message || "Lỗi khi tạo voucher" 
      });
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
