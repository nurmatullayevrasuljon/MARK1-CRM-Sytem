/**
 * @swagger
 * tags:
 *   - name: Product
 *     description: Product management
 */

/**
 * @swagger
 * /product/create:
 *   post:
 *     summary: Create product
 *     tags: [Product]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProduct'
 *     responses:
 *       200:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tovar muvaffaqiyatli yaratildi
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Product with this barcode already exists
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /product/update:
 *   put:
 *     summary: Update product
 *     tags: [Product]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         example: 68922f5e7d82d8c2d5e4c123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProduct'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tovar muvaffaqiyatli tahrirlandi
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Product with this barcode already exists
 *       500:
 *         description: Server error
 */

/**
/**
 * @swagger
 * /product/add:
 *   put:
 *     summary: Increase amount of product
 *     tags: [Product]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         example: 68922f5e7d82d8c2d5e4c123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddStock'
 *     responses:
 *       200:
 *         description: Product amount increased successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tovar miqdori muvaffaqiyatli oshirildi
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Qo'shilayotgan miqdor 0 dan katta bo'lishi kerak
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /product/delete:
 *   delete:
 *     summary: Delete product
 *     tags: [Product]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         example: 68922f5e7d82d8c2d5e4c123
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tovar muvaffaqiyatli o'chirildi
 *       400:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /product/get:
 *   get:
 *     summary: Get products
 *     tags: [Product]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_name
 *         schema:
 *           type: string
 *         description: Product name search
 *
 *       - in: query
 *         name: product_barcode
 *         schema:
 *           type: string
 *         description: Barcode search
 *
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *         description: Category ID
 *
 *       - in: query
 *         name: sort_type
 *         schema:
 *           type: string
 *           enum:
 *             - purchase_price
 *             - selling_price
 *             - quantity
 *             - minimum_quantity
 *         description: Sort field
 *
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum:
 *             - ascending
 *             - descending
 *         description: Sort order
 *
 *     responses:
 *       200:
 *         description: Product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
