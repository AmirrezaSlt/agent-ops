import os
from minio import Minio
from minio.error import S3Error
from django.conf import settings


class MinioClient:
    def __init__(self):
        self.client = Minio(
            f"{settings.MINIO_ENDPOINT}:{settings.MINIO_PORT}",
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL,
        )
        self.bucket_name = settings.MINIO_BUCKET

    def get_file(self, file_path):
        """
        Retrieve a file from MinIO by its path
        
        Args:
            file_path (str): Path to the file in MinIO
            
        Returns:
            bytes: File data as bytes
        """
        try:
            response = self.client.get_object(
                bucket_name=self.bucket_name,
                object_name=file_path,
            )
            file_data = response.read()
            response.close()
            response.release_conn()
            return file_data
        except S3Error as err:
            raise Exception(f"Error retrieving file: {err}")

    def list_files(self, prefix=""):
        """
        List files in the bucket with an optional prefix
        
        Args:
            prefix (str): Optional prefix to filter objects
            
        Returns:
            list: List of object names
        """
        try:
            objects = self.client.list_objects(
                bucket_name=self.bucket_name,
                prefix=prefix,
                recursive=True,
            )
            return [obj.object_name for obj in objects]
        except S3Error as err:
            raise Exception(f"Error listing files: {err}")

    def upload_file(self, file_data, file_path, content_type=None):
        """
        Upload a file to MinIO
        
        Args:
            file_data (bytes or file-like object): File content
            file_path (str): Path where to store the file
            content_type (str): Optional content type
            
        Returns:
            str: Path of the uploaded file
        """
        try:
            if isinstance(file_data, bytes):
                import io
                file_data = io.BytesIO(file_data)
                
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=file_path,
                data=file_data,
                length=file_data.getbuffer().nbytes if hasattr(file_data, 'getbuffer') else os.fstat(file_data.fileno()).st_size,
                content_type=content_type,
            )
            return file_path
        except S3Error as err:
            raise Exception(f"Error uploading file: {err}")

    def delete_file(self, file_path):
        """
        Delete a file from MinIO
        
        Args:
            file_path (str): Path to the file in MinIO
            
        Returns:
            bool: Success status
        """
        try:
            self.client.remove_object(
                bucket_name=self.bucket_name,
                object_name=file_path,
            )
            return True
        except S3Error as err:
            raise Exception(f"Error deleting file: {err}")

    def get_file_url(self, file_path, expires=3600):
        """
        Get a presigned URL for a file
        
        Args:
            file_path (str): Path to the file in MinIO
            expires (int): URL expiration time in seconds
            
        Returns:
            str: Presigned URL
        """
        try:
            return self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=file_path,
                expires=expires,
            )
        except S3Error as err:
            raise Exception(f"Error generating URL: {err}") 