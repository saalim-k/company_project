'use client'

import { useParams } from 'next/navigation'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

export default function FilePage() {
  const params = useParams()
  const filename = params.filename as string

  return (
    <div className='p-8'>
      <Card>
        <CardHeader>
          <h1 className='text-2xl font-bold'>
            File: {decodeURIComponent(filename)}
          </h1>
        </CardHeader>
        <CardContent>{/* Content will be added here */}</CardContent>
      </Card>
    </div>
  )
}
