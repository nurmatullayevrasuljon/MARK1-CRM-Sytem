/**
 * @swagger
 * tags:
 *   - name: Store Auth
 *     description: Store authentication endpoints
 *
 *   - name: User Auth
 *     description: User authentication endpoints
 */

/**
 * @swagger
 * /auth/store/signup:
 *   post:
 *     tags:
 *       - Store Auth
 *     summary: Register a new store
 *     operationId: registerStore
 *     description: |
 *       Creates a new store account.
 *
 *       After successful registration:
 *
 *       - An OTP code is sent to the provided CEO phone number.
 *       - The account remains inactive until it is verified.
 *       - Use the /auth/store/verify endpoint to activate the account.
 *
 *       The password is securely hashed before being stored.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StoreSignup'
 *           example:
 *             ceo_name: "Ali Valiyev"
 *             ceo_phone: "901234567"
 *             store_name: "Ali Market"
 *             password: "12345678"
 *
 *     responses:
 *       200:
 *         description: Store registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignupResponse'
 *             example:
 *               message: Hisob yaratildi, hisobni tasdiqlashingiz mumkin
 *               verify_data:
 *                 ceo_phone: "901234567"
 *                 otp_expires_at: "2026-08-03T12:30:00.000Z"
 *
 *       400:
 *         description: Registration failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               PhoneAlreadyExists:
 *                 summary: Phone number already registered
 *                 value:
 *                   message: Ushbu telefon raqam bilan avval ro'yhatdan o'tilgan
 *
 *               SmsError:
 *                 summary: SMS sending failed
 *                 value:
 *                   message: Sms yuborishda xatolik
 *
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: Internal server error
 */

/**
 * @swagger
 * /auth/store/verify:
 *   post:
 *     tags:
 *       - Store Auth
 *     summary: Verify store account
 *     operationId: verifyStore
 *     description: |
 *       Verifies a newly registered store using the OTP code sent via SMS.
 *
 *       If the verification is successful:
 *
 *       - The store account becomes active.
 *       - An **access_token** is returned in the response body.
 *       - A **refreshToken** is automatically stored as an HttpOnly Cookie.
 *
 *       Use the returned access token in the Authorization header for all protected endpoints.
 *
 *       Example:
 *
 *           Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StoreVerify'
 *           example:
 *             ceo_phone: "901234567"
 *             otp: "458912"
 *
 *     responses:
 *       200:
 *         description: Store verified successfully.
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly Refresh Token Cookie.
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyResponse'
 *             example:
 *               message: Hisobga kirish muvaffaqiyatli
 *               access_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxx
 *
 *       400:
 *         description: Invalid verification request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               StoreNotFound:
 *                 summary: Store not found
 *                 value:
 *                   message: Telefon raqam bo'yicha do'kon topilmadi
 *
 *               AlreadyVerified:
 *                 summary: Store already verified
 *                 value:
 *                   message: Do'kon allaqachon tasdiqlangan
 *
 *               OtpExpired:
 *                 summary: OTP expired
 *                 value:
 *                   message: Kodning yaroqlilik muddati tugagan
 *
 *               InvalidOtp:
 *                 summary: Invalid OTP
 *                 value:
 *                   message: Kod mos emas
 *
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: Internal server error
 */

/**
 * @swagger
 * /auth/store/signin:
 *   post:
 *     tags:
 *       - Store Auth
 *     summary: Login store
 *     operationId: storeSignin
 *     description: |
 *       Login to the store account.
 *
 *       After successful authentication:
 *
 *       • Returns an **access_token** in the response body.
 *
 *       • Saves a **refreshToken** as an HttpOnly Cookie.
 *
 *       Use the returned access token in the Authorization header.
 *
 *       Example:
 *
 *           Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StoreSignin'
 *           example:
 *             ceo_phone: "901234567"
 *             password: "12345678"
 *
 *     responses:
 *       200:
 *         description: Login successful.
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly Refresh Token Cookie.
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               message: Hisobga kirish muvaffaqiyatli
 *               access_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *       400:
 *         description: Invalid credentials.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: Parol mos emas
 *
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/store/refresh:
 *   post:
 *     tags:
 *       - Store Auth
 *     summary: Refresh access token
 *     operationId: refreshStoreToken
 *     security:
 *       - CookieAuth: []
 *     description: |
 *       Generates a new Access Token using the refreshToken cookie.
 *
 *       No request body is required.
 *
 *       The refreshToken must exist in the browser cookie.
 *
 *     responses:
 *       200:
 *         description: New access token generated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshResponse'
 *             example:
 *               access_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *       401:
 *         description: Missing or invalid refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedResponse'
 *
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /auth/store/forgot-password:
 *   post:
 *     tags:
 *       - Store Auth
 *     summary: Request password reset
 *     operationId: forgotStorePassword
 *     description: |
 *       Sends a One-Time Password (OTP) to the store owner's registered phone number.
 *
 *       If the phone number exists:
 *
 *       - A new OTP is generated.
 *       - The OTP expiration time is updated.
 *       - The OTP is sent via SMS.
 *
 *       The received OTP must be used with the /auth/store/reset-password
 *       endpoint to change the account password.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPassword'
 *           example:
 *             ceo_phone: "901234567"
 *
 *     responses:
 *       200:
 *         description: OTP sent successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignupResponse'
 *             example:
 *               message: Parolni o'zgartirish uchun sms kod yuborildi
 *               verify_data:
 *                 ceo_phone: "901234567"
 *                 otp_expires_at: "2026-08-03T12:30:00.000Z"
 *
 *       400:
 *         description: Password reset request failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               StoreNotFound:
 *                 summary: Store not found
 *                 value:
 *                   message: Telefon raqam bo'yicha do'kon topilmadi
 *
 *               SmsFailed:
 *                 summary: SMS sending failed
 *                 value:
 *                   message: Sms yuborishda xatolik
 *
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: Internal server error
 */

/**
 * @swagger
 * /auth/store/reset-password:
 *   post:
 *     tags:
 *       - Store Auth
 *     summary: Reset store password
 *     operationId: resetStorePassword
 *     description: |
 *       Resets the store account password using a valid One-Time Password (OTP).
 *
 *       Before calling this endpoint:
 *
 *       - Request an OTP using /auth/store/forgot-password.
 *       - Use the received OTP before it expires.
 *
 *       If the OTP is valid:
 *
 *       - The password is securely hashed.
 *       - The old password is replaced.
 *       - The OTP is permanently removed.
 *       - The OTP expiration time is cleared.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPassword'
 *           example:
 *             ceo_phone: "901234567"
 *             otp: "852741"
 *             new_password: "NewPassword123"
 *
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: Parol muvaffaqiyatli o'zgartirildi
 *
 *       400:
 *         description: Password reset failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               StoreNotFound:
 *                 summary: Store not found
 *                 value:
 *                   message: Telefon raqam bo'yicha do'kon topilmadi
 *
 *               AlreadyVerified:
 *                 summary: OTP is not available
 *                 value:
 *                   message: Do'kon allaqachon tasdiqlangan
 *
 *               OtpExpired:
 *                 summary: OTP expired
 *                 value:
 *                   message: Kodning yaroqlilik muddati tugagan
 *
 *               InvalidOtp:
 *                 summary: Invalid OTP
 *                 value:
 *                   message: Kod mos emas
 *
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: Internal server error
 */

/**
 * @swagger
 * /auth/user/signin:
 *   post:
 *     tags:
 *       - User Auth
 *     summary: Login employee account
 *     operationId: signinUser
 *     description: |
 *       Authenticates an employee using their phone number and password.
 *
 *       If authentication is successful:
 *
 *       - Returns an **access_token** in the response body.
 *       - Stores a **refreshToken** as an HttpOnly Cookie.
 *
 *       Use the returned access token in the Authorization header for all
 *       protected API endpoints.
 *
 *       Example:
 *
 *           Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSignin'
 *           example:
 *             user_phone: "901112233"
 *             password: "123456"
 *
 *     responses:
 *       200:
 *         description: User logged in successfully.
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly Refresh Token Cookie.
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               message: Hisobga kirish muvaffaqiyatli
 *               access_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxx
 *
 *       400:
 *         description: Login failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               UserNotFound:
 *                 summary: User not found
 *                 value:
 *                   message: Telefon raqam bo'yicha xodim topilmadi
 *
 *               InvalidPassword:
 *                 summary: Invalid password
 *                 value:
 *                   message: Parol mos emas
 *
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: Internal server error
 */

/**
 * @swagger
 * /auth/user/refresh:
 *   post:
 *     tags:
 *       - User Auth
 *     summary: Refresh user access token
 *     operationId: refreshUserToken
 *     security:
 *       - CookieAuth: []
 *     description: |
 *       Generates a new JWT Access Token using the refreshToken stored
 *       in the HttpOnly Cookie.
 *
 *       This endpoint does not require a request body.
 *
 *       Requirements:
 *
 *       - A valid **refreshToken** must exist in the browser cookie.
 *       - The refresh token must not be expired.
 *       - The associated employee account must still exist.
 *
 *       Returns a new access token that should be used in the
 *       Authorization header for subsequent protected requests.
 *
 *       Example:
 *
 *           Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *     responses:
 *       200:
 *         description: Access token refreshed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshResponse'
 *             example:
 *               access_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxx
 *
 *       401:
 *         description: Missing or invalid refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedResponse'
 *             examples:
 *               MissingRefreshToken:
 *                 summary: Refresh token not found
 *                 value:
 *                   message: Refresh token topilmadi
 *
 *               InvalidRefreshToken:
 *                 summary: Invalid or expired refresh token
 *                 value:
 *                   message: Refresh token yaroqsiz yoki muddati tugagan
 *
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundResponse'
 *             example:
 *               message: Xodim topilmadi
 *
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: Internal server error
 */
