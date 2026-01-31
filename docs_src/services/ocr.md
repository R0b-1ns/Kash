# Service OCR

Le service OCR utilise **PaddleOCR** pour extraire le texte des documents.

## Fichier source

`backend/app/services/ocr_service.py`

## Fonctionnalités

- Extraction de texte depuis images (JPG, PNG, WEBP, BMP)
- Extraction de texte depuis PDF (conversion en images)
- Score de confiance pour chaque extraction
- Support multilingue (français, anglais)

## Classes

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

Service principal d'extraction.

```python
class OCRService:
    def __init__(self):
        """Initialise PaddleOCR avec les paramètres optimaux."""
        self.ocr = PaddleOCR(
            use_angle_cls=True,  # Correction d'orientation
            lang='fr',            # Langue française
            use_gpu=False         # CPU uniquement
        )

    def extract_text(self, file_path: str) -> OCRResult:
        """
        Extrait le texte d'un fichier.

        Args:
            file_path: Chemin absolu vers le fichier

        Returns:
            OCRResult avec le texte et le score de confiance
        """
```

## Utilisation

```python
from app.services.ocr_service import get_ocr_service

# Obtenir une instance du service
ocr = get_ocr_service()

# Extraire le texte d'une image
result = ocr.extract_text("/path/to/ticket.jpg")

if result.success:
    print(f"Texte: {result.text}")
    print(f"Confiance: {result.confidence}%")
else:
    print(f"Erreur: {result.error}")
```

## Traitement des PDF

Les fichiers PDF sont convertis en images avant l'extraction :

```python
def _extract_from_pdf(self, file_path: str) -> OCRResult:
    """
    Convertit le PDF en images et extrait le texte.

    Utilise pdf2image pour la conversion.
    Traite chaque page séparément et concatène les résultats.
    """
```

## Configuration

### Paramètres PaddleOCR

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| use_angle_cls | True | Détection et correction de l'orientation |
| lang | fr | Langue du modèle |
| use_gpu | False | Utilisation CPU (compatible M1) |
| show_log | False | Logs désactivés |

### Performances

| Type de document | Temps moyen | Confiance moyenne |
|------------------|-------------|-------------------|
| Ticket de caisse | 1-2s | 85-95% |
| Facture PDF | 2-4s | 90-98% |
| Photo floue | 2-3s | 60-80% |

## Formats supportés

| Format | Extension | Notes |
|--------|-----------|-------|
| JPEG | .jpg, .jpeg | Format recommandé |
| PNG | .png | Bonne qualité |
| WebP | .webp | Compact |
| BMP | .bmp | Non compressé |
| PDF | .pdf | Converti en images |

## Gestion des erreurs

```python
try:
    result = ocr.extract_text(file_path)
except FileNotFoundError:
    # Fichier introuvable
except PermissionError:
    # Accès refusé
except Exception as e:
    # Erreur OCR interne
```

## Optimisation

### Conseils pour de meilleurs résultats

1. **Qualité d'image** : Résolution minimale 300 DPI
2. **Éclairage** : Éviter les ombres et reflets
3. **Orientation** : Le texte doit être lisible (PaddleOCR corrige jusqu'à 90°)
4. **Contraste** : Texte noir sur fond blanc idéal

### Prétraitement recommandé

Pour des cas difficiles, un prétraitement peut améliorer les résultats :

```python
from PIL import Image, ImageEnhance

# Améliorer le contraste
img = Image.open(file_path)
enhancer = ImageEnhance.Contrast(img)
img = enhancer.enhance(1.5)

# Convertir en niveaux de gris
img = img.convert('L')
```
