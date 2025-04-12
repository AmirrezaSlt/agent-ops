from .minio_client import MinioClient

def get_file(file_path):
    """
    Get a file from MinIO storage
    
    Args:
        file_path (str): Path to the file in MinIO
        
    Returns:
        bytes: File data
    """
    minio_client = MinioClient()
    return minio_client.get_file(file_path)

def get_file_url(file_path, expires=3600):
    """
    Get a presigned URL for a file
    
    Args:
        file_path (str): Path to the file in MinIO
        expires (int): URL expiration time in seconds
        
    Returns:
        str: Presigned URL to access the file
    """
    minio_client = MinioClient()
    return minio_client.get_file_url(file_path, expires)

def list_files(prefix=""):
    """
    List files in the storage
    
    Args:
        prefix (str): Optional prefix to filter objects
        
    Returns:
        list: List of file paths
    """
    minio_client = MinioClient()
    return minio_client.list_files(prefix)

def upload_file(file_data, file_path, content_type=None):
    """
    Upload a file to storage
    
    Args:
        file_data (bytes or file-like object): File content
        file_path (str): Path where to store the file
        content_type (str): Optional content type
        
    Returns:
        str: Path of the uploaded file
    """
    minio_client = MinioClient()
    return minio_client.upload_file(file_data, file_path, content_type)

def delete_file(file_path):
    """
    Delete a file from storage
    
    Args:
        file_path (str): Path to the file in storage
        
    Returns:
        bool: Success status
    """
    minio_client = MinioClient()
    return minio_client.delete_file(file_path) 