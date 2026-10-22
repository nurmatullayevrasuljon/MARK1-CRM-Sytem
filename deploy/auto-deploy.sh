#!/bin/bash
# MARK1 CRM — avtomatik deploy (cron: har daqiqada)
# Tuzilma: Backend/ (Express + pm2: mark-one), Frontend/ (nginx: /var/www/html)
#
# Repo private bo'lsa SSH deploy key ishlatiladi (Settings -> Deploy keys).
# Kalit qo'shilmagan bo'lsa HTTPS (public) bilan urinadi.
set -uo pipefail

REPO_DIR="/root/mark-one"
WEB_ROOT="/var/www/html"
PM2_NAME="mark-one"
ORIGIN_SSH="git@github.com:nurmatullayevrasuljon/MARK1-CRM-Sytem.git"
ORIGIN_HTTPS="https://github.com/nurmatullayevrasuljon/MARK1-CRM-Sytem.git"
DEPLOY_KEY="/root/.ssh/mark1_deploy"

LOG_PREFIX="$(date)"

cd "$REPO_DIR" || exit 1

# ---------- Repo manzilini avtomatik tanlash ----------
sync_remote() {
    if git fetch origin main -q 2>/dev/null; then
        return 0
    fi
    # HTTPS ishlamadi (repo private bo'lgan bo'lishi mumkin) -> SSH deploy key
    if [ -f "$DEPLOY_KEY" ]; then
        export GIT_SSH_COMMAND="ssh -i $DEPLOY_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
        git remote set-url origin "$ORIGIN_SSH"
        git fetch origin main -q 2>/dev/null && return 0
    fi
    return 1
}

if ! sync_remote; then
    echo "$LOG_PREFIX: git fetch amalga oshmadi (repo private bo'lsa deploy key qo'shing)."
    exit 1
fi

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
