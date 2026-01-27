const VoucherUsage = require("../models/VoucherUsage");

const VoucherUsageController = {

  // ================= LƯU VOUCHER =================
  saveVoucher: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      const { voucherId } = req.body;

      await VoucherUsage.create(voucherId, accountId);

      res.json({ message: "Lưu voucher thành công" });

    } catch (err) {
      if (err.message === "ALREADY_RECEIVED") {
        return res.status(400).json({ message: "Đã nhận voucher này" });
      }
      if (err.message === "OUT_OF_STOCK") {
        return res.status(400).json({ message: "Voucher đã hết" });
      }
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ================= LẤY VOUCHER USER =================
  getMyVouchers: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      const vouchers = await VoucherUsage.getByAccount(accountId);
      res.json(vouchers);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },
  
  getByAccount: async (req, res) => {
    try {
      const accountId = req.params.accountId;
      const vouchers = await VoucherUsage.getByAccount(accountId);
      res.json(vouchers);
    } catch (err) {
      console.error("Error getting voucher usage:", err);
      res.status(500).json({ message: "Lỗi khi lấy voucher" });
    }
  },
};

module.exports = VoucherUsageController;
