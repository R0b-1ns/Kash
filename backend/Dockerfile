FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PaddleOCR and PDF processing
# Note: libgl1 remplace libgl1-mesa-glx dans les versions récentes de Debian
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN python -m pip install --upgrade pip

# Install ML libraries first to ensure correct numpy/opencv resolution
RUN pip install --no-cache-dir "paddleocr==2.7.3" "paddlepaddle==2.6.2"

# Install the rest of the requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
