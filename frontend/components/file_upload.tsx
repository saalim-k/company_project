'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

export interface UploadResponse {
  status: string
  message: string
  results?: unknown
}

interface FileUploadProps {
  onResponse?: (response: UploadResponse | null) => void
}

export default function FileUpload({ onResponse }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(
    null
  )

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
    },
    multiple: false,
  })

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadStatus('No file selected.')
      if (onResponse) {
        onResponse(null)
      }
      return
    }
    const file = files[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/upload/', {
        method: 'POST',
        body: formData,
      })

      const data: UploadResponse = await response.json()

      if (!response.ok || data.status === 'error') {
        setUploadStatus(`Upload failed: ${data.message}`)
        setUploadResponse(data)
        if (onResponse) {
          onResponse(data)
        }
      } else {
        setUploadStatus('Upload successful!')
        setUploadResponse(data)
        if (onResponse) {
          onResponse(data)
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadStatus('Upload failed.')
      if (onResponse) {
        onResponse(null)
      }
    }
  }

  return (
    <div className='flex flex-col items-center space-y-6'>
      {/* Dropzone with fixed dimensions */}
      <div
        {...getRootProps()}
        className={`w-full max-w-lg h-48 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all 
          ${
            isDragActive
              ? 'bg-blue-50 border-blue-500'
              : 'bg-white border-gray-300'
          }`}
        style={{ minHeight: '12rem' }} // Prevents shifting
      >
        <input {...getInputProps()} className='w-0 h-0 opacity-0' />
        <p className='text-gray-700 text-center text-lg font-medium'>
          {isDragActive
            ? 'Drop the file here...'
            : 'Drag & drop a CSV or Excel file here, or click to select one'}
        </p>
      </div>

      {/* File info display */}
      <div className='w-full max-w-lg text-center'>
        {files.length > 0 ? (
          <div className='p-4 bg-gray-100 rounded-lg shadow-sm border border-gray-300'>
            <h3 className='text-lg font-semibold'>Selected File:</h3>
            <ul className='mt-2'>
              {files.map(file => (
                <li key={file.name} className='text-gray-700'>
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className='text-gray-500 italic'>No file selected</p>
        )}
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        className='px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all focus:ring-4 focus:ring-blue-300'
      >
        Upload
      </button>

      {/* Status message */}
      {uploadStatus && (
        <p className='text-gray-700 text-lg font-medium'>{uploadStatus}</p>
      )}

      {uploadResponse?.status === 'error' && (
        <div className='w-full max-w-lg p-4 bg-red-50 text-red-700 rounded-lg shadow-sm border border-red-300'>
          <h3 className='text-lg font-semibold'>Error:</h3>
          <p className='mt-2'>{uploadResponse.message}</p>
        </div>
      )}
    </div>
  )
}
