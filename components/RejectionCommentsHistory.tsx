"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { fetchRejectionComments } from "@/app/dashboard/actions/fetchForReview"
import { Card, CardContent } from "@/components/ui/card"

interface RejectionComment {
  id: string
  created_at: string
  comment: string
  users?: {
    id?: string
    name?: string
    email?: string
  } | {
    id?: string
    name?: string
    email?: string
  }[]
}

interface RejectionCommentsHistoryProps {
  submissionId: string
}

export function RejectionCommentsHistory({ submissionId }: RejectionCommentsHistoryProps) {
  const [comments, setComments] = useState<RejectionComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadComments = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchRejectionComments(submissionId)
        if (result.success) {
          setComments((result.data as any) || [])
        } else {
          setError(result.error || "Failed to load rejection comments")
        }
      } catch (err) {
        console.error("Error loading rejection comments:", err)
        setError("An error occurred while loading comments")
      } finally {
        setIsLoading(false)
      }
    }

    if (submissionId) {
      loadComments()
    }
  }, [submissionId])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-600 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-sm">Loading comments...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 text-red-600 py-2">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (comments.length === 0) {
    return null
  }

  return (
            <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <p className="text-sm font-semibold text-gray-700">Rejection Reasons from HOD</p>
      </div>
      {comments.map((comment) => (
        <Card key={comment.id} className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    {Array.isArray(comment.users) ? comment.users[0]?.name : (comment.users as any)?.name || "HOD"}
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <p className="text-sm text-red-800 leading-relaxed">{comment.comment}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
