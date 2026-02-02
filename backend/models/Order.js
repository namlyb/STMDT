const { pool } = require("../config/db");
const VoucherUsage = require("./VoucherUsage");

const Order = {
  getByIds: async (accountId, cartIds) => {
    const sql = `
      SELECT
        c.CartId,
        c.Quantity,
        c.UnitPrice,
        p.ProductId,
        p.ProductName,
        p.Description,
        p.Image
      FROM Carts c
      JOIN Products p ON c.ProductId = p.ProductId
      WHERE c.AccountId = ?
        AND c.CartId IN (?)
        AND c.Status = 1
    `;

    const [rows] = await pool.query(sql, [accountId, cartIds]);
    return rows;
  },

    getCheckoutItems: async (accountId, cartIds) => {
    try {
      // Lấy thông tin sản phẩm từ cart
      const placeholders = cartIds.map(() => "?").join(",");
      const cartParams = [accountId, ...cartIds];
      
      const [cartItems] = await pool.query(
        `
        SELECT 
          c.CartId,
          c.Quantity,
          c.UnitPrice,
          (c.Quantity * c.UnitPrice) AS totalPrice,
          p.ProductId,
          p.ProductName,
          p.Image,
          s.StallId,
          s.AccountId AS SellerAccountId
        FROM Carts c
        JOIN Products p ON p.ProductId = c.ProductId
        JOIN Stalls s ON s.StallId = p.StallId
        WHERE c.AccountId = ?
          AND c.CartId IN (${placeholders})
          AND c.Status = 1
        `,
        cartParams
      );

      if (cartItems.length === 0) return [];

      // Lấy voucher SẢN PHẨM của account (CHỈ LOẠI fixed, percent) và chỉ của Admin (CreatedBy=1) hoặc của chính Stall
      const [itemVouchers] = await pool.query(
        `
        SELECT 
          vu.UsageId,
          v.VoucherId,
          v.VoucherName,
          v.DiscountType,
          v.DiscountValue,
          v.MinOrderValue,
          v.MaxDiscount,
          v.EndTime,
          v.CreatedBy,
          s.StallId
        FROM VoucherUsage vu
        JOIN Vouchers v ON v.VoucherId = vu.VoucherId
        LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
        WHERE vu.AccountId = ?
          AND vu.IsUsed = 0
          AND v.EndTime >= CURDATE()
          AND v.DiscountType IN ('fixed', 'percent')
          AND (v.CreatedBy = 1 OR s.StallId IN (${cartItems.map(item => item.StallId).join(',')}))
        `,
        [accountId]
      );

      // Gắn voucher sản phẩm phù hợp cho từng sản phẩm
      const itemsWithVouchers = cartItems.map(item => {
        // Voucher sản phẩm: từ Admin (CreatedBy = 1) hoặc từ chính Stall (StallId trùng)
        const productVouchers = itemVouchers.filter(v => 
          v.CreatedBy === 1 || v.StallId === item.StallId
        );

        return {
          ...item,
          vouchers: productVouchers,
          selectedVoucher: null,
          selectedShipType: null
        };
      });

      return itemsWithVouchers;
    } catch (error) {
      console.error("Error in getCheckoutItems:", error);
      throw error;
    }
  },

  checkoutBuyNow: async (accountId, productId, quantity) => {
    // Lấy thông tin sản phẩm
    const [productRows] = await pool.query(
      `
      SELECT
        p.ProductId,
        p.ProductName,
        p.Image,
        p.Price AS UnitPrice,
        s.StallId,
        s.AccountId AS SellerAccountId
      FROM Products p
      JOIN Stalls s ON s.StallId = p.StallId
      WHERE p.ProductId = ?
        AND p.IsActive = 1
      `,
      [productId]
    );

    if (productRows.length === 0) return [];

    const product = productRows[0];
    const totalPrice = product.UnitPrice * quantity;

    // Lấy voucher của account
    const [vouchers] = await pool.query(
      `
      SELECT 
        vu.UsageId,
        v.VoucherId,
        v.VoucherName,
        v.DiscountType,
        v.DiscountValue,
        v.MinOrderValue,
        v.MaxDiscount,
        v.EndTime,
        v.CreatedBy,
        s.StallId
      FROM VoucherUsage vu
      JOIN Vouchers v ON v.VoucherId = vu.VoucherId
      LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
      WHERE vu.AccountId = ?
        AND vu.IsUsed = 0
        AND v.EndTime >= CURDATE()
      `,
      [accountId]
    );

    // Lọc voucher cho sản phẩm này
    const itemVouchers = vouchers.filter(v => 
      v.DiscountType !== "ship" && // Voucher sản phẩm không bao gồm loại ship
      (v.CreatedBy === 1 || v.StallId === product.StallId)
    );

    return [{
      CartId: null,
      ProductId: product.ProductId,
      ProductName: product.ProductName,
      Image: product.Image,
      Quantity: quantity,
      UnitPrice: product.UnitPrice,
      totalPrice: totalPrice,
      StallId: product.StallId,
      SellerAccountId: product.SellerAccountId,
      vouchers: itemVouchers,
      selectedVoucher: null,
      selectedShipType: null
    }];
  },

  // Lấy voucher toàn đơn (chỉ của admin)
  getOrderVouchers: async (accountId) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT 
          vu.UsageId,
          v.VoucherId,
          v.VoucherName,
          v.DiscountType,
          v.DiscountValue,
          v.MinOrderValue,
          v.MaxDiscount,
          v.EndTime,
          v.CreatedBy
        FROM VoucherUsage vu
        JOIN Vouchers v ON v.VoucherId = vu.VoucherId
        WHERE vu.AccountId = ?
          AND vu.IsUsed = 0
          AND v.EndTime >= CURDATE()
          AND v.CreatedBy = 1  -- Chỉ voucher của Admin
          AND v.DiscountType IN ('fixed', 'percent', 'ship')
        ORDER BY v.EndTime ASC
        `,
        [accountId]
      );
      return rows;
    } catch (error) {
      console.error("Error in getOrderVouchers:", error);
      throw error;
    }
  },

  // Lấy TẤT CẢ voucher (cả sản phẩm và toàn đơn) - để kiểm tra trùng lặp
  getAllVouchers: async (accountId) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT 
          vu.UsageId,
          v.VoucherId,
          v.VoucherName,
          v.DiscountType,
          v.DiscountValue,
          v.MinOrderValue,
          v.MaxDiscount,
          v.EndTime,
          v.CreatedBy,
          s.StallId,
          CASE 
            WHEN v.DiscountType = 'ship' THEN 'order'
            WHEN v.CreatedBy = 1 AND v.DiscountType IN ('fixed', 'percent') THEN 'both'  -- Có thể dùng cho cả 2
            ELSE 'product'
          END as voucherType
        FROM VoucherUsage vu
        JOIN Vouchers v ON v.VoucherId = vu.VoucherId
        LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
        WHERE vu.AccountId = ?
          AND vu.IsUsed = 0
          AND v.EndTime >= CURDATE()
        `,
        [accountId]
      );
      return rows;
    } catch (error) {
      console.error("Error in getAllVouchers:", error);
      throw error;
    }
  },

   createOrder: async (orderData) => {
    const {
      AccountId,
      AddressId,
      MethodId,
      UsageId,
      FinalPrice,
      OrderDate
    } = orderData;

    const [result] = await pool.query(
      `INSERT INTO Orders (AccountId, AddressId, MethodId, UsageId, FinalPrice, OrderDate, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [AccountId, AddressId, MethodId, UsageId, FinalPrice, OrderDate]
    );

    return result.insertId;
  },

  // Kiểm tra và lấy thông tin sản phẩm
  getProductDetails: async (productId) => {
    const [rows] = await pool.query(
      `SELECT p.ProductId, p.Price, p.StallId, s.AccountId as SellerAccountId
       FROM Products p
       JOIN Stalls s ON p.StallId = s.StallId
       WHERE p.ProductId = ? AND p.IsActive = 1 AND p.Status = 1`,
      [productId]
    );
    return rows[0];
  },

  // Lấy platform fee dựa trên giá sản phẩm
  getApplicableFee: async (unitPrice) => {
    const [rows] = await pool.query(
      `SELECT FeeId FROM PlatformFees 
       WHERE Status = 1 
         AND MinOrderValue <= ?
         AND (MaxOrderValue IS NULL OR MaxOrderValue >= ?)
       ORDER BY MinOrderValue DESC
       LIMIT 1`,
      [unitPrice, unitPrice]
    );
    return rows[0] ? rows[0].FeeId : null;
  },

  createOrderTransaction: async (connection, orderData) => {
    const {
      accountId,
      addressId,
      methodId,
      orderVoucherId,
      grandTotal,
      orderDate,
      orderItems
    } = orderData;

    // 1. Tạo đơn hàng chính
    const [orderResult] = await connection.query(
      `INSERT INTO Orders (AccountId, AddressId, MethodId, UsageId, FinalPrice, OrderDate, Status, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [accountId, addressId, methodId, orderVoucherId || null, grandTotal, orderDate]
    );
    const orderId = orderResult.insertId;

    // 2. Tạo chi tiết đơn hàng và thu thập thông tin voucher sử dụng
    const orderDetails = [];
    const usedProductVouchers = new Map(); // Map<usageId, quantityUsed>

    for (const item of orderItems) {
      const [detailResult] = await connection.query(
        `INSERT INTO OrderDetails (OrderId, ProductId, UsageId, UnitPrice, Quantity, ShipTypeId, ShipFee, FeeId, Status, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [orderId, item.productId, item.voucherId || null, item.unitPrice, 
         item.quantity, item.shipTypeId, item.shipFee, item.feeId]
      );

      // Thêm vào danh sách chi tiết đơn hàng
      orderDetails.push({
        orderDetailId: detailResult.insertId,
        ...item
      });

      // Đếm số lần sử dụng voucher sản phẩm
      if (item.voucherId) {
        const currentCount = usedProductVouchers.get(item.voucherId) || 0;
        usedProductVouchers.set(item.voucherId, currentCount + 1);
      }
    }

    // 3. Xử lý voucher
    const voucherResults = [];

    // Xử lý voucher sản phẩm
    for (const [usageId, quantityUsed] of usedProductVouchers) {
      const result = await VoucherUsage.decrementVoucherQuantity(usageId, quantityUsed);
      voucherResults.push({
        type: 'product',
        usageId,
        quantityUsed,
        result
      });
    }

    // Xử lý voucher toàn đơn
    if (orderVoucherId) {
      const result = await VoucherUsage.decrementVoucherQuantity(orderVoucherId, 1);
      voucherResults.push({
        type: 'order',
        usageId: orderVoucherId,
        quantityUsed: 1,
        result
      });
    }

    // 4. Tạo lịch sử trạng thái đơn hàng
    for (const detail of orderDetails) {
      const trackingCode = `TRACK-${orderId}-${detail.orderDetailId}-${Date.now()}`;
      await connection.query(
        `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, 'Đã đặt hàng', NOW())`,
        [detail.orderDetailId, trackingCode]
      );
    }

    // 5. Xóa cart items nếu cần
    if (orderData.cartIds && orderData.cartIds.length > 0) {
      await connection.query(
        "UPDATE Carts SET Status = 0 WHERE CartId IN (?)",
        [orderData.cartIds]
      );
    }

    return {
      orderId,
      orderDetails,
      voucherResults
    };
  },

  // Hàm tạo đơn hàng với xử lý voucher trong cùng transaction
  createOrderTransactionWithVouchers: async (connection, orderData, productVoucherUsage, orderVoucherIdParam) => {
    const {
      accountId,
      addressId,
      methodId,
      orderVoucherId,
      grandTotal,
      orderDate,
      orderItems,
      cartIds
    } = orderData;

    // 1. Tạo đơn hàng chính
    const [orderResult] = await connection.query(
      `INSERT INTO Orders (AccountId, AddressId, MethodId, UsageId, FinalPrice, OrderDate, Status, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [accountId, addressId, methodId, orderVoucherId || null, grandTotal, orderDate]
    );
    const orderId = orderResult.insertId;

    // 2. Tạo chi tiết đơn hàng
    const orderDetails = [];
    for (const item of orderItems) {
      const [detailResult] = await connection.query(
        `INSERT INTO OrderDetails (OrderId, ProductId, UsageId, UnitPrice, Quantity, ShipTypeId, ShipFee, FeeId, Status, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [orderId, item.productId, item.voucherId || null, item.unitPrice, 
         item.quantity, item.shipTypeId, item.shipFee, item.feeId]
      );

      orderDetails.push({
        orderDetailId: detailResult.insertId,
        ...item
      });
    }

    // 3. Xử lý voucher sản phẩm TRONG CÙNG TRANSACTION
    for (const [usageId, quantityUsed] of productVoucherUsage) {
      // Kiểm tra voucher tồn tại và có đủ quantity không
      const [voucherRows] = await connection.query(
        `SELECT vu.* FROM VoucherUsage vu WHERE vu.UsageId = ? AND vu.Quantity >= ?`,
        [usageId, quantityUsed]
      );

      if (!voucherRows.length) {
        throw new Error(`Voucher không tồn tại hoặc không đủ quantity`);
      }

      const currentQuantity = voucherRows[0].Quantity;
      const newQuantity = currentQuantity - quantityUsed;

      // Cập nhật quantity và IsUsed
      const [updateResult] = await connection.query(
        `UPDATE VoucherUsage 
         SET Quantity = ?,
             IsUsed = CASE WHEN ? <= 0 THEN 1 ELSE IsUsed END
         WHERE UsageId = ?`,
        [newQuantity, newQuantity, usageId]
      );

      if (updateResult.affectedRows === 0) {
        throw new Error(`Không thể cập nhật voucher ${usageId}`);
      }
    }

    // 4. Xử lý voucher toàn đơn nếu có
    if (orderVoucherIdParam) {
      const [voucherRows] = await connection.query(
        `SELECT vu.* FROM VoucherUsage vu WHERE vu.UsageId = ? AND vu.Quantity >= 1`,
        [orderVoucherIdParam]
      );

      if (!voucherRows.length) {
        throw new Error(`Voucher toàn đơn không tồn tại hoặc không đủ quantity`);
      }

      const currentQuantity = voucherRows[0].Quantity;
      const newQuantity = currentQuantity - 1;

      const [updateResult] = await connection.query(
        `UPDATE VoucherUsage 
         SET Quantity = ?,
             IsUsed = CASE WHEN ? <= 0 THEN 1 ELSE IsUsed END
         WHERE UsageId = ?`,
        [newQuantity, newQuantity, orderVoucherIdParam]
      );

      if (updateResult.affectedRows === 0) {
        throw new Error(`Không thể cập nhật voucher toàn đơn ${orderVoucherIdParam}`);
      }
    }

    // 5. Tạo lịch sử trạng thái đơn hàng
    for (const detail of orderDetails) {
      const trackingCode = `TRACK-${orderId}-${detail.orderDetailId}-${Date.now()}`;
      await connection.query(
        `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, 'Đã đặt hàng', NOW())`,
        [detail.orderDetailId, trackingCode]
      );
    }

    // 6. Xóa cart items nếu cần
    if (cartIds && cartIds.length > 0) {
      await connection.query(
        "UPDATE Carts SET Status = 0 WHERE CartId IN (?)",
        [cartIds]
      );
    }

    return {
      orderId,
      orderDetails
    };
  },

  // Lấy thông tin sản phẩm cho checkout với voucher tương ứng
  getCheckoutData: async (accountId, cartIds) => {
    try {
      if (!cartIds.length) return { items: [] };

      const placeholders = cartIds.map(() => "?").join(",");
      const cartParams = [accountId, ...cartIds];
      
      // Lấy thông tin sản phẩm từ cart
      const [cartItems] = await pool.query(
        `
        SELECT 
          c.CartId,
          c.Quantity,
          c.UnitPrice,
          (c.Quantity * c.UnitPrice) AS totalPrice,
          p.ProductId,
          p.ProductName,
          p.Image,
          s.StallId,
          s.AccountId AS SellerAccountId
        FROM Carts c
        JOIN Products p ON p.ProductId = c.ProductId
        JOIN Stalls s ON s.StallId = p.StallId
        WHERE c.AccountId = ?
          AND c.CartId IN (${placeholders})
          AND c.Status = 1
        `,
        cartParams
      );

      if (cartItems.length === 0) return { items: [] };

      // Lấy voucher cho từng sản phẩm theo stall
      const itemsWithVouchers = [];
      for (const item of cartItems) {
        const productVouchers = await VoucherUsage.getProductVouchersForStall(accountId, item.StallId);
        
        itemsWithVouchers.push({
          ...item,
          vouchers: productVouchers,
          selectedVoucher: null,
          selectedShipType: null
        });
      }

      // Lấy voucher toàn đơn
      const orderVouchers = await VoucherUsage.getOrderVouchers(accountId);
      const orderTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

      const validOrderVouchers = orderVouchers.filter(voucher => {
        return orderTotal >= voucher.MinOrderValue;
      });

      return {
        items: itemsWithVouchers,
        orderVouchers: validOrderVouchers, // Chỉ trả về voucher hợp lệ
        orderTotal: orderTotal
      };

    } catch (error) {
      console.error("Error in getCheckoutData:", error);
      throw error;
    }
  },

  // Lấy thông tin buy now
  getBuyNowData: async (accountId, productId, quantity) => {
    try {
      // Lấy thông tin sản phẩm
      const [productRows] = await pool.query(
        `
        SELECT
          p.ProductId,
          p.ProductName,
          p.Image,
          p.Price AS UnitPrice,
          s.StallId,
          s.AccountId AS SellerAccountId
        FROM Products p
        JOIN Stalls s ON s.StallId = p.StallId
        WHERE p.ProductId = ?
          AND p.IsActive = 1
          AND p.Status = 1
        `,
        [productId]
      );

      if (productRows.length === 0) {
        throw new Error("Không tìm thấy sản phẩm");
      }

      const product = productRows[0];
      const totalPrice = product.UnitPrice * quantity;

      // Lấy voucher cho sản phẩm này
      const productVouchers = await VoucherUsage.getProductVouchersForStall(accountId, product.StallId);

      // Lấy voucher toàn đơn
      const orderVouchers = await VoucherUsage.getOrderVouchers(accountId);

      return {
        items: [{
          CartId: null,
          ProductId: product.ProductId,
          ProductName: product.ProductName,
          Image: product.Image,
          Quantity: quantity,
          UnitPrice: product.UnitPrice,
          totalPrice: totalPrice,
          StallId: product.StallId,
          SellerAccountId: product.SellerAccountId,
          vouchers: productVouchers,
          selectedVoucher: null,
          selectedShipType: null
        }],
        orderVouchers
      };

    } catch (error) {
      console.error("Error in getBuyNowData:", error);
      throw error;
    }
  },

  getOrdersByAccountId: async (accountId) => {
    const [orders] = await pool.query(
      `SELECT 
        o.OrderId,
        o.OrderDate,
        o.FinalPrice,
        o.Status,
        o.CreatedAt,
        o.UpdatedAt,
        a.Content as AddressContent,
        a.Name as AddressName,
        a.Phone as AddressPhone,
        pm.MethodName,
        COUNT(od.OrderDetailId) as itemCount
       FROM Orders o
       LEFT JOIN Address a ON o.AddressId = a.AddressId
       LEFT JOIN PaymentMethods pm ON o.MethodId = pm.MethodId
       LEFT JOIN OrderDetails od ON o.OrderId = od.OrderId
       WHERE o.AccountId = ?
       GROUP BY o.OrderId
       ORDER BY o.CreatedAt DESC`,
      [accountId]
    );
    return orders;
  },

  getOrderDetailById: async (orderId, accountId) => {
    const [orderRows] = await pool.query(
      `SELECT 
        o.*,
        a.Name as AddressName,
        a.Phone as AddressPhone,
        a.Content as AddressContent,
        pm.MethodName
       FROM Orders o
       LEFT JOIN Address a ON o.AddressId = a.AddressId
       LEFT JOIN PaymentMethods pm ON o.MethodId = pm.MethodId
       WHERE o.OrderId = ? AND o.AccountId = ?`,
      [orderId, accountId]
    );

    const [detailRows] = await pool.query(
      `SELECT 
        od.*,
        p.ProductName,
        p.Image,
        st.Content as ShipTypeContent,
        pf.PercentValue as PlatformFeePercent,
        vu.UsageId,
        v.VoucherName
       FROM OrderDetails od
       LEFT JOIN Products p ON od.ProductId = p.ProductId
       LEFT JOIN ShipType st ON od.ShipTypeId = st.ShipTypeId
       LEFT JOIN PlatformFees pf ON od.FeeId = pf.FeeId
       LEFT JOIN VoucherUsage vu ON od.UsageId = vu.UsageId
       LEFT JOIN Vouchers v ON vu.VoucherId = v.VoucherId
       WHERE od.OrderId = ?`,
      [orderId]
    );

    const [historyRows] = await pool.query(
      `SELECT 
        osh.*,
        od.ProductId
       FROM OrderStatusHistory osh
       JOIN OrderDetails od ON osh.OrderDetailId = od.OrderDetailId
       WHERE od.OrderId = ?
       ORDER BY osh.CreatedAt DESC`,
      [orderId]
    );

    const [paymentRows] = await pool.query(
      `SELECT * FROM Payments 
       WHERE OrderId = ? 
       ORDER BY CreatedAt DESC`,
      [orderId]
    );

    return {
      order: orderRows[0],
      details: detailRows,
      history: historyRows,
      payments: paymentRows
    };
  },


  cancelOrderById: async (orderId, accountId) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [orderRows] = await connection.query(
        "SELECT Status FROM Orders WHERE OrderId = ? AND AccountId = ?",
        [orderId, accountId]
      );

      if (!orderRows.length) {
        throw new Error("Không tìm thấy đơn hàng");
      }

      if (orderRows[0].Status !== 1) {
        throw new Error("Chỉ có thể hủy đơn hàng ở trạng thái chờ thanh toán");
      }

      await connection.query(
        "UPDATE Orders SET Status = 5, UpdatedAt = NOW() WHERE OrderId = ?",
        [orderId]
      );

      await connection.query(
        "UPDATE OrderDetails SET Status = 5 WHERE OrderId = ?",
        [orderId]
      );

      const [detailRows] = await connection.query(
        "SELECT OrderDetailId FROM OrderDetails WHERE OrderId = ?",
        [orderId]
      );

      for (const detail of detailRows) {
        await connection.query(
          `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
           VALUES (?, ?, 'Đã hủy', NOW())`,
          [detail.OrderDetailId, `CANCEL-${Date.now()}`]
        );
      }

      await connection.commit();
      return true;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  reorderById: async (orderId, accountId) => {
    const [details] = await pool.query(
      `SELECT 
        od.ProductId,
        od.UnitPrice,
        od.Quantity
       FROM Orders o
       JOIN OrderDetails od ON o.OrderId = od.OrderId
       WHERE o.OrderId = ? AND o.AccountId = ?
         AND od.Status = 4`,
      [orderId, accountId]
    );

    if (!details.length) {
      throw new Error("Không tìm thấy đơn hàng để mua lại");
    }

    for (const detail of details) {
      const [product] = await pool.query(
        "SELECT ProductId FROM Products WHERE ProductId = ? AND IsActive = 1",
        [detail.ProductId]
      );

      if (product.length) {
        const [existing] = await pool.query(
          "SELECT CartId, Quantity FROM Carts WHERE ProductId = ? AND AccountId = ? AND Status = 1",
          [detail.ProductId, accountId]
        );

        if (existing.length) {
          await pool.query(
            "UPDATE Carts SET Quantity = Quantity + ?, UpdatedAt = NOW() WHERE CartId = ?",
            [detail.Quantity, existing[0].CartId]
          );
        } else {
          await pool.query(
            `INSERT INTO Carts (ProductId, AccountId, Quantity, Status, UnitPrice, UpdatedAt)
             VALUES (?, ?, ?, 1, ?, NOW())`,
            [detail.ProductId, accountId, detail.Quantity, detail.UnitPrice]
          );
        }
      }
    }
    
    return true;
  },
};

module.exports = Order;