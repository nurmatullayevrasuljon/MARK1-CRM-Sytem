/**
 * @swagger
 * tags:
 *   - name: Store
 *     description: Store profile management
 */

/**
 * @swagger
 * /store/profile/get:
 *   get:
 *     tags:
 *       - Store
 *     summary: Get current store profile
 *     description: Returns the authenticated store profile.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Store profile retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Store'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Store not found.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /store/profile/update:
 *   post:
 *     tags:
 *       - Store
 *     summary: Update store profile
 *     description: Update store information.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStore'
 *     responses:
 *       200:
 *         description: Store updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreUpdateResponse'
 *       400:
 *         description: Store not found.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */