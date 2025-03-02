'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import FileDataTable from './file-data-table'
import FileStats from './file-stats'
import SentimentChart from './SentimentChart'
import FileSummary from './FileSummary'
import WordCloudVisualization from './WordCloudVisualization'

type FileData = {
  [key: string]: string | number
}

// Your backend API base URL
const API_BASE_URL = 'http://localhost:8000'

export default function FilePage() {
  const params = useParams()
  const filename = params.filename as string
  const [data, setData] = useState<FileData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    total_records: number
    predictions_summary?: Record<string, number>
  }>({ total_records: 0 })

  useEffect(() => {
    const fetchFileData = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `${API_BASE_URL}/files/${encodeURIComponent(filename)}`
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch file data: ${response.statusText}`)
        }

        const result = await response.json()

        if (result.status === 'success' && result.data) {
          setData(result.data)
          setStats({
            total_records: result.total_records || 0,
            predictions_summary: result.predictions_summary,
          })
        } else {
          throw new Error(result.message || 'Failed to load file data')
        }
      } catch (err) {
        console.error('Error fetching file data:', err)
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        )
      } finally {
        setLoading(false)
      }
    }

    if (filename) {
      fetchFileData()
    }
  }, [filename])

  return (
    <div className='p-8'>
      <Card className='mt-4'>
        <CardHeader>
          <FileStats filename={filename} stats={stats} />
        </CardHeader>
        <CardContent>
          <FileDataTable data={data} loading={loading} error={error} />
        </CardContent>
      </Card>

      <Card className='mt-4'>
        <CardHeader>
          <CardTitle>AI Summary Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <FileSummary filename={filename} apiBaseUrl={API_BASE_URL} />
        </CardContent>
      </Card>

      <Card className='mt-4'>
        <CardHeader>
          <CardTitle>Word Cloud Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <WordCloudVisualization
            filename={filename}
            apiBaseUrl={API_BASE_URL}
          />
        </CardContent>
      </Card>

      <Card className='mt-4'>
        <CardHeader>
          <CardTitle>Sentiment Distribution for Survey ID</CardTitle>
        </CardHeader>
        <CardContent>
          <SentimentChart data={data} loading={loading} error={error} />
        </CardContent>
      </Card>
    </div>
  )
}
