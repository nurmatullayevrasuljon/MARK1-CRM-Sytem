/**
 * @swagger
 * tags:
 *   name: Sale
 *   description: Sotuvlar bilan ishlash uchun endpointlar
 */

/**
 * @swagger
 * /sale/create:
 *   post:
 *     summary: Yangi sotuv yaratish
 *     description: Mahsulotlar ombordan kamaytiriladi va sotuv yaratiladi (tranzaksiya ichida).
 *     tags: [Sale]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSaleInput'
 *     responses:
 *       201:
 *         description: Sotuv muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sotuv yaratildi
 *                 sale:
 *                   $ref: '#/components/schemas/Sale'
 *       400:
 *         description: Mahsulot topilmadi yoki omborda yetarli miqdor mavjud emas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /sale/cancel:
 *   delete:
 *     summary: Sotuvni bekor qilish
 *     description: Sotuvdagi mahsulotlar miqdori omborga qaytariladi, sotuv statusi "cancelled" ga o'zgaradi.
 *     tags: [Sale]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sale_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bekor qilinadigan sotuvning ID raqami
 *     responses:
 *       200:
 *         description: Sotuv muvaffaqiyatli bekor qilindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sotuv muvaffaqiyatli bekor qilindi
 *       500:
 *         description: Sotuv topilmadi yoki server xatoligi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /sale/return:
 *   put:
 *     summary: Sotuvni qaytarish
 *     description: Sotuvdagi mahsulotlar miqdori omborga qaytariladi, sotuv statusi "returned" ga o'zgaradi.
 *     tags: [Sale]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sale_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Qaytariladigan sotuvning ID raqami
 *     responses:
 *       200:
 *         description: Sotuv muvaffaqiyatli qaytarildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sotuv muvaffaqiyatli qaytarildi
 *       500:
 *         description: Sotuv topilmadi yoki server xatoligi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /sale/payment/add:
 *   post:
 *     summary: Sotuvga to'lov qo'shish
 *     tags: [Sale]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sale_id
 *         required: true
 *         schema:
 *           type: string
 *         description: To'lov qo'shiladigan sotuvning ID raqami
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddPaymentInput'
 *     responses:
 *       200:
 *         description: To'lov muvaffaqiyatli qo'shildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: To'lov muvaffaqiyatli qo'shildi
 *                 sale:
 *                   $ref: '#/components/schemas/Sale'
 *       400:
 *         description: Faqat faol sotuvga to'lov qo'shish mumkin yoki summa qarzdan katta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Sotuv topilmadi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server xatoligi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /sale/get:
 *   get:
 *     summary: Sotuvlar ro'yxatini olish (filter va sort bilan)
 *     tags: [Sale]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: client_id
 *         schema:
 *           type: string
 *         description: Xaridor ID bo'yicha filter
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: string
 *         description: Mahsulot ID bo'yicha filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, cancelled, returned]
 *           default: active
 *         description: Sotuv statusi bo'yicha filter
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           example: "01.01.2025"
 *         description: Boshlanish sanasi (dd.mm.yyyy formatida)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           example: "31.01.2025"
 *         description: Tugash sanasi (dd.mm.yyyy formatida)
 *       - in: query
 *         name: sort_type
 *         schema:
 *           type: string
 *           enum: [total_purchase, total_price, total_paid, total_remaining]
 *         description: Saralash maydoni (berilmasa createdAt bo'yicha saralanadi)
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ascending, descending]
 *           default: descending
 *         description: Saralash tartibi
 *     responses:
 *       200:
 *         description: Sotuvlar ro'yxati (client va mahsulotlar populate qilingan)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sale'
 *       500:
 *         description: Server xatoligi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /sale/export:
 *   get:
 *     tags:
 *       - Sale
 *     summary: Export sales
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: client_id
 *         schema:
 *           type: integer
 *
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: integer
 *
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           example: "2026-08-29"
 *
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           example: "2026-08-29"
 *
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - sales
 *             - items
 *             - payments
 *
 *     responses:
 *       200:
 *         description: Excel file successfully generated
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *
 *       400:
 *         description: Invalid request parameters
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /sale/remind:
 *   post:
 *     summary: Qarzdorlikka qo'lda eslatma (SMS) yuborish
 *     description: Belgilangan sotuv bo'yicha xaridorga qarzdorligi haqida qo'lda SMS eslatma yuboriladi.
 *     tags: [Sale]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sale_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Eslatma yuboriladigan sotuvning ID raqami
 *     responses:
 *       200:
 *         description: SMS muvaffaqiyatli yuborildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sms muvaffaqiyatli yuborildi
 *                 client:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "68922f5e7d82d8c2d5e4c123"
 *                     client_name:
 *                       type: string
 *                       example: "Aziz Karimov"
 *                     client_phone:
 *                       type: string
 *                       example: "+998901234567"
 *                 sms_message:
 *                   type: string
 *                   example: "Hurmatli Aziz Karimov, sizning Do'kon nomi oldidagi 30 000 so'm qarzingizni to'lash vaqti ertaga keladi. Iltimos, o'z vaqtida to'lang."
 *       400:
 *         description: Sotuv topilmadi, xaridor biriktirilmagan, qarzdorlik yo'q, telefon raqam noto'g'ri yoki SMS yuborishda xatolik
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server xatoligi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
