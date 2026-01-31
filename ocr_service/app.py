import os
import logging
from flask import Flask, request, jsonify
from paddleocr import PaddleOCR
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app) # Enable CORS for the Flask app

# Initialize PaddleOCR outside the request context to load models once
# Set lang to 'fr' for French, 'en' for English, or list for multiple languages
# use_gpu=False for CPU, use_gpu=True for GPU (if available and configured)
try:
    logger.info("Initializing PaddleOCR...")
    ocr = PaddleOCR(use_angle_cls=True, lang='fr', use_gpu=False) # Use CPU for now
    logger.info("PaddleOCR initialized successfully.")
except Exception as e:
    logger.error(f"Error initializing PaddleOCR: {e}")
    ocr = None # Mark as failed to initialize

@app.route('/ocr', methods=['POST'])
def perform_ocr():
    if ocr is None:
        logger.error("PaddleOCR not initialized. Cannot perform OCR.")
        return jsonify({"error": "OCR service not ready"}), 503

    data = request.get_json()
    if not data or 'file_path' not in data:
        logger.warning("Invalid request: 'file_path' missing in JSON payload.")
        return jsonify({"error": "Missing 'file_path' in request"}), 400

    file_path = data['file_path']
    full_path = os.path.join('/app/uploads', os.path.basename(file_path)) # Ensure path is within expected volume

    if not os.path.exists(full_path):
        logger.warning(f"File not found: {full_path}")
        return jsonify({"error": f"File not found: {file_path}"}), 404

    try:
        logger.info(f"Performing OCR on file: {full_path}")
        result = ocr.ocr(full_path, cls=True)
        
        # Process the result from PaddleOCR
        extracted_text = []
        if result and result[0]: # Check if result is not empty and first element exists
            for line in result[0]:
                text = line[1][0]
                confidence = line[1][1]
                extracted_text.append({"text": text, "confidence": confidence})
        
        logger.info(f"OCR completed for {full_path}. Extracted {len(extracted_text)} lines.")
        return jsonify({"extracted_text": extracted_text}), 200
    except Exception as e:
        logger.error(f"Error during OCR processing for {full_path}: {e}")
        return jsonify({"error": f"OCR processing failed: {e}"}), 500

if __name__ == '__main__':
    # This block is usually for local development outside Docker
    # In Docker, gunicorn or flask run --host=0.0.0.0 is used.
    # We still keep it for completeness and direct local testing if needed.
    app.run(host='0.0.0.0', port=5001)
