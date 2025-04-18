import io
import json
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile


class MinioClientMock:
    """Mock for MinioClient operations"""
    
    def list_files(self, prefix):
        return [
            {"name": "file1.txt", "size": 1024, "last_modified": "2023-01-01T00:00:00Z"},
            {"name": "file2.pdf", "size": 2048, "last_modified": "2023-01-02T00:00:00Z"}
        ]
    
    def get_file(self, file_path):
        if file_path == "file1.txt":
            return io.BytesIO(b"This is test file content")
        else:
            raise Exception("File not found")
    
    def upload_file(self, file_obj, file_path, content_type=None):
        return file_path
    
    def get_file_url(self, file_path):
        return f"https://minio-server/bucket/{file_path}"
    
    def delete_file(self, file_path):
        if file_path != "file1.txt":
            raise Exception("File not found")
        return True


class FileViewTest(APITestCase):
    """Test module for File API endpoints"""

    @patch('storage.views.MinioClient', return_value=MinioClientMock())
    def test_list_files(self, mock_minio_client):
        """Test listing files"""
        url = reverse('file-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['files']), 2)
        self.assertEqual(response.data['files'][0]['name'], 'file1.txt')
        self.assertEqual(response.data['files'][1]['name'], 'file2.pdf')

    @patch('storage.views.MinioClient', return_value=MinioClientMock())
    def test_get_file(self, mock_minio_client):
        """Test retrieving a specific file"""
        url = reverse('file-detail', kwargs={'file_path': 'file1.txt'})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Disposition'], 'attachment; filename="file1.txt"')
        self.assertEqual(response.content, b"This is test file content")

    @patch('storage.views.MinioClient', return_value=MinioClientMock())
    def test_get_nonexistent_file(self, mock_minio_client):
        """Test retrieving a nonexistent file"""
        url = reverse('file-detail', kwargs={'file_path': 'nonexistent.txt'})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('storage.views.MinioClient', return_value=MinioClientMock())
    def test_upload_file(self, mock_minio_client):
        """Test uploading a file"""
        url = reverse('file-list')
        file = SimpleUploadedFile("test_file.txt", b"file content", content_type="text/plain")
        
        response = self.client.post(url, {'file': file}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['path'], 'test_file.txt')
        self.assertEqual(response.data['url'], 'https://minio-server/bucket/test_file.txt')

    @patch('storage.views.MinioClient', return_value=MinioClientMock())
    def test_upload_file_with_path(self, mock_minio_client):
        """Test uploading a file with custom path"""
        url = reverse('file-list')
        file = SimpleUploadedFile("test_file.txt", b"file content", content_type="text/plain")
        
        response = self.client.post(
            url, 
            {'file': file, 'path': 'custom/path/test_file.txt'}, 
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['path'], 'custom/path/test_file.txt')

    @patch('storage.views.MinioClient', return_value=MinioClientMock())
    def test_delete_file(self, mock_minio_client):
        """Test deleting a file"""
        url = reverse('file-detail', kwargs={'file_path': 'file1.txt'})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'File deleted successfully')

    @patch('storage.views.MinioClient', return_value=MinioClientMock())
    def test_delete_nonexistent_file(self, mock_minio_client):
        """Test deleting a nonexistent file"""
        url = reverse('file-detail', kwargs={'file_path': 'nonexistent.txt'})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR) 