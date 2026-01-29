const PlatformFee = require("../models/PlatformFees");

const PlatformFeeController = {
  // Lấy tất cả platform fees (active)
  getAll: async (req, res) => {
    try {
      const fees = await PlatformFee.getAll();
      res.json(fees);
    } catch (error) {
      console.error("Error in PlatformFeeController.getAll:", error);
      res.status(500).json({ 
        message: "Lỗi server khi lấy danh sách thuế",
        error: error.message 
      });
    }
  },

  // Lấy tất cả bao gồm cả inactive
  getAllWithInactive: async (req, res) => {
    try {
      const fees = await PlatformFee.getAllWithInactive();
      res.json(fees);
    } catch (error) {
      console.error("Error in PlatformFeeController.getAllWithInactive:", error);
      res.status(500).json({ 
        message: "Lỗi server khi lấy danh sách thuế",
        error: error.message 
      });
    }
  },

  // Lấy platform fee theo ID
  getById: async (req, res) => {
    try {
      const fee = await PlatformFee.getById(req.params.id);
      if (!fee) {
        return res.status(404).json({ message: "Không tìm thấy mức thuế" });
      }
      res.json(fee);
    } catch (error) {
      console.error("Error in PlatformFeeController.getById:", error);
      res.status(500).json({ 
        message: "Lỗi server khi lấy thông tin thuế",
        error: error.message 
      });
    }
  },

  // Lấy mức thuế áp dụng cho một giá trị đơn hàng
  getApplicable: async (req, res) => {
    try {
      const { orderValue } = req.params;
      const fee = await PlatformFee.getApplicableFee(orderValue);
      if (!fee) {
        return res.status(404).json({ message: "Không tìm thấy mức thuế phù hợp" });
      }
      res.json(fee);
    } catch (error) {
      console.error("Error in PlatformFeeController.getApplicable:", error);
      res.status(500).json({ 
        message: "Lỗi server khi tìm thuế áp dụng",
        error: error.message 
      });
    }
  },

  // Tạo platform fee mới
  create: async (req, res) => {
    try {
      const { PercentValue, MinOrderValue, MaxOrderValue, Description } = req.body;
      
      // Validation
      if (!PercentValue || MinOrderValue === undefined) {
        return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" });
      }
      
      const percent = parseFloat(PercentValue);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        return res.status(400).json({ message: "Phần trăm thuế phải từ 0-100%" });
      }
      
      const min = parseInt(MinOrderValue);
      if (min < 0) {
        return res.status(400).json({ message: "Giá trị tối thiểu không được âm" });
      }
      
      const max = MaxOrderValue ? parseInt(MaxOrderValue) : null;
      if (max !== null && max <= min) {
        return res.status(400).json({ message: "Giá trị tối đa phải lớn hơn giá trị tối thiểu" });
      }
      
      // Kiểm tra chồng chéo khoảng giá trị
      const validation = await PlatformFee.validateRange(min, max);
      if (validation.hasOverlap) {
        return res.status(400).json({ 
          message: "Khoảng giá trị này chồng chéo với mức thuế khác. Vui lòng kiểm tra lại." 
        });
      }
      
      // Kiểm tra khoảng trống (nếu có dữ liệu trước đó)
      if (validation.maxPrevEnd !== null && validation.maxPrevEnd !== undefined) {
        if (min > validation.maxPrevEnd + 1) {
          return res.status(400).json({ 
            message: `Có khoảng trống giữa các mức thuế. Khoảng tiếp theo nên bắt đầu từ ${validation.maxPrevEnd + 1}đ` 
          });
        }
      }
      
      const newFee = await PlatformFee.create({
        PercentValue: percent,
        MinOrderValue: min,
        MaxOrderValue: max,
        Description: Description || `Áp dụng cho đơn hàng từ ${min.toLocaleString()}đ${max ? ` đến ${max.toLocaleString()}đ` : ' trở lên'}`
      });
      
      res.status(201).json({
        message: "Đã thêm mức thuế mới",
        data: newFee
      });
    } catch (error) {
      console.error("Error in PlatformFeeController.create:", error);
      res.status(500).json({ 
        message: "Lỗi server khi tạo thuế mới",
        error: error.message 
      });
    }
  },

  // Cập nhật platform fee
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { PercentValue, MinOrderValue, MaxOrderValue, Description } = req.body;
      
      // Validation
      if (!PercentValue || MinOrderValue === undefined) {
        return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" });
      }
      
      const percent = parseFloat(PercentValue);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        return res.status(400).json({ message: "Phần trăm thuế phải từ 0-100%" });
      }
      
      const min = parseInt(MinOrderValue);
      if (min < 0) {
        return res.status(400).json({ message: "Giá trị tối thiểu không được âm" });
      }
      
      const max = MaxOrderValue ? parseInt(MaxOrderValue) : null;
      if (max !== null && max <= min) {
        return res.status(400).json({ message: "Giá trị tối đa phải lớn hơn giá trị tối thiểu" });
      }
      
      // Kiểm tra chồng chéo (loại trừ bản thân)
      const validation = await PlatformFee.validateRange(min, max, id);
      if (validation.hasOverlap) {
        return res.status(400).json({ 
          message: "Khoảng giá trị này chồng chéo với mức thuế khác" 
        });
      }
      
      const updatedFee = await PlatformFee.update(id, {
        PercentValue: percent,
        MinOrderValue: min,
        MaxOrderValue: max,
        Description: Description || `Áp dụng cho đơn hàng từ ${min.toLocaleString()}đ${max ? ` đến ${max.toLocaleString()}đ` : ' trở lên'}`
      });
      
      res.json({
        message: "Đã cập nhật mức thuế",
        data: updatedFee
      });
    } catch (error) {
      console.error("Error in PlatformFeeController.update:", error);
      res.status(500).json({ 
        message: "Lỗi server khi cập nhật thuế",
        error: error.message 
      });
    }
  },

  // Xóa mềm platform fee
  softDelete: async (req, res) => {
    try {
      const { id } = req.params;
      await PlatformFee.softDelete(id);
      res.json({ message: "Đã xóa mức thuế" });
    } catch (error) {
      console.error("Error in PlatformFeeController.softDelete:", error);
      res.status(500).json({ 
        message: "Lỗi server khi xóa thuế",
        error: error.message 
      });
    }
  },

  // Kích hoạt lại platform fee
  activate: async (req, res) => {
    try {
      const { id } = req.params;
      await PlatformFee.activate(id);
      res.json({ message: "Đã kích hoạt lại mức thuế" });
    } catch (error) {
      console.error("Error in PlatformFeeController.activate:", error);
      res.status(500).json({ 
        message: "Lỗi server khi kích hoạt thuế",
        error: error.message 
      });
    }
  }
};

module.exports = PlatformFeeController;