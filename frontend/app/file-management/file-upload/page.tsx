'use client'
import { useState } from 'react'
import FileUpload, { UploadResponse } from '@/components/file_upload'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import { ColumnDef } from '@tanstack/react-table'

interface SurveyData {
  ID: string
  SurveyID: string
  Question: string
  SurveyAnswer: string
  Sentiment: string | null
  PredictedSentiment: string
}

export default function FileUploadPage() {
  const [responseData, setResponseData] = useState<UploadResponse | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 10

  let columns: ColumnDef<SurveyData>[] = []
  if (
    responseData &&
    responseData.status === 'success' &&
    Array.isArray(responseData.results) &&
    responseData.results.length > 0
  ) {
    columns = Object.keys(responseData.results[0]).map(key => ({
      accessorKey: key as keyof SurveyData,
      header: key.toUpperCase(),
    }))
  }

  // Calculate paginated data
  const allData =
    responseData && responseData.results && Array.isArray(responseData.results)
      ? responseData.results
      : []
  const totalPages = Math.ceil(allData.length / pageSize)
  const paginatedData = allData.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize
  )

  return (
    <main className='flex p-8 bg-gray-100'>
      <div className='flex flex-col gap-6 w-full'>
        {/* Upload Files Section */}
        <Card className='w-full'>
          <CardHeader>
            <h1 className='text-4xl font-bold text-gray-900'>Upload Files</h1>
          </CardHeader>
          <CardContent>
            <FileUpload onResponse={setResponseData} />
          </CardContent>
        </Card>

        {/* Results Section */}
        {responseData?.status === 'success' && (
          <Card className='w-full overflow-x-auto'>
            <CardHeader>
              <h2 className='text-2xl font-bold text-gray-900'>Results</h2>
            </CardHeader>
            <CardContent>
              {allData.length > 0 ? (
                <>
                  <DataTable columns={columns} data={paginatedData} />
                  {/* Pagination Controls */}
                  <div className='mt-4 flex items-center justify-between'>
                    <button
                      className='px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50'
                      onClick={() => setPageIndex(Math.max(pageIndex - 1, 0))}
                      disabled={pageIndex === 0}
                    >
                      Previous
                    </button>
                    <span>
                      Page {pageIndex + 1} of {totalPages}
                    </span>
                    <button
                      className='px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50'
                      onClick={() =>
                        setPageIndex(Math.min(pageIndex + 1, totalPages - 1))
                      }
                      disabled={pageIndex >= totalPages - 1}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <p>No data available.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
