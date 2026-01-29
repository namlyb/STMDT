const { pool } = require("../config/db");

const PlatformFee = {
  // Lấy tất cả platform fees (active)
  getAll: async () => {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM PlatformFees WHERE Status = 1 ORDER BY MinOrderValue ASC"
      );
      return rows;
    } catch (error) {
      console.error("Error in PlatformFee.getAll:", error);
      throw error;
    }
  },

  // Lấy tất cả bao gồm cả inactive
  getAllWithInactive: async () => {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM PlatformFees ORDER BY Status DESC, MinOrderValue ASC"
      );
      return rows;
    } catch (error) {
      console.error("Error in PlatformFee.getAllWithInactive:", error);
      throw error;
    }
  },

  // Lấy platform fee theo ID
  getById: async (id) => {
    try {
      const [rows] = await pool.query("SELECT * FROM PlatformFees WHERE FeeId = ?", [id]);
      return rows[0];
    } catch (error) {
      console.error("Error in PlatformFee.getById:", error);
      throw error;
    }
  },

  // Lấy mức thuế áp dụng cho một giá trị đơn hàng
  getApplicableFee: async (orderValue) => {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM PlatformFees 
         WHERE Status = 1 
           AND MinOrderValue <= ? 
           AND (MaxOrderValue IS NULL OR MaxOrderValue >= ?)
         ORDER BY MinOrderValue DESC
         LIMIT 1`,
        [orderValue, orderValue]
      );
      
      return rows[0] || null;
    } catch (error) {
      console.error("Error in PlatformFee.getApplicableFee:", error);
      throw error;
    }
  },

  // Kiểm tra chồng chéo và khoảng trống (sát nút)
  validateRange: async (min, max, excludeId = null) => {
  try {
    // Tìm max_prev_end: MaxOrderValue lớn nhất của các bản ghi có MaxOrderValue < min
    let queryPrev = `
      SELECT MAX(MaxOrderValue) as max_prev_end
      FROM PlatformFees 
      WHERE Status = 1 AND MaxOrderValue < ?
    `;
    let paramsPrev = [min];

    if (excludeId) {
      queryPrev += " AND FeeId != ?";
      paramsPrev.push(excludeId);
    }

    // Tìm min_next_start: MinOrderValue nhỏ nhất của các bản ghi có MinOrderValue > (max hoặc min nếu max null)
    // Nếu max là null, thì chúng ta tìm các bản ghi có MinOrderValue > min
    let queryNext = `
      SELECT MIN(MinOrderValue) as min_next_start
      FROM PlatformFees 
      WHERE Status = 1 AND MinOrderValue > ?
    `;
    let paramsNext = [max || min];

    if (excludeId) {
      queryNext += " AND FeeId != ?";
      paramsNext.push(excludeId);
    }

    // Kiểm tra chồng chéo
    let overlapQuery = `
      SELECT COUNT(*) as count 
      FROM PlatformFees 
      WHERE Status = 1 
        AND (
          (? <= IFNULL(MaxOrderValue, 999999999) 
           AND IFNULL(?, 999999999) >= MinOrderValue)
        )
    `;
    let overlapParams = [min, max || 999999999];
    if (excludeId) {
      overlapQuery += " AND FeeId != ?";
      overlapParams.push(excludeId);
    }

    const [prevRows] = await pool.query(queryPrev, paramsPrev);
    const [nextRows] = await pool.query(queryNext, paramsNext);
    const [overlapRows] = await pool.query(overlapQuery, overlapParams);

    const hasOverlap = overlapRows[0].count > 0;
    const maxPrevEnd = prevRows[0].max_prev_end;
    const minNextStart = nextRows[0].min_next_start;

    return {
      hasOverlap,
      maxPrevEnd,
      minNextStart
    };
  } catch (error) {
    console.error("Error in PlatformFee.validateRange:", error);
    throw error;
  }
},

  // Tạo platform fee mới
  create: async (platformFee) => {
    try {
      const { PercentValue, MinOrderValue, MaxOrderValue, Description } = platformFee;
      
      const [result] = await pool.query(
        "INSERT INTO PlatformFees (PercentValue, MinOrderValue, MaxOrderValue, Description) VALUES (?, ?, ?, ?)",
        [PercentValue, MinOrderValue, MaxOrderValue || null, Description]
      );
      
      return { FeeId: result.insertId, ...platformFee };
    } catch (error) {
      console.error("Error in PlatformFee.create:", error);
      throw error;
    }
  },

  // Cập nhật platform fee
  update: async (id, platformFee) => {
    try {
      const { PercentValue, MinOrderValue, MaxOrderValue, Description } = platformFee;
      
      await pool.query(
        "UPDATE PlatformFees SET PercentValue = ?, MinOrderValue = ?, MaxOrderValue = ?, Description = ? WHERE FeeId = ?",
        [PercentValue, MinOrderValue, MaxOrderValue || null, Description, id]
      );
      
      return { FeeId: id, ...platformFee };
    } catch (error) {
      console.error("Error in PlatformFee.update:", error);
      throw error;
    }
  },

  // Xóa mềm platform fee
  softDelete: async (id) => {
    try {
      await pool.query("UPDATE PlatformFees SET Status = 0 WHERE FeeId = ?", [id]);
      return true;
    } catch (error) {
      console.error("Error in PlatformFee.softDelete:", error);
      throw error;
    }
  },

  // Kích hoạt lại platform fee
  activate: async (id) => {
    try {
      await pool.query("UPDATE PlatformFees SET Status = 1 WHERE FeeId = ?", [id]);
      return true;
    } catch (error) {
      console.error("Error in PlatformFee.activate:", error);
      throw error;
    }
  }
};

module.exports = PlatformFee;