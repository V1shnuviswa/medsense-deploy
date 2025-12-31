"""
PostgreSQL Database Setup Script for MedSense

This script creates the PostgreSQL database if it doesn't exist.
Run this before starting the Flask application for the first time.
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'medsense_db')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')

def create_database():
    """Create the PostgreSQL database if it doesn't exist"""
    try:
        # Connect to PostgreSQL server (not to a specific database)
        print(f"Connecting to PostgreSQL server at {DB_HOST}:{DB_PORT}...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database='postgres'  # Connect to default postgres database
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME}'")
        exists = cursor.fetchone()
        
        if exists:
            print(f"✓ Database '{DB_NAME}' already exists")
        else:
            # Create database
            cursor.execute(f'CREATE DATABASE {DB_NAME}')
            print(f"✓ Database '{DB_NAME}' created successfully")
        
        cursor.close()
        conn.close()
        
        print(f"\n✓ PostgreSQL setup complete!")
        print(f"   Database: {DB_NAME}")
        print(f"   Host: {DB_HOST}:{DB_PORT}")
        print(f"\nYou can now run 'python run.py' to start the application.")
        return True
        
    except psycopg2.OperationalError as e:
        print(f"\n✗ Error: Could not connect to PostgreSQL server")
        print(f"   {str(e)}")
        print(f"\nPlease ensure:")
        print(f"   1. PostgreSQL is installed and running")
        print(f"   2. Credentials in .env file are correct")
        print(f"   3. PostgreSQL is listening on {DB_HOST}:{DB_PORT}")
        return False
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("MedSense PostgreSQL Database Setup")
    print("=" * 60)
    create_database()
