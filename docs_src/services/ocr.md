# OCR Service (Microservice)

The OCR service is an **independent microservice** that uses **PaddleOCR** to extract text from documents.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              ocr_service.py (HTTP Client)             │  │
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

## Source Files

| File | Description |
|---------|-------------|
| `ocr_service/app.py` | Flask microservice with `/ocr` endpoint |
| `ocr_service/Dockerfile` | Docker image with PaddleOCR |
| `ocr_service/requirements.txt` | Python dependencies |
| `backend/app/services/ocr_service.py` | HTTP Client (backend side) |

## Microservice API

### POST /ocr

Extracts text from a file.

**Request:**
```json
{
  "file_path": "/app/uploads/abc123.jpg"
}
```

**Response (success):**
```json
{
  "success": true,
  "text": "CARREFOUR\nReceipt\n...",
  "confidence": 92.5,
  "error": null
}
```

**Response (error):**
```json
{
  "success": false,
  "text": "",
  "confidence": 0,
  "error": "File not found"
}
```

### GET /health

Service health check.

**Response:**
```json
{
  "status": "healthy",
  "paddle_ocr": "loaded"
}
```

## Backend Client

### OCRResult

Result of an OCR extraction.

```python
@dataclass
class OCRResult:
    text: str           # Extracted text
    confidence: float   # Confidence score (0-100)
    success: bool       # Extraction successful
    error: str | None   # Error message if failed
```

### OCRService

HTTP client to the microservice.

```python
class OCRService:
    def __init__(self, service_url: str):
        self.service_url = service_url
        self._client = None

    async def extract_text(self, file_path: str) -> OCRResult:
        """
        Calls the OCR microservice to extract text.

        Args:
            file_path: Absolute path to the file

        Returns:
            OCRResult with text and confidence score
        """
        response = await self._client.post(
            f"{self.service_url}/ocr",
            json={"file_path": file_path}
        )
        data = response.json()
        return OCRResult(**data)
```

## Usage

```python
from app.services.ocr_service import get_ocr_service

# Get a service instance
ocr = get_ocr_service()

# Extract text from an image (async HTTP call)
result = await ocr.extract_text("/app/uploads/receipt.jpg")

if result.success:
    print(f"Text: {result.text}")
    print(f"Confidence: {result.confidence}%")
else:
    print(f"Error: {result.error}")
```

## Configuration

### Environment Variables

```bash
# OCR microservice URL (in backend)
OCR_SERVICE_URL=http://ocr-service:5001
```

### PaddleOCR Parameters

| Parameter | Value | Description |
|-----------|--------|-------------|
| use_angle_cls | True | Orientation detection and correction |
| lang | fr | Model language |
| use_gpu | False | CPU usage (M1 compatible) |
| show_log | False | Logs disabled |

## Docker

### Microservice Dockerfile

```dockerfile
FROM python:3.11-slim

# System dependencies for OpenCV
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

### docker compose.yml

```yaml
ocr-service:
  build:
    context: ./ocr_service
    dockerfile: Dockerfile
  container_name: finance-ocr-service
  ports:
    - "5001:5001"
  volumes:
    - ./uploads:/app/uploads  # Access to uploaded files
  restart: unless-stopped
```

## Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| JPEG | .jpg, .jpeg | Recommended format |
| PNG | .png | Good quality |
| WebP | .webp | Compact |
| GIF | .gif | First frame |
| PDF | .pdf | Converted to images |

## Performance

| Document Type | Average Time | Average Confidence |
|------------------|-------------|-------------------|
| Receipt | 1-2s | 85-95% |
| PDF Invoice | 2-4s | 90-98% |
| Blurry Photo | 2-3s | 60-80% |

## Microservice Advantages

1. **Isolation** : PaddleOCR and its heavy dependencies (numpy, opencv) are isolated
2. **Scalability** : Can be scaled independently
3. **Maintenance** : Update without touching the backend
4. **Resources** : Separate memory management (PaddleOCR is memory intensive)
5. **Compatibility** : Avoids dependency conflicts with the backend

## Error Handling

| Error | Cause | Solution |
|--------|-------|----------|
| Connection refused | Service not started | `docker compose up ocr-service` |
| File not found | Invalid path | Check volume mounts |
| Timeout | File too large | Increase timeout (default: 60s) |
| Low confidence | Blurry image | Improve scan quality |
