"""Health Chatbot routes for the Flask backend."""
from flask import Blueprint, request, jsonify
from typing import Dict, Any

# Create blueprint
health_chatbot_bp = Blueprint('health_chatbot', __name__)

# Lazy import to avoid loading heavy dependencies at startup
_chatbot = None

def get_chatbot():
    """Lazy load the health chatbot agent."""
    global _chatbot
    if _chatbot is None:
        from services.health_chatbot_agent import chatbot_agent
        _chatbot = chatbot_agent
    return _chatbot


@health_chatbot_bp.route('/api/health-chatbot/chat', methods=['POST'])
def chat():
    """
    Process a chat message and return a response.
    
    Request JSON:
        {
            "message": "user's message",
            "session_id": "optional session identifier"
        }
    
    Response JSON:
        {
            "response": "chatbot's response",
            "session_id": "session identifier",
            "success": true/false
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        message = data['message'].strip()
        
        if not message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        # Get session ID (default if not provided)
        session_id = data.get('session_id', 'default')
        
        # Get the chatbot and process message
        chatbot = get_chatbot()
        result = chatbot.chat(message, session_id)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error in health chatbot: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Error processing message: {str(e)}',
            'response': "I apologize, but I'm having trouble right now. Please try again later. 🙏",
            'success': False
        }), 500


@health_chatbot_bp.route('/api/health-chatbot/history', methods=['GET'])
def get_history():
    """
    Get conversation history for a session.
    
    Query Parameters:
        session_id: Session identifier (default: 'default')
    
    Response JSON:
        {
            "history": [
                {"role": "user", "content": "message"},
                {"role": "assistant", "content": "response"}
            ]
        }
    """
    try:
        session_id = request.args.get('session_id', 'default')
        
        chatbot = get_chatbot()
        history = chatbot.get_conversation_history(session_id)
        
        return jsonify({
            'history': history,
            'session_id': session_id
        }), 200
        
    except Exception as e:
        print(f"Error getting chat history: {str(e)}")
        return jsonify({
            'error': str(e),
            'history': []
        }), 500


@health_chatbot_bp.route('/api/health-chatbot/clear', methods=['POST'])
def clear_history():
    """
    Clear conversation history for a session.
    
    Request JSON:
        {
            "session_id": "optional session identifier"
        }
    
    Response JSON:
        {
            "success": true,
            "message": "Conversation cleared"
        }
    """
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id', 'default')
        
        chatbot = get_chatbot()
        chatbot.clear_conversation(session_id)
        
        return jsonify({
            'success': True,
            'message': 'Conversation cleared'
        }), 200
        
    except Exception as e:
        print(f"Error clearing chat history: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500


@health_chatbot_bp.route('/api/health-chatbot/health', methods=['GET'])
def health_check():
    """Health check endpoint for chatbot."""
    try:
        from services.symptom_checker_config import config
        return jsonify({
            'status': 'healthy',
            'model': config.MOONSHOT_MODEL,
            'api_configured': bool(config.MOONSHOT_API_KEY)
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500
