import paramiko
import os
from typing import Optional, Tuple
from backend.config import Config

class SSHClient:
    _client: Optional[paramiko.SSHClient] = None
    _sftp: Optional[paramiko.SFTPClient] = None
    
    @classmethod
    def connect(cls) -> Tuple[bool, Optional[str]]:
        if cls._client and cls._client.get_transport() and cls._client.get_transport().is_active():
            return True, None
        
        if not Config.NAS_HOST or not Config.NAS_USER:
            return False, "NAS_HOST and NAS_USER must be configured"
        
        try:
            cls._client = paramiko.SSHClient()
            cls._client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            kwargs = {
                'hostname': Config.NAS_HOST,
                'port': Config.NAS_PORT,
                'username': Config.NAS_USER,
                'timeout': 10
            }
            
            if Config.NAS_SSH_KEY_PATH:
                if not os.path.exists(Config.NAS_SSH_KEY_PATH):
                    return False, f"SSH key file not found: {Config.NAS_SSH_KEY_PATH}"
                
                kwargs['key_filename'] = Config.NAS_SSH_KEY_PATH
                if Config.NAS_SSH_KEY_PASSPHRASE:
                    kwargs['passphrase'] = Config.NAS_SSH_KEY_PASSPHRASE
            elif Config.NAS_PASSWORD:
                kwargs['password'] = Config.NAS_PASSWORD
            else:
                return False, "Either NAS_PASSWORD or NAS_SSH_KEY_PATH must be configured"
            
            cls._client.connect(**kwargs)
            return True, None
            
        except paramiko.AuthenticationException:
            return False, "Authentication failed. Check username and password/key."
        except paramiko.SSHException as e:
            return False, f"SSH connection error: {str(e)}"
        except Exception as e:
            return False, f"Connection error: {str(e)}"
    
    @classmethod
    def disconnect(cls):
        if cls._sftp:
            try:
                cls._sftp.close()
            except:
                pass
            cls._sftp = None
        
        if cls._client:
            try:
                cls._client.close()
            except:
                pass
            cls._client = None
    
    @classmethod
    def is_connected(cls) -> bool:
        if not cls._client:
            return False
        transport = cls._client.get_transport()
        return transport is not None and transport.is_active()
    
    @classmethod
    def run_command(cls, command: str) -> Tuple[bool, Optional[str], Optional[str]]:
        if not cls.is_connected():
            success, error = cls.connect()
            if not success:
                return False, None, error
        
        try:
            stdin, stdout, stderr = cls._client.exec_command(command, timeout=30)
            exit_status = stdout.channel.recv_exit_status()
            stdout_text = stdout.read().decode('utf-8')
            stderr_text = stderr.read().decode('utf-8')
            
            if exit_status == 0:
                return True, stdout_text, None
            else:
                return False, stdout_text, stderr_text or "Command failed"
        except Exception as e:
            return False, None, str(e)
    
    @classmethod
    def get_sftp(cls) -> Optional[paramiko.SFTPClient]:
        if not cls.is_connected():
            success, _ = cls.connect()
            if not success:
                return None
        
        if not cls._sftp or not cls._sftp.sock or not cls._sftp.sock.getpeername():
            try:
                cls._sftp = cls._client.open_sftp()
            except Exception:
                return None
        
        return cls._sftp

