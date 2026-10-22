/**
 * @swagger
 * tags:
 *   name: AI Overview
 *   description: Do'konning kunlik AI biznes tahlili
 */

/**
 * @swagger
 * /ai/overview:
 *   get:
 *     summary: Kunlik AI overview olish
 *     description: >
 *       Tanlangan kun uchun savdo, qarz, ombor va mahsulotlar statistikasini
 *       hisoblaydi va AI yordamida tahliliy matn yaratadi. Natija bazada
 *       saqlanadi; shu kun uchun avval saqlangan overview bo'lsa, qayta
 *       hisoblanmasdan qaytariladi (`force=true` bo'lsa qayta hisoblanadi).
 *       Sanalar UTC+5 (O'zbekiston vaqti) bo'yicha hisoblanadi.
 *     tags: [AI Overview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [daily]
 *           default: daily
 *         description: Davr turi. Hozircha faqat `daily` qo'llab-quvvatlanadi.
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           example: "29-09-2026"
 *           pattern: '^\d{2}-\d{2}-\d{4}$'
 *         description: Sana, DD-MM-YYYY formatida. Berilmasa, bugungi kun olinadi.
 *       - in: query
 *         name: force
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: >
 *           `true` bo'lsa, saqlangan natija e'tiborga olinmaydi va overview
 *           qaytadan hisoblanadi.
 *     responses:
 *       200:
 *         description: AI overview muvaffaqiyatli qaytarildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiOverview'
 *       400:
 *         description: Noto'g'ri so'rov parametrlari
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               invalidPeriod:
 *                 summary: Noto'g'ri period
 *                 value:
 *                   message: "Faqat 'daily' period qo'llab-quvvatlanadi"
 *               invalidDate:
 *                 summary: Noto'g'ri sana formati
 *                 value:
 *                   message: "date parametri DD-MM-YYYY formatida bo'lishi kerak"
 *       401:
 *         description: Avtorizatsiyadan o'tilmagan (access token yo'q yoki yaroqsiz)
 *       500:
 *         description: Server yoki OpenAI xatosi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "AI overview hisoblashda xatolik"
 *                 error:
 *                   type: string
 *                   example: "OpenAI xatosi: 429 ..."
 */