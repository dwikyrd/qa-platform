import os

class Config:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    DB_NAME = 'test_manager_final.db'
    DB_PATH = os.path.join(BASE_DIR, DB_NAME)
    
    # Pastikan folder uploads ada
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)