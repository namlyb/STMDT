const Account = require("../models/account");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const AccountController = {

  // ================= GET ALL USERS =================
  getUsers: async (req, res) => {
    try {
      const users = await Account.getAll();
      res.status(200).json(users);
    } catch (err) {
      console.error("Get users error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // ================= UPDATE ACTIVE =================
  updateActive: async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      if (isActive === undefined) {
        return res.status(400).json({ message: "Thiếu isActive" });
      }

      await Account.updateActive(id, isActive);
      res.status(200).json({ message: "Updated successfully" });
    } catch (err) {
      console.error("Update active error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // ================= REGISTER =================
  register: async (req, res) => {
    try {
      const { username, password, roleId } = req.body;

      if (!username || !password || !roleId) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
      }

      // Hash mật khẩu trước khi lưu
      const hashedPassword = await bcrypt.hash(password, 10); // saltRounds = 10

      const newUser = await Account.create({
        username,
        password: hashedPassword,
        roleId
      });

      res.status(201).json({ message: "Đăng ký thành công", user: newUser });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Đăng ký thất bại" });
    }
  },

  // ================= REGISTER =================
  register: async (req, res) => {
    try {
      const { username, password, name, phone, identityNumber, dateOfBirth, gender, isActive } = req.body;

      const roleId = 2;

      if (!username || !password || !name || !phone || !identityNumber || !dateOfBirth || !gender) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
      }

      // Kiểm tra username đã tồn tại chưa
      const existing = await Account.getByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username đã tồn tại" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await Account.create({
        username,
        password: hashedPassword,
        name,
        phone,
        identityNumber,
        dateOfBirth,
        gender,
        isActive,
        roleId
      });

      res.status(201).json({ message: "Đăng ký thành công", user: newUser });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Đăng ký thất bại" });
    }
  },

  // ================= LOGIN =================
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Thiếu username hoặc password" });
      }

      const account = await Account.getByUsername(username);

      if (!account) {
        return res.status(401).json({ message: "Tài khoản không tồn tại" });
      }

      if (!account.Password) {
        return res.status(500).json({ message: "Mật khẩu chưa được lưu hợp lệ" });
      }

      // So sánh password hash
      const match = await bcrypt.compare(password, account.Password);
      if (!match) {
        return res.status(401).json({ message: "Sai mật khẩu" });
      }

      // ======== TẠO TOKEN ========
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: "JWT_SECRET chưa được cấu hình" });
      }

      const token = jwt.sign(
        { AccountId: account.AccountId, RoleId: account.RoleId },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // ======== GỬI COOKIE ========
      res.cookie("token", token, {
        //httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600 * 1000 // 1h
      });

      // Trả về thông tin account + role
      res.status(200).json({
        message: "Đăng nhập thành công",
        token, // gửi token cho fe
        account: {
          AccountId: account.AccountId,
          Username: account.Username,
          RoleId: account.RoleId.toString(),
          Avatar: account.Avatar || null
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Đăng nhập thất bại" });
    }
  },

  // ================= UPDATE ACCOUNT =================
  updateAccount: async (req, res) => {
    try {
      const { id } = req.params;
      const { Username, Name, Phone, Password, RoleId } = req.body;

      if (!Username || !RoleId) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
      }

      const account = await Account.getById(id);
      if (!account) {
        return res.status(404).json({ message: "Tài khoản không tồn tại" });
      }

      // Nếu có Password mới thì hash
      let hashedPassword = account.Password;
      if (Password) {
        hashedPassword = await bcrypt.hash(Password, 10);
      }

      await Account.update(id, {
        Username,
        Name,
        Phone,
        Password: hashedPassword,
        RoleId
      });

      res.status(200).json({ message: "Cập nhật thành công" });
    } catch (err) {
      console.error("Update account error:", err);
      res.status(500).json({ message: "Cập nhật thất bại" });
    }
  },

  // ================= GET ACCOUNT BY ID =================
  getAccountById: async (req, res) => {
    try {
      const { id } = req.params;
      const account = await Account.getById(id);
      if (!account) return res.status(404).json({ message: "Tài khoản không tồn tại" });
      res.json(account);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ================= GET CURRENT USER =================
  getCurrentUser: async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const account = await Account.getById(req.user.AccountId);
      if (!account) return res.status(404).json({ message: "Tài khoản không tồn tại" });
      res.json(account);
    } catch (err) {
      console.error("getCurrentUser error:", err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ================= LOGOUT =================
  logout: (req, res) => {
    res.clearCookie("token", { httpOnly: true, sameSite: "strict" });
    res.json({ message: "Đăng xuất thành công" });
  },

};

module.exports = AccountController;
