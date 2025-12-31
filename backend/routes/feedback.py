from flask import Blueprint, request, jsonify
from models.feedback import UserFeedback
from extensions import db

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/feedback', methods=['POST'])
def submit_feedback():
    """Submit user feedback for symptom checker or report analyzer"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('feature_type') or not data.get('reference_id') or 'is_helpful' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Get user ID from JWT if authenticated
    user_id = None
    try:
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            user_id = int(identity)
    except:
        pass  # Anonymous feedback is allowed
    
    # Create feedback entry
    feedback = UserFeedback(
        user_id=user_id,
        feature_type=data['feature_type'],
        reference_id=data['reference_id'],
        is_helpful=bool(data['is_helpful']),
        comment=data.get('comment', '')
    )
    
    db.session.add(feedback)
    db.session.commit()
    
    return jsonify({
        'message': 'Feedback submitted successfully',
        'feedback_id': feedback.id
    }), 201


@feedback_bp.route('/feedback/stats', methods=['GET'])
def get_feedback_stats():
    """Get feedback statistics for a feature"""
    feature_type = request.args.get('feature_type')
    
    if not feature_type:
        return jsonify({'error': 'feature_type required'}), 400
    
    # Count helpful vs not helpful
    total = UserFeedback.query.filter_by(feature_type=feature_type).count()
    helpful = UserFeedback.query.filter_by(feature_type=feature_type, is_helpful=True).count()
    not_helpful = UserFeedback.query.filter_by(feature_type=feature_type, is_helpful=False).count()
    
    helpful_percentage = (helpful / total * 100) if total > 0 else 0
    
    return jsonify({
        'feature_type': feature_type,
        'total_feedback': total,
        'helpful_count': helpful,
        'not_helpful_count': not_helpful,
        'helpful_percentage': round(helpful_percentage, 2)
    })
