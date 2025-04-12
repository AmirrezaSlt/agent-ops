from django.http import HttpResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from .minio_client import MinioClient
from .permissions import AllowAnyForStorage


class FileView(APIView):
    """
    API endpoint for file operations
    """
    permission_classes = [AllowAnyForStorage]
    
    def get(self, request, file_path=None):
        """
        Get a file or list files
        """
        minio_client = MinioClient()
        
        if file_path:
            try:
                file_data = minio_client.get_file(file_path)
                # Try to determine content type
                import mimetypes
                content_type = mimetypes.guess_type(file_path)[0]
                
                # Return file data as a downloadable response
                response = HttpResponse(file_data, content_type=content_type or 'application/octet-stream')
                response['Content-Disposition'] = f'attachment; filename="{file_path.split("/")[-1]}"'
                return response
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        else:
            # List files
            prefix = request.query_params.get('prefix', '')
            try:
                files = minio_client.list_files(prefix)
                return Response({'files': files})
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request):
        """
        Upload a file
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get path from request or use filename
        file_path = request.data.get('path', file_obj.name)
        
        minio_client = MinioClient()
        try:
            uploaded_path = minio_client.upload_file(
                file_obj,
                file_path,
                content_type=file_obj.content_type
            )
            url = minio_client.get_file_url(uploaded_path)
            return Response({
                'message': 'File uploaded successfully',
                'path': uploaded_path,
                'url': url
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, file_path):
        """
        Delete a file
        """
        if not file_path:
            return Response({'error': 'No file path provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        minio_client = MinioClient()
        try:
            minio_client.delete_file(file_path)
            return Response({'message': 'File deleted successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 