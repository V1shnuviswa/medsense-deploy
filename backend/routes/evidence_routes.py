from flask import Blueprint, request, jsonify
from services.pubmed_service import search_pubmed
import logging

evidence_bp = Blueprint('evidence', __name__)
logger = logging.getLogger(__name__)

@evidence_bp.route('/search', methods=['GET'])
def search_evidence():
    """
    Search PubMed for clinical evidence based on query parameter
    """
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400
    
    try:
        results = search_pubmed(query)
        return jsonify({"results": results})
    except Exception as e:
        logger.error(f"Search failed: {e}")
        return jsonify({"error": "Failed to fetch evidence"}), 500
