import { Badge } from '@/components/ui/badge'

interface FileStatsProps {
  filename: string
  stats: {
    total_records: number
    predictions_summary?: Record<string, number>
  }
}

export default function FileStats({ filename, stats }: FileStatsProps) {
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
      'Very Positive': 'outline',
    }
    return sentimentMap[sentiment] || 'default'
  }

  return (
    <div className='flex flex-col space-y-2'>
      <h1 className='text-2xl font-bold'>
        File: {decodeURIComponent(filename)}
      </h1>
      {stats.total_records > 0 && (
        <p className='text-muted-foreground'>
          Total records: {stats.total_records}
        </p>
      )}
      {stats.predictions_summary && (
        <div className='flex flex-wrap gap-2 mt-2'>
          {Object.entries(stats.predictions_summary).map(
            ([sentiment, count]) => (
              <Badge key={sentiment} variant={getSentimentVariant(sentiment)}>
                {sentiment}: {count}
              </Badge>
            )
          )}
        </div>
      )}
    </div>
  )
}
