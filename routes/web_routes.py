"""
Web Routes - Halaman HTML (Jinja Templates)
Compatible dengan Supabase REST API
"""
from flask import render_template, redirect, url_for, flash, session
from auth import login_required, admin_required, get_current_user
from models import (
    get_all_projects, get_project, get_scenarios_by_project,
    get_scenario, get_test_cases, get_test_case_stats
)
from services import get_dashboard_analytics, get_project_dashboard_data, prepare_scenario_detail


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