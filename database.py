"""
Database Layer - Supabase REST API Client
Compatible dengan firewall kantor (HTTPS port 443)
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional, Any, Dict, List
from contextlib import contextmanager

load_dotenv()

# ============ KONFIGURASI ============
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "❌ SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY (atau SUPABASE_ANON_KEY) "
        "harus diset di file .env!"
    )

# Singleton client
_supabase: Optional[Client] = None


def get_supabase() -> Client:
    """Dapatkan Supabase client (singleton)"""
    global _supabase
    if _supabase is None:
        try:
            _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            print("✅ Supabase REST client berhasil dibuat")
        except Exception as e:
            print(f"❌ Gagal buat Supabase client: {e}")
            raise
    return _supabase


def _convert_bool(val):
    """Convert Python bool ke integer 1/0 untuk kolom INTEGER di Supabase"""
    if val is True:
        return 1
    if val is False:
        return 0
    return val


# ============ CORE HELPERS ============

def query_db(table: str, filters: Dict[str, Any] = None,
             columns: str = "*", order: str = None,
             limit: int = None, fetch: str = 'all') -> Any:
    """
    Query data dari tabel.
    
    Args:
        table: Nama tabel
        filters: Dict filter, contoh: {'id': 5, 'is_active': True}
                 - Nilai None → IS NULL
                 - Nilai list → IN (...)
                 - Boolean → convert ke 1/0 (integer)
                 - Nilai lain → = (equals)
        columns: Kolom yang diambil (default "*")
        order: Format "column.asc" atau "column.desc"
        limit: Limit jumlah row
        fetch: 'all' (list), 'one' (dict/None), 'count' (int)
    
    Returns:
        List of dict, single dict, None, atau int
    """
    client = get_supabase()
    query = client.table(table).select(columns)
    
    # Apply filters
    if filters:
        for key, value in filters.items():
            if value is None:
                query = query.is_(key, None)
            elif isinstance(value, bool):
                # ✅ Convert Python bool ke integer (1/0)
                query = query.eq(key, 1 if value else 0)
            elif isinstance(value, list):
                if len(value) > 0:
                    # Convert boolean dalam list
                    converted = [1 if v is True else 0 if v is False else v for v in value]
                    query = query.in_(key, converted)
            else:
                query = query.eq(key, value)
    
    # Apply order
    if order:
        parts = order.split('.')
        col = parts[0]
        desc = len(parts) > 1 and parts[1].lower() == 'desc'
        query = query.order(col, desc=desc)
    
    # Apply limit
    if limit:
        query = query.limit(limit)
    
    # Execute
    response = query.execute()
    data = response.data or []
    
    if fetch == 'count':
        return len(data)
    elif fetch == 'one':
        return data[0] if data else None
    else:
        return data


def execute_insert(table: str, data: Dict[str, Any]) -> Dict:
    """
    Insert data ke tabel.
    Return inserted row sebagai dict (dengan id yang di-generate).
    """
    # ✅ Convert boolean ke integer
    data = {k: _convert_bool(v) for k, v in data.items()}
    
    client = get_supabase()
    response = client.table(table).insert(data).execute()
    return response.data[0] if response.data else None


def execute_update(table: str, data: Dict[str, Any],
                   filters: Dict[str, Any]) -> List[Dict]:
    """
    Update data di tabel.
    Return updated rows sebagai list of dict.
    """
    if not filters:
        raise ValueError("execute_update WAJIB punya filters untuk keamanan!")
    
    # ✅ Convert boolean ke integer
    data = {k: _convert_bool(v) for k, v in data.items()}
    filters = {k: _convert_bool(v) for k, v in filters.items()}
    
    client = get_supabase()
    query = client.table(table).update(data)
    
    for key, value in filters.items():
        query = query.eq(key, value)
    
    response = query.execute()
    return response.data or []


def execute_delete(table: str, filters: Dict[str, Any]) -> List[Dict]:
    """
    Delete data dari tabel.
    Return deleted rows sebagai list of dict.
    """
    if not filters:
        raise ValueError("execute_delete WAJIB punya filters untuk keamanan!")
    
    # ✅ Convert boolean ke integer
    filters = {k: _convert_bool(v) for k, v in filters.items()}
    
    client = get_supabase()
    query = client.table(table).delete()
    
    for key, value in filters.items():
        query = query.eq(key, value)
    
    response = query.execute()
    return response.data or []


# ============ BACKWARD COMPATIBILITY ============

@contextmanager
def get_db():
    """
    Backward compatibility untuk kode lama.
    Return Supabase client.
    """
    yield get_supabase()


def execute_db(query: str, params: tuple = None) -> int:
    """
    ⚠️ DEPRECATED: Compatibility layer untuk kode lama.
    """
    import re
    query = query.strip()
    
    if query.upper().startswith('UPDATE'):
        match = re.match(
            r'UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)',
            query, re.IGNORECASE | re.DOTALL
        )
        if match:
            table = match.group(1)
            set_parts = re.findall(r'(\w+)\s*=\s*%s', match.group(2))
            where_parts = re.findall(r'(\w+)\s*=\s*%s', match.group(3))
            
            data = {col: params[i] for i, col in enumerate(set_parts)}
            filters = {col: params[len(set_parts) + i] 
                      for i, col in enumerate(where_parts)}
            
            result = execute_update(table, data, filters)
            return len(result)
    
    if query.upper().startswith('INSERT'):
        match = re.match(
            r'INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)',
            query, re.IGNORECASE | re.DOTALL
        )
        if match:
            table = match.group(1)
            columns = [c.strip() for c in match.group(2).split(',')]
            values_count = match.group(3).count('%s')
            
            data = {col: params[i] for i, col in enumerate(columns[:values_count])}
            result = execute_insert(table, data)
            return 1 if result else 0
    
    if query.upper().startswith('DELETE'):
        match = re.match(
            r'DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)',
            query, re.IGNORECASE | re.DOTALL
        )
        if match:
            table = match.group(1)
            where_parts = re.findall(r'(\w+)\s*=\s*%s', match.group(2))
            filters = {col: params[i] for i, col in enumerate(where_parts)}
            
            result = execute_delete(table, filters)
            return len(result)
    
    print(f"⚠️  execute_db tidak bisa parse: {query[:100]}")
    return 0


# ============ INIT & TEST ============

def init_db():
    """Test koneksi ke Supabase saat app start"""
    print("🔌 Memeriksa koneksi ke Supabase...")
    try:
        client = get_supabase()
        result = client.table('users').select('id').limit(1).execute()
        print(f"✅ Koneksi ke Supabase berhasil (REST API via HTTPS)")
        print(f"   URL: {SUPABASE_URL}")
        return True
    except Exception as e:
        print(f"❌ Gagal connect ke Supabase: {e}")
        return False


def test_connection():
    """Test koneksi lengkap - untuk debugging"""
    print("=" * 60)
    print("🔍 TEST KONEKSI SUPABASE")
    print("=" * 60)
    try:
        client = get_supabase()
        
        users = client.table('users').select('id, username, role').execute()
        print(f"✅ Users: {len(users.data)} records")
        
        projects = client.table('projects').select('id, name').execute()
        print(f"✅ Projects: {len(projects.data)} records")
        
        scenarios = client.table('scenarios').select('id').execute()
        print(f"✅ Scenarios: {len(scenarios.data)} records")
        
        print("=" * 60)
        print("✅ Semua test berhasil!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    test_connection()