
use STMDT;

CREATE TABLE Roles (
    RoleId INT AUTO_INCREMENT PRIMARY KEY,
    RoleName VARCHAR(100) NOT NULL
);
CREATE TABLE Categories (
    CategoryId INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName TEXT NOT NULL,
    CategoryImage TEXT NOT NULL
);
CREATE TABLE Accounts (
    AccountId INT AUTO_INCREMENT PRIMARY KEY,
    Username TEXT NOT NULL,
    Password TEXT NOT NULL,
    Avt TEXT,
    Name TEXT NOT NULL,
    Phone VARCHAR(12) NOT NULL,
    IdentityNumber VARCHAR(12) NOT NULL,
    DateOfBirth DATE,
    Gender ENUM('m','f'),
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    RoleId INT,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (RoleId) REFERENCES Roles(RoleId)
);
CREATE TABLE Chats (
    ChatId INT AUTO_INCREMENT PRIMARY KEY,
    BuyerId INT NOT NULL,
    SellerId INT NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BuyerId) REFERENCES Accounts(AccountId),
    FOREIGN KEY (SellerId) REFERENCES Accounts(AccountId)
);
CREATE TABLE Stalls (
    StallId INT AUTO_INCREMENT PRIMARY KEY,
    StallName TEXT NOT NULL,
    AccountId INT UNIQUE NOT NULL,
    FOREIGN KEY (AccountId) REFERENCES Accounts(AccountId)
);
CREATE TABLE Products (
    ProductId INT AUTO_INCREMENT PRIMARY KEY,
    StallId INT NOT NULL,
    ProductName TEXT NOT NULL,
    Price INT NOT NULL,
    Description TEXT NOT NULL,
    Image TEXT NOT NULL,
    Status TINYINT(1) NOT NULL DEFAULT 1,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (StallId) REFERENCES Stalls(StallId)
);
CREATE TABLE ProductCategory (
    ProductId INT NOT NULL,
    CategoryId INT NOT NULL,
    PRIMARY KEY (ProductId, CategoryId),
    FOREIGN KEY (ProductId) REFERENCES Products(ProductId),
    FOREIGN KEY (CategoryId) REFERENCES Categories(CategoryId)
);

CREATE TABLE Promotions (
    PromotionId INT AUTO_INCREMENT PRIMARY KEY,
    DiscountType VARCHAR(50) NOT NULL,
    DiscountValue INT NOT NULL,
    Quantity INT,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    Status TINYINT(1) DEFAULT 1 not null,
);
CREATE TABLE PromotionProduct (
    ProductId INT NOT NULL,
    PromotionId INT NOT NULL,
    PRIMARY KEY (ProductId, PromotionId),
    FOREIGN KEY (ProductId) REFERENCES Products(ProductId),
    FOREIGN KEY (PromotionId) REFERENCES Promotions(PromotionId)
);
CREATE TABLE Address (
    AddressId INT AUTO_INCREMENT PRIMARY KEY,
    AccountId INT NOT NULL,
    Content TEXT NOT NULL,
    Status TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (AccountId) REFERENCES Accounts(AccountId)
);
CREATE TABLE Messages (
    MessageId INT AUTO_INCREMENT PRIMARY KEY,
    ChatId INT NOT NULL,
    SenderId INT NOT NULL,
    Content TEXT NOT NULL,
    SentAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IsRead TINYINT(1) DEFAULT 0,
    FOREIGN KEY (ChatId) REFERENCES Chats(ChatId),
    FOREIGN KEY (SenderId) REFERENCES Accounts(AccountId)
);
CREATE TABLE Shippers (
    ShipperId INT AUTO_INCREMENT PRIMARY KEY,
    CompanyName VARCHAR(255) NOT NULL,
    Phone VARCHAR(12) NOT NULL,
    Status TINYINT(1) DEFAULT 1,
);
CREATE TABLE Shipments (
    ShipmentId INT AUTO_INCREMENT PRIMARY KEY,
    ShipperId INT NOT NULL,
    TrackingCode VARCHAR(255) NOT NULL,
    ShippingFee INT NOT NULL,
    CreatedAt DATE NOT NULL,
    Status TINYINT(1) DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ShipperId) REFERENCES Shippers(ShipperId)
);
CREATE TABLE PlatformFees (
    FeeId INT AUTO_INCREMENT PRIMARY KEY,
    PercentValue INT NOT NULL,
    ConditionText TEXT NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE Orders (
    OrderId INT AUTO_INCREMENT PRIMARY KEY,
    AccountId INT NOT NULL,
    ShipmentId INT,
    FeeId INT NOT NULL,
    AddressId INT NOT NULL,
    OrderDate DATE NOT NULL,
    StallId INT NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (AccountId) REFERENCES Accounts(AccountId),
    FOREIGN KEY (ShipmentId) REFERENCES Shipments(ShipmentId),
    FOREIGN KEY (FeeId) REFERENCES PlatformFees(FeeId),
    FOREIGN KEY (AddressId) REFERENCES Address(AddressId),
    FOREIGN KEY (StallId) REFERENCES Stalls(StallId);
);
CREATE TABLE PaymentMethods (
    MethodId INT AUTO_INCREMENT PRIMARY KEY,
    MethodName VARCHAR(100) NOT NULL,
    Description TEXT,
    Status TINYINT(1) DEFAULT 1,
);
CREATE TABLE Vouchers (
    VoucherId INT AUTO_INCREMENT PRIMARY KEY,
    VoucherName VARCHAR(100) NOT NULL,
    DiscountType VARCHAR(50) NOT NULL,
    Discount INT NOT NULL,
    Quantity INT NOT NULL,
    ConditionText TEXT NOT NULL,
    EndTime DATE NOT NULL,
    CreatedBy INT NOT NULL,
    FOREIGN KEY (CreatedBy) REFERENCES Accounts(AccountId)
);
CREATE TABLE VoucherUsage (
    UsageId INT AUTO_INCREMENT PRIMARY KEY,
    VoucherId INT NOT NULL,
    AccountId INT NOT NULL,
    Quantity INT NOT NULL,
    FOREIGN KEY (VoucherId) REFERENCES Vouchers(VoucherId),
    FOREIGN KEY (AccountId) REFERENCES Accounts(AccountId)
);
CREATE TABLE OrderDetails (
    OrderDetailId INT AUTO_INCREMENT PRIMARY KEY,
    OrderId INT NOT NULL,
    ProductId INT NOT NULL,
    MethodId INT NOT NULL,
    UsageId INT,
    UnitPrice INT NOT NULL,
    Quantity INT NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrderId) REFERENCES Orders(OrderId),
    FOREIGN KEY (ProductId) REFERENCES Products(ProductId),
    FOREIGN KEY (MethodId) REFERENCES PaymentMethods(MethodId),
    FOREIGN KEY (UsageId) REFERENCES VoucherUsage(UsageId)
);
CREATE TABLE Feedbacks (
    FeedbackId INT AUTO_INCREMENT PRIMARY KEY,
    AccountId INT NOT NULL,
    OrderDetailId INT NOT NULL,
    Score INT CHECK (Score BETWEEN 1 AND 5),
    Content TEXT NOT NULL,
    Image TEXT,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AccountId) REFERENCES Accounts(AccountId),
    FOREIGN KEY (OrderDetailId) REFERENCES OrderDetails(OrderDetailId)
);
CREATE TABLE Payments (
    PaymentId INT AUTO_INCREMENT PRIMARY KEY,
    OrderDetailId INT NOT NULL,
    Amount INT NOT NULL,
    TransactionDate DATE NOT NULL,
    TransactionCode VARCHAR(255) NOT NULL,
    Status VARCHAR(50) NOT NULL,
    FOREIGN KEY (OrderDetailId) REFERENCES OrderDetails(OrderDetailId)
);
CREATE TABLE OrderStatusHistory (
    HistoryId INT AUTO_INCREMENT PRIMARY KEY,
    OrderDetailId INT NOT NULL,
    Status VARCHAR(100) NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrderDetailId) REFERENCES OrderDetails(OrderDetailId)
);
CREATE TABLE Carts (
    CartId INT AUTO_INCREMENT PRIMARY KEY,
    ProductId INT NOT NULL,
    AccountId INT NOT NULL,
    Quantity INT NOT NULL CHECK (Quantity > 0),
    Status TINYINT(1) NOT NULL DEFAULT 1,
    UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UnitPrice INT NOT NULL,
    IsSelected TINYINT(1) DEFAULT 1,
    UNIQUE (ProductId, AccountId),
    FOREIGN KEY (ProductId) REFERENCES Products(ProductId),
    FOREIGN KEY (AccountId) REFERENCES Accounts(AccountId)
);
CREATE TABLE StyleAds (
    StyleID INT AUTO_INCREMENT PRIMARY KEY,
    StyleName VARCHAR(100) NOT NULL
);
create table Ads(
AdsId INT AUTO_INCREMENT PRIMARY KEY,
AdsImage TEXT NOT NULL,
StyleID INT,
Status TINYINT(1) NOT NULL DEFAULT 1,
FOREIGN KEY (StyleID) REFERENCES StyleAds(StyleID)
);
