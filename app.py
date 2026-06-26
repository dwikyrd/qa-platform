import os
from flask import Flask, send_file, request, render_template, redirect, url_for, flash, session, jsonify
from flask_cors import CORS

# 1. Import Database & Auth (WAJIB DI URUTAN ATAS)
from database import get_db
from auth import (
    authenticate, create_user, get_current_user, get_user_by_id,
    login_user, logout_user, update_password, log_activity, verify_password,
    login_required, admin_required, get_activity_logs, get_all_users, 
    create_user_admin, update_user_role, 
    toggle_user_status, reset_user_password, delete_user
)

# 2. Import & Registrasi Route Modular
from routes.web_routes import register_web_routes
from routes.api_routes import register_api_routes

# 3. Inisialisasi Aplikasi
app = Flask(__name__)

# ============================================
# ✅ KONFIGURASI KEAMANAN & HTTPS
# ============================================

# SECRET_KEY - WAJIB dari environment variable di production
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY')
if not app.config['SECRET_KEY']:
    # Fallback untuk development ONLY
    if os.environ.get('FLASK_ENV') == 'production':
        raise RuntimeError(
            "❌ SECRET_KEY environment variable is not set! "
            "Please set it in systemd service file for production."
        )
    else:
        # Development fallback (TIDAK AMAN untuk production!)
        app.config['SECRET_KEY'] = 'dev-only-secret-key-do-not-use-in-production'
        print("⚠️  WARNING: Using default SECRET_KEY. Set SECRET_KEY env var for production!")

# Session Cookie Configuration (WAJIB untuk HTTPS)
app.config['SESSION_COOKIE_SECURE'] = True      # ✅ Cookie hanya dikirim via HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True    # ✅ Cookie tidak bisa diakses via JavaScript
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'   # ✅ Proteksi CSRF
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 jam

# Upload Configuration
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # ✅ Batas upload 20 MB
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ============================================
# ✅ PROXY FIX untuk Nginx Reverse Proxy
# ============================================
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(
    app.wsgi_app,
    x_for=1,      # Trust X-Forwarded-For header
    x_proto=1,    # Trust X-Forwarded-Proto header (HTTPS detection)
    x_host=1,     # Trust X-Forwarded-Host header
    x_prefix=0    # Trust X-Forwarded-Prefix header
)

# ============================================
# ✅ CORS Configuration
# ============================================
ALLOWED_ORIGINS = [
    "http://localhost:5173",      # Vite dev server
    "http://localhost:3000",      # Create React App
    "http://127.0.0.1:5173",
    "http://147.139.162.197",     # IP server (HTTP)
    "https://qa.worklogic.dev",   # ✅ Domain HTTPS
    "http://qa.worklogic.dev",    # Domain HTTP (untuk redirect)
]

CORS(app, 
     resources={r"/api/*": {"origins": ALLOWED_ORIGINS}},
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Last-Update"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     expose_headers=["Content-Disposition"])

# ============================================
# ✅ Security Headers
# ============================================
@app.after_request
def add_security_headers(response):
    """Tambahkan security headers untuk semua response"""
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

# ============================================
# REGISTRASI ROUTES
# ============================================
register_web_routes(app)
register_api_routes(app)

# ================= STATIC FILES =================
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serve uploaded files"""
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))

# ================= AUTH ROUTES (Legacy - untuk web UI) =================
@app.route('/login', methods=['GET', 'POST'])
def login_page():
    if 'user_id' in session:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        user, error = authenticate(username, password)
        if user:
            login_user(user)
            log_activity(user['id'], user['username'], 'login', ip=request.remote_addr)
            flash(f'Welcome, {user["full_name"] or user["username"]}!', 'success')
            return redirect(url_for('index'))
        else:
            flash(error or 'Login gagal', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    logout_user()
    flash('Anda telah logout', 'info')
    return redirect(url_for('login_page'))

@app.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    user = get_current_user()
    if request.method == 'POST':
        old_pass = request.form.get('old_password', '')
        new_pass = request.form.get('new_password', '')
        confirm_pass = request.form.get('confirm_password', '')
        
        db_user = get_user_by_id(user['id'])
        if not verify_password(old_pass, db_user['password_hash']):
            flash('Password lama salah', 'danger')
        elif new_pass != confirm_pass:
            flash('Konfirmasi password tidak cocok', 'danger')
        elif len(new_pass) < 4:
            flash('Password minimal 4 karakter', 'danger')
        else:
            update_password(user['id'], new_pass)
            log_activity(user['id'], user['username'], 'change_password')
            flash('Password berhasil diubah!', 'success')
            return redirect(url_for('index'))
    
    return render_template('change_password.html', user=user)

@app.route('/skip-change-password')
@login_required
def skip_change_password():
    user = get_current_user()
    if user:
        conn = get_db()
        conn.execute("UPDATE users SET must_change_password=0 WHERE id=?", (user['id'],))
        conn.commit()
        conn.close()
        log_activity(user['id'], user['username'], 'skip_password_change')
        flash('Anda melewati pengubahan password. Sangat disarankan untuk mengubahnya nanti di profil.', 'info')
    return redirect(url_for('index'))

# ================= ADMIN ROUTES (Legacy - untuk web UI) =================
@app.route('/admin')
@admin_required
def admin_panel():
    """Halaman admin panel"""
    users = get_all_users()
    logs = get_activity_logs(limit=50)
    current_user = get_current_user()
    return render_template('admin.html', users=users, logs=logs, current_user=current_user)

# ============================================
# ✅ ADMIN API ENDPOINTS (UNTUK REACT FRONTEND)
# ============================================

@app.route('/api/admin/create-user', methods=['POST'])
@admin_required
def api_create_user():
    """API: Buat user baru"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    role = data.get('role', 'tester')
    
    user_id, error = create_user_admin(username, password, full_name, role)
    if user_id:
        log_activity(
            session.get('user_id'),
            session.get('username'),
            'create_user',
            target_type='user',
            target_id=user_id,
            details=f'Created user: {username}'
        )
        return jsonify({'success': True, 'user_id': user_id})
    else:
        return jsonify({'error': error}), 400

@app.route('/api/admin/update-user/<int:user_id>', methods=['POST'])
@admin_required
def api_update_user(user_id):
    """API: Update role user"""
    data = request.json
    new_role = data.get('role')
    
    if new_role:
        success, error = update_user_role(user_id, new_role)
        if success:
            log_activity(
                session.get('user_id'),
                session.get('username'),
                'update_user_role',
                target_type='user',
                target_id=user_id,
                details=f'Changed role to {new_role}'
            )
            return jsonify({'success': True})
        else:
            return jsonify({'error': error}), 400
    return jsonify({'error': 'Invalid request'}), 400

@app.route('/api/admin/toggle-user/<int:user_id>', methods=['POST'])
@admin_required
def api_toggle_user(user_id):
    """API: Aktifkan/nonaktifkan user"""
    if user_id == session.get('user_id'):
        return jsonify({'error': 'Tidak bisa nonaktifkan diri sendiri'}), 400
    
    success, error = toggle_user_status(user_id)
    if success:
        log_activity(
            session.get('user_id'),
            session.get('username'),
            'toggle_user_status',
            target_type='user',
            target_id=user_id
        )
        return jsonify({'success': True})
    else:
        return jsonify({'error': error}), 400

@app.route('/api/admin/reset-password/<int:user_id>', methods=['POST'])
@admin_required
def api_reset_password(user_id):
    """API: Reset password user"""
    data = request.json
    new_password = data.get('password', '')
    
    success, error = reset_user_password(user_id, new_password)
    if success:
        user = get_user_by_id(user_id)
        log_activity(
            session.get('user_id'),
            session.get('username'),
            'reset_password',
            target_type='user',
            target_id=user_id,
            details=f'Reset password for {user["username"] if user else "unknown"}'
        )
        return jsonify({'success': True})
    else:
        return jsonify({'error': error}), 400

@app.route('/api/admin/delete-user/<int:user_id>', methods=['POST'])
@admin_required
def api_delete_user(user_id):
    """API: Hapus user (soft delete)"""
    if user_id == session.get('user_id'):
        return jsonify({'error': 'Tidak bisa hapus diri sendiri'}), 400
    
    user = get_user_by_id(user_id)
    success, error = delete_user(user_id)
    if success:
        log_activity(
            session.get('user_id'),
            session.get('username'),
            'delete_user',
            target_type='user',
            target_id=user_id,
            details=f'Deleted user: {user["username"] if user else "unknown"}'
        )
        return jsonify({'success': True})
    else:
        return jsonify({'error': error}), 400

# ============================================
# ✅ HEALTH CHECK (untuk monitoring)
# ============================================
@app.route('/health')
def health_check():
    """Health check endpoint untuk monitoring"""
    return jsonify({
        'status': 'healthy',
        'timestamp': __import__('datetime').datetime.now().isoformat(),
        'version': '1.0.0'
    })

# ================= RUNNING =================
if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 QA Test Manager Server")
    print("="*60)
    print(f"📍 Local:   http://localhost:5000")
    print(f"🌐 Public:  https://qa.worklogic.dev")
    print(f"📁 Upload:  {app.config['UPLOAD_FOLDER']}")
    print(f"🔒 HTTPS:   {'Enabled' if app.config['SESSION_COOKIE_SECURE'] else 'Disabled'}")
    print("="*60 + "\n")
    
    app.run(debug=True, port=5000)