/**
 * @swagger
 * tags:
 *   - name: Files
 *     description: File upload management
 */

/**
 * @swagger
 * /file/create:
 *   post:
 *     tags:
 *       - Files
 *     summary: Upload a file
 *     description: Upload a single file and save its metadata.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileResponse'
 *             example:
 *               message: Fayl muvaffaqiyatli saqlandi
 *               file:
 *                 _id: 6890dbb8a99dc8f2f4f86521
 *                 store_id: 6890dbb8a99dc8f2f4f86511
 *                 file_name: image.png
 *                 file_url: http://localhost:5000/api/uploads/image.png
 *                 mimetype: image/png
 *                 size: 245760
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */