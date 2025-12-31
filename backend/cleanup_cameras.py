"""
Clean up duplicate cameras from the database
"""
from app import app
from extensions import db
from models.fall_detection import Camera

with app.app_context():
    # Get all cameras
    cameras = Camera.query.all()
    print(f"Found {len(cameras)} cameras in database:")
    
    for cam in cameras:
        print(f"  - {cam.name} (ID: {cam.id}, URL: {cam.url}, Status: {cam.status})")
    
    # Group cameras by URL
    url_groups = {}
    for cam in cameras:
        if cam.url not in url_groups:
            url_groups[cam.url] = []
        url_groups[cam.url].append(cam)
    
    # Remove duplicates - keep only the first camera for each URL
    deleted_count = 0
    for url, cams in url_groups.items():
        if len(cams) > 1:
            print(f"\nFound {len(cams)} cameras with URL '{url}', removing duplicates...")
            # Keep the first one, delete the rest
            for cam in cams[1:]:
                print(f"  Deleting: {cam.name} (ID: {cam.id})")
                db.session.delete(cam)
                deleted_count += 1
    
    if deleted_count > 0:
        db.session.commit()
        print(f"\n✓ Deleted {deleted_count} duplicate camera(s)")
    else:
        print("\n✓ No duplicate cameras found")
    
    # Show remaining cameras
    remaining = Camera.query.all()
    print(f"\nRemaining cameras: {len(remaining)}")
    for cam in remaining:
        print(f"  - {cam.name} (ID: {cam.id}, URL: {cam.url})")
