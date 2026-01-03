import os
import re
from typing import List, Dict, Optional
from datetime import datetime
from backend.ssh_client import SSHClient
from backend.config import Config

def _get_actual_reports_root() -> Optional[str]:
    test_path = Config.NAS_REPORTS_ROOT
    if not test_path:
        return None
    
    success, output, _ = SSHClient.run_command(f'test -d "{test_path}" && echo "exists" || echo "notfound"')
    if success and output and 'exists' in output:
        return test_path
    
    if test_path.startswith('/homes/'):
        alt_path = f"/var/services{test_path}"
        success2, output2, _ = SSHClient.run_command(f'test -d "{alt_path}" && echo "exists" || echo "notfound"')
        if success2 and output2 and 'exists' in output2:
            return alt_path
    
    return test_path

def list_report_folders() -> List[Dict]:
    if not Config.NAS_REPORTS_ROOT:
        return []
    
    actual_root = _get_actual_reports_root()
    if not actual_root:
        return []
    
    success, output, error = SSHClient.run_command(f'for dir in "{actual_root}"/*; do if [ -d "$dir" ]; then echo "$dir"; fi; done')
    if not success:
        if error:
            print(f"Error listing folders: {error}")
        return []
    
    if not output or not output.strip():
        return []
    
    folders = []
    for line in output.strip().split('\n'):
        if not line or not line.strip():
            continue
        
        folder_path = line.strip()
        if not folder_path or folder_path == actual_root:
            continue
            
        report_info = validate_report_folder(folder_path)
        if report_info:
            folders.append(report_info)
    
    folders.sort(key=lambda x: x['timestamp'], reverse=True)
    return folders

def validate_report_folder(folder_path: str) -> Optional[Dict]:
    dup_db_path = os.path.join(folder_path, 'dup.db')
    csv_zip_path = os.path.join(folder_path, 'csv', 'duplicate_file.csv.zip')
    
    has_db = False
    has_csv = False
    
    success_db, output_db, _ = SSHClient.run_command(f'test -f "{dup_db_path}" && echo "exists" || echo "notfound"')
    if success_db and output_db and 'exists' in output_db:
        has_db = True
    
    success_csv, output_csv, _ = SSHClient.run_command(f'test -f "{csv_zip_path}" && echo "exists" || echo "notfound"')
    if success_csv and output_csv and 'exists' in output_csv:
        has_csv = True
    
    if not has_db and not has_csv:
        return None
    
    folder_name = os.path.basename(folder_path)
    timestamp = extract_timestamp_from_folder(folder_path, folder_name)
    
    return {
        'path': folder_path,
        'name': folder_name,
        'has_db': has_db,
        'has_csv': has_csv,
        'timestamp': timestamp,
        'valid': True
    }

def extract_timestamp_from_folder(folder_path: str, folder_name: str) -> float:
    timestamp_pattern = r'(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})'
    match = re.search(timestamp_pattern, folder_name)
    
    if match:
        try:
            year, month, day, hour, minute, second = map(int, match.groups())
            dt = datetime(year, month, day, hour, minute, second)
            return dt.timestamp()
        except:
            pass
    
    success, output, _ = SSHClient.run_command(f'stat -c %Y "{folder_path}" 2>/dev/null')
    if success and output:
        try:
            return float(output.strip())
        except:
            pass
    
    return 0.0

def get_report_info(report_path: str) -> Optional[Dict]:
    return validate_report_folder(report_path)

