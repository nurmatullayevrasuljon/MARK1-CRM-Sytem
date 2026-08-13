module.exports = {
  securitySchemes: {
    BearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description: "JWT Access Token",
    },

    CookieAuth: {
      type: "apiKey",
      in: "cookie",
      name: "refreshToken",
      description: "Refresh Token Cookie",
    },
  },
  schemas: {
    /* ===========================
            STORE AUTH
    ============================ */

    StoreSignup: {
      type: "object",
      required: ["ceo_name", "ceo_phone", "store_name", "password"],
      properties: {
        ceo_name: {
          type: "string",
          example: "Ali Valiyev",
        },
        ceo_phone: {
          type: "string",
          example: "901234567",
        },
        store_name: {
          type: "string",
          example: "Ali Market",
        },
        password: {
          type: "string",
          example: "12345678",
        },
      },
    },

    StoreVerify: {
      type: "object",
      required: ["ceo_phone", "otp"],
      properties: {
        ceo_phone: {
          type: "string",
          example: "901234567",
        },
        otp: {
          type: "string",
          example: "458912",
        },
      },
    },

    StoreSignin: {
      type: "object",
      required: ["ceo_phone", "password"],
      properties: {
        ceo_phone: {
          type: "string",
          example: "901234567",
        },
        password: {
          type: "string",
          example: "12345678",
        },
      },
    },

    ForgotPassword: {
      type: "object",
      required: ["ceo_phone"],
      properties: {
        ceo_phone: {
          type: "string",
          example: "901234567",
        },
      },
    },

    ResetPassword: {
      type: "object",
      required: ["ceo_phone", "otp", "new_password"],
      properties: {
        ceo_phone: {
          type: "string",
          example: "901234567",
        },
        otp: {
          type: "string",
          example: "852741",
        },
        new_password: {
          type: "string",
          example: "newPassword123",
        },
      },
    },

    /* ===========================
              USER
    ============================ */

    UserSignin: {
      type: "object",
      required: ["user_phone", "password"],
      properties: {
        user_phone: {
          type: "string",
          example: "901112233",
        },
        password: {
          type: "string",
          example: "123456",
        },
      },
    },

    CreateUser: {
      type: "object",
      required: ["user_name", "user_phone", "password", "role"],
      properties: {
        user_name: {
          type: "string",
          example: "John Doe",
        },
        user_phone: {
          type: "string",
          example: "901112233",
        },
        password: {
          type: "string",
          example: "123456",
        },
        role: {
          type: "string",
          enum: ["ceo", "admin", "seller"],
          example: "seller",
        },
        profile_picture: {
          type: "string",
          nullable: true,
          example: "https://example.com/profile.jpg",
        },
      },
    },

    UpdateUser: {
      type: "object",
      properties: {
        user_name: {
          type: "string",
          example: "John Doe",
        },
        user_phone: {
          type: "string",
          example: "901112233",
        },
        password: {
          type: "string",
          example: "123456",
        },
        role: {
          type: "string",
          enum: ["ceo", "admin", "seller"],
          example: "admin",
        },
        profile_picture: {
          type: "string",
          nullable: true,
          example: "https://example.com/profile.jpg",
        },
      },
    },

    User: {
      type: "object",
      properties: {
        _id: {
          type: "string",
          example: "6890dbb8a99dc8f2f4f86521",
        },
        user_name: {
          type: "string",
          example: "John Doe",
        },
        user_phone: {
          type: "string",
          example: "901112233",
        },
        role: {
          type: "string",
          example: "seller",
        },
        profile_picture: {
          type: "string",
          nullable: true,
          example: "https://example.com/profile.jpg",
        },
        store_id: {
          type: "string",
          example: "6890dbb8a99dc8f2f4f86511",
        },
      },
    },

    /* ===========================
             CATEGORY
    ============================ */

    Category: {
      type: "object",
      properties: {
        _id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c123",
        },
        store_id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c111",
        },
        category_name: {
          type: "string",
          example: "Ichimliklar",
        },
        createdAt: {
          type: "string",
          format: "date-time",
          example: "2026-08-06T12:00:00.000Z",
        },
        updatedAt: {
          type: "string",
          format: "date-time",
          example: "2026-08-06T12:00:00.000Z",
        },
      },
    },

    CreateCategory: {
      type: "object",
      required: ["category_name"],
      properties: {
        category_name: {
          type: "string",
          example: "Ichimliklar",
        },
      },
    },

    UpdateCategory: {
      type: "object",
      required: ["category_name"],
      properties: {
        category_name: {
          type: "string",
          example: "Gazli ichimliklar",
        },
      },
    },

    /* ===========================
             PRODUCT
    ============================ */

    Product: {
      type: "object",
      properties: {
        _id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c123",
        },
        store_id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c111",
        },
        product_name: {
          type: "string",
          example: "Coca Cola 1.5L",
        },
        product_barcode: {
          type: "string",
          example: "1234567890123",
        },
        category_id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c222",
        },
        purchase_price: {
          type: "number",
          example: 12000,
        },
        selling_price: {
          type: "number",
          example: 15000,
        },
        quantity: {
          type: "number",
          example: 35,
        },
        minimum_quantity: {
          type: "number",
          example: 5,
        },
        images: {
          type: "array",
          items: {
            type: "string",
          },
          example: [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg",
          ],
        },
        createdAt: {
          type: "string",
          format: "date-time",
        },
        updatedAt: {
          type: "string",
          format: "date-time",
        },
      },
    },

    CreateProduct: {
      type: "object",
      required: ["product_name", "product_barcode", "category_id"],
      properties: {
        product_name: {
          type: "string",
          example: "Coca Cola 1.5L",
        },
        product_barcode: {
          type: "string",
          example: "1234567890123",
        },
        category_id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c222",
        },
        purchase_price: {
          type: "number",
          example: 12000,
        },
        selling_price: {
          type: "number",
          example: 15000,
        },
        quantity: {
          type: "number",
          example: 20,
        },
        minimum_quantity: {
          type: "number",
          example: 5,
        },
        images: {
          type: "array",
          items: {
            type: "string",
          },
          example: ["https://example.com/image1.jpg"],
        },
      },
    },

    UpdateProduct: {
      type: "object",
      properties: {
        product_name: {
          type: "string",
          example: "Coca Cola 2L",
        },
        product_barcode: {
          type: "string",
          example: "1234567890123",
        },
        category_id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c222",
        },
        purchase_price: {
          type: "number",
          example: 13000,
        },
        selling_price: {
          type: "number",
          example: 17000,
        },
        quantity: {
          type: "number",
          example: 25,
        },
        minimum_quantity: {
          type: "number",
          example: 5,
        },
        images: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
    },

    /* ===========================
             STORE
    ============================ */

    Store: {
      type: "object",
      properties: {
        _id: {
          type: "string",
          example: "6890dbb8a99dc8f2f4f86511",
        },
        ceo_name: {
          type: "string",
          example: "Ali Valiyev",
        },
        ceo_phone: {
          type: "string",
          example: "901234567",
        },
        store_name: {
          type: "string",
          example: "Ali Market",
        },
        profile_picture: {
          type: "string",
          nullable: true,
          example: "https://example.com/store.png",
        },
      },
    },

    UpdateStore: {
      type: "object",
      properties: {
        ceo_name: {
          type: "string",
          example: "Ali Valiyev",
        },
        store_name: {
          type: "string",
          example: "Ali Market",
        },
        profile_picture: {
          type: "string",
          nullable: true,
          example: "https://example.com/store.png",
        },
      },
    },

    StoreUpdateResponse: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Do'kon muvaffaqiyatli tahrirlandi",
        },
        data: {
          $ref: "#/components/schemas/Store",
        },
      },
    },

    /* ===========================
               FILE
    ============================ */

    File: {
      type: "object",
      properties: {
        _id: {
          type: "string",
          example: "6890dbb8a99dc8f2f4f86521",
        },
        store_id: {
          type: "string",
          example: "6890dbb8a99dc8f2f4f86511",
        },
        file_name: {
          type: "string",
          example: "image.png",
        },
        file_url: {
          type: "string",
          example: "http://localhost:5000/api/uploads/image.png",
        },
        mimetype: {
          type: "string",
          example: "image/png",
        },
        size: {
          type: "integer",
          example: 245760,
        },
      },
    },

    FileResponse: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Fayl muvaffaqiyatli saqlandi",
        },
        file: {
          $ref: "#/components/schemas/File",
        },
      },
    },

    /* ===========================
            RESPONSES
    ============================ */

    SignupResponse: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Hisob yaratildi, hisobni tasdiqlashingiz mumkin",
        },
        verify_data: {
          type: "object",
          properties: {
            ceo_phone: {
              type: "string",
              example: "901234567",
            },
            otp_expires_at: {
              type: "string",
              format: "date-time",
              example: "2026-08-03T12:30:00.000Z",
            },
          },
        },
      },
    },

    LoginResponse: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Hisobga kirish muvaffaqiyatli",
        },
        access_token: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxx",
        },
      },
    },

    VerifyResponse: {
      $ref: "#/components/schemas/LoginResponse",
    },

    RefreshResponse: {
      type: "object",
      properties: {
        access_token: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxx",
        },
      },
    },

    SuccessResponse: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Operation completed successfully",
        },
      },
    },

    MessageResponse: {
      $ref: "#/components/schemas/SuccessResponse",
    },

    ErrorResponse: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Xatolik yuz berdi",
        },
      },
    },

    UnauthorizedResponse: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Unauthorized",
        },
      },
    },

    ForbiddenResponse: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Forbidden",
        },
      },
    },

    NotFoundResponse: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Topilmadi",
        },
      },
    },
    /* ===========================
             CLIENT
    ============================ */

    Client: {
      type: "object",
      properties: {
        _id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c123",
        },
        store_id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c111",
        },
        client_name: {
          type: "string",
          example: "Aziz Karimov",
        },
        client_phone: {
          type: "string",
          nullable: true,
          example: "901234567",
        },
        createdAt: {
          type: "string",
          format: "date-time",
        },
        updatedAt: {
          type: "string",
          format: "date-time",
        },
      },
    },

    ClientInput: {
      type: "object",
      required: ["client_name"],
      properties: {
        client_name: {
          type: "string",
          example: "Aziz Karimov",
        },
        client_phone: {
          type: "string",
          pattern: "^\\d{9}$",
          example: "901234567",
        },
      },
    },

    /* ===========================
              SALE
    ============================ */

    SaleProductInput: {
      type: "object",
      required: ["product_id", "purchase_price", "selling_price", "quantity"],
      properties: {
        product_id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c123",
        },
        purchase_price: {
          type: "number",
          example: 15000,
        },
        selling_price: {
          type: "number",
          example: 20000,
        },
        quantity: {
          type: "number",
          example: 2,
        },
      },
    },

    SaleProduct: {
      type: "object",
      properties: {
        product_id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c123",
        },
        purchase_price: {
          type: "number",
          example: 15000,
        },
        selling_price: {
          type: "number",
          example: 20000,
        },
        quantity: {
          type: "number",
          example: 2,
        },
      },
    },

    Payment: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          example: 10000,
        },
        paid_at: {
          type: "string",
          format: "date-time",
        },
      },
    },

    CreateSaleInput: {
      type: "object",
      required: ["products"],
      properties: {
        products: {
          type: "array",
          items: {
            $ref: "#/components/schemas/SaleProductInput",
          },
        },
        total_paid: {
          type: "number",
          default: 0,
          example: 10000,
        },
        client_id: {
          type: "string",
          nullable: true,
          example: "68922f5e7d82d8c2d5e4c123",
        },
        note: {
          type: "string",
          nullable: true,
          example: "Chegirma bilan sotildi",
        },
      },
    },

    AddPaymentInput: {
      type: "object",
      required: ["amount"],
      properties: {
        amount: {
          type: "number",
          example: 5000,
        },
      },
    },

    Sale: {
      type: "object",
      properties: {
        _id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c999",
        },
        store_id: {
          type: "string",
          example: "68922f5e7d82d8c2d5e4c111",
        },
        client_id: {
          type: "string",
          nullable: true,
          example: "68922f5e7d82d8c2d5e4c123",
        },
        products: {
          type: "array",
          items: {
            $ref: "#/components/schemas/SaleProduct",
          },
        },
        note: {
          type: "string",
          nullable: true,
          example: "Chegirma bilan sotildi",
        },
        status: {
          type: "string",
          enum: ["active", "cancelled", "returned"],
          example: "active",
        },
        total_purchase: {
          type: "number",
          example: 30000,
        },
        total_price: {
          type: "number",
          example: 40000,
        },
        total_paid: {
          type: "number",
          example: 10000,
        },
        total_remaining: {
          type: "number",
          example: 30000,
        },
        payments: {
          type: "array",
          items: {
            $ref: "#/components/schemas/Payment",
          },
        },
        createdAt: {
          type: "string",
          format: "date-time",
        },
        updatedAt: {
          type: "string",
          format: "date-time",
        },
      },
    },
  },
};
