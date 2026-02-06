const { pool } = require("../config/db");

// Status cho OrderDetails
const ORDER_DETAIL_STATUS = {
  PENDING_PREPARED: 1,      // Chờ chuẩn bị
  PREPARED: 2,             // Đã chuẩn bị xong
  SHIPPING: 3,             // Đang giao
  COMPLETED: 4,            // Hoàn thành
  CANCELLED: 5,            // Đã hủy
  RETURNED: 6              // Trả hàng
};

// Status cho Orders (chỉ để tham khảo, không dùng trong model)
const ORDER_STATUS = {
  PENDING_PAYMENT: 1,
  PROCESSING: 2,
  SHIPPING: 3,
  COMPLETED: 4,
  CANCELLED: 5,
  RETURNED: 6,
  WAITING_OTHER_SELLERS: 7
};

const OrderModel = {
  // ==================== BUYER FUNCTIONS ====================
  
  getCheckoutData: async (accountId, cartIds) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Lấy thông tin sản phẩm trong giỏ hàng
      const [items] = await connection.query(
        `SELECT 
          c.CartId,
          c.ProductId,
          c.Quantity,
          c.UnitPrice,
          p.ProductName,
          p.Image,
          p.Price AS ProductPrice,
          p.StallId,
          p.Description,
          s.StallName,
          (c.UnitPrice * c.Quantity) AS TotalPrice
        FROM Carts c
        JOIN Products p ON c.ProductId = p.ProductId
        JOIN Stalls s ON p.StallId = s.StallId
        WHERE c.AccountId = ? AND c.CartId IN (?) 
          AND c.Status = 1 AND p.Status = 1 AND p.IsActive = 1`,
        [accountId, cartIds]
      );

      if (items.length === 0) {
        throw new Error("Không tìm thấy sản phẩm trong giỏ hàng");
      }

      // 2. Lấy tất cả voucher của user với điều kiện mới
      const [allVouchers] = await connection.query(
        `SELECT DISTINCT
          vu.UsageId,
          v.VoucherId,
          v.VoucherName,
          v.DiscountType,
          v.DiscountValue,
          v.MinOrderValue,
          v.MaxDiscount,
          v.CreatedBy,
          st.StallId,
          vu.Quantity AS AvailableQuantity,
          vu.IsUsed,
          v.EndTime
        FROM VoucherUsage vu
        JOIN Vouchers v ON vu.VoucherId = v.VoucherId
        LEFT JOIN Stalls st ON st.AccountId = v.CreatedBy
        WHERE vu.AccountId = ? 
          AND vu.IsUsed = 0 
          AND vu.Quantity > 0
          AND v.EndTime >= CURDATE()
          AND (v.DiscountType IN ('percent', 'fixed') 
               OR st.StallId IS NULL)
        `,
        [accountId]
      );

      // 3. Phân loại voucher: toàn đơn (StallId = null)
      const orderVouchers = allVouchers.filter(v => !v.StallId);
      
      // 4. Gán voucher cho từng sản phẩm theo logic mới
      const itemsWithVouchers = items.map(item => {
        // Lấy voucher áp dụng cho sản phẩm này
        const productVouchers = allVouchers.filter(v => {
          // Điều kiện 1: Voucher của cùng gian hàng
          if (v.StallId === item.StallId) {
            return v.DiscountType === 'percent' || v.DiscountType === 'fixed';
          }
          
          // Điều kiện 2: Voucher của admin (CreatedBy=1)
          if (v.CreatedBy === 1 && (v.DiscountType === 'percent' || v.DiscountType === 'fixed')) {
            return true;
          }
          
          return false;
        });
        
        return {
          ...item,
          totalPrice: Number(item.TotalPrice) || (item.UnitPrice * item.Quantity),
          vouchers: productVouchers
        };
      });

      await connection.commit();
      
      return {
        items: itemsWithVouchers,
        orderVouchers: orderVouchers,
        allVouchers: allVouchers
      };

    } catch (error) {
      await connection.rollback();
      console.error("Get checkout data error:", error);
      throw error;
    } finally {
      connection.release();
    }
  },

  getBuyNowData: async (accountId, productId, quantity) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Lấy thông tin sản phẩm
      const [products] = await connection.query(
        `SELECT 
          p.ProductId,
          p.ProductName,
          p.Image,
          p.Price AS UnitPrice,
          p.StallId,
          p.Description,
          s.StallName,
          ? AS Quantity,
          (p.Price * ?) AS TotalPrice
        FROM Products p
        JOIN Stalls s ON p.StallId = s.StallId
        WHERE p.ProductId = ? 
          AND p.Status = 1 
          AND p.IsActive = 1`,
        [quantity, quantity, productId]
      );

      if (products.length === 0) {
        throw new Error("Sản phẩm không tồn tại hoặc đã ngừng bán");
      }

      const item = products[0];

      // 2. Lấy voucher của user với điều kiện mới
      const [allVouchers] = await connection.query(
        `SELECT DISTINCT
          vu.UsageId,
          v.VoucherId,
          v.VoucherName,
          v.DiscountType,
          v.DiscountValue,
          v.MinOrderValue,
          v.MaxDiscount,
          v.CreatedBy,
          st.StallId,
          vu.Quantity AS AvailableQuantity,
          vu.IsUsed,
          v.EndTime
        FROM VoucherUsage vu
        JOIN Vouchers v ON vu.VoucherId = v.VoucherId
        LEFT JOIN Stalls st ON st.AccountId = v.CreatedBy
        WHERE vu.AccountId = ? 
          AND vu.IsUsed = 0 
          AND vu.Quantity > 0
          AND v.EndTime >= CURDATE()
          AND (v.DiscountType IN ('percent', 'fixed') 
               OR st.StallId IS NULL)
        `,
        [accountId]
      );

      // 3. Phân loại voucher
      const orderVouchers = allVouchers.filter(v => !v.StallId);
      
      // 4. Gán voucher cho sản phẩm theo logic mới
      const productVouchers = allVouchers.filter(v => {
        // Điều kiện 1: Voucher của cùng gian hàng
        if (v.StallId === item.StallId) {
          return v.DiscountType === 'percent' || v.DiscountType === 'fixed';
        }
        
        // Điều kiện 2: Voucher của admin (CreatedBy=1)
        if (v.CreatedBy === 1 && (v.DiscountType === 'percent' || v.DiscountType === 'fixed')) {
          return true;
        }
        
        return false;
      });

      const itemWithVoucher = {
        ...item,
        totalPrice: Number(item.TotalPrice) || (item.UnitPrice * quantity),
        vouchers: productVouchers,
        Quantity: quantity
      };

      await connection.commit();
      
      return {
        items: [itemWithVoucher],
        orderVouchers: orderVouchers,
        allVouchers: allVouchers
      };

    } catch (error) {
      await connection.rollback();
      console.error("Get buy now data error:", error);
      throw error;
    } finally {
      connection.release();
    }
  },

  getProductDetails: async (productId) => {
    try {
      const [rows] = await pool.query(
        `SELECT 
          p.ProductId,
          p.ProductName,
          p.Price,
          p.StallId,
          s.StallName
        FROM Products p
        JOIN Stalls s ON p.StallId = s.StallId
        WHERE p.ProductId = ? 
          AND p.Status = 1 
          AND p.IsActive = 1`,
        [productId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Get product details error:", error);
      throw error;
    }
  },

  getApplicableFee: async (price) => {
    const [rows] = await pool.query(`
      SELECT FeeId 
      FROM PlatformFees 
      WHERE MinOrderValue <= ? 
        AND (MaxOrderValue >= ? OR MaxOrderValue IS NULL)
        AND Status = 1
      ORDER BY PercentValue DESC 
      LIMIT 1
    `, [price, price]);
    return rows[0]?.FeeId || 1;
  },

  createOrderTransactionWithVouchers: async (connection, orderData, productVoucherUsage) => {
    const { accountId, addressId, methodId, orderVoucherId, grandTotal, orderDate, orderItems, cartIds, initialStatus } = orderData;

    // Tạo đơn hàng chính
    const [orderResult] = await connection.query(`
      INSERT INTO Orders (AccountId, AddressId, MethodId, UsageId, FinalPrice, OrderDate, Status, CreatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [accountId, addressId, methodId, orderVoucherId, grandTotal, orderDate, initialStatus]);

    const orderId = orderResult.insertId;

    // Tạo chi tiết đơn hàng với Status = 1 (PENDING_PREPARED)
    for (const item of orderItems) {
      const [detailResult] = await connection.query(`
        INSERT INTO OrderDetails (OrderId, ProductId, UsageId, UnitPrice, Quantity, ShipTypeId, ShipFee, FeeId, Status, CreatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [orderId, item.productId, item.voucherId, item.unitPrice, item.quantity, item.shipTypeId, item.shipFee, item.feeId, ORDER_DETAIL_STATUS.PENDING_PREPARED]);
      
      const orderDetailId = detailResult.insertId;
      
      // Tạo lịch sử trạng thái đầu tiên
      await connection.query(`
        INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
        VALUES (?, ?, 'Đơn hàng được tạo', NOW())
      `, [orderDetailId, `ORDER-${orderId}-${orderDetailId}`]);
    }

    // Cập nhật trạng thái giỏ hàng nếu có
    if (cartIds.length > 0) {
      await connection.query(`
        UPDATE Carts 
        SET Status = 0, UpdatedAt = NOW()
        WHERE CartId IN (?)
      `, [cartIds]);
    }

    // ================= CẬP NHẬT VOUCHER USAGE =================
    // 1. Xử lý voucher toàn đơn (nếu có)
    if (orderVoucherId) {
      // Mỗi lần sử dụng voucher giảm Quantity 1, tăng IsUsed 1
      await VoucherUsage.decrementVoucherQuantityWithConnection(
        connection,
        orderVoucherId,
        1
      );
    }

    // 2. Xử lý voucher sản phẩm
    for (const [voucherId, usageCount] of productVoucherUsage) {
      // Mỗi sản phẩm sử dụng voucher giảm Quantity 1, tăng IsUsed 1
      await VoucherUsage.decrementVoucherQuantityWithConnection(
        connection,
        voucherId,
        usageCount
      );
    }

    return { orderId, orderItems };
  },

  getOrdersByAccountId: async (accountId) => {
    const [orders] = await pool.query(`
      SELECT o.*, a.Content as AddressContent, a.Name as AddressName, 
             a.Phone as AddressPhone, pm.MethodName,
             (SELECT COUNT(*) FROM OrderDetails WHERE OrderId = o.OrderId) as ItemCount
      FROM Orders o
      JOIN Address a ON o.AddressId = a.AddressId
      LEFT JOIN PaymentMethods pm ON o.MethodId = pm.MethodId
      WHERE o.AccountId = ?
      ORDER BY o.CreatedAt DESC
    `, [accountId]);
    return orders;
  },

  getOrderDetailById: async (orderId, accountId) => {
    // Lấy thông tin đơn hàng
    const [orderRows] = await pool.query(`
      SELECT o.*, a.Content as AddressContent, a.Name as AddressName, 
             a.Phone as AddressPhone, acc.Name as CustomerName,
             acc.Phone as CustomerPhone, pm.MethodName
      FROM Orders o
      JOIN Address a ON o.AddressId = a.AddressId
      JOIN Accounts acc ON o.AccountId = acc.AccountId
      LEFT JOIN PaymentMethods pm ON o.MethodId = pm.MethodId
      WHERE o.OrderId = ? AND o.AccountId = ?
    `, [orderId, accountId]);

    if (!orderRows.length) {
      return { order: null, details: [], history: [], payments: [] };
    }

    // Lấy chi tiết sản phẩm
    const [detailRows] = await pool.query(`
      SELECT od.*, p.ProductName, p.Image, s.StallName,
             st.Content as ShipTypeContent, pf.PercentValue as PlatformFeePercent
      FROM OrderDetails od
      JOIN Products p ON od.ProductId = p.ProductId
      JOIN Stalls s ON p.StallId = s.StallId
      LEFT JOIN ShipType st ON od.ShipTypeId = st.ShipTypeId
      LEFT JOIN PlatformFees pf ON od.FeeId = pf.FeeId
      WHERE od.OrderId = ?
      ORDER BY od.CreatedAt ASC
    `, [orderId]);

    // Lấy lịch sử trạng thái
    const [historyRows] = await pool.query(`
      SELECT osh.* 
      FROM OrderStatusHistory osh
      JOIN OrderDetails od ON osh.OrderDetailId = od.OrderDetailId
      WHERE od.OrderId = ?
      ORDER BY osh.CreatedAt ASC
    `, [orderId]);

    // Lấy thông tin thanh toán
    const [paymentRows] = await pool.query(`
      SELECT * FROM Payments 
      WHERE OrderId = ?
      ORDER BY CreatedAt ASC
    `, [orderId]);

    return {
      order: orderRows[0],
      details: detailRows,
      history: historyRows,
      payments: paymentRows,
      itemCount: detailRows.length
    };
  },

  cancelOrderById: async (orderId, accountId) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Kiểm tra trạng thái hiện tại
      const [orderRows] = await connection.query(`
        SELECT Status FROM Orders 
        WHERE OrderId = ? AND AccountId = ?
      `, [orderId, accountId]);

      if (!orderRows.length) {
        throw new Error("Đơn hàng không tồn tại");
      }

      const currentStatus = orderRows[0].Status;
      if (currentStatus !== ORDER_STATUS.PENDING_PAYMENT && currentStatus !== ORDER_STATUS.PROCESSING) {
        throw new Error("Chỉ có thể hủy đơn hàng khi đang chờ thanh toán hoặc đang xử lý");
      }

      // Cập nhật trạng thái đơn hàng
      await connection.query(`
        UPDATE Orders 
        SET Status = ?, UpdatedAt = NOW()
        WHERE OrderId = ?
      `, [ORDER_STATUS.CANCELLED, orderId]);

      // Cập nhật trạng thái order details
      await connection.query(`
        UPDATE OrderDetails 
        SET Status = ?, UpdatedAt = NOW()
        WHERE OrderId = ?
      `, [ORDER_DETAIL_STATUS.CANCELLED, orderId]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  reorderById: async (orderId, accountId) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Lấy chi tiết đơn hàng cũ
      const [detailRows] = await connection.query(
        `SELECT od.ProductId, od.UnitPrice, od.Quantity
        FROM OrderDetails od
        JOIN Orders o ON od.OrderId = o.OrderId
        WHERE o.OrderId = ? AND o.AccountId = ?
          AND od.Status = ?`,
        [orderId, accountId, ORDER_DETAIL_STATUS.COMPLETED]
      );

      if (!detailRows.length) {
        throw new Error("Không tìm thấy đơn hàng hoặc đơn hàng chưa hoàn thành");
      }

      // Thêm vào giỏ hàng
      for (const detail of detailRows) {
        // Kiểm tra sản phẩm có tồn tại và đang hoạt động không
        const [productRows] = await connection.query(`
          SELECT ProductId FROM Products 
          WHERE ProductId = ? AND IsActive = 1 AND Status = 1
        `, [detail.ProductId]);

        if (productRows.length) {
          // Kiểm tra sản phẩm đã có trong giỏ chưa
          const [cartRows] = await connection.query(`
            SELECT CartId, Quantity FROM Carts 
            WHERE ProductId = ? AND AccountId = ? AND Status = 1
          `, [detail.ProductId, accountId]);

          if (cartRows.length) {
            // Cập nhật số lượng
            await connection.query(`
              UPDATE Carts 
              SET Quantity = Quantity + ?, UpdatedAt = NOW()
              WHERE CartId = ?
            `, [detail.Quantity, cartRows[0].CartId]);
          } else {
            // Thêm mới vào giỏ
            await connection.query(`
              INSERT INTO Carts (ProductId, AccountId, Quantity, Status, UnitPrice)
              VALUES (?, ?, ?, 1, ?)
            `, [detail.ProductId, accountId, detail.Quantity, detail.UnitPrice]);
          }
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // ==================== SELLER FUNCTIONS ====================

  getSellerOrders: async (sellerId, filters) => {
    const { status = 'all', search = '', dateFrom = '', dateTo = '', orderId = '', page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    // Lấy stallId của seller
    const [stallRows] = await pool.query(
      "SELECT StallId FROM Stalls WHERE AccountId = ?",
      [sellerId]
    );

    if (!stallRows.length) {
      return { orders: [], total: 0 };
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
            AND od2.Status IN (1,2,3,4,5,6)
        ) as itemCount,
        (
          SELECT COUNT(*) 
          FROM OrderDetails od2 
          WHERE od2.OrderId = o.OrderId 
            AND od2.ProductId IN (
              SELECT ProductId FROM Products WHERE StallId = ?
            )
            AND od2.Status = 2
        ) as preparedCount,
        (
          SELECT SUM(od2.UnitPrice * od2.Quantity)
          FROM OrderDetails od2 
          WHERE od2.OrderId = o.OrderId 
            AND od2.ProductId IN (
              SELECT ProductId FROM Products WHERE StallId = ?
            )
            AND od2.Status IN (1,2,3,4,5,6)
        ) as SubTotal,
        (
          SELECT SUM(od2.ShipFee)
          FROM OrderDetails od2 
          WHERE od2.OrderId = o.OrderId 
            AND od2.ProductId IN (
              SELECT ProductId FROM Products WHERE StallId = ?
            )
            AND od2.Status IN (1,2,3,4,5,6)
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
          AND od.Status IN (1,2,3,4,5,6)
      )
      AND o.Status IN (2,3,4,5,6,7)
    `;

    const params = [stallId, stallId, stallId, stallId, stallId];

    // Thêm điều kiện lọc
    const whereConditions = [];
    
    if (status && status !== "all") {
      whereConditions.push("o.Status = ?");
      params.push(status);
    }

    if (dateFrom && dateTo) {
      if (new Date(dateTo) >= new Date(dateFrom)) {
        whereConditions.push("DATE(o.CreatedAt) BETWEEN ? AND ?");
        params.push(dateFrom, dateTo);
      }
    } else if (dateFrom) {
      whereConditions.push("DATE(o.CreatedAt) >= ?");
      params.push(dateFrom);
    } else if (dateTo) {
      whereConditions.push("DATE(o.CreatedAt) <= ?");
      params.push(dateTo);
    }

    if (search) {
      whereConditions.push("(o.OrderId LIKE ? OR acc.Name LIKE ? OR acc.Phone LIKE ?)");
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (orderId) {
      whereConditions.push("o.OrderId = ?");
      params.push(orderId);
    }

    if (whereConditions.length > 0) {
      query += " AND " + whereConditions.join(" AND ");
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0].total;

    // Add pagination
    query += " ORDER BY o.CreatedAt DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [orders] = await pool.query(query, params);

    // Lấy thông tin chi tiết sản phẩm cho từng đơn hàng
    for (const order of orders) {
      const [details] = await pool.query(`
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
          AND od.Status IN (1,2,3,4,5,6)
        ORDER BY od.CreatedAt ASC
      `, [order.OrderId, stallId]);

      order.details = details.map(detail => ({
        ...detail,
        Status: detail.Status
      }));
    }

    return { orders, total };
  },

  getSellerOrderDetail: async (orderId, sellerId) => {
    // Lấy stallId của seller
    const [stallRows] = await pool.query(
      "SELECT StallId FROM Stalls WHERE AccountId = ?",
      [sellerId]
    );

    if (!stallRows.length) {
      throw new Error("Không tìm thấy cửa hàng");
    }

    const stallId = stallRows[0].StallId;

    // Lấy thông tin đơn hàng
    const [orderRows] = await pool.query(`
      SELECT 
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
        AND o.Status IN (2,3,4,5,6,7)
        AND EXISTS (
          SELECT 1 FROM OrderDetails od
          JOIN Products p ON od.ProductId = p.ProductId
          WHERE od.OrderId = o.OrderId
            AND p.StallId = ?
            AND od.Status IN (1,2,3,4,5,6)
        )
    `, [orderId, stallId]);

    if (!orderRows.length) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    // Lấy chi tiết sản phẩm
    const [detailRows] = await pool.query(`
      SELECT 
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
        AND od.Status IN (1,2,3,4,5,6)
      ORDER BY od.CreatedAt ASC
    `, [orderId, stallId]);

    return {
      order: orderRows[0],
      details: detailRows,
      itemCount: detailRows.length
    };
  },

  checkOrderDetailStatus: async (orderDetailId, sellerId) => {
  try {
    const [accessRows] = await pool.query(
      `SELECT 
        od.OrderDetailId, 
        od.Status, 
        od.OrderId,
        p.StallId
      FROM OrderDetails od
      JOIN Products p ON od.ProductId = p.ProductId
      JOIN Stalls s ON p.StallId = s.StallId
      WHERE od.OrderDetailId = ? AND s.AccountId = ?`,
      [orderDetailId, sellerId]
    );

    if (accessRows.length === 0) {
      throw new Error("Không có quyền truy cập vào sản phẩm này");
    }

    const orderDetail = accessRows[0];
    const isPrepared = orderDetail.Status === ORDER_DETAIL_STATUS.PREPARED;
    const canPrepare = orderDetail.Status === ORDER_DETAIL_STATUS.PENDING_PREPARED;
    const canCancelPrepare = orderDetail.Status === ORDER_DETAIL_STATUS.PREPARED;
    const canShip = orderDetail.Status === ORDER_DETAIL_STATUS.PREPARED;
    const canComplete = orderDetail.Status === ORDER_DETAIL_STATUS.SHIPPING;

    return {
      orderDetailId,
      OrderId: orderDetail.OrderId,
      currentStatus: orderDetail.Status,
      isPrepared,
      canPrepare,
      canCancelPrepare,
      canShip,
      canComplete,
      stallId: orderDetail.StallId
    };
  } catch (error) {
    console.error("Check order detail status error:", error);
    throw error;
  }
},

  prepareOrderItem: async (orderDetailId, sellerId, isPrepared) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Kiểm tra quyền truy cập
      const orderDetail = await OrderModel.checkOrderDetailStatus(orderDetailId, sellerId);
      if (!orderDetail) {
        throw new Error("Không có quyền truy cập sản phẩm này");
      }

      let newStatus;
      let statusMessage;

      if (isPrepared) {
        // Chuẩn bị hàng: từ PENDING_PREPARED (1) -> PREPARED (2)
        if (!orderDetail.canPrepare) {
          throw new Error("Chỉ có thể chuẩn bị hàng khi đang ở trạng thái chờ chuẩn bị");
        }
        newStatus = ORDER_DETAIL_STATUS.PREPARED;
        statusMessage = 'Đã chuẩn bị hàng';
      } else {
        // Bỏ chuẩn bị hàng: từ PREPARED (2) -> PENDING_PREPARED (1)
        if (!orderDetail.canCancelPrepare) {
          throw new Error("Chỉ có thể bỏ đánh dấu chuẩn bị khi đã chuẩn bị");
        }
        newStatus = ORDER_DETAIL_STATUS.PENDING_PREPARED;
        statusMessage = 'Bỏ đánh dấu chuẩn bị hàng';
      }

      // Cập nhật trạng thái
      await connection.query(
        `UPDATE OrderDetails SET Status = ?, UpdatedAt = NOW() WHERE OrderDetailId = ?`,
        [newStatus, orderDetailId]
      );

      // Tạo lịch sử trạng thái
      const trackingCode = `PREPARE-${orderDetailId}-${Date.now()}`;
      await connection.query(
        `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, ?, NOW())`,
        [orderDetailId, trackingCode, statusMessage]
      );

      // Kiểm tra xem tất cả sản phẩm của seller trong đơn hàng đã chuẩn bị chưa
      const [allItems] = await connection.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN od.Status = ? THEN 1 ELSE 0 END) as prepared
         FROM OrderDetails od
         JOIN Products p ON od.ProductId = p.ProductId
         JOIN Stalls s ON p.StallId = s.StallId
         WHERE od.OrderId = ?
           AND s.AccountId = ?
           AND od.Status IN (?, ?)`,
        [ORDER_DETAIL_STATUS.PREPARED, orderDetail.OrderId, sellerId, ORDER_DETAIL_STATUS.PENDING_PREPARED, ORDER_DETAIL_STATUS.PREPARED]
      );

      await connection.commit();

      return {
        orderDetailId,
        newStatus,
        allPrepared: allItems[0].prepared === allItems[0].total && allItems[0].total > 0
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  shipSellerOrder: async (orderId, sellerId) => {
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

    // 1. Kiểm tra xem có sản phẩm nào còn ở trạng thái chờ chuẩn bị (status = 1) không
    const [pendingRows] = await connection.query(
      `SELECT COUNT(*) as pendingItems
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId = ?
         AND od.Status = ?`,
      [orderId, stallId, ORDER_DETAIL_STATUS.PENDING_PREPARED]
    );

    if (pendingRows[0].pendingItems > 0) {
      throw new Error("Vẫn còn sản phẩm chưa được chuẩn bị");
    }

    // 2. Lấy tất cả sản phẩm có thể gửi của seller (status = 2 - đã chuẩn bị)
    const [preparedItems] = await connection.query(
      `SELECT od.OrderDetailId 
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId = ?
         AND od.Status = ?`,
      [orderId, stallId, ORDER_DETAIL_STATUS.PREPARED]
    );

    if (preparedItems.length === 0) {
      throw new Error("Không có sản phẩm nào sẵn sàng để gửi");
    }

    // 3. Cập nhật các sản phẩm đã chuẩn bị sang trạng thái đang giao
    const orderDetailIds = preparedItems.map(item => item.OrderDetailId);
    await connection.query(
      `UPDATE OrderDetails 
       SET Status = ?, UpdatedAt = NOW()
       WHERE OrderDetailId IN (?)`,
      [ORDER_DETAIL_STATUS.SHIPPING, orderDetailIds]
    );

    // 4. Tạo lịch sử trạng thái cho từng sản phẩm
    for (const item of preparedItems) {
      const trackingCode = `SHIP-${orderId}-${item.OrderDetailId}-${Date.now()}`;
      await connection.query(
        `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, 'Đang giao hàng', NOW())`,
        [item.OrderDetailId, trackingCode]
      );
    }

    // 5. Kiểm tra xem có seller khác trong đơn hàng vẫn còn sản phẩm chưa gửi không
    const [otherSellersItems] = await connection.query(
      `SELECT COUNT(DISTINCT p.StallId) as otherStalls
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId != ?
         AND od.Status IN (?, ?)`,
      [orderId, stallId, ORDER_DETAIL_STATUS.PENDING_PREPARED, ORDER_DETAIL_STATUS.PREPARED]
    );

    // 6. Xác định trạng thái đơn hàng mới
    let newOrderStatus;
    if (otherSellersItems[0].otherStalls > 0) {
      // Còn seller khác chưa gửi hàng
      newOrderStatus = ORDER_STATUS.WAITING_OTHER_SELLERS;
      
      // Kiểm tra nếu đơn hàng hiện đang ở trạng thái 2 (PROCESSING) thì cập nhật sang 7
      const [currentOrder] = await connection.query(
        `SELECT Status FROM Orders WHERE OrderId = ?`,
        [orderId]
      );
      
      if (currentOrder[0].Status === ORDER_STATUS.PROCESSING) {
        await connection.query(
          `UPDATE Orders SET Status = ?, UpdatedAt = NOW() WHERE OrderId = ?`,
          [ORDER_STATUS.WAITING_OTHER_SELLERS, orderId]
        );
      }
    } else {
      // Tất cả seller đã gửi hàng
      newOrderStatus = ORDER_STATUS.SHIPPING;
      
      // Cập nhật tất cả order details khác còn đang chờ chuẩn bị hoặc đã chuẩn bị sang đang giao
      await connection.query(
        `UPDATE OrderDetails 
         SET Status = ?, UpdatedAt = NOW()
         WHERE OrderId = ? AND Status IN (?, ?)`,
        [ORDER_DETAIL_STATUS.SHIPPING, orderId, ORDER_DETAIL_STATUS.PENDING_PREPARED, ORDER_DETAIL_STATUS.PREPARED]
      );
      
      // Cập nhật trạng thái đơn hàng chính
      await connection.query(
        `UPDATE Orders SET Status = ?, UpdatedAt = NOW() WHERE OrderId = ?`,
        [newOrderStatus, orderId]
      );
    }

    await connection.commit();

    return {
      orderId,
      newOrderStatus,
      updatedItems: preparedItems.length
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
},

  completeSellerOrder: async (orderDetailId, sellerId) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Kiểm tra quyền truy cập
      const orderDetail = await OrderModel.checkOrderDetailStatus(orderDetailId, sellerId);
      if (!orderDetail) {
        throw new Error("Không có quyền truy cập sản phẩm này");
      }

      // Chỉ cho phép hoàn thành khi trạng thái là SHIPPING (3)
      if (orderDetail.currentStatus !== ORDER_DETAIL_STATUS.SHIPPING) {
        throw new Error("Chỉ có thể xác nhận hoàn thành khi đơn hàng đang ở trạng thái đang giao");
      }

      // Cập nhật trạng thái sang COMPLETED (4)
      await connection.query(
        `UPDATE OrderDetails SET Status = ?, UpdatedAt = NOW() WHERE OrderDetailId = ?`,
        [ORDER_DETAIL_STATUS.COMPLETED, orderDetailId]
      );

      // Tạo lịch sử trạng thái
      const trackingCode = `COMPLETE-${orderDetailId}-${Date.now()}`;
      await connection.query(
        `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, 'Đã giao hàng', NOW())`,
        [orderDetailId, trackingCode]
      );

      await connection.commit();

      return {
        orderDetailId,
        newStatus: ORDER_DETAIL_STATUS.COMPLETED
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

};

module.exports = OrderModel;