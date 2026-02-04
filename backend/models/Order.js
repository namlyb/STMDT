const { pool } = require("../config/db");

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
    const [items] = await pool.query(`
      SELECT p.ProductId, p.ProductName, p.Price, p.Image, 
             c.Quantity, c.UnitPrice, s.StallId, s.StallName
      FROM Carts c
      JOIN Products p ON c.ProductId = p.ProductId
      JOIN Stalls s ON p.StallId = s.StallId
      WHERE c.AccountId = ? 
        AND c.CartId IN (?)
        AND c.Status = 1
        AND p.IsActive = 1
        AND p.Status = 1
    `, [accountId, cartIds]);
    
    const [vouchers] = await pool.query(`
      SELECT vu.*, v.* 
      FROM VoucherUsage vu
      JOIN Vouchers v ON vu.VoucherId = v.VoucherId
      WHERE vu.AccountId = ? 
        AND vu.IsUsed = 0
        AND v.EndTime >= CURDATE()
    `, [accountId]);
    
    return { items, orderVouchers: vouchers };
  },

  getBuyNowData: async (accountId, productId, quantity) => {
    const [items] = await pool.query(`
      SELECT p.ProductId, p.ProductName, p.Price, p.Image, 
             ? as Quantity, p.Price as UnitPrice, 
             s.StallId, s.StallName
      FROM Products p
      JOIN Stalls s ON p.StallId = s.StallId
      WHERE p.ProductId = ?
        AND p.IsActive = 1
        AND p.Status = 1
    `, [quantity, productId]);
    
    const [vouchers] = await pool.query(`
      SELECT vu.*, v.* 
      FROM VoucherUsage vu
      JOIN Vouchers v ON vu.VoucherId = v.VoucherId
      WHERE vu.AccountId = ? 
        AND vu.IsUsed = 0
        AND v.EndTime >= CURDATE()
    `, [accountId]);
    
    return { items, orderVouchers: vouchers };
  },

  getProductDetails: async (productId) => {
    const [rows] = await pool.query(`
      SELECT p.*, s.StallId 
      FROM Products p
      JOIN Stalls s ON p.StallId = s.StallId
      WHERE p.ProductId = ?
        AND p.IsActive = 1
        AND p.Status = 1
    `, [productId]);
    return rows[0] || null;
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

    // Tạo chi tiết đơn hàng
    for (const item of orderItems) {
      const [detailResult] = await connection.query(`
        INSERT INTO OrderDetails (OrderId, ProductId, UsageId, UnitPrice, Quantity, ShipTypeId, ShipFee, FeeId, Status, CreatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [orderId, item.productId, item.voucherId, item.unitPrice, item.quantity, item.shipTypeId, item.shipFee, item.feeId, initialStatus]);
      
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

    // Cập nhật voucher usage nếu có
    if (orderVoucherId) {
      await connection.query(`
        UPDATE VoucherUsage 
        SET IsUsed = 1, Quantity = Quantity - 1
        WHERE UsageId = ? AND AccountId = ?
      `, [orderVoucherId, accountId]);
    }

    // Cập nhật voucher usage cho từng sản phẩm
    for (const [voucherId, usageCount] of productVoucherUsage) {
      await connection.query(`
        UPDATE VoucherUsage 
        SET IsUsed = 1, Quantity = Quantity - ?
        WHERE UsageId = ? AND AccountId = ?
      `, [usageCount, voucherId, accountId]);
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
      `, [ORDER_STATUS.CANCELLED, orderId]);

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
      const [detailRows] = await connection.query(`
        SELECT od.ProductId, od.UnitPrice, od.Quantity
        FROM OrderDetails od
        JOIN Orders o ON od.OrderId = o.OrderId
        WHERE o.OrderId = ? AND o.AccountId = ?
          AND od.Status = ?
      `, [orderId, accountId, ORDER_STATUS.COMPLETED]);

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
            AND od2.Status IN (2,3,4,5,7)
        ) as itemCount,
        (
          SELECT SUM(od2.UnitPrice * od2.Quantity)
          FROM OrderDetails od2 
          WHERE od2.OrderId = o.OrderId 
            AND od2.ProductId IN (
              SELECT ProductId FROM Products WHERE StallId = ?
            )
            AND od2.Status IN (2,3,4,5,7)
        ) as SubTotal,
        (
          SELECT SUM(od2.ShipFee)
          FROM OrderDetails od2 
          WHERE od2.OrderId = o.OrderId 
            AND od2.ProductId IN (
              SELECT ProductId FROM Products WHERE StallId = ?
            )
            AND od2.Status IN (2,3,4,5,7)
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
          AND od.Status IN (2,3,4,5,7)
      )
      AND o.Status IN (2,3,4,5,7)  -- THÊM TRẠNG THÁI 7 VÀO ĐÂY
    `;

    const params = [stallId, stallId, stallId, stallId];

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
          AND od.Status IN (2,3,4,5,7)
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
        AND o.Status IN (2,3,4,5,7)  -- THÊM TRẠNG THÁI 7
        AND EXISTS (
          SELECT 1 FROM OrderDetails od
          JOIN Products p ON od.ProductId = p.ProductId
          WHERE od.OrderId = o.OrderId
            AND p.StallId = ?
            AND od.Status IN (2,3,4,5,7)
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
        AND od.Status IN (2,3,4,5,7)
      ORDER BY od.CreatedAt ASC
    `, [orderId, stallId]);

    return {
      order: orderRows[0],
      details: detailRows,
      itemCount: detailRows.length
    };
  },

  checkOrderDetailAccess: async (orderDetailId, sellerId) => {
    const [rows] = await pool.query(`
      SELECT od.*, o.Status as orderStatus, p.StallId, s.AccountId
      FROM OrderDetails od
      JOIN Products p ON od.ProductId = p.ProductId
      JOIN Stalls s ON p.StallId = s.StallId
      JOIN Orders o ON od.OrderId = o.OrderId
      WHERE od.OrderDetailId = ?
        AND s.AccountId = ?
    `, [orderDetailId, sellerId]);
    return rows[0] || null;
  },

  prepareOrderItem: async (orderDetailId, sellerId, isPrepared) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Kiểm tra quyền truy cập
      const orderDetail = await OrderModel.checkOrderDetailAccess(orderDetailId, sellerId);
      if (!orderDetail) {
        throw new Error("Không có quyền truy cập sản phẩm này");
      }

      // Chỉ cho phép chuẩn bị khi trạng thái là PROCESSING (2) và order status là 2 hoặc 7
      if (orderDetail.Status !== ORDER_STATUS.PROCESSING || 
          (orderDetail.orderStatus !== ORDER_STATUS.PROCESSING && 
           orderDetail.orderStatus !== ORDER_STATUS.WAITING_OTHER_SELLERS)) {
        throw new Error("Chỉ có thể chuẩn bị hàng khi đơn hàng đang xử lý hoặc chờ gian hàng khác");
      }

      const newStatus = isPrepared ? ORDER_STATUS.SHIPPING : ORDER_STATUS.PROCESSING;

      await connection.query(
        `UPDATE OrderDetails SET Status = ?, UpdatedAt = NOW() WHERE OrderDetailId = ?`,
        [newStatus, orderDetailId]
      );

      // Tạo lịch sử trạng thái
      const trackingCode = `PREPARE-${orderDetailId}-${Date.now()}`;
      const statusText = isPrepared ? 'Đã chuẩn bị hàng' : 'Bỏ chuẩn bị hàng';

      await connection.query(
        `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, ?, NOW())`,
        [orderDetailId, trackingCode, statusText]
      );

      // Kiểm tra nếu tất cả sản phẩm của seller đã được chuẩn bị
      const [allItems] = await connection.query(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN od.Status = ${ORDER_STATUS.SHIPPING} THEN 1 ELSE 0 END) as prepared
         FROM OrderDetails od
         JOIN Products p ON od.ProductId = p.ProductId
         JOIN Stalls s ON p.StallId = s.StallId
         WHERE od.OrderId = ?
           AND s.AccountId = ?
           AND od.Status IN (${ORDER_STATUS.PROCESSING}, ${ORDER_STATUS.SHIPPING})`,
        [orderDetail.OrderId, sellerId]
      );

      await connection.commit();

      return {
        orderDetailId,
        newStatus,
        allPrepared: allItems[0].total === allItems[0].prepared && allItems[0].total > 0
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

      // Kiểm tra xem tất cả sản phẩm của seller đã được chuẩn bị chưa
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

      // Cập nhật tất cả order details của seller sang SHIPPING
      const [updateResult] = await connection.query(
        `UPDATE OrderDetails od
         JOIN Products p ON od.ProductId = p.ProductId
         SET od.Status = ${ORDER_STATUS.SHIPPING}, od.UpdatedAt = NOW()
         WHERE od.OrderId = ?
           AND p.StallId = ?
           AND od.Status = ${ORDER_STATUS.PROCESSING}`,
        [orderId, stallId]
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

      // Kiểm tra xem có seller khác chưa gửi hàng không
      const [otherSellersItems] = await connection.query(
        `SELECT COUNT(DISTINCT p.StallId) as otherStalls
         FROM OrderDetails od
         JOIN Products p ON od.ProductId = p.ProductId
         WHERE od.OrderId = ?
           AND p.StallId != ?
           AND od.Status = ${ORDER_STATUS.PROCESSING}`,
        [orderId, stallId]
      );

      // Xác định trạng thái đơn hàng mới
      let newOrderStatus;
      if (otherSellersItems[0].otherStalls > 0) {
        newOrderStatus = ORDER_STATUS.WAITING_OTHER_SELLERS;
      } else {
        newOrderStatus = ORDER_STATUS.SHIPPING;
        
        // Cập nhật tất cả order details khác còn đang xử lý
        await connection.query(
          `UPDATE OrderDetails 
           SET Status = ${ORDER_STATUS.SHIPPING}, UpdatedAt = NOW()
           WHERE OrderId = ? AND Status = ${ORDER_STATUS.PROCESSING}`,
          [orderId]
        );
      }

      // Cập nhật trạng thái đơn hàng
      await connection.query(
        `UPDATE Orders SET Status = ?, UpdatedAt = NOW() WHERE OrderId = ?`,
        [newOrderStatus, orderId]
      );

      await connection.commit();

      return {
        orderId,
        newOrderStatus,
        updatedItems: updateResult.affectedRows
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

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
           VALUES (?, ?, 'Đang giao hàng', NOW())`,
          [detail.OrderDetailId, trackingCode]
        );
      }

      // Kiểm tra xem có seller khác chưa gửi hàng không
      const [otherSellersItems] = await connection.query(
        `SELECT COUNT(DISTINCT p.StallId) as otherStalls
         FROM OrderDetails od
         JOIN Products p ON od.ProductId = p.ProductId
         WHERE od.OrderId = ?
           AND p.StallId != ?
           AND od.Status = ${ORDER_STATUS.PROCESSING}`,
        [orderId, stallId]
      );

      // Xác định trạng thái đơn hàng mới
      let newOrderStatus;
      if (otherSellersItems[0].otherStalls > 0) {
        newOrderStatus = ORDER_STATUS.WAITING_OTHER_SELLERS;
      } else {
        newOrderStatus = ORDER_STATUS.SHIPPING;
        
        // Cập nhật tất cả order details khác còn đang xử lý
        await connection.query(
          `UPDATE OrderDetails 
           SET Status = ${ORDER_STATUS.SHIPPING}, UpdatedAt = NOW()
           WHERE OrderId = ? AND Status = ${ORDER_STATUS.PROCESSING}`,
          [orderId]
        );
      }

      // Cập nhật trạng thái đơn hàng
      await connection.query(
        `UPDATE Orders SET Status = ?, UpdatedAt = NOW() WHERE OrderId = ?`,
        [newOrderStatus, orderId]
      );

      await connection.commit();

      return {
        orderId,
        newOrderStatus,
        updatedItems: updateResult.affectedRows
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
      const orderDetail = await OrderModel.checkOrderDetailAccess(orderDetailId, sellerId);
      if (!orderDetail) {
        throw new Error("Không có quyền truy cập sản phẩm này");
      }

      // Chỉ cho phép hoàn thành khi trạng thái là SHIPPING (3)
      if (orderDetail.Status !== ORDER_STATUS.SHIPPING) {
        throw new Error("Chỉ có thể xác nhận hoàn thành khi đơn hàng đang ở trạng thái đang giao");
      }

      // Cập nhật trạng thái sang COMPLETED
      await connection.query(
        `UPDATE OrderDetails SET Status = ?, UpdatedAt = NOW() WHERE OrderDetailId = ?`,
        [ORDER_STATUS.COMPLETED, orderDetailId]
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
        newStatus: ORDER_STATUS.COMPLETED
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  checkOrderDetailStatus: async (orderDetailId, sellerId) => {
    const rows = await OrderModel.checkOrderDetailAccess(orderDetailId, sellerId);
    if (!rows) {
      throw new Error("Không tìm thấy");
    }

    return {
      orderDetailId,
      orderStatus: rows.orderStatus,
      hasShipped: rows.Status >= 3
    };
  }
};

module.exports = OrderModel;