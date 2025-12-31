from models.medical import WearableDevice, WearableMetric
from extensions import db
from datetime import datetime, timedelta

def connect_device(user_id, provider):
    """
    Connects a new wearable device for the user.
    If the device already exists, updates its status to 'Connected'.
    """
    device = WearableDevice.query.filter_by(user_id=user_id, provider=provider).first()
    
    if device:
        device.status = 'Connected'
        device.last_sync = datetime.utcnow()
    else:
        device = WearableDevice(
            user_id=user_id,
            provider=provider,
            status='Connected'
        )
        db.session.add(device)
    
    db.session.commit()
    return device

def sync_data(device_id, metrics_data):
    """
    Ingests a batch of metrics for a specific device.
    metrics_data: List of dicts {type, value, unit, timestamp}
    """
    device = WearableDevice.query.get(device_id)
    if not device:
        return None
    
    new_metrics = []
    for m in metrics_data:
        metric = WearableMetric(
            device_id=device.id,
            metric_type=m['type'],
            value=m['value'],
            unit=m['unit'],
            timestamp=datetime.fromisoformat(m['timestamp']) if isinstance(m['timestamp'], str) else m['timestamp']
        )
        new_metrics.append(metric)
    
    db.session.add_all(new_metrics)
    device.last_sync = datetime.utcnow()
    db.session.commit()
    
    return len(new_metrics)

def get_latest_metrics(user_id):
    """
    Retrieves the latest value for each metric type for the user.
    """
    devices = WearableDevice.query.filter_by(user_id=user_id).all()
    device_ids = [d.id for d in devices]
    
    if not device_ids:
        return {}
    
    # This is a simplified approach. Ideally, we'd use a more complex query.
    # For now, we fetch recent metrics and filter in python.
    recent_metrics = WearableMetric.query.filter(
        WearableMetric.device_id.in_(device_ids)
    ).order_by(WearableMetric.timestamp.desc()).limit(100).all()
    
    latest = {}
    for m in recent_metrics:
        if m.metric_type not in latest:
            latest[m.metric_type] = m.to_dict()
            
    return latest

def get_metric_history(user_id, metric_type, days=7):
    """
    Retrieves historical data for a specific metric type.
    """
    devices = WearableDevice.query.filter_by(user_id=user_id).all()
    device_ids = [d.id for d in devices]
    
    if not device_ids:
        return []
        
    start_date = datetime.utcnow() - timedelta(days=days)
    
    metrics = WearableMetric.query.filter(
        WearableMetric.device_id.in_(device_ids),
        WearableMetric.metric_type == metric_type,
        WearableMetric.timestamp >= start_date
    ).order_by(WearableMetric.timestamp.asc()).all()
    
    return [m.to_dict() for m in metrics]
