"""
Download and export YOLOv8n model to ONNX format for fall detection
"""
from ultralytics import YOLO
import os

print("Downloading YOLOv8n model...")
model = YOLO('yolov8n.pt')  # This will download the model if not present

print("Exporting to ONNX format...")
# Export to ONNX format
model.export(format='onnx', imgsz=640)

# Move the exported model to the models directory
source_file = 'yolov8n.onnx'
dest_file = 'models/yolov8n.onnx'

if os.path.exists(source_file):
    import shutil
    shutil.move(source_file, dest_file)
    print(f"✓ Model exported successfully to: {dest_file}")
    print(f"  Model size: {os.path.getsize(dest_file) / (1024*1024):.2f} MB")
else:
    print("Error: ONNX file not created")

# Clean up the .pt file if you want
if os.path.exists('yolov8n.pt'):
    print("\nYOLOv8n.pt file downloaded. You can keep it or delete it.")
    print("The ONNX file is what the system will use.")
