#!/usr/bin/env python
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

DATABASE_URL = os.getenv('DATABASE_URL')
print(f"Testing connection to: {DATABASE_URL}")

try:
    # Test connection
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute('SELECT version();')
    version = cursor.fetchone()
    print(f"✅ Connection successful!")
    print(f"PostgreSQL version: {version[0]}")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("\nPlease check:")
    print("1. Your internet connection")
    print("2. Supabase project is active")
    print("3. Database URL is correct")
    print("4. Firewall/VPN settings")