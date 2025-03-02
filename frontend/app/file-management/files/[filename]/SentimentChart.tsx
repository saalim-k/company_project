'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

type FileData = {
  [key: string]: string | number
}

type ChartData = {
  name: string
  value: number
}

interface SentimentChartProps {
  data: FileData[]
  loading: boolean
  error: string | null
}

export default function SentimentChart({
  data,
  loading,
  error,
}: SentimentChartProps) {
  // Survey ID filter states
  const [surveyIdInput, setSurveyIdInput] = useState<string>('')
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)

  // Get available survey IDs for dropdown or suggestions
  const availableSurveyIds = Array.from(
    new Set(data.map(item => String(item.SurveyID)))
  )

  // Set default survey ID when data loads
  if (availableSurveyIds.length > 0 && !selectedSurveyId && !surveyIdInput) {
    const firstId = availableSurveyIds[0]
    setSurveyIdInput(firstId)
    setSelectedSurveyId(firstId)
  }

  // Generate chart data for the selected survey ID
  const surveyChartData: ChartData[] = calculateChartData(
    data,
    selectedSurveyId
  )

  const handleSurveyIdSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSelectedSurveyId(surveyIdInput)
  }

  return (
    <>
      {loading ? (
        <div className='flex items-center justify-center p-4'>
          Loading survey data...
        </div>
      ) : (
        <>
          {/* Survey ID Selection */}
          <form
            onSubmit={handleSurveyIdSubmit}
            className='flex items-center space-x-2 mb-6'
          >
            <div className='flex-1'>
              <Input
                value={surveyIdInput}
                onChange={e => setSurveyIdInput(e.target.value)}
                placeholder='Enter Survey ID'
                list='survey-ids'
              />
              <datalist id='survey-ids'>
                {availableSurveyIds.map(id => (
                  <option key={id} value={id} />
                ))}
              </datalist>
            </div>
            <Button type='submit'>View Sentiments</Button>
          </form>

          {/* Chart for selected survey */}
          {error ? (
            <div className='h-80 flex items-center justify-center text-red-500'>
              Error loading chart data
            </div>
          ) : selectedSurveyId ? (
            surveyChartData.length > 0 ? (
              <div className='h-80'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart
                    data={surveyChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='name' />
                    <YAxis
                      label={{
                        value: 'Number of Responses',
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    />
                    <Tooltip />
                    <Bar dataKey='value' name=''>
                      {surveyChartData.map((entry, index) => {
                        const colors = {
                          'Very Negative': '#ef4444',
                          Negative: '#f87171',
                          Neutral: '#9ca3af',
                          Positive: '#22c55e',
                          'Very Positive': '#16a34a',
                        }
                        const color =
                          colors[entry.name as keyof typeof colors] || '#9ca3af'
                        return <Cell key={`cell-${index}`} fill={color} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className='h-80 flex items-center justify-center'>
                No sentiment data available for Survey ID: {selectedSurveyId}
              </div>
            )
          ) : (
            <div className='h-80 flex items-center justify-center'>
              Enter a Survey ID to view sentiment distribution
            </div>
          )}
        </>
      )}
    </>
  )
}

// Helper function to calculate chart data
function calculateChartData(
  data: FileData[],
  selectedSurveyId: string | null
): ChartData[] {
  if (!data.length || !selectedSurveyId) return []

  // Filter data for selected survey
  const filteredData = data.filter(
    item => String(item.SurveyID) === selectedSurveyId
  )

  // Count sentiments
  const sentimentCounts = {
    'Very Negative': 0,
    Negative: 0,
    Neutral: 0,
    Positive: 0,
    'Very Positive': 0,
  }

  filteredData.forEach(item => {
    const sentiment = String(item.PredictedSentiment)
    if (sentiment && sentiment in sentimentCounts) {
      sentimentCounts[sentiment as keyof typeof sentimentCounts]++
    }
  })

  // Format for bar chart
  return Object.entries(sentimentCounts).map(([name, value]) => ({
    name,
    value,
  }))
}
