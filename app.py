"""
Main Application - QA Test Manager
Compatible dengan Supabase REST API
"""
import os
from flask import Flask, send_file, request, render_template, redirect, url_for, flash, session, jsonify
from flask_cors import CORS 

# 1. Import Database & Auth
from database import init_db, execute_update
from auth import (
    authenticate, create_user, get_current_user, get_user_by_id,
    login_user, logout_user, update_password, log_activity, verify_password,
    login_required, admin_required, get_activity_logs, get_all_users,
    create_user_admin, update_user_role, toggle_user_status,
    reset_user_password, delete_user
)

# 2. Import & Registrasi Route Modular
from routes.web_routes import register_web_routes   
from routes.api_routes import register_api_routes

# 3. Inisialisasi Aplikasi
app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", 
                    "http://localhost:3000",   
                    "http://147.139.162.197",           # ✅ IP VPS
                    "http://qa.worklogic.dev",# ✅ Domain (jika sudah ada)
                    "https://qa.worklogic.dev",   
                 ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-this')
app.config['SESSION_COOKIE_SECURE'] = False      # ✅ False untuk HTTP, True jika HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'    # ✅ PENTING: Lax untuk cross-origin
app.config['SESSION_COOKIE_DOMAIN'] = None       # ✅ None untuk IP-based access
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload
app.secret_key = os.environ.get('SECRET_KEY', 'qa-test-manager-secret-key-2026')

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Registrasi Route
register_web_routes(app)
register_api_routes(app)


# ================= AUTH ROUTES (Web) =================
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))


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
            flash(f'Welcome, {user.get("full_name") or user["username"]}!', 'success')
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
        pwd_hash = db_user.get('password_hash')
        
        if not verify_password(old_pass, pwd_hash):
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
        execute_update('users', {'must_change_password': False}, {'id': user['id']})
        log_activity(user['id'], user['username'], 'skip_password_change')
        flash('Anda melewati pengubahan password. Sangat disarankan untuk mengubahnya nanti di profil.', 'info')
    return redirect(url_for('index'))


@app.route('/admin')
@admin_required
def admin_panel():
    """Halaman admin panel"""
    users = get_all_users()
    logs, total = get_activity_logs(limit=50)
    current_user = get_current_user()
    return render_template('admin.html', users=users, logs=logs, current_user=current_user)


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


@app.route('/export/<int:sid>')
@login_required
def export_excel(sid):
    """Export test cases ke Excel"""
    from services import export_to_excel
    
    try:
        buf, filename = export_to_excel(sid)
        
        if buf is None:
            flash(f'Export gagal: {filename}', 'danger')
            return redirect(url_for('index'))
        
        # Log activity
        log_activity(
            session.get('user_id'),
            session.get('username'),
            'export_excel',
            target_type='scenario',
            target_id=sid,
            details=f'Exported: {filename}'
        )
        
        return send_file(
            buf,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        import traceback
        print(f"❌ Export error: {traceback.format_exc()}")
        flash(f'Export gagal: {str(e)}', 'danger')
        return redirect(url_for('index'))

# ================= RUNNING =================
if __name__ == '__main__':
    # Test koneksi Supabase saat start
    init_db()
    print("\n🚀 Server berjalan di: http://localhost:5000")
    app.run(debug=True, port=5000)