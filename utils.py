import os, re, requests, json, html
from datetime import datetime

def calc_duration(start, end, status):
    s = start or None
    if not s: return "N/A"
    try:
        s_dt = datetime.fromisoformat(s)
        if status == 'Done' and end:
            e_dt = datetime.fromisoformat(end)
            delta = e_dt - s_dt
        else:
            delta = datetime.now() - s_dt
        days = delta.days
        hours = delta.seconds // 3600
        return f"{days}d {hours}h" if days > 0 else f"{hours}h"
    except: return "N/A"

def generate_export_filename(scenario, project):
    link = scenario.get('link', '') if isinstance(scenario, dict) else (scenario['link'] if scenario else '')
    if not link and project:
        link = project.get('link', '') if isinstance(project, dict) else (project['link'] if project else '')
    
    link_slug = ''
    if link:
        parts = link.rstrip('/').split('?')[0].split('#')[0].split('/')
        match = re.search(r'([A-Za-z0-9]+-?\d+)', parts[-1])
        if match: link_slug = match.group(1)
        
    title = scenario.get('title', 'Untitled') if isinstance(scenario, dict) else (scenario['title'] if scenario else 'Untitled')
    match = re.match(r'^([A-Za-z0-9]+-?\d+)\s*(.*)', title)
    if match: ticket_id, rest_title = match.group(1), match.group(2).strip()
    else:
        words = title.split()
        ticket_id = words[0] if len(words) > 1 else title
        rest_title = ' '.join(words[1:]) if len(words) > 1 else ''
        
    if link_slug and ticket_id: filename = f"[{link_slug}][{ticket_id}] {rest_title}".strip()
    elif link_slug: filename = f"[{link_slug}] {title}".strip()
    elif ticket_id: filename = f"[{ticket_id}] {rest_title}".strip()
    else: filename = title
    
    filename = re.sub(r'[<>:"/\\|?*]', '', filename).replace('  ', ' ').strip()
    return f"{filename}.xlsx"

def call_ai_api(prompt):
    gemini_key = os.getenv("GEMINI_API_KEY"); openai_key = os.getenv("OPENAI_API_KEY")
    system = "Return ONLY a JSON array. Each object MUST contain: tc_id, test_case, test_criteria, test_date, test_data, expected_result, actual_result, status, remarks. Generate 3 to 5 distinct cases. Status must be 'Not Run'."
    try:
        if gemini_key:
            res = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={gemini_key}",
                json={"contents":[{"parts":[{"text":f"{system}\n\nPrompt: {prompt}"}]}]}, timeout=15)
            text = res.json()["candidates"][0]["content"]["parts"][0]["text"].replace("```json","").replace("```","").strip()
            return json.loads(text)
        elif openai_key:
            res = requests.post("https://api.openai.com/v1/chat/completions",
                json={"model":"gpt-4o-mini","messages":[{"role":"system","content":system},{"role":"user","content":f"Prompt: {prompt}"}]},
                headers={"Authorization":f"Bearer {openai_key}"}, timeout=15)
            text = res.json()["choices"][0]["message"]["content"].replace("```json","").replace("```","").strip()
            return json.loads(text)
    except: pass
    return [{"tc_id":"","test_case":f"Validasi {prompt[:30]}...","test_criteria":"Sesuai spec","test_date":"","test_data":"Sample","expected_result":"Success","actual_result":"","status":"Not Run","remarks":"AI Generated"}]