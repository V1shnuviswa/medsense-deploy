from flask import Blueprint, request, jsonify
from services.wearable_service import connect_device, sync_data, get_latest_metrics, get_metric_history
from models.auth import User

wearable_bp = Blueprint('wearable', __name__)

# Note: In a real app, we would use @jwt_required() and get_jwt_identity()
# For this prototype, we'll assume a default user_id or pass it in the request

@wearable_bp.route('/connect', methods=['POST'])
def connect():
    """Connect a wearable device for a user"""
    data = request.get_json()
    user_id = data.get('user_id', 1) # Default to 1 for prototype
    provider = data.get('provider')
    
    if not provider:
        return jsonify({'error': 'Provider is required'}), 400
        
    device = connect_device(user_id, provider)
    return jsonify(device.to_dict()), 201

@wearable_bp.route('/sync', methods=['POST'])
def sync():
    """Sync health metrics from a connected device"""
    data = request.get_json()
    device_id = data.get('device_id')
    metrics = data.get('metrics', [])
    
    if not device_id or not metrics:
        return jsonify({'error': 'Device ID and metrics are required'}), 400
        
    count = sync_data(device_id, metrics)
    if count is None:
        return jsonify({'error': 'Device not found'}), 404
        
    return jsonify({'message': f'Synced {count} metrics'}), 200

@wearable_bp.route('/dashboard', methods=['GET'])
def dashboard():
    """Get latest metrics for all connected devices"""
    user_id = request.args.get('user_id', 1, type=int)
    metrics = get_latest_metrics(user_id)
    return jsonify(metrics)

@wearable_bp.route('/history/<metric_type>', methods=['GET'])
def history(metric_type):
    """Get historical data for a specific metric type"""
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 7, type=int)
    
    data = get_metric_history(user_id, metric_type, days)
    return jsonify(data)
