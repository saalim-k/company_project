'use client'

import { useState } from 'react'
import { DataTable } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

type FileData = {
  [key: string]: string | number
}

interface FileDataTableProps {
  data: FileData[]
  loading: boolean
  error: string | null
}

export default function FileDataTable({
  data,
  loading,
  error,
}: FileDataTableProps) {
  // Pagination
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 10

  // Calculate paginated data
  const totalPages = Math.ceil(data.length / pageSize)
  const paginatedData = data.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize
  )

  const columns = Object.keys(data[0] || {}).map(key => ({
    accessorKey: key,
    header: key,
    cell: ({ row }) => {
      const value = row.getValue(key)
      // Special formatting for sentiment values
      if (key === 'PredictedSentiment' || key === 'Sentiment') {
        return (
          <Badge variant={getSentimentVariant(value as string)}>
            {value as string}
          </Badge>
        )
      }
      return <div>{String(value)}</div>
    },
  })) as ColumnDef<FileData>[]

  function getSentimentVariant(
    sentiment: string
  ): 'default' | 'destructive' | 'outline' | 'secondary' {
    const sentimentMap: Record<
      string,
      'default' | 'destructive' | 'outline' | 'secondary'
    > = {
      'Very Negative': 'destructive',
      Negative: 'destructive',
      Neutral: 'secondary',
      Positive: 'outline',
      'Very Positive': 'outline', // Changed from 'primary' to 'outline'
    }
    return sentimentMap[sentiment] || 'default'
  }

  if (loading) {
    return (
      <div className='space-y-2'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-full' />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant='destructive'>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (data.length === 0) {
    return <div className='text-center py-4'>No data available</div>
  }

  return (
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
          Page {pageIndex + 1} of {totalPages || 1}
        </span>
        <button
          className='px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50'
          onClick={() => setPageIndex(Math.min(pageIndex + 1, totalPages - 1))}
          disabled={pageIndex >= totalPages - 1}
        >
          Next
        </button>
      </div>
    </>
  )
}
