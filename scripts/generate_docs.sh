#!/bin/bash
# ============================================
# Script de génération de la documentation HTML
# ============================================
#
# Ce script génère la documentation du projet avec MkDocs.
#
# Usage: ./scripts/generate_docs.sh
#
# La documentation est générée dans le dossier docs/
# ============================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}=== Génération de la documentation ===${NC}"
echo ""

cd "$PROJECT_ROOT"

# Vérifier si mkdocs est installé
if ! command -v mkdocs &> /dev/null; then
    echo "Installation de MkDocs..."
    pip3 install mkdocs mkdocs-material --user
fi

# Générer la documentation
echo -e "${BLUE}Génération de la documentation MkDocs...${NC}"
mkdocs build

echo -e "${GREEN}✓ Documentation générée dans docs/${NC}"
echo ""
echo -e "${GREEN}=== Documentation générée avec succès ===${NC}"
echo ""
echo "Pour visualiser la documentation :"
echo "  1. Ouvrez docs/index.html dans votre navigateur"
echo "  2. Ou lancez: mkdocs serve (puis ouvrez http://localhost:8000)"
echo ""
