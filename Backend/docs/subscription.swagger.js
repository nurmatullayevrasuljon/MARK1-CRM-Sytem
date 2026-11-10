/**
 * @swagger
 * tags:
 *   - name: Subscription
 *     description: Monthly plans (30 days). Plans are bought from the store balance. Amounts are in so'm
 */

/**
 * @swagger
 * /subscription/plans:
 *   get:
 *     summary: Get purchasable plans
 *     description: >-
 *       START 99 000 (1 user, 5 sms, 1 ai), STANDART 199 000 (2 users, 20 sms, 2 ai),
 *       GROWTH 349 000 (5 users, 60 sms, 10 ai), PRO 599 000 (10 users, 150 sms, 30 ai).
 *       The custom plan cannot be purchased. It is given as the 14 day free trial or assigned by an admin.
 *     tags: [Subscription]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 plans:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 */

/**
 * @swagger
 * /subscription/current:
 *   get:
 *     summary: Get current and scheduled subscription
 *     description: >-
 *       current is the subscription active right now. It is null when there is no plan or it has expired
 *       (requests then fail with plan_required). scheduled is a purchased period that has not started yet.
 *       usage and remaining show SMS and AI counters for the current period. balance is the store balance.
 *     tags: [Subscription]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 current:
 *                   nullable: true
 *                   allOf:
 *                     - $ref: '#/components/schemas/Subscription'
 *                 scheduled:
 *                   nullable: true
 *                   allOf:
 *                     - $ref: '#/components/schemas/Subscription'
 *                 balance:
 *                   type: number
 *                   example: 150000
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /subscription/purchase:
 *   post:
 *     summary: Purchase a plan from balance
 *     description: >-
 *       The plan price is deducted from the store balance atomically. Double clicks are safe, while a
 *       previous request is running the response is 409 purchase_in_progress.
 *       During the free trial, or when there is no plan, the new period starts immediately and the remaining
 *       trial days are lost. If a paid plan is active, the new period starts when the current one ends
 *       (starts_at is in the future), and only one scheduled period is allowed at a time.
 *       SMS and AI counters reset with every new period.
 *     tags: [Subscription]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchasePlan'
 *     responses:
 *       201:
 *         description: Plan purchased successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Tarif sotib olindi va faollashtirildi
 *                 subscription:
 *                   $ref: '#/components/schemas/Subscription'
 *                 balance:
 *                   type: number
 *                   example: 51000
 *       400:
 *         description: Invalid plan code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionError'
 *             example:
 *               success: false
 *               code: invalid_plan
 *               message: Noto'g'ri tarif
 *       402:
 *         description: Not enough balance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionError'
 *             example:
 *               success: false
 *               code: insufficient_balance
 *               message: Balans yetarli emas
 *               required: 199000
 *               balance: 120000
 *               shortfall: 79000
 *       409:
 *         description: A previous purchase is still running or the next period is already purchased
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionError'
 *             example:
 *               success: false
 *               code: already_scheduled
 *               message: Keyingi davr uchun tarif allaqachon sotib olingan
 *       500:
 *         description: Server error
 */