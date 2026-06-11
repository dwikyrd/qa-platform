"""
Models Layer - Semua operasi database
Menggunakan Supabase REST API via database.py
"""
import os
import re
from datetime import datetime, timedelta
from database import query_db, execute_insert, execute_update, execute_delete


# ============================================================
# PROJECTS
# ============================================================
def get_all_projects():
    """Ambil semua projects, pisah active & archived"""
    active = query_db('projects', 
                      filters={'is_archived': False}, 
                      order='name.asc')
    archived = query_db('projects', 
                        filters={'is_archived': True}, 
                        order='name.asc')
    return {'active': active, 'archived': archived}


def get_project(pid):
    """Ambil satu project by ID"""
    return query_db('projects', filters={'id': pid}, fetch='one')


def create_project(name, link=''):
    """Buat project baru. Return (project, error)"""
    if not name or not name.strip():
        return None, "Nama project wajib diisi"
    
    existing = query_db('projects', filters={'name': name.strip()}, fetch='one')
    if existing:
        return None, "Project sudah ada"
    
    try:
        project = execute_insert('projects', {
            'name': name.strip(),
            'link': link,
            'is_archived': False
        })
        return project, None
    except Exception as e:
        return None, str(e)


def update_project(pid, name, link):
    """Update nama & link project"""
    execute_update('projects', 
                   {'name': name, 'link': link}, 
                   {'id': pid})


def archive_project(pid, archive=True):
    """Archive/restore project"""
    execute_update('projects', 
                   {'is_archived': archive}, 
                   {'id': pid})


def permanent_delete_project(pid):
    """Hapus project permanen (CASCADE ke scenarios & test_cases)"""
    execute_delete('projects', {'id': pid})


# ============================================================
# SCENARIOS (Tickets)
# ============================================================
def get_scenarios_by_project(pid, include_archived=True, tester_filter=None):
    """Ambil semua scenarios untuk project tertentu"""
    scenarios = query_db('scenarios', 
                         filters={'project_id': pid},
                         order='created_at.desc')
    
    if not include_archived:
        scenarios = [s for s in scenarios if not s.get('is_deleted')]
    
    # Filter by tester
    if tester_filter:
        tester_lower = tester_filter.lower()
        scenarios = [s for s in scenarios 
                     if tester_lower in (s.get('testers') or '').lower()]
    
    # Sort: active dulu, lalu by status priority
    status_priority = {'In Progress': 1, 'Not Run': 2, 'Done': 3, 'Fail': 4}
    scenarios.sort(key=lambda s: (
        s.get('is_deleted', False),
        status_priority.get(s.get('status'), 99),
        s.get('created_at', '')
    ), reverse=False)
    
    return scenarios


def get_scenario(sid):
    """Ambil satu scenario by ID"""
    return query_db('scenarios', 
                    filters={'id': sid, 'is_deleted': False}, 
                    fetch='one')


def create_scenario(pid, title):
    """Buat scenario baru. Return (scenario, error)"""
    if not title or not title.strip():
        return None, "Judul wajib diisi"
    
    try:
        scenario = execute_insert('scenarios', {
            'project_id': pid,
            'title': title.strip(),
            'status': 'Not Run',
            'is_deleted': False
        })
        return scenario, None
    except Exception as e:
        return None, str(e)


def rename_scenario(sid, new_title):
    """Rename scenario"""
    execute_update('scenarios', 
                   {'title': new_title}, 
                   {'id': sid})


def update_scenario_meta(sid, link='', testers='', start_date='', end_date=''):
    """Update metadata scenario"""
    data = {
        'link': link,
        'testers': testers,
        'start_date': start_date or None,
        'end_date': end_date or None
    }
    execute_update('scenarios', data, {'id': sid})


def archive_scenario(sid, archive=True):
    """Archive/restore scenario"""
    execute_update('scenarios', 
                   {'is_deleted': archive}, 
                   {'id': sid})
    if not archive:
        update_scenario_status_logic(sid)


def hard_delete_scenario(sid):
    """Hapus scenario permanen"""
    execute_delete('scenarios', {'id': sid})


def update_scenario_status_logic(sid):
    """Auto-update status scenario berdasarkan test cases"""
    tcs = query_db('test_cases', 
                   filters={'scenario_id': sid, 'is_deleted': False})
    if not tcs:
        execute_update('scenarios', {'status': 'Not Run'}, {'id': sid})
        return
    
    statuses = [tc.get('status') for tc in tcs]
    
    if all(s == 'Pass' for s in statuses):
        new_status = 'Done'
    elif 'Fail' in statuses:
        new_status = 'Fail'
    elif 'In Progress' in statuses:
        new_status = 'In Progress'
    else:
        new_status = 'Not Run'
    
    execute_update('scenarios', {'status': new_status}, {'id': sid})


# ============================================================
# TEST CASES
# ============================================================
def get_test_cases(sid, include_deleted=False):
    """Ambil semua test cases untuk scenario"""
    filters = {'scenario_id': sid}
    if not include_deleted:
        filters['is_deleted'] = False
    
    tcs = query_db('test_cases', 
                   filters=filters,
                   order='display_order.asc')
    return tcs


def get_last_tc_number(sid):
    """Dapatkan nomor TC terakhir untuk auto-increment"""
    tcs = query_db('test_cases', 
                   filters={'scenario_id': sid, 'is_deleted': False},
                   order='display_order.desc',
                   limit=1)
    
    if not tcs:
        return 1
    
    match = re.search(r'TC-(\d+)', tcs[0].get('tc_id', ''))
    if match:
        return int(match.group(1)) + 1
    return 1


def add_test_case(sid):
    """Tambah test case kosong baru. Return (tc_id, error)"""
    next_num = get_last_tc_number(sid)
    tc_id = f"TC-{next_num:03d}"
    
    tcs = query_db('test_cases',
                   filters={'scenario_id': sid, 'is_deleted': False},
                   order='display_order.desc',
                   limit=1)
    max_ord = tcs[0].get('display_order', 0) if tcs else 0
    
    try:
        execute_insert('test_cases', {
            'scenario_id': sid,
            'tc_id': tc_id,
            'display_order': max_ord + 1,
            'status': 'Not Run',
            'is_deleted': False,
            'is_reviewed': False
        })
        
        resequence_tcs_logic(sid)
        update_scenario_status_logic(sid)
        return tc_id, None
    except Exception as e:
        return None, str(e)


def update_test_case(sid, tc_id, field, value):
    """Update satu field test case"""
    allowed_fields = [
        'test_case', 'test_criteria', 'test_date', 'test_data',
        'expected_result', 'actual_result', 'status', 'remarks'
    ]
    if field not in allowed_fields:
        return False, "Field tidak valid"
    
    if isinstance(value, str):
        value = value.strip()
    
    execute_update('test_cases', 
                   {field: value}, 
                   {'scenario_id': sid, 'tc_id': tc_id})
    
    if field == 'status':
        update_scenario_status_logic(sid)
    
    return True, None


def delete_test_case(sid, tc_id):
    """Soft delete test case"""
    execute_update('test_cases',
                   {'is_deleted': True},
                   {'scenario_id': sid, 'tc_id': tc_id})
    resequence_tcs_logic(sid)
    update_scenario_status_logic(sid)


def bulk_delete_test_cases(sid, tc_ids):
    """Hapus banyak test cases sekaligus. Return jumlah yang dihapus"""
    deleted = 0
    for tc_id in tc_ids:
        # Hapus screenshot fisik
        screenshots = query_db('screenshots',
                               filters={'tc_id': tc_id, 'scenario_id': sid})
        for img in screenshots:
            path = os.path.join('uploads', img.get('file_path', ''))
            if os.path.exists(path):
                try:
                    os.remove(path)
                except:
                    pass
        
        execute_delete('screenshots', {'tc_id': tc_id, 'scenario_id': sid})
        execute_delete('log_attachments', {'tc_id': tc_id, 'scenario_id': sid})
        execute_update('test_cases',
                       {'is_deleted': True},
                       {'scenario_id': sid, 'tc_id': tc_id})
        deleted += 1
    
    resequence_tcs_logic(sid)
    update_scenario_status_logic(sid)
    return deleted


def copy_test_case(sid, source_tc_id):
    """Duplikasi test case. Return (new_tc_id, error)"""
    source = query_db('test_cases',
                      filters={'tc_id': source_tc_id, 
                               'scenario_id': sid,
                               'is_deleted': False},
                      fetch='one')
    
    if not source:
        return None, "Test case sumber tidak ditemukan"
    
    next_num = get_last_tc_number(sid)
    new_tc_id = f"TC-{next_num:03d}"
    
    tcs = query_db('test_cases',
                   filters={'scenario_id': sid, 'is_deleted': False},
                   order='display_order.desc',
                   limit=1)
    max_ord = tcs[0].get('display_order', 0) if tcs else 0
    
    try:
        execute_insert('test_cases', {
            'scenario_id': sid,
            'tc_id': new_tc_id,
            'display_order': max_ord + 1,
            'test_case': source.get('test_case', ''),
            'test_criteria': source.get('test_criteria', ''),
            'test_date': source.get('test_date'),
            'test_data': source.get('test_data', ''),
            'expected_result': source.get('expected_result', ''),
            'actual_result': source.get('actual_result', ''),
            'status': source.get('status', 'Not Run'),
            'remarks': source.get('remarks', ''),
            'is_deleted': False,
            'is_reviewed': False
        })
        
        resequence_tcs_logic(sid)
        update_scenario_status_logic(sid)
        return new_tc_id, None
    except Exception as e:
        return None, str(e)


def reorder_test_cases(sid, order):
    """Reorder test cases berdasarkan list tc_id"""
    for i, tc_id in enumerate(order, 1):
        execute_update('test_cases',
                       {'display_order': i},
                       {'scenario_id': sid, 'tc_id': tc_id})
    resequence_tcs_logic(sid)


def resequence_tcs_logic(sid):
    """
    Rapikan urutan display_order DAN tc_id setelah delete/reorder.
    Juga update referensi di tabel screenshots & log_attachments.
    """
    # 1. Ambil semua TC yang aktif, urutkan by display_order
    tcs = query_db('test_cases',
                   filters={'scenario_id': sid, 'is_deleted': False},
                   order='display_order.asc')
    
    if not tcs:
        return
    
    # 2. Buat mapping: tc_id lama → tc_id baru
    mapping = {}
    for i, tc in enumerate(tcs, 1):
        new_tc_id = f"TC-{i:03d}"
        old_tc_id = tc['tc_id']
        
        if old_tc_id != new_tc_id:
            mapping[old_tc_id] = new_tc_id
            
            # Update tc_id di test_cases
            execute_update('test_cases',
                           {'tc_id': new_tc_id, 'display_order': i},
                           {'id': tc['id']})
            
            # Update referensi di screenshots
            screenshots = query_db('screenshots',
                                   filters={'tc_id': old_tc_id, 'scenario_id': sid})
            for sc in screenshots:
                execute_update('screenshots',
                               {'tc_id': new_tc_id},
                               {'id': sc['id']})
            
            # Update referensi di log_attachments
            logs = query_db('log_attachments',
                            filters={'tc_id': old_tc_id, 'scenario_id': sid})
            for log in logs:
                execute_update('log_attachments',
                               {'tc_id': new_tc_id},
                               {'id': log['id']})
        else:
            # Hanya update display_order jika tc_id tidak berubah
            if tc.get('display_order') != i:
                execute_update('test_cases',
                               {'display_order': i},
                               {'id': tc['id']})
    
    return mapping


def get_test_case_stats(sid):
    """Statistik test case untuk scenario"""
    tcs = query_db('test_cases',
                   filters={'scenario_id': sid, 'is_deleted': False})
    
    total = len(tcs)
    pass_count = sum(1 for tc in tcs if tc.get('status') == 'Pass')
    fail_count = sum(1 for tc in tcs if tc.get('status') == 'Fail')
    in_progress = sum(1 for tc in tcs if tc.get('status') == 'In Progress')
    not_run = sum(1 for tc in tcs if tc.get('status') == 'Not Run')
    reviewed = sum(1 for tc in tcs if tc.get('is_reviewed'))
    
    pass_rate = round((pass_count / total * 100), 1) if total > 0 else 0
    review_rate = round((reviewed / total * 100), 1) if total > 0 else 0
    
    return {
        'total': total,
        'pass': pass_count,
        'fail': fail_count,
        'in_progress': in_progress,
        'not_run': not_run,
        'pass_rate': pass_rate,
        'reviewed': reviewed,
        'not_reviewed': total - reviewed,
        'review_rate': review_rate
    }


# ============================================================
# REVIEW FUNCTIONS (FITUR BARU)
# ============================================================
def toggle_review_status(sid, tc_id, user_id):
    """Toggle review status test case"""
    tc = query_db('test_cases',
                  filters={'tc_id': tc_id, 'scenario_id': sid, 'is_deleted': False},
                  fetch='one')
    
    if not tc:
        return False, "Test case tidak ditemukan"
    
    new_status = not tc.get('is_reviewed', False)
    
    if new_status:
        execute_update('test_cases',
                       {
                           'is_reviewed': True,
                           'reviewed_by': user_id,
                           'reviewed_at': datetime.now().isoformat()
                       },
                       {'scenario_id': sid, 'tc_id': tc_id})
    else:
        execute_update('test_cases',
                       {
                           'is_reviewed': False,
                           'reviewed_by': None,
                           'reviewed_at': None
                       },
                       {'scenario_id': sid, 'tc_id': tc_id})
    
    return True, None


def get_review_stats(sid):
    """Statistik review untuk scenario"""
    tcs = query_db('test_cases',
                   filters={'scenario_id': sid, 'is_deleted': False})
    
    total = len(tcs)
    reviewed = sum(1 for tc in tcs if tc.get('is_reviewed'))
    not_reviewed = total - reviewed
    review_rate = round((reviewed / total * 100), 1) if total > 0 else 0
    
    return {
        'total': total,
        'reviewed': reviewed,
        'not_reviewed': not_reviewed,
        'review_rate': review_rate
    }


# ============================================================
# ATTACHMENTS (Screenshots & Logs)
# ============================================================
def get_attachments(sid, tc_id=None):
    """
    Ambil semua attachments (screenshots & logs) untuk scenario.
    Jika tc_id specified, ambil hanya untuk TC tersebut.
    """
    print(f"\n🔍 get_attachments called:")
    print(f"   - Scenario ID: {sid}")
    print(f"   - TC ID: {tc_id}")
    
    screenshots = []
    logs = []
    
    try:
        # Query screenshots
        if tc_id:
            sc_query = query_db('screenshots', 
                               filters={'scenario_id': sid, 'tc_id': tc_id},
                               order='display_order.asc')
        else:
            sc_query = query_db('screenshots',
                               filters={'scenario_id': sid},
                               order='display_order.asc')
        
        print(f"   - Screenshots found: {len(sc_query) if sc_query else 0}")
        
        if sc_query:
            for sc in sc_query:
                screenshots.append({
                    'id': sc.get('id'),
                    'tc_id': sc.get('tc_id'),
                    'file_path': sc.get('file_path'),
                    'name': sc.get('custom_name') or os.path.basename(sc.get('file_path', '')),
                    'url': f"/uploads/{sc.get('file_path')}",
                    'display_order': sc.get('display_order', 0)
                })
                print(f"     ✓ {sc.get('tc_id')} - {sc.get('file_path')}")
        
        # Query logs
        if tc_id:
            log_query = query_db('log_attachments',
                                filters={'scenario_id': sid, 'tc_id': tc_id},
                                order='display_order.asc')
        else:
            log_query = query_db('log_attachments',
                                filters={'scenario_id': sid},
                                order='display_order.asc')
        
        print(f"   - Logs found: {len(log_query) if log_query else 0}")
        
        if log_query:
            for log in log_query:
                logs.append({
                    'id': log.get('id'),
                    'tc_id': log.get('tc_id'),
                    'content': log.get('content'),
                    'name': log.get('custom_name') or f"Log_{log.get('id')}",
                    'display_order': log.get('display_order', 0)
                })
        
        result = {
            'screenshots': screenshots,
            'logs': logs
        }
        
        print(f"   ✅ Returning {len(screenshots)} screenshots, {len(logs)} logs\n")
        return result
        
    except Exception as e:
        print(f"   ❌ Error in get_attachments: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return {'screenshots': [], 'logs': []}


def get_all_logs_for_export(sid):
    """Ambil semua logs untuk export Excel"""
    return query_db('log_attachments',
                    filters={'scenario_id': sid},
                    order='tc_id.asc, display_order.asc')


def get_attachment_counts(sid):
    """Hitung jumlah attachment per TC"""
    screenshots = query_db('screenshots', filters={'scenario_id': sid})
    logs = query_db('log_attachments', filters={'scenario_id': sid})
    
    counts = {}
    for s in screenshots:
        tc_id = s.get('tc_id')
        if tc_id not in counts:
            counts[tc_id] = {'img': 0, 'log': 0}
        counts[tc_id]['img'] += 1
    
    for l in logs:
        tc_id = l.get('tc_id')
        if tc_id not in counts:
            counts[tc_id] = {'img': 0, 'log': 0}
        counts[tc_id]['log'] += 1
    
    return counts


def save_screenshot(sid, tc_id, file_path, custom_name=None):
    """Simpan record screenshot"""
    screenshots = query_db('screenshots',
                           filters={'tc_id': tc_id, 'scenario_id': sid},
                           order='display_order.desc',
                           limit=1)
    max_ord = screenshots[0].get('display_order', 0) if screenshots else 0
    
    return execute_insert('screenshots', {
        'tc_id': tc_id,
        'scenario_id': sid,
        'file_path': file_path,
        'custom_name': custom_name,
        'display_order': max_ord + 1
    })


def save_log(sid, tc_id, content, custom_name=None):
    """Simpan log text"""
    logs = query_db('log_attachments',
                    filters={'tc_id': tc_id, 'scenario_id': sid},
                    order='display_order.desc',
                    limit=1)
    max_ord = logs[0].get('display_order', 0) if logs else 0
    
    return execute_insert('log_attachments', {
        'tc_id': tc_id,
        'scenario_id': sid,
        'content': content,
        'custom_name': custom_name,
        'display_order': max_ord + 1
    })


def delete_screenshot(sid, att_id):
    """Hapus screenshot by ID"""
    screenshot = query_db('screenshots',
                          filters={'id': att_id, 'scenario_id': sid},
                          fetch='one')
    if screenshot:
        path = os.path.join('uploads', screenshot.get('file_path', ''))
        if os.path.exists(path):
            try:
                os.remove(path)
            except:
                pass
    execute_delete('screenshots', {'id': att_id})


def delete_log(sid, log_id):
    """Hapus log by ID"""
    execute_delete('log_attachments', {'id': log_id, 'scenario_id': sid})


def rename_attachment(sid, att_id, att_type, new_name):
    """Rename attachment"""
    table = 'screenshots' if att_type == 'img' else 'log_attachments'
    execute_update(table,
                   {'custom_name': new_name},
                   {'id': att_id, 'scenario_id': sid})


def reorder_attachments(sid, tc_id, att_type, order):
    """Reorder attachments"""
    table = 'screenshots' if att_type == 'img' else 'log_attachments'
    for i, att_id in enumerate(order, 1):
        execute_update(table,
                       {'display_order': i},
                       {'id': att_id, 'scenario_id': sid, 'tc_id': tc_id})


# ============================================================
# SEARCH
# ============================================================
def search_tickets(pid, query):
    """Search tickets by title"""
    all_scenarios = query_db('scenarios', 
                             filters={'project_id': pid})
    query_lower = query.lower().strip()
    
    if not query_lower:
        return all_scenarios
    
    return [s for s in all_scenarios 
            if query_lower in (s.get('title') or '').lower()]


# ============================================================
# GLOBAL STATISTICS
# ============================================================
def get_global_stats():
    """Statistik global untuk dashboard"""
    scenarios = query_db('scenarios', filters={'is_deleted': False})
    test_cases = query_db('test_cases', filters={'is_deleted': False})
    
    ticket_dict = {}
    for s in scenarios:
        status = s.get('status', 'Not Run')
        ticket_dict[status] = ticket_dict.get(status, 0) + 1
    
    total_tickets = len(scenarios)
    done_tickets = ticket_dict.get('Done', 0)
    ticket_pass_rate = round((done_tickets / total_tickets * 100), 1) if total_tickets > 0 else 0
    
    tc_total = len(test_cases)
    tc_pass = sum(1 for tc in test_cases if tc.get('status') == 'Pass')
    tc_fail = sum(1 for tc in test_cases if tc.get('status') == 'Fail')
    tc_in_progress = sum(1 for tc in test_cases if tc.get('status') == 'In Progress')
    tc_not_run = sum(1 for tc in test_cases if tc.get('status') == 'Not Run')
    
    return {
        'tickets': {
            'total': total_tickets,
            'done': done_tickets,
            'in_progress': ticket_dict.get('In Progress', 0),
            'not_run': ticket_dict.get('Not Run', 0),
            'fail': ticket_dict.get('Fail', 0),
            'pass_rate': ticket_pass_rate
        },
        'test_cases': {
            'total': tc_total,
            'pass': tc_pass,
            'fail': tc_fail,
            'in_progress': tc_in_progress,
            'not_run': tc_not_run,
            'pass_rate': round((tc_pass / tc_total * 100), 1) if tc_total > 0 else 0
        }
    }


def get_project_ticket_counts():
    """Hitung ticket per project"""
    projects = query_db('projects', filters={'is_archived': False})
    scenarios = query_db('scenarios', filters={'is_deleted': False})
    
    counts_by_project = {}
    for s in scenarios:
        pid = s.get('project_id')
        counts_by_project[pid] = counts_by_project.get(pid, 0) + 1
    
    result = []
    for p in projects:
        result.append({
            'id': p['id'],
            'name': p['name'],
            'ticket_count': counts_by_project.get(p['id'], 0)
        })
    
    result.sort(key=lambda x: x['ticket_count'], reverse=True)
    return result


# ============================================================
# PERIOD STATS (FITUR BARU - Dashboard Charts)
# ============================================================
def get_ticket_stats_by_period(year=None, month=None):
    """
    Statistik ticket per bulan dan per minggu.
    Support filter berdasarkan tahun dan bulan tertentu.
    """
    scenarios = query_db('scenarios', 
                         filters={'is_deleted': False},
                         order='created_at.desc')
    
    now = datetime.now()
    filter_year = year or now.year
    filter_month = month or now.month
    
    monthly_stats = {}
    weekly_stats = {}
    total_filtered = 0
    
    for s in scenarios:
        created_at = s.get('created_at', '')
        if not created_at:
            continue
        
        try:
            # Parse tanggal
            if 'T' in created_at:
                date_str = created_at.split('T')[0]
            else:
                date_str = created_at.split(' ')[0]
            
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            year_month = date_str[:7]  # 2026-06
            
            # Hitung monthly (6 bulan terakhir dari bulan yang dipilih)
            if year_month not in monthly_stats:
                monthly_stats[year_month] = 0
            monthly_stats[year_month] += 1
            
            # Hitung weekly (hanya untuk bulan yang difilter)
            if date_obj.year == filter_year and date_obj.month == filter_month:
                total_filtered += 1
                
                # Hitung minggu ke berapa dalam bulan
                week_num = (date_obj.day - 1) // 7 + 1
                week_label = f"Week {week_num}"
                weekly_stats[week_label] = weekly_stats.get(week_label, 0) + 1
                
        except Exception as e:
            continue
    
    # Convert monthly ke list (6 bulan terakhir)
    monthly_data = [
        {'month': k, 'count': v}
        for k, v in sorted(monthly_stats.items(), reverse=True)[:6]
    ]
    monthly_data.reverse()
    
    # Convert weekly ke list (Week 1-5 untuk bulan yang dipilih)
    weekly_data = []
    for i in range(1, 6):
        label = f"Week {i}"
        weekly_data.append({
            'week': label,
            'count': weekly_stats.get(label, 0)
        })
    
    # Hitung total bulan ini
    current_month = f"{filter_year}-{filter_month:02d}"
    
    return {
        'monthly': monthly_data,
        'weekly': weekly_data,
        'total_this_month': monthly_stats.get(current_month, 0),
        'total_filtered': total_filtered,
        'filter_year': filter_year,
        'filter_month': filter_month
    }


def get_tickets_by_tester():
    """Get ticket counts grouped by tester"""
    scenarios = query_db('scenarios', 
                         filters={'is_deleted': False})
    
    tester_stats = {}
    for s in scenarios:
        testers = s.get('testers', '')
        if not testers:
            testers = 'Unassigned'
        
        tester_list = [t.strip() for t in testers.split(',') if t.strip()]
        
        for tester in tester_list:
            if tester not in tester_stats:
                tester_stats[tester] = {
                    'total': 0,
                    'done': 0,
                    'in_progress': 0,
                    'not_run': 0,
                    'fail': 0
                }
            
            tester_stats[tester]['total'] += 1
            status = s.get('status', 'Not Run')
            if status == 'Done':
                tester_stats[tester]['done'] += 1
            elif status == 'In Progress':
                tester_stats[tester]['in_progress'] += 1
            elif status == 'Fail':
                tester_stats[tester]['fail'] += 1
            else:
                tester_stats[tester]['not_run'] += 1
    
    result = [
        {'tester': k, **v}
        for k, v in tester_stats.items()
    ]
    result.sort(key=lambda x: x['total'], reverse=True)
    
    return result