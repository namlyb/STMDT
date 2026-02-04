const { pool } = require("../config/db");
const VoucherUsage = require("./VoucherUsage");

const ORDER_STATUS = {
  PENDING_PAYMENT: 1,      // Chờ thanh toán (cho online payment)
  PROCESSING: 2,           // Đang xử lý/Chuẩn bị hàng
  SHIPPING: 3,             // Đang giao
  COMPLETED: 4,            // Hoàn thành
  CANCELLED: 5,            // Đã hủy
  RETURNED: 6,              // Trả hàng
  WAITING_OTHER_SELLERS: 7 // Chờ gian hàng khác gửi hàng
};
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
      cartIds,
      initialStatus
    } = orderData;

    // 1. Tạo đơn hàng chính
    const [orderResult] = await connection.query(
      `INSERT INTO Orders (AccountId, AddressId, MethodId, UsageId, FinalPrice, OrderDate, Status, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [accountId, addressId, methodId, orderVoucherId || null, grandTotal, orderDate, initialStatus]
    );
    const orderId = orderResult.insertId;

    // 2. Tạo chi tiết đơn hàng
    const orderDetails = [];
    for (const item of orderItems) {
      const [detailResult] = await connection.query(
        `INSERT INTO OrderDetails (OrderId, ProductId, UsageId, UnitPrice, Quantity, ShipTypeId, ShipFee, FeeId, Status, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [orderId, item.productId, item.voucherId || null, item.unitPrice,
          item.quantity, item.shipTypeId, item.shipFee, item.feeId, initialStatus]
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
         VALUES (?, ?, ?, NOW())`,
        [detail.orderDetailId, trackingCode, initialStatus === ORDER_STATUS.PROCESSING ? 'Đang xử lý' : 'Chờ thanh toán']
      );
    }

    // 6. Xóa cart items nếu cần
    if (cartIds && cartIds.length > 0) {
      await connection.query(
        "UPDATE Carts SET Status = 0 WHERE CartId IN (?)",
        [cartIds]
      );
    }

    for (const detail of orderDetails) {
      const trackingCode = `TRACK-${orderId}-${detail.orderDetailId}-${Date.now()}`;
      const statusText = initialStatus === ORDER_STATUS.PROCESSING ? 'Đang xử lý' : 'Chờ thanh toán';

      await connection.query(
        `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
       VALUES (?, ?, ?, NOW())`,
        [detail.orderDetailId, trackingCode, statusText]
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
    try {
      console.log(`Getting order detail for orderId: ${orderId}, accountId: ${accountId}`);

      // Lấy thông tin đơn hàng
      const [orderRows] = await pool.query(
        `SELECT 
        o.*,
        a.Name as AddressName,
        a.Phone as AddressPhone,
        a.Content as AddressContent,
        pm.MethodName,
        vu_order.UsageId as OrderVoucherUsageId,
        v_order.VoucherId as OrderVoucherId,
        v_order.VoucherName as OrderVoucherName,
        v_order.DiscountType as OrderDiscountType,
        v_order.DiscountValue as OrderDiscountValue,
        v_order.MinOrderValue as OrderMinOrderValue,
        v_order.MaxDiscount as OrderMaxDiscount
       FROM Orders o
       LEFT JOIN Address a ON o.AddressId = a.AddressId
       LEFT JOIN PaymentMethods pm ON o.MethodId = pm.MethodId
       LEFT JOIN VoucherUsage vu_order ON o.UsageId = vu_order.UsageId
       LEFT JOIN Vouchers v_order ON vu_order.VoucherId = v_order.VoucherId
       WHERE o.OrderId = ? AND o.AccountId = ?`,
        [orderId, accountId]
      );

      console.log("Order rows found:", orderRows.length);

      if (!orderRows.length) {
        return { order: null, details: [], history: [], payments: [], itemCount: 0 };
      }

      // Lấy chi tiết sản phẩm trong đơn với thông tin voucher
      const [detailRows] = await pool.query(
        `SELECT 
        od.*,
        p.ProductName,
        p.Image,
        st.Content as ShipTypeContent,
        pf.PercentValue as PlatformFeePercent,
        vu.UsageId as VoucherUsageId,
        v.VoucherId,
        v.VoucherName,
        v.DiscountType,
        v.DiscountValue,
        v.MinOrderValue,
        v.MaxDiscount,
        v.EndTime,
        s.StallName,
        s.StallId
       FROM OrderDetails od
       LEFT JOIN Products p ON od.ProductId = p.ProductId
       LEFT JOIN ShipType st ON od.ShipTypeId = st.ShipTypeId
       LEFT JOIN PlatformFees pf ON od.FeeId = pf.FeeId
       LEFT JOIN VoucherUsage vu ON od.UsageId = vu.UsageId
       LEFT JOIN Vouchers v ON vu.VoucherId = v.VoucherId
       LEFT JOIN Stalls s ON p.StallId = s.StallId
       WHERE od.OrderId = ?
       ORDER BY od.CreatedAt ASC`,
        [orderId]
      );

      console.log("Detail rows found:", detailRows.length);

      // Lấy lịch sử trạng thái
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

      // Lấy thông tin thanh toán
      const [paymentRows] = await pool.query(
        `SELECT * FROM Payments 
       WHERE OrderId = ? 
       ORDER BY CreatedAt DESC`,
        [orderId]
      );

      // Đếm số sản phẩm
      const itemCount = detailRows.length;

      return {
        order: orderRows[0],
        details: detailRows,
        history: historyRows,
        payments: paymentRows,
        itemCount: itemCount
      };

    } catch (error) {
      console.error("Error in getOrderDetailById:", error);
      console.error("SQL Error:", error.sqlMessage || error.message);
      throw error;
    }
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

      const currentStatus = orderRows[0].Status;

      // Chỉ cho phép hủy khi status là 1 (chờ thanh toán) hoặc 2 (đang xử lý)
      if (![ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PROCESSING].includes(currentStatus)) {
        throw new Error("Chỉ có thể hủy đơn hàng ở trạng thái chờ thanh toán hoặc đang xử lý");
      }

      await connection.query(
        "UPDATE Orders SET Status = ?, UpdatedAt = NOW() WHERE OrderId = ?",
        [ORDER_STATUS.CANCELLED, orderId]
      );

      await connection.query(
        "UPDATE OrderDetails SET Status = ? WHERE OrderId = ?",
        [ORDER_STATUS.CANCELLED, orderId]
      );

      const [detailRows] = await connection.query(
        "SELECT OrderDetailId FROM OrderDetails WHERE OrderId = ?",
        [orderId]
      );

      for (const detail of detailRows) {
        await connection.query(
          `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
           VALUES (?, ?, ?, NOW())`,
          [detail.OrderDetailId, `CANCEL-${Date.now()}`, 'Đã hủy']
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

  // Thêm hàm đếm số sản phẩm trong đơn
  getItemCountByOrderId: async (orderId) => {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM OrderDetails WHERE OrderId = ?`,
      [orderId]
    );
    return rows[0]?.count || 0;
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

  // ... TẤT CẢ CÁC HÀM HIỆN CÓ Ở TRÊN ...

  // ================== FUNCTIONS FOR SELLER ==================

  // Hàm kiểm tra xem seller có quyền truy cập order detail không
  checkSellerAccess: async (orderDetailId, sellerId) => {
    const [rows] = await pool.query(
      `SELECT od.* 
     FROM OrderDetails od
     JOIN Products p ON od.ProductId = p.ProductId
     JOIN Stalls s ON p.StallId = s.StallId
     WHERE od.OrderDetailId = ?
       AND s.AccountId = ?`,
      [orderDetailId, sellerId]
    );
    return rows.length > 0;
  },

  // Hàm lấy thông tin stall của seller
  getSellerStallId: async (sellerId) => {
    const [rows] = await pool.query(
      "SELECT StallId FROM Stalls WHERE AccountId = ?",
      [sellerId]
    );
    return rows[0] ? rows[0].StallId : null;
  },

  // Lấy danh sách đơn hàng cho seller (chỉ order details thuộc stall của seller)
  // backend/controllers/OrderController.js - Sửa hàm getSellerOrders
  getSellerOrders: async (req, res) => {
    try {
      const sellerId = req.user.AccountId;
      const { status, search, dateFrom, dateTo } = req.query;

      // Lấy stallId của seller
      const [stallRows] = await pool.query(
        "SELECT StallId FROM Stalls WHERE AccountId = ?",
        [sellerId]
      );

      if (!stallRows.length) {
        return res.status(404).json({ message: "Không tìm thấy cửa hàng" });
      }

      const stallId = stallRows[0].StallId;

      let query = `
      SELECT DISTINCT
        o.OrderId,
        o.OrderDate,
        o.FinalPrice,
        o.Status as OrderStatus,
        o.CreatedAt,
        o.UpdatedAt,
        a.Content as AddressContent,
        a.Name as AddressName,
        a.Phone as AddressPhone,
        acc.Name as CustomerName,
        acc.Phone as CustomerPhone,
        pm.MethodName,
        (
          SELECT COUNT(*) 
          FROM OrderDetails od2 
          WHERE od2.OrderId = o.OrderId 
            AND od2.ProductId IN (
              SELECT ProductId FROM Products WHERE StallId = ?
            )
        ) as itemCount,
        (
          SELECT SUM(od2.UnitPrice * od2.Quantity)
          FROM OrderDetails od2 
          WHERE od2.OrderId = o.OrderId 
            AND od2.ProductId IN (
              SELECT ProductId FROM Products WHERE StallId = ?
            )
        ) as SubTotal,
        (
          SELECT SUM(od2.ShipFee)
          FROM OrderDetails od2 
          WHERE od2.OrderId = o.OrderId 
            AND od2.ProductId IN (
              SELECT ProductId FROM Products WHERE StallId = ?
            )
        ) as ShipFee
      FROM Orders o
      JOIN Address a ON o.AddressId = a.AddressId
      JOIN Accounts acc ON o.AccountId = acc.AccountId
      LEFT JOIN PaymentMethods pm ON o.MethodId = pm.MethodId
      WHERE EXISTS (
        SELECT 1 FROM OrderDetails od
        JOIN Products p ON od.ProductId = p.ProductId
        WHERE od.OrderId = o.OrderId
          AND p.StallId = ?
      )
    `;

      const params = [stallId, stallId, stallId, stallId];

      // Thêm điều kiện lọc
      if (status && status !== "all") {
        query += " AND o.Status = ?";
        params.push(status);
      }

      if (dateFrom) {
        query += " AND DATE(o.CreatedAt) >= ?";
        params.push(dateFrom);
      }

      if (dateTo) {
        query += " AND DATE(o.CreatedAt) <= ?";
        params.push(dateTo);
      }

      if (search) {
        query += " AND (o.OrderId LIKE ? OR acc.Name LIKE ? OR acc.Phone LIKE ?)";
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      query += " ORDER BY o.CreatedAt DESC";

      const [orders] = await pool.query(query, params);

      // Lấy thông tin chi tiết sản phẩm cho từng đơn hàng
      for (const order of orders) {
        const [details] = await pool.query(
          `
        SELECT 
          od.*,
          p.ProductName,
          p.Image,
          p.StallId,
          s.StallName
        FROM OrderDetails od
        JOIN Products p ON od.ProductId = p.ProductId
        JOIN Stalls s ON p.StallId = s.StallId
        WHERE od.OrderId = ?
          AND p.StallId = ?
        ORDER BY od.CreatedAt ASC
        `,
          [order.OrderId, stallId]
        );

        order.details = details.map(detail => ({
          ...detail,
          Status: detail.Status // Trạng thái của order detail
        }));
      }

      res.json(orders);
    } catch (error) {
      console.error("Get seller orders error:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách đơn hàng" });
    }
  },

  // Lấy chi tiết đơn hàng cho seller (chỉ sản phẩm thuộc stall của seller)
  // backend/controllers/OrderController.js - Sửa hàm getSellerOrderDetail
  getSellerOrderDetail: async (req, res) => {
    try {
      const { orderId } = req.params;
      const sellerId = req.user.AccountId;

      // Lấy stallId của seller
      const [stallRows] = await pool.query(
        "SELECT StallId FROM Stalls WHERE AccountId = ?",
        [sellerId]
      );

      if (!stallRows.length) {
        return res.status(404).json({ message: "Không tìm thấy cửa hàng" });
      }

      const stallId = stallRows[0].StallId;

      // Lấy thông tin đơn hàng
      const [orderRows] = await pool.query(
        `SELECT 
        o.OrderId,
        o.OrderDate,
        o.FinalPrice,
        o.Status as OrderStatus,
        o.CreatedAt,
        a.Content as AddressContent,
        a.Name as AddressName,
        a.Phone as AddressPhone,
        acc.Name as CustomerName,
        acc.Phone as CustomerPhone,
        pm.MethodName
       FROM Orders o
       JOIN Address a ON o.AddressId = a.AddressId
       JOIN Accounts acc ON o.AccountId = acc.AccountId
       LEFT JOIN PaymentMethods pm ON o.MethodId = pm.MethodId
       WHERE o.OrderId = ?
         AND EXISTS (
           SELECT 1 FROM OrderDetails od
           JOIN Products p ON od.ProductId = p.ProductId
           WHERE od.OrderId = o.OrderId
             AND p.StallId = ?
         )`,
        [orderId, stallId]
      );

      if (!orderRows.length) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      // Lấy chi tiết sản phẩm (chỉ của stall này)
      const [detailRows] = await pool.query(
        `SELECT 
        od.*,
        p.ProductName,
        p.Image,
        p.StallId,
        s.StallName,
        st.Content as ShipTypeContent,
        pf.PercentValue as PlatformFeePercent
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       JOIN Stalls s ON p.StallId = s.StallId
       LEFT JOIN ShipType st ON od.ShipTypeId = st.ShipTypeId
       LEFT JOIN PlatformFees pf ON od.FeeId = pf.FeeId
       WHERE od.OrderId = ?
         AND p.StallId = ?
       ORDER BY od.CreatedAt ASC`,
        [orderId, stallId]
      );

      // Đếm số sản phẩm
      const itemCount = detailRows.length;

      res.json({
        order: orderRows[0],
        details: detailRows,
        itemCount: itemCount
      });
    } catch (error) {
      console.error("Get seller order detail error:", error);
      res.status(500).json({ message: "Lỗi khi lấy chi tiết đơn hàng" });
    }
  },

  // Cập nhật trạng thái chuẩn bị hàng
  prepareOrderItem: async (orderDetailId, sellerId, isPrepared) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Kiểm tra order detail có thuộc stall của seller không
      const [checkRows] = await connection.query(
        `SELECT od.*, p.StallId, od.OrderId
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       JOIN Stalls s ON p.StallId = s.StallId
       WHERE od.OrderDetailId = ?
         AND s.AccountId = ?`,
        [orderDetailId, sellerId]
      );

      if (!checkRows.length) {
        throw new Error("Không có quyền truy cập sản phẩm này");
      }

      const orderDetail = checkRows[0];

      // 2. Chỉ cho phép chuẩn bị khi trạng thái là PROCESSING (2)
      if (orderDetail.Status !== ORDER_STATUS.PROCESSING) {
        throw new Error("Chỉ có thể chuẩn bị hàng khi đơn hàng đang ở trạng thái xử lý");
      }

      // 3. Cập nhật trạng thái (nếu isPrepared = true thì Status = 3 - SHIPPING)
      const newStatus = isPrepared ? ORDER_STATUS.SHIPPING : ORDER_STATUS.PROCESSING;

      await connection.query(
        `UPDATE OrderDetails 
       SET Status = ?, UpdatedAt = NOW() 
       WHERE OrderDetailId = ?`,
        [newStatus, orderDetailId]
      );

      // 4. Tạo lịch sử trạng thái
      const trackingCode = `PREPARE-${orderDetailId}-${Date.now()}`;
      const statusText = isPrepared ? 'Đã chuẩn bị hàng' : 'Bỏ chuẩn bị hàng';

      await connection.query(
        `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
       VALUES (?, ?, ?, NOW())`,
        [orderDetailId, trackingCode, statusText]
      );

      // 5. Kiểm tra nếu tất cả sản phẩm trong order đã được chuẩn bị
      const stallId = await getSellerStallId(sellerId);
      const [allItems] = await connection.query(
        `SELECT COUNT(*) as total,
              SUM(CASE WHEN od.Status = ${ORDER_STATUS.SHIPPING} THEN 1 ELSE 0 END) as prepared
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId = ?`,
        [orderDetail.OrderId, stallId]
      );

      await connection.commit();

      return {
        orderDetailId: orderDetailId,
        newStatus: newStatus,
        orderId: orderDetail.OrderId,
        allPrepared: allItems[0].total === allItems[0].prepared && allItems[0].total > 0
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Chuyển trạng thái đơn hàng sang đang giao
  shipSellerOrder: async (orderId, sellerId) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Kiểm tra seller có sản phẩm trong order này không
      const stallId = await getSellerStallId(sellerId);
      if (!stallId) {
        throw new Error("Không tìm thấy cửa hàng");
      }

      // 2. Kiểm tra xem tất cả sản phẩm của seller đã được chuẩn bị chưa
      const [itemsRows] = await connection.query(
        `SELECT od.* 
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId = ?
         AND od.Status = ${ORDER_STATUS.PROCESSING}`,
        [orderId, stallId]
      );

      if (itemsRows.length > 0) {
        throw new Error("Vẫn còn sản phẩm chưa được chuẩn bị");
      }

      // 3. Cập nhật tất cả order details của seller sang SHIPPING
      await connection.query(
        `UPDATE OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       SET od.Status = ${ORDER_STATUS.SHIPPING}, od.UpdatedAt = NOW()
       WHERE od.OrderId = ?
         AND p.StallId = ?`,
        [orderId, stallId]
      );

      // 4. Tạo lịch sử trạng thái cho từng order detail
      const [detailRows] = await connection.query(
        `SELECT od.OrderDetailId 
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId = ?`,
        [orderId, stallId]
      );

      for (const detail of detailRows) {
        const trackingCode = `SHIP-${orderId}-${detail.OrderDetailId}-${Date.now()}`;
        await connection.query(
          `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, 'Đang giao hàng', NOW())`,
          [detail.OrderDetailId, trackingCode]
        );
      }

      await connection.commit();

      return {
        orderId: orderId,
        updatedItems: detailRows.length
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Xác nhận hoàn thành đơn hàng
  completeSellerOrder: async (orderDetailId, sellerId) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Kiểm tra order detail có thuộc stall của seller không
      const [checkRows] = await connection.query(
        `SELECT od.*, p.StallId, od.OrderId
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       JOIN Stalls s ON p.StallId = s.StallId
       WHERE od.OrderDetailId = ?
         AND s.AccountId = ?`,
        [orderDetailId, sellerId]
      );

      if (!checkRows.length) {
        throw new Error("Không có quyền truy cập sản phẩm này");
      }

      const orderDetail = checkRows[0];

      // 2. Chỉ cho phép hoàn thành khi trạng thái là SHIPPING (3)
      if (orderDetail.Status !== ORDER_STATUS.SHIPPING) {
        throw new Error("Chỉ có thể xác nhận hoàn thành khi đơn hàng đang ở trạng thái đang giao");
      }

      // 3. Cập nhật trạng thái sang COMPLETED
      await connection.query(
        `UPDATE OrderDetails 
       SET Status = ?, UpdatedAt = NOW() 
       WHERE OrderDetailId = ?`,
        [ORDER_STATUS.COMPLETED, orderDetailId]
      );

      // 4. Tạo lịch sử trạng thái
      const trackingCode = `COMPLETE-${orderDetailId}-${Date.now()}`;
      await connection.query(
        `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
       VALUES (?, ?, 'Đã giao hàng', NOW())`,
        [orderDetailId, trackingCode]
      );

      await connection.commit();

      return {
        orderDetailId: orderDetailId,
        newStatus: ORDER_STATUS.COMPLETED,
        orderId: orderDetail.OrderId
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Hàm cập nhật trạng thái đơn hàng khi tất cả sản phẩm đã vận chuyển
  updateOrderStatusWhenAllShipped: async (orderId) => {
    const [items] = await pool.query(
      `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN Status = ${ORDER_STATUS.SHIPPING} THEN 1 ELSE 0 END) as shipped
     FROM OrderDetails 
     WHERE OrderId = ?`,
      [orderId]
    );

    if (items[0].total > 0 && items[0].total === items[0].shipped) {
      await pool.query(
        `UPDATE Orders SET Status = ?, UpdatedAt = NOW() WHERE OrderId = ?`,
        [ORDER_STATUS.SHIPPING, orderId]
      );
      return true;
    }
    return false;
  },

  // Hàm chuyển trạng thái tất cả sản phẩm sang vận chuyển
  shipAllItemsForSeller: async (orderId, sellerId) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Lấy stallId của seller
      const [stallRows] = await connection.query(
        "SELECT StallId FROM Stalls WHERE AccountId = ?",
        [sellerId]
      );

      if (!stallRows.length) {
        throw new Error("Không tìm thấy cửa hàng");
      }

      const stallId = stallRows[0].StallId;

      // Cập nhật tất cả order details của seller sang SHIPPING
      const [updateResult] = await connection.query(
        `UPDATE OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       SET od.Status = ?, od.UpdatedAt = NOW()
       WHERE od.OrderId = ?
         AND p.StallId = ?
         AND od.Status = ?`,
        [ORDER_STATUS.SHIPPING, orderId, stallId, ORDER_STATUS.PROCESSING]
      );

      if (updateResult.affectedRows === 0) {
        throw new Error("Không có sản phẩm nào để chuyển trạng thái");
      }

      // Tạo lịch sử trạng thái
      const [detailRows] = await connection.query(
        `SELECT od.OrderDetailId 
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId = ?
         AND od.Status = ?`,
        [orderId, stallId, ORDER_STATUS.SHIPPING]
      );

      for (const detail of detailRows) {
        const trackingCode = `SHIP-ALL-${orderId}-${detail.OrderDetailId}-${Date.now()}`;
        await connection.query(
          `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, ?, NOW())`,
          [detail.OrderDetailId, trackingCode, 'Đang giao hàng']
        );
      }

      // Kiểm tra và cập nhật trạng thái đơn hàng
      await updateOrderStatusWhenAllShipped(orderId);

      await connection.commit();

      return {
        orderId: orderId,
        updatedItems: updateResult.affectedRows,
        newStatus: ORDER_STATUS.SHIPPING
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

module.exports = Order;