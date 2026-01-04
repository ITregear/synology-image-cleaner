import paramiko
import os
import logging
from typing import Optional, Tuple
from backend.config import Config

logger = logging.getLogger(__name__)

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
        """Get an SFTP client by reusing the main SSH connection."""
        # Ensure we have an active SSH connection
        if not cls.is_connected():
            success, error = cls.connect()
            if not success:
                logger.error(f"Could not establish SSH connection: {error}")
                return None
        
        # Try to reuse existing SFTP if it's still valid
        if cls._sftp:
            try:
                # Test if SFTP is still alive by trying a simple operation
                cls._sftp.stat('.')
                logger.debug("Reusing existing SFTP connection")
                return cls._sftp
            except:
                # SFTP is dead, close it
                logger.debug("Existing SFTP connection is stale, creating new one")
                try:
                    cls._sftp.close()
                except:
                    pass
                cls._sftp = None
        
        # Create new SFTP from the existing SSH connection
        # Manually create channel and invoke SFTP subsystem for better Synology compatibility
        try:
            logger.debug("Opening new SFTP channel on existing SSH connection")
            transport = cls._client.get_transport()
            if not transport or not transport.is_active():
                raise Exception("Transport is not active")
            
            # Create a new channel manually
            chan = transport.open_session()
            chan.invoke_subsystem('sftp')
            
            # Create SFTP client from the channel
            cls._sftp = paramiko.SFTPClient(chan)
            logger.info("SFTP channel opened successfully")
            return cls._sftp
        except Exception as e:
            logger.error(f"Error opening SFTP channel: {e}")
            # If this fails, the SSH connection itself might be bad
            # Try to reconnect completely
            try:
                logger.info("Attempting full SSH reconnection for SFTP")
                cls.disconnect()
                success, error = cls.connect()
                if success:
                    transport = cls._client.get_transport()
                    if transport and transport.is_active():
                        chan = transport.open_session()
                        chan.invoke_subsystem('sftp')
                        cls._sftp = paramiko.SFTPClient(chan)
                        logger.info("SFTP channel opened successfully after reconnection")
                        return cls._sftp
                else:
                    logger.error(f"Reconnection failed: {error}")
            except Exception as e2:
                logger.error(f"Error during reconnection: {e2}")
            return None

