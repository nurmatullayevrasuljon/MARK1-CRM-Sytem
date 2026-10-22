/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Employee management
 */

/**
 * @swagger
 * /user/create:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a new employee
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUser'
 *     responses:
 *       200:
 *         description: Employee created successfully.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */

/**
 * @swagger
 * /user/update:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update employee
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         example: 6890dbb8a99dc8f2f4f86521
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUser'
 *     responses:
 *       200:
 *         description: Employee updated.
 *       400:
 *         description: Employee not found.
 */

/**
 * @swagger
 * /user/delete:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete employee
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         example: 6890dbb8a99dc8f2f4f86521
 *     responses:
 *       200:
 *         description: Employee deleted.
 *       400:
 *         description: Employee not found.
 */

/**
 * @swagger
 * /user/get/all:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all employees
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees.
 */

/**
 * @swagger
 * /user/get/id:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get employee by id
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         example: 6890dbb8a99dc8f2f4f86521
 *     responses:
 *       200:
 *         description: Employee object.
 *       400:
 *         description: Employee not found.
 */

/**
 * @swagger
 * /user/get/phone:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get employee by phone
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_phone
 *         required: true
 *         schema:
 *           type: string
 *         example: 901112233
 *     responses:
 *       200:
 *         description: Employee object.
 *       400:
 *         description: Employee not found.
 */

/**
 * @swagger
 * /user/profile/get:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get current user profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current authenticated employee.
 *       401:
 *         description: Unauthorized.
 */