'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface FileSummaryProps {
  filename: string
  apiBaseUrl: string
}

type SummaryData = {
  key_themes: string[]
  main_issues: {
    issue: string
    sentiment: string
    frequency: string
    quotes: string[]
  }[]
  actionable_insights: string[]
  positive_highlights: string[]
  summary: string
}

export default function FileSummary({
  filename,
  apiBaseUrl,
}: FileSummaryProps) {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [focus, setFocus] = useState<
    'all' | 'negative' | 'positive' | 'neutral'
  >('all')

  const fetchSummary = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `${apiBaseUrl}/files/${encodeURIComponent(filename)}/summary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            focus: focus,
            max_issues: 5,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch summary: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status === 'success') {
        // Parse the raw_response if needed
        if (data.analysis.raw_response && !data.analysis.key_themes) {
          try {
            // Extract JSON from the markdown code block
            const jsonStr = data.analysis.raw_response
              .replace(/```json\n/, '')
              .replace(/\n```$/, '')
            const parsedData = JSON.parse(jsonStr)
            setSummaryData(parsedData)
          } catch (e) {
            console.error('Failed to parse raw response:', e)
            setError('Failed to parse summary data')
          }
        } else {
          // Direct structured data
          setSummaryData(data.analysis)
        }
      } else {
        throw new Error(data.message || 'Failed to load summary')
      }
    } catch (err) {
      console.error('Error fetching summary:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    if (filename) {
      fetchSummary()
    }
  }, [filename])

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'negative':
      case 'very negative':
        return 'bg-red-500 text-white'
      case 'positive':
      case 'very positive':
        return 'bg-green-500 text-white'
      case 'neutral':
        return 'bg-gray-400 text-white'
      default:
        return 'bg-blue-500 text-white'
    }
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency.toLowerCase()) {
      case 'high':
        return 'bg-red-500 text-white'
      case 'medium':
        return 'bg-orange-400 text-white'
      case 'low':
        return 'bg-yellow-400 text-black'
      default:
        return 'bg-gray-400 text-white'
    }
  }

  if (loading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-8 w-3/4' />
        <div className='space-y-2'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-2/3' />
        </div>
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

  if (!summaryData) {
    return (
      <div className='flex flex-col gap-4 items-center justify-center p-4'>
        <p>No summary available. Generate one now?</p>
        <Button onClick={fetchSummary}>Generate Summary</Button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold'>AI-Generated Summary</h2>
        <div className='flex items-center gap-2'>
          <Select value={focus} onValueChange={value => setFocus(value as any)}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Focus' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Feedback</SelectItem>
              <SelectItem value='negative'>Negative Only</SelectItem>
              <SelectItem value='positive'>Positive Only</SelectItem>
              <SelectItem value='neutral'>Neutral Only</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchSummary} size='sm'>
            Get Summary
          </Button>
        </div>
      </div>

      <div className='p-4 bg-slate-50 dark:bg-slate-900 rounded-lg'>
        <p className='text-sm text-slate-700 dark:text-slate-300'>
          {summaryData.summary}
        </p>
      </div>

      <Tabs defaultValue='issues'>
        <TabsList>
          <TabsTrigger value='issues'>Main Issues</TabsTrigger>
          <TabsTrigger value='themes'>Key Themes</TabsTrigger>
          <TabsTrigger value='insights'>Actionable Insights</TabsTrigger>
          {summaryData.positive_highlights?.length > 0 && (
            <TabsTrigger value='positive'>Positive Highlights</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value='issues' className='mt-4'>
          <div className='space-y-4'>
            {summaryData.main_issues?.map((issue, index) => (
              <Card key={`issue-${index}`}>
                <CardContent className='pt-4'>
                  <div className='flex flex-wrap gap-2 mb-2'>
                    <Badge className={getSentimentColor(issue.sentiment)}>
                      {issue.sentiment}
                    </Badge>
                    <Badge className={getFrequencyColor(issue.frequency)}>
                      {issue.frequency} frequency
                    </Badge>
                  </div>
                  <p className='font-medium mb-3'>{issue.issue}</p>
                  {issue.quotes?.length > 0 && (
                    <div className='space-y-2'>
                      <p className='text-sm text-slate-500'>Example quotes:</p>
                      {issue.quotes.map((quote, i) => (
                        <div
                          key={`quote-${index}-${i}`}
                          className='bg-slate-100 dark:bg-slate-800 p-2 rounded text-sm italic'
                        >
                          "{quote}"
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value='themes' className='mt-4'>
          <div className='flex flex-wrap gap-2'>
            {summaryData.key_themes?.map((theme, index) => (
              <Badge
                key={`theme-${index}`}
                variant='outline'
                className='text-sm py-1 px-3'
              >
                {theme}
              </Badge>
            ))}
          </div>
        </TabsContent>

        <TabsContent value='insights' className='mt-4'>
          <ul className='space-y-2 list-disc pl-5'>
            {summaryData.actionable_insights?.map((insight, index) => (
              <li key={`insight-${index}`} className='text-sm'>
                {insight}
              </li>
            ))}
          </ul>
        </TabsContent>

        {summaryData.positive_highlights?.length > 0 && (
          <TabsContent value='positive' className='mt-4'>
            <ul className='space-y-2 list-disc pl-5'>
              {summaryData.positive_highlights.map((highlight, index) => (
                <li key={`highlight-${index}`} className='text-sm'>
                  {highlight}
                </li>
              ))}
            </ul>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
