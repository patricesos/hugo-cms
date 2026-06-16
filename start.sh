#!/usr/bin/env bash
echo "Démarrage de Hugo CMS..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Copie de .env.example vers .env — modifiez-le selon votre configuration."
fi
exec node build/index.js
