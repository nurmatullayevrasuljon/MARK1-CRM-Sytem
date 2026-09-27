/**
 * @swagger
 * tags:
 *   name: Client
 *   description: Xaridorlar (mijozlar) bilan ishlash uchun endpointlar
 */

/**
 * @swagger
 * /client/create:
 *   post:
 *     summary: Yangi xaridor qo'shish
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput'
 *     responses:
 *       200:
 *         description: Xaridor muvaffaqiyatli qo'shildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Xaridor muvaffaqiyatli qo'shildi
 *                 client:
 *                   $ref: '#/components/schemas/Client'
 *       400:
 *         description: Bunday ism yoki telefon raqam bilan xaridor allaqachon mavjud
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
 * /client/update:
 *   put:
 *     summary: Xaridor ma'lumotlarini yangilash
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: client_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Yangilanadigan xaridorning ID raqami
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput'
 *     responses:
 *       200:
 *         description: Xaridor muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Xaridor muvaffaqiyatli yangilandi
 *                 client:
 *                   $ref: '#/components/schemas/Client'
 *       400:
 *         description: Xaridor topilmadi yoki bunday ism/telefon raqam band
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
 * /client/delete:
 *   delete:
 *     summary: Xaridorni o'chirish
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: client_id
 *         required: true
 *         schema:
 *           type: string
 *         description: O'chiriladigan xaridorning ID raqami
 *     responses:
 *       200:
 *         description: Xaridor muvaffaqiyatli o'chirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Xaridor muvaffaqiyatli o'chirildi
 *       400:
 *         description: Xaridor topilmadi
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
 * /client/get:
 *   get:
 *     summary: Xaridorlar ro'yxatini olish (filter bilan)
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: client_id
 *         schema:
 *           type: string
 *         description: Aniq bir xaridorni ID bo'yicha qidirish
 *       - in: query
 *         name: client_name
 *         schema:
 *           type: string
 *         description: Xaridor ismi bo'yicha qidirish (regex, case-insensitive)
 *       - in: query
 *         name: client_phone
 *         schema:
 *           type: string
 *         description: Xaridor telefon raqami bo'yicha qidirish
 *     responses:
 *       200:
 *         description: Xaridorlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Client'
 *       500:
 *         description: Server xatoligi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */