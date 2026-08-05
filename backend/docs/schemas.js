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
  },
};
