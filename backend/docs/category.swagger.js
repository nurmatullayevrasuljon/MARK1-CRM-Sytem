/**
 * @swagger
 * tags:
 *   - name: Category
 *     description: Category management
 */

/**
 * @swagger
 * /category/create:
 *   post:
 *     summary: Create category
 *     tags: [Category]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategory'
 *     responses:
 *       200:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Kategoriya muvaffaqiyatli yaratildi
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /category/update:
 *   put:
 *     summary: Update category
 *     tags: [Category]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category_id
 *         required: true
 *         schema:
 *           type: string
 *         example: 68922f5e7d82d8c2d5e4c123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCategory'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Kategoriya muvaffaqiyatli tahrirlandi
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Category not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /category/delete:
 *   delete:
 *     summary: Delete category
 *     tags: [Category]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category_id
 *         required: true
 *         schema:
 *           type: string
 *         example: 68922f5e7d82d8c2d5e4c123
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Kategoriya muvaffaqiyatli o'chirildi
 *       400:
 *         description: Category not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /category/get/all:
 *   get:
 *     summary: Get all categories
 *     tags: [Category]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       500:
 *         description: Server error
 */
