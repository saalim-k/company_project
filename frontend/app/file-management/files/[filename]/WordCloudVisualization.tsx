'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import * as d3 from 'd3'
import cloud from 'd3-cloud'

interface WordCloudProps {
  filename: string
  apiBaseUrl: string
}

type WordCloudData = {
  text: string
  value: number
}

export default function WordCloudVisualization({
  filename,
  apiBaseUrl,
}: WordCloudProps) {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [words, setWords] = useState<WordCloudData[]>([])
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const svgRef = useRef<SVGSVGElement>(null)

  const fetchWordCloudData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `${apiBaseUrl}/files/${encodeURIComponent(
          filename
        )}/wordcloud?sentiment_filter=${sentimentFilter}`
      )

      if (!response.ok) {
        throw new Error(
          `Failed to fetch word cloud data: ${response.statusText}`
        )
      }

      const data = await response.json()

      if (data.status === 'success' && data.wordcloud_data) {
        setWords(data.wordcloud_data)
      } else {
        throw new Error(data.message || 'Failed to load word cloud data')
      }
    } catch (err) {
      console.error('Error fetching word cloud data:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (filename) {
      fetchWordCloudData()
    }
  }, [filename, sentimentFilter])

  useEffect(() => {
    if (words.length > 0 && svgRef.current) {
      renderWordCloud()
    }
  }, [words])

  const getSentimentColors = () => {
    if (sentimentFilter === 'negative') {
      return d3.scaleOrdinal([
        '#ff9999',
        '#ff6666',
        '#ff3333',
        '#ff0000',
        '#cc0000',
      ])
    } else if (sentimentFilter === 'positive') {
      return d3.scaleOrdinal([
        '#99ff99',
        '#66ff66',
        '#33ff33',
        '#00ff00',
        '#00cc00',
      ])
    } else {
      return d3.scaleOrdinal([
        '#9999ff',
        '#6666ff',
        '#3333ff',
        '#0000ff',
        '#0000cc',
      ])
    }
  }

  const renderWordCloud = () => {
    if (!svgRef.current) return

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    const colorScale = getSentimentColors()

    // Calculate font size scale based on word frequencies
    const maxFreq = Math.max(...words.map(w => w.value))
    const minFreq = Math.min(...words.map(w => w.value))
    const fontScale = d3
      .scaleLinear()
      .domain([minFreq, maxFreq])
      .range([15, 60])

    // Configure the layout
    cloud()
      .size([width, height])
      .words(
        words.map(w => ({
          text: w.text,
          size: fontScale(w.value),
          value: w.value,
        }))
      )
      .padding(5)
      .rotate(() => (~~(Math.random() * 6) - 3) * 30)
      .font('Impact')
      .fontSize(d => d.size!)
      .on('end', draw)
      .start()

    function draw(words: any[]) {
      const svg = d3
        .select(svgRef.current)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`)

      // Add tooltip div
      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'word-cloud-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'white')
        .style('border', '1px solid #ddd')
        .style('border-radius', '4px')
        .style('padding', '4px 8px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '100')
        .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')

      // Add words
      svg
        .selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .style('font-size', d => `${d.size}px`)
        .style('font-family', 'Impact')
        .style('fill', (_, i) => colorScale(i.toString()))
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .text(d => d.text)
        .on('mouseover', function (event, d) {
          tooltip
            .html(`${d.text}: ${d.value}`)
            .style('visibility', 'visible')
            .style('top', event.pageY - 10 + 'px')
            .style('left', event.pageX + 10 + 'px')

          d3.select(this)
            .style('cursor', 'pointer')
            .style('font-size', `${(d.size as number) * 1.1}px`)
        })
        .on('mousemove', function (event) {
          tooltip
            .style('top', event.pageY - 10 + 'px')
            .style('left', event.pageX + 10 + 'px')
        })
        .on('mouseout', function (event, d) {
          tooltip.style('visibility', 'hidden')
          d3.select(this).style('font-size', `${d.size}px`)
        })
    }
  }

  if (loading) {
    return (
      <div className='h-80'>
        <Skeleton className='h-full w-full' />
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

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='Filter by sentiment' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Feedback</SelectItem>
            <SelectItem value='negative'>Negative Only</SelectItem>
            <SelectItem value='positive'>Positive Only</SelectItem>
            <SelectItem value='neutral'>Neutral Only</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchWordCloudData} variant='outline'>
          Refresh
        </Button>
      </div>

      <div className='h-80 border rounded-md'>
        {words.length > 0 ? (
          <svg ref={svgRef} className='w-full h-full' />
        ) : (
          <div className='h-full flex items-center justify-center text-muted-foreground'>
            No word data available for the selected filter
          </div>
        )}
      </div>
    </div>
  )
}
