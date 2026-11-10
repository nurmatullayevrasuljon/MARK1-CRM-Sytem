/**
 * @swagger
 * tags:
 *   - name: Payment
 *     description: Balance top-up payments via TezCheck (Click/Payme). All amounts are in so'm
 *   - name: Webhook
 *     description: Events sent by the TezCheck server. Not for the frontend
 */

/**
 * @swagger
 * /payment/create:
 *   post:
 *     summary: Create top-up payment
 *     description: >-
 *       Opens a one-time bill in TezCheck and returns payment_url. Redirect the customer to it.
 *       Amount is in so'm (integer). Allowed range is PAYMENT_MIN_AMOUNT (default 1 000)
 *       to PAYMENT_MAX_AMOUNT (default 50 000 000). A store can have only one open payment at a time,
 *       if there is one the response is 409 with that payment. A payment is valid for 30 minutes (expires_at).
 *       Flow - create, redirect to payment_url, poll GET /payment/{id} every ~3 seconds until the status
 *       is paid, cancelled or failed. When paid, the store balance is increased automatically.
 *     tags: [Payment]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePayment'
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid amount (not an integer, below minimum, above maximum or out of provider range)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *             example:
 *               success: false
 *               message: Summa 1 000 dan 50 000 000 so'mgacha butun son bo'lishi kerak
 *       409:
 *         description: The store already has an unfinished payment (returned in payment) or a payment is being created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentConflict'
 *             example:
 *               success: false
 *               message: Sizda yakunlanmagan to'lov bor. Uni tugating yoki bekor qiling
 *       502:
 *         description: TezCheck could not open the bill
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *             example:
 *               success: false
 *               message: To'lov yaratib bo'lmadi. Birozdan keyin qayta urinib ko'ring
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /payment/active:
 *   get:
 *     summary: Get current open payment
 *     description: >-
 *       Used to resume a payment after a page refresh. Returns payment null when there is no open payment.
 *       The status is synced with TezCheck and an expired payment is closed during this request.
 *     tags: [Payment]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Open payment or null
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payment:
 *                   nullable: true
 *                   allOf:
 *                     - $ref: '#/components/schemas/Payment'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /payment:
 *   get:
 *     summary: Get payment history
 *     description: Payments of the store, newest first
 *     tags: [Payment]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         example: 10
 *     responses:
 *       200:
 *         description: List of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaymentPagination'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /payment/{id}:
 *   get:
 *     summary: Get payment status (for polling)
 *     description: >-
 *       The frontend polls this endpoint every ~3 seconds. The response also contains the current store balance.
 *       For an open payment the server syncs with TezCheck (at most once per 10 seconds), so the payment is
 *       not lost even if the webhook never arrives. Final statuses are paid, cancelled and failed.
 *     tags: [Payment]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 665f1c2e9b1e8a0012a4c7d1
 *     responses:
 *       200:
 *         description: Payment and current balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *                 balance:
 *                   type: number
 *                   example: 150000
 *       400:
 *         description: Invalid id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *             example:
 *               success: false
 *               message: Noto'g'ri ID
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *             example:
 *               success: false
 *               message: To'lov topilmadi
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /payment/{id}/cancel:
 *   post:
 *     summary: Cancel open payment
 *     description: >-
 *       Cancels the bill in TezCheck (the link stops working) and sets the payment to cancelled.
 *       Before cancelling, the server checks that the payment was not paid in the meantime.
 *       If it was paid, or the customer is paying right now, the response is 409.
 *     tags: [Payment]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 665f1c2e9b1e8a0012a4c7d1
 *     responses:
 *       200:
 *         description: Payment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *             example:
 *               success: false
 *               message: Noto'g'ri ID
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *             example:
 *               success: false
 *               message: To'lov topilmadi
 *       409:
 *         description: Payment is already finished (returned in payment) or is being processed right now
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentConflict'
 *             example:
 *               success: false
 *               message: Bu to'lov allaqachon yakunlangan
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /payment/webhook:
 *   post:
 *     summary: TezCheck webhook (payment events)
 *     description: >-
 *       Called only by the TezCheck server. No JWT, the HMAC signature is verified instead.
 *       Signature is v1= plus hex of HMAC-SHA256 using TEZCHECK_WEBHOOK_SECRET over the string
 *       {X-Checkout-Timestamp}.{X-Checkout-Delivery}.{raw body}. The timestamp must be within 300 seconds
 *       of server time. During key rotation the header may contain two comma separated signatures.
 *       payment.succeeded increases the balance exactly once (repeated deliveries are safe).
 *       payment.processing and payment.requires_action set the payment to processing.
 *       Other events and payments that are not ours are ignored with 200.
 *       A 5xx response makes TezCheck retry up to 8 times.
 *       Payments made through the test provider (environment test) are not credited to the balance.
 *     tags: [Webhook]
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-Checkout-Signature
 *         required: true
 *         schema:
 *           type: string
 *         example: v1=6c1f0a1b2c3d4e5f
 *       - in: header
 *         name: X-Checkout-Timestamp
 *         required: true
 *         schema:
 *           type: string
 *         example: "1786000000"
 *       - in: header
 *         name: X-Checkout-Delivery
 *         required: true
 *         schema:
 *           type: string
 *         example: whd_01JQEXAMPLEDLV00000000ABCD
 *       - in: header
 *         name: X-Checkout-Event
 *         schema:
 *           type: string
 *         example: payment.succeeded
 *       - in: header
 *         name: X-Checkout-Event-Id
 *         schema:
 *           type: string
 *         example: oev_01JQEXAMPLEEVT00000000ABCD
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentWebhookEvent'
 *     responses:
 *       200:
 *         description: Accepted (or ignored)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 ignored:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Invalid signature or expired timestamp
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *             example:
 *               success: false
 *               message: Imzo noto'g'ri
 *       500:
 *         description: Internal error, TezCheck will redeliver the event
 */