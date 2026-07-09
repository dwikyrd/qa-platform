"""
Web Routes - Halaman HTML (Jinja Templates)
Compatible dengan Supabase REST API
"""
from flask import render_template, redirect, url_for, flash, session, send_file
from auth import login_required, admin_required, get_current_user
from models import (
    get_all_projects, get_project, get_scenarios_by_project,
    get_scenario, get_test_cases, get_test_case_stats, get_all_logs_for_export,
    get_attachment_counts,
)
from utils import generate_export_filename
from services import get_dashboard_analytics, get_project_dashboard_data, prepare_scenario_detail, export_to_excel


def register_web_routes(app):
    
    @app.route('/')
    @login_required
    def index():
        """Dashboard utama"""
        analytics = get_dashboard_analytics()
        projects = get_all_projects()
        return render_template('dashboard.html', 
                             analytics=analytics,
                             projects=projects,
                             user=get_current_user())
    
    @app.route('/project/<int:pid>')
    @login_required
    def view_project(pid):
        """Halaman project detail"""
        data = get_project_dashboard_data(pid)
        if not data:
            flash('Project tidak ditemukan', 'danger')
            return redirect(url_for('index'))
        
        return render_template('project.html', **data, user=get_current_user())
    
    @app.route('/scenario/<int:sid>')
    @login_required
    def view_scenario(sid):
        """Halaman scenario detail"""
        data = prepare_scenario_detail(sid)
        if not data:
            flash('Scenario tidak ditemukan', 'danger')
            return redirect(url_for('index'))
        
        return render_template('scenario.html', **data, user=get_current_user())
    
    @app.route('/export/<int:sid>')
    @login_required
    def export_excel(sid):
        """Export scenario ke Excel - hanya memanggil fungsi export_to_excel"""
        buf, filename_or_error = export_to_excel(sid)
        
        if buf is None:
            # Error terjadi
            flash(f'Export gagal: {filename_or_error}', 'danger')
            return redirect(url_for('view_scenario', sid=sid))
        
        # Sukses - kirim file ke browser
        return send_file(
            buf,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename_or_error
        )