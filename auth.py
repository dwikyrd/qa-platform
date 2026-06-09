"""
Authentication & User Management Module
Compatible dengan Supabase REST API
Support role: admin, user, viewer, tester, reviewer
"""
import hashlib
import functools
from datetime import datetime
from flask import request, redirect, url_for, session, flash, jsonify

from database import query_db, execute_insert, execute_update


# ============ PASSWORD HASHING ============
def hash_password(password):
    """SHA-256 hash (kompatibel dengan data lama)"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password, password_hash):
    """Verifikasi password"""
    if not password_hash:
        return False
    return hash_password(password) == password_hash


# ============ USER MANAGEMENT ============
def get_user_by_id(user_id):
    """Ambil user by ID"""
    return query_db('users', filters={'id': user_id}, fetch='one')


def get_user_by_username(username):
    """Ambil user by username"""
    return query_db('users', filters={'username': username}, fetch='one')


def get_all_active_users():
    """
    Ambil semua user aktif (untuk dropdown tester)
    Return list of dict dengan id, username, full_name, email, role
    """
    users = query_db('users', 
                     filters={'is_active': True},
                     order='username.asc')
    return [{
        'id': u['id'],
        'username': u['username'],
        'full_name': u.get('full_name', ''),
        'email': u.get('email', ''),
        'role': u.get('role', 'user')
    } for u in users]


def authenticate(username, password):
    """
    Login: return (user_dict, None) jika sukses,
           return (None, error_message) jika gagal
    """
    user = get_user_by_username(username)
    
    if not user:
        return None, "Username tidak ditemukan"
    
    # Cek password dari kolom password_hash
    pwd_hash = user.get('password_hash')
    if not pwd_hash or not verify_password(password, pwd_hash):
        return None, "Password salah"
    
    if not user.get('is_active', True):
        return None, "Akun nonaktif"
    
    # Update last_login
    try:
        execute_update(
            'users',
            {'last_login': datetime.now().isoformat()},
            {'id': user['id']}
        )
    except Exception as e:
        print(f"⚠️  Gagal update last_login: {e}")
    
    return user, None


def create_user(username, password, full_name='', role='tester', must_change_password=True):
    """Buat user baru. Return (user_id, None) atau (None, error)"""
    if not username or not password:
        return None, "Username dan password wajib diisi"
    
    if get_user_by_username(username):
        return None, "Username sudah ada"
    
    allowed_roles = ['admin', 'user', 'viewer', 'tester', 'reviewer']
    if role not in allowed_roles:
        return None, f"Role tidak valid. Pilihan: {', '.join(allowed_roles)}"
    
    try:
        pwd_hash = hash_password(password)
        new_user = execute_insert('users', {
            'username': username,
            'password_hash': pwd_hash,
            'full_name': full_name,
            'role': role,
            'must_change_password': must_change_password,
            'is_active': True
        })
        return new_user['id'], None
    except Exception as e:
        return None, str(e)


def update_password(user_id, new_password):
    """Update password user"""
    if len(new_password) < 4:
        return False, "Password minimal 4 karakter"
    
    pwd_hash = hash_password(new_password)
    execute_update(
        'users',
        {
            'password_hash': pwd_hash,
            'must_change_password': False
        },
        {'id': user_id}
    )
    return True, None


# ============ ACTIVITY LOG ============
def log_activity(user_id, username, action, target_type=None,
                 target_id=None, details=None, ip=None):
    """Simpan log aktivitas user"""
    try:
        execute_insert('activity_logs', {
            'user_id': user_id,
            'username': username,
            'action': action,
            'target_type': target_type,
            'target_id': target_id,
            'details': details,
            'ip_address': ip or (request.remote_addr if request else None)
        })
    except Exception as e:
        print(f"⚠️  Gagal log activity: {e}")


def get_activity_logs(limit=100, user_id=None, action=None, page=1):
    """
    Ambil activity logs dengan filter dan pagination
    Return (logs_list, total_count)
    """
    filters = {}
    if user_id:
        filters['user_id'] = user_id
    if action:
        filters['action'] = action
    
    logs = query_db(
        'activity_logs',
        filters=filters if filters else None,
        order='created_at.desc',
        limit=limit
    )
    
    total = query_db(
        'activity_logs',
        filters=filters if filters else None,
        fetch='count'
    )
    
    return logs, total


# ============ SESSION HELPERS ============
def login_user(user):
    """Set session data setelah login sukses"""
    session['user_id'] = user['id']
    session['username'] = user['username']
    session['full_name'] = user.get('full_name', '') or ''
    session['role'] = user.get('role', 'user')


def logout_user():
    """Clear session dan log aktivitas logout"""
    if 'user_id' in session:
        try:
            log_activity(
                user_id=session.get('user_id'),
                username=session.get('username'),
                action='logout'
            )
        except:
            pass
    session.clear()


def get_current_user():
    """Ambil user dari session"""
    user_id = session.get('user_id')
    if not user_id:
        return None
    return get_user_by_id(user_id)


# ============ DECORATORS ============
def login_required(f):
    """Decorator: wajib login"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Unauthorized'}), 401
            flash('Silakan login terlebih dahulu', 'warning')
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """Decorator: wajib admin"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Unauthorized'}), 401
            return redirect(url_for('login_page'))
        
        if session.get('role') != 'admin':
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Admin access required'}), 403
            flash('Akses ditolak. Hanya admin yang dapat mengakses fitur ini.', 'danger')
            return redirect(url_for('index'))
        
        return f(*args, **kwargs)
    return decorated_function


def reviewer_required(f):
    """Decorator: wajib reviewer atau admin (untuk fitur review)"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Unauthorized'}), 401
            return redirect(url_for('login_page'))
        
        role = session.get('role')
        if role not in ['admin', 'reviewer']:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Reviewer access required'}), 403
            flash('Akses ditolak. Hanya reviewer/admin yang dapat mengakses.', 'danger')
            return redirect(url_for('index'))
        
        return f(*args, **kwargs)
    return decorated_function


# ================= USER MANAGEMENT (ADMIN) =================
def get_all_users():
    """Ambil semua user untuk admin panel"""
    return query_db('users', order='created_at.desc')


def update_user_role(user_id, new_role):
    """Update role user (admin only)"""
    allowed_roles = ['admin', 'user', 'viewer', 'tester', 'reviewer']
    if new_role not in allowed_roles:
        return False, f"Role tidak valid. Pilihan: {', '.join(allowed_roles)}"
    
    execute_update('users', {'role': new_role}, {'id': user_id})
    return True, None


def toggle_user_status(user_id):
    """Aktifkan/nonaktifkan user"""
    user = query_db('users', filters={'id': user_id}, fetch='one')
    if not user:
        return False, "User tidak ditemukan"
    
    new_status = not user.get('is_active', True)
    execute_update('users', {'is_active': new_status}, {'id': user_id})
    return True, None


def reset_user_password(user_id, new_password):
    """Reset password user (admin)"""
    if len(new_password) < 4:
        return False, "Password minimal 4 karakter"
    
    pwd_hash = hash_password(new_password)
    execute_update(
        'users',
        {
            'password_hash': pwd_hash,
            'must_change_password': True
        },
        {'id': user_id}
    )
    return True, None


def delete_user(user_id):
    """Soft delete user (set is_active = False)"""
    current_user_id = session.get('user_id')
    if current_user_id == user_id:
        return False, "Tidak bisa menghapus akun sendiri"
    
    execute_update('users', {'is_active': False}, {'id': user_id})
    return True, None


def create_user_admin(username, password, full_name='', role='user', email=''):
    """Buat user baru (versi admin panel)"""
    if not username or not password:
        return None, "Username dan password wajib diisi"
    
    if len(password) < 4:
        return None, "Password minimal 4 karakter"
    
    if get_user_by_username(username):
        return None, "Username sudah ada"
    
    allowed_roles = ['admin', 'user', 'viewer', 'tester', 'reviewer']
    if role not in allowed_roles:
        return None, f"Role tidak valid. Pilihan: {', '.join(allowed_roles)}"
    
    try:
        pwd_hash = hash_password(password)
        new_user = execute_insert('users', {
            'username': username,
            'password_hash': pwd_hash,
            'full_name': full_name,
            'email': email,
            'role': role,
            'must_change_password': False,
            'is_active': True
        })
        return new_user['id'], None
    except Exception as e:
        return None, str(e)


def update_user(user_id, full_name='', email='', role='user',
                is_active=True, new_password=None):
    """Update user (admin panel) - versi lengkap"""
    allowed_roles = ['admin', 'user', 'viewer', 'tester', 'reviewer']
    if role not in allowed_roles:
        return False, f"Role tidak valid. Pilihan: {', '.join(allowed_roles)}"
    
    if new_password and len(new_password) < 4:
        return False, "Password minimal 4 karakter"
    
    if new_password:
        pwd_hash = hash_password(new_password)
        execute_update(
            'users',
            {
                'full_name': full_name,
                'email': email,
                'role': role,
                'is_active': is_active,
                'password_hash': pwd_hash
            },
            {'id': user_id}
        )
    else:
        execute_update(
            'users',
            {
                'full_name': full_name,
                'email': email,
                'role': role,
                'is_active': is_active
            },
            {'id': user_id}
        )
    
    return True, None