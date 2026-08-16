/**
 * @swagger
 * tags:
 *   name: Debts
 *   description: Qarzlarni boshqarish
 */

/**
 * @swagger
 * /debt/get:
 *   get:
 *     summary: Qarzlar ro'yxatini olish
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: client_id
 *         schema:
 *           type: string
 *         description: Mijoz ID bo'yicha filter
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           example: "01-01-2025"
 *         description: Boshlanish sanasi (DD-MM-YYYY)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           example: "31-01-2025"
 *         description: Tugash sanasi (DD-MM-YYYY)
 *       - in: query
 *         name: sort_type
 *         schema:
 *           type: string
 *           enum: [total_price, total_paid, total_remaining]
 *         description: Saralash maydoni
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [descending, ascending]
 *           default: descending
 *         description: Saralash tartibi
 *     responses:
 *       200:
 *         description: Qarzlar muvaffaqiyatli olindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Qarzlar muvaffaqiyatli olindi"
 *                 count:
 *                   type: number
 *                   example: 12
 *                 debts:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Debt"
 *       400:
 *         description: Noto'g'ri so'rov parametrlari
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "client_id noto'g'ri"
 *       500:
 *         description: Server xatoligi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
