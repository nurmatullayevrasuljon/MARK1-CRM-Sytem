#!/bin/bash
# MARK1 CRM — avtomatik deploy (cron: har daqiqada)
# Tuzilma: Backend/ (Express + pm2: mark-one), Frontend/ (nginx: /var/www/html)
set -uo pipefail

REPO_DIR="/root/mark-one"
WEB_ROOT="/var/www/html"
PM2_NAME="mark-one"
LOG_PREFIX="$(date)"

cd "$REPO_DIR" || exit 1

git fetch origin main -q || exit 1
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"

if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0
fi

echo "$LOG_PREFIX: O'zgarishlar topildi ($LOCAL -> $REMOTE). Yangilanmoqda..."

git reset --hard origin/main || exit 1

# ---------- Frontend ----------
# qa/ sahifalari va img/eski arxivi productionga chiqarilmaydi
rsync -a --delete \
    --exclude 'qa/' \
    --exclude 'img/eski/' \
    "$REPO_DIR/Frontend/" "$WEB_ROOT/"
chown -R ubuntu:ubuntu "$WEB_ROOT"

# ---------- Backend ----------
cd "$REPO_DIR/Backend" || exit 1

# package.json o'zgargan bo'lsa bog'liqliklarni yangilash
if [ ! -f node_modules/.package-lock.json ] || \
   [ package.json -nt node_modules/.package-lock.json ] || \
   [ package-lock.json -nt node_modules/.package-lock.json ]; then
    echo "$LOG_PREFIX: npm install..."
    npm install --omit=dev --silent
fi

mkdir -p uploads

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 restart "$PM2_NAME" --update-env --silent
else
    pm2 start server.js --name "$PM2_NAME" --cwd "$REPO_DIR/Backend"
fi

echo "$LOG_PREFIX: Yangilanish yakunlandi."
