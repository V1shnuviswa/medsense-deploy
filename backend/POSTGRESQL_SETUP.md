# PostgreSQL Migration Guide

## Quick Start

The authentication database has been migrated from SQLite to PostgreSQL.

### Prerequisites
- PostgreSQL installed and running
- Default credentials: `postgres / postgres`

### Setup Steps

1. **Install PostgreSQL** (if not installed):
   - Download from: https://www.postgresql.org/download/
   - Default port: 5432
   - Remember your postgres password

2. **Update .env file** (if credentials differ):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=medsense_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

3. **Create Database**:
   ```bash
   cd backend
   .\venv\Scripts\activate
   python setup_database.py
   ```

4. **Start Application**:
   ```bash
   python run.py
   ```

The Flask app will automatically create all tables on first run.

### Verify Connection
Check that PostgreSQL is running:
```bash
psql -U postgres -l
```

### Troubleshooting
- **Connection refused**: Start PostgreSQL service
- **Authentication failed**: Check DB_PASSWORD in .env
- **Database exists**: OK, tables will be created automatically
