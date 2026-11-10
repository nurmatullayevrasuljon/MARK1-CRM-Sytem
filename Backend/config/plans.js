// Narxlar SO'MDA (balans ham so'mda saqlanadi). Limitlar har bir obuna davri (30 kun) uchun.
// Tarif o'zgarsa, faqat shu fayl o'zgaradi. Eski obunalarga ta'sir qilmaydi, chunki
// limitlar har bir Subscription ichiga nusxalab saqlanadi.

const PLANS = {
  start: {
    code: "start",
    name: "START",
    price: 99000,
    period_days: 30,
    limits: { max_users: 1, sms: 5, ai: 1 },
  },
  standart: {
    code: "standart",
    name: "STANDART",
    price: 199000,
    period_days: 30,
    limits: { max_users: 2, sms: 20, ai: 2 },
  },
  growth: {
    code: "growth",
    name: "GROWTH",
    price: 349000,
    period_days: 30,
    limits: { max_users: 5, sms: 60, ai: 10 },
  },
  pro: {
    code: "pro",
    name: "PRO",
    price: 599000,
    period_days: 30,
    limits: { max_users: 10, sms: 150, ai: 30 },
  },
  // "custom" sotib olinmaydi: admin qo'lda beradi (scripts/plan-admin.js)
};

// Ro'yxatdan o'tib tasdiqlangan do'konga bir marta beriladigan bepul davr ("custom" tarif sifatida)
const TRIAL = {
  plan: "custom",
  days: 14,
  limits: { max_users: 1, sms: 5, ai: 1 },
};

module.exports = { PLANS, TRIAL };