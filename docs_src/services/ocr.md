# Service OCR (Microservice)

Le service OCR est un **microservice indépendant** qui utilise **PaddleOCR** pour extraire le texte des documents.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              ocr_service.py (Client HTTP)              │  │
│  │                                                        │  │
│  │  async def extract_text(file_path):                   │  │
│  │      response = await client.post(                     │  │
│  │          f"{OCR_SERVICE_URL}/ocr",                    │  │
│  │          json={"file_path": file_path}                │  │
│  │      )                                                 │  │
│  └────────────────────────┬──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP POST :5001
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    OCR SERVICE (Flask)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     app.py                             │  │
│  │                                                        │  │
│  │  @app.route('/ocr', methods=['POST'])                 │  │
│  │  def ocr():                                            │  │
│  │      file_path = request.json['file_path']            │  │
│  │      result = paddle_ocr.ocr(file_path)               │  │
│  │      return {"text": ..., "confidence": ...}          │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │  PaddleOCR  │                          │
│                    │  (CPU/GPU)  │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Fichiers sources

| Fichier | Description |
|---------|-------------|
| `ocr_service/app.py` | Microservice Flask avec endpoint `/ocr` |
| `ocr_service/Dockerfile` | Image Docker avec PaddleOCR |
| `ocr_service/requirements.txt` | Dépendances Python |
| `backend/app/services/ocr_service.py` | Client HTTP (côté backend) |

## API du microservice

### POST /ocr

Extrait le texte d'un fichier.

**Requête :**
```json
{
  "file_path": "/app/uploads/abc123.jpg"
}
```

**Réponse (succès) :**
```json
{
  "success": true,
  "text": "CARREFOUR\nTicket de caisse\n...",
  "confidence": 92.5,
  "error": null
}
```

**Réponse (erreur) :**
```json
{
  "success": false,
  "text": "",
  "confidence": 0,
  "error": "Fichier introuvable"
}
```

### GET /health

Vérification de santé du service.

**Réponse :**
```json
{
  "status": "healthy",
  "paddle_ocr": "loaded"
}
```

## Client côté Backend

### OCRResult

Résultat d'une extraction OCR.

```python
@dataclass
class OCRResult:
    text: str           # Texte extrait
    confidence: float   # Score de confiance (0-100)
    success: bool       # Extraction réussie
    error: str | None   # Message d'erreur si échec
```

### OCRService

Client HTTP vers le microservice.

```python
class OCRService:
    def __init__(self, service_url: str):
        self.service_url = service_url
        self._client = None

    async def extract_text(self, file_path: str) -> OCRResult:
        """
        Appelle le microservice OCR pour extraire le texte.

        Args:
            file_path: Chemin absolu vers le fichier

        Returns:
            OCRResult avec le texte et le score de confiance
        """
        response = await self._client.post(
            f"{self.service_url}/ocr",
            json={"file_path": file_path}
        )
        data = response.json()
        return OCRResult(**data)
```

## Utilisation

```python
from app.services.ocr_service import get_ocr_service

# Obtenir une instance du service
ocr = get_ocr_service()

# Extraire le texte d'une image (appel HTTP async)
result = await ocr.extract_text("/app/uploads/ticket.jpg")

if result.success:
    print(f"Texte: {result.text}")
    print(f"Confiance: {result.confidence}%")
else:
    print(f"Erreur: {result.error}")
```

## Configuration

### Variables d'environnement

```bash
# URL du microservice OCR (dans le backend)
OCR_SERVICE_URL=http://ocr-service:5001
```

### Paramètres PaddleOCR

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| use_angle_cls | True | Détection et correction de l'orientation |
| lang | fr | Langue du modèle |
| use_gpu | False | Utilisation CPU (compatible M1) |
| show_log | False | Logs désactivés |

## Docker

### Dockerfile du microservice

```dockerfile
FROM python:3.11-slim

# Dépendances système pour OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
EXPOSE 5001
CMD ["python", "app.py"]
```

### docker-compose.yml

```yaml
ocr-service:
  build:
    context: ./ocr_service
    dockerfile: Dockerfile
  container_name: finance-ocr-service
  ports:
    - "5001:5001"
  volumes:
    - ./uploads:/app/uploads  # Accès aux fichiers uploadés
  restart: unless-stopped
```

## Formats supportés

| Format | Extension | Notes |
|--------|-----------|-------|
| JPEG | .jpg, .jpeg | Format recommandé |
| PNG | .png | Bonne qualité |
| WebP | .webp | Compact |
| GIF | .gif | Première frame |
| PDF | .pdf | Converti en images |

## Performances

| Type de document | Temps moyen | Confiance moyenne |
|------------------|-------------|-------------------|
| Ticket de caisse | 1-2s | 85-95% |
| Facture PDF | 2-4s | 90-98% |
| Photo floue | 2-3s | 60-80% |

## Avantages du microservice

1. **Isolation** : PaddleOCR et ses dépendances lourdes (numpy, opencv) sont isolées
2. **Scalabilité** : Peut être répliqué indépendamment
3. **Maintenance** : Mise à jour sans toucher au backend
4. **Ressources** : Gestion mémoire séparée (PaddleOCR est gourmand)
5. **Compatibilité** : Évite les conflits de dépendances avec le backend

## Gestion des erreurs

| Erreur | Cause | Solution |
|--------|-------|----------|
| Connection refused | Service non démarré | `docker-compose up ocr-service` |
| File not found | Chemin invalide | Vérifier le montage des volumes |
| Timeout | Fichier trop gros | Augmenter le timeout (défaut: 60s) |
| Low confidence | Image floue | Améliorer la qualité de scan |
