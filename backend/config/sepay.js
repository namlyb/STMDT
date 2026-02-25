// backend/config/sepay.js
module.exports = {
  apiKey: process.env.SEPAY_API_KEY || '7JSVJWX4YZ9XJFZETMN6GH8I0H3EW2CMXA1DHPDJRPGO4TVKKB8FIVOQLOCAGA0E',
  webhookSecret: process.env.SEPAY_WEBHOOK_SECRET || 'spsk_test_c1BCMtfp5eaYjPQBKAnZjMJ7YsP682Q5',
  bankAccount: {
    bankName: process.env.BANK_NAME || 'MBBank',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || '0339391633',
    accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'DINH GIA NAM'
  },
  apiUrl: process.env.SEPAY_API_URL || 'https://api.sepay.vn/v1' // URL API của SePay
};