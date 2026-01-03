import sqlite3
import os
import tempfile
import zipfile
import csv
import base64 as b64
from typing import List, Dict, Optional, Tuple
from backend.ssh_client import SSHClient
from backend.config import Config

def download_file_via_sftp(remote_path: str, local_path: str) -> bool:
    sftp = SSHClient.get_sftp()
    if not sftp:
        return False
    
    try:
        sftp.get(remote_path, local_path)
        return True
    except Exception as e:
        print(f"Error downloading {remote_path}: {e}")
        return False

def parse_dup_db(report_path: str) -> List[Dict]:
    dup_db_path = os.path.join(report_path, 'dup.db')
    
    success, output, error = SSHClient.run_command(f'cd "{report_path}" && sqlite3 dup.db ".tables" 2>&1')
    if not success or 'not a database' in (output or '') or 'not a database' in (error or ''):
        return []
    
    success, output, error = SSHClient.run_command(f'cd "{report_path}" && sqlite3 dup.db "SELECT name FROM sqlite_master WHERE type=\'table\'" 2>&1')
    if not success or not output:
        return []
    
    tables = [t.strip() for t in output.strip().split('\n') if t.strip()]
    duplicate_groups = []
    
    for table_name in tables:
        if 'dup' in table_name.lower() or 'duplicate' in table_name.lower():
            try:
                success, output, error = SSHClient.run_command(f'cd "{report_path}" && sqlite3 dup.db "PRAGMA table_info({table_name})" 2>&1')
                if not success or not output:
                    continue
                
                columns = []
                for line in output.strip().split('\n'):
                    if line:
                        parts = line.split('|')
                        if len(parts) > 1:
                            columns.append(parts[1])
                
                if not columns:
                    continue
                
                path_col = next((c for c in columns if 'path' in c.lower()), None)
                if not path_col:
                    path_col = next((c for c in columns if 'file' in c.lower()), None)
                if not path_col:
                    path_col = columns[0] if columns else None
                
                if not path_col:
                    continue
                
                group_col = next((c for c in columns if 'group' in c.lower()), None)
                
                if group_col:
                    success, output, error = SSHClient.run_command(f'cd "{report_path}" && sqlite3 dup.db "SELECT DISTINCT {group_col} FROM {table_name}" 2>&1')
                    if success and output:
                        group_ids = [g.strip() for g in output.strip().split('\n') if g.strip()]
                        
                        for group_id in group_ids:
                            success2, output2, error2 = SSHClient.run_command(f'cd "{report_path}" && sqlite3 dup.db "SELECT {path_col} FROM {table_name} WHERE {group_col} = \'{group_id}\'" 2>&1')
                            if success2 and output2:
                                paths = [p.strip() for p in output2.strip().split('\n') if p.strip()]
                                if len(paths) >= 2:
                                    duplicate_groups.append({
                                        'group_id': str(group_id),
                                        'paths': paths
                                    })
                else:
                    success, output, error = SSHClient.run_command(f'cd "{report_path}" && sqlite3 dup.db "SELECT {path_col} FROM {table_name}" 2>&1')
                    if success and output:
                        all_paths = [p.strip() for p in output.strip().split('\n') if p.strip()]
                        if len(all_paths) >= 2:
                            duplicate_groups.append({
                                'group_id': 'default',
                                'paths': all_paths
                            })
            except Exception as e:
                print(f"Error reading table {table_name}: {e}")
                continue
    
    return duplicate_groups

def parse_csv_zip(report_path: str) -> List[Dict]:
    csv_zip_path = os.path.join(report_path, 'csv', 'duplicate_file.csv.zip')
    
    script_content = '''import zipfile,sys
z=zipfile.ZipFile("duplicate_file.csv.zip")
n=[f for f in z.namelist() if f.endswith(".csv")][0]
b=z.read(n)
try:
    c=b.decode("utf-16-le")
except:
    try:
        c=b.decode("utf-16")
    except:
        c=b.decode("utf-8",errors="ignore")
sys.stdout.write(c)'''
    
    script_b64 = b64.b64encode(script_content.encode()).decode()
    success, output, error = SSHClient.run_command(f'cd "{report_path}/csv" && echo {script_b64} | base64 -d > /tmp/extract_csv.py && python3 /tmp/extract_csv.py 2>&1 && rm -f /tmp/extract_csv.py')
    
    if success and output and len(output.strip()) > 0:
        csv_content = output
        csv_reader = csv.DictReader(csv_content.splitlines(), delimiter='\t')
        
        if not csv_reader.fieldnames:
            return []
        
        print(f"CSV columns found: {csv_reader.fieldnames}")
        
        group_key = None
        path_key = None
        
        for key in csv_reader.fieldnames:
            key_clean = key.replace('\ufeff', '').strip()
            key_lower = key_clean.lower()
            if 'group' in key_lower:
                group_key = key
            if key_clean.lower() == 'file' or ('file' in key_lower and 'path' not in key_lower):
                path_key = key
        
        if not group_key or not path_key:
            print(f"Warning: Could not find required columns. Group: {group_key}, File: {path_key}")
            return []
        
        groups = {}
        row_count = 0
        for row in csv_reader:
            row_count += 1
            if row_count % 1000 == 0:
                print(f"Processed {row_count} rows...")
            
            group_id = row.get(group_key, '').strip()
            file_path = row.get(path_key, '').strip()
            
            if group_id and file_path:
                if group_id not in groups:
                    groups[group_id] = []
                groups[group_id].append(file_path)
        
        print(f"Total rows processed: {row_count}")
        print(f"Total groups found: {len(groups)}")
        
        duplicate_groups = []
        for group_id, paths in groups.items():
            if len(paths) >= 2:
                duplicate_groups.append({
                    'group_id': str(group_id),
                    'paths': paths
                })
        
        print(f"Groups with 2+ files: {len(duplicate_groups)}")
        return duplicate_groups
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_zip:
        local_zip_path = tmp_zip.name
    
    try:
        if not download_file_via_sftp(csv_zip_path, local_zip_path):
            return []
        
        duplicate_groups = []
        
        with zipfile.ZipFile(local_zip_path, 'r') as zip_ref:
            csv_files = [f for f in zip_ref.namelist() if f.endswith('.csv')]
            if not csv_files:
                return []
            
            csv_bytes = zip_ref.read(csv_files[0])
            try:
                csv_content = csv_bytes.decode('utf-16-le')
            except:
                try:
                    csv_content = csv_bytes.decode('utf-16')
                except:
                    csv_content = csv_bytes.decode('utf-8', errors='ignore')
            
            csv_reader = csv.DictReader(csv_content.splitlines(), delimiter='\t')
            
            if not csv_reader.fieldnames:
                return []
            
            group_key = None
            path_key = None
            
            for key in csv_reader.fieldnames:
                key_clean = key.replace('\ufeff', '').strip()
                key_lower = key_clean.lower()
                if 'group' in key_lower:
                    group_key = key
                if key_clean.lower() == 'file' or ('file' in key_lower and 'path' not in key_lower):
                    path_key = key
            
            if not group_key or not path_key:
                return []
            
            groups = {}
            for row in csv_reader:
                group_id = row.get(group_key, '').strip()
                file_path = row.get(path_key, '').strip()
                
                if group_id and file_path:
                    if group_id not in groups:
                        groups[group_id] = []
                    groups[group_id].append(file_path)
            
            for group_id, paths in groups.items():
                if len(paths) >= 2:
                    duplicate_groups.append({
                        'group_id': str(group_id),
                        'paths': paths
                    })
        
        return duplicate_groups
        
    finally:
        if os.path.exists(local_zip_path):
            os.unlink(local_zip_path)

def classify_duplicate_group(paths: List[str]) -> Tuple[Optional[str], Optional[str], bool]:
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.heic', '.heif', '.raw', '.cr2', '.nef', '.orf', '.sr2'}
    
    backup_path = None
    sorted_path = None
    
    image_paths = [p for p in paths if any(p.lower().endswith(ext) for ext in image_extensions)]
    
    if not image_paths:
        return None, None, False
    
    for path in image_paths:
        if Config.is_backup_path(path):
            if not backup_path:
                backup_path = path
        elif Config.is_sorted_path(path):
            if not sorted_path:
                sorted_path = path
    
    is_valid = backup_path is not None and sorted_path is not None
    
    return backup_path, sorted_path, is_valid

def parse_report(report_path: str) -> List[Dict]:
    duplicate_groups_raw = []
    
    db_groups = parse_dup_db(report_path)
    print(f"Found {len(db_groups)} groups from DB")
    duplicate_groups_raw.extend(db_groups)
    
    if not duplicate_groups_raw:
        csv_groups = parse_csv_zip(report_path)
        print(f"Found {len(csv_groups)} groups from CSV")
        duplicate_groups_raw.extend(csv_groups)
    
    print(f"Total raw groups: {len(duplicate_groups_raw)}")
    
    classified_groups = []
    for group in duplicate_groups_raw:
        backup_path, sorted_path, is_valid = classify_duplicate_group(group['paths'])
        if is_valid:
            classified_groups.append({
                'group_id': group['group_id'],
                'backup_path': backup_path,
                'sorted_path': sorted_path,
                'all_paths': group['paths']
            })
        else:
            print(f"Group {group['group_id']} invalid - backup: {backup_path}, sorted: {sorted_path}")
    
    print(f"Valid classified groups: {len(classified_groups)}")
    return classified_groups
