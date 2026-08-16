/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Statistika va hisobotlar
 */

/**
 * @swagger
 * /statistics:
 *   get:
 *     summary: Umumiy statistika (oylik daromad, foyda, qarzdorlik va h.k.)
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistika muvaffaqiyatli olindi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Statistics"
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

/**
 * @swagger
 * /statistics/daily-revenue:
 *   get:
 *     summary: Bugungi kunlik daromadni olish
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kunlik daromad muvaffaqiyatli olindi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DailyRevenue"
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

/**
 * @swagger
 * /statistics/weekly-trend:
 *   get:
 *     summary: Haftalik sotuv trendini olish (dushanbadan yakshanbagacha)
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Haftalik trend muvaffaqiyatli olindi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/WeeklyTrend"
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
