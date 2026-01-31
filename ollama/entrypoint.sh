#!/bin/bash
# Script d'initialisation Ollama
# Télécharge automatiquement le modèle configuré au premier démarrage

MODEL=${OLLAMA_MODEL:-mistral}

echo "=== Démarrage Ollama ==="

# Lancer Ollama en arrière-plan
ollama serve &
OLLAMA_PID=$!

# Attendre qu'Ollama soit prêt
echo "Attente du démarrage d'Ollama..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "Ollama est prêt!"
        break
    fi
    sleep 1
done

# Vérifier si le modèle est déjà téléchargé
if ollama list | grep -q "$MODEL"; then
    echo "Modèle '$MODEL' déjà installé."
else
    echo "Téléchargement du modèle '$MODEL'..."
    ollama pull "$MODEL"
    echo "Modèle '$MODEL' installé avec succès!"
fi

echo "=== Ollama prêt avec le modèle $MODEL ==="

# Garder le processus en premier plan
wait $OLLAMA_PID
