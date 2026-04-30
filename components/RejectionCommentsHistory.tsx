"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react"
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
  const [submissionStatus, setSubmissionStatus] = useState<string>("")
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
          setSubmissionStatus((result as any).status || "")
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

  const [coPart, hodPart] = submissionStatus.includes("|") 
    ? submissionStatus.split("|") 
    : [submissionStatus, ""]

  if (comments.length === 0 && coPart !== "rejected" && hodPart !== "rejected") {
    return null
  }

  const isCOApproved = coPart === "approved"
  const isHODApproved = hodPart === "approved"

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center gap-2 border-b pb-2">
        <AlertCircle className="h-4 w-4 text-[#1A5CA1]" />
        <h3 className="text-sm font-bold text-gray-800">Review Timeline</h3>
      </div>

      <div className="space-y-4">
        {/* Course Owner Status Row */}
        <div className={`flex items-start gap-3 p-3 rounded-lg border ${
          isCOApproved ? "bg-green-50 border-green-200" : coPart === "rejected" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
        }`}>
          {isCOApproved ? (
            <div className="bg-green-100 p-1.5 rounded-full"><CheckCircle className="h-4 w-4 text-green-600" /></div>
          ) : coPart === "rejected" ? (
            <div className="bg-red-100 p-1.5 rounded-full"><XCircle className="h-4 w-4 text-red-600" /></div>
          ) : (
            <div className="bg-gray-200 p-1.5 rounded-full"><div className="h-4 w-4" /></div>
          )}
          <div>
            <p className={`text-sm font-semibold ${isCOApproved ? "text-green-900" : coPart === "rejected" ? "text-red-900" : "text-gray-900"}`}>
              Course Owner Review
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Status: <span className="font-medium uppercase">{coPart || "Pending"}</span>
            </p>
          </div>
        </div>

        {/* HOD Status Row */}
        <div className={`flex items-start gap-3 p-3 rounded-lg border ${
          isHODApproved ? "bg-green-50 border-green-200" : hodPart === "rejected" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
        }`}>
          {isHODApproved ? (
            <div className="bg-green-100 p-1.5 rounded-full"><CheckCircle className="h-4 w-4 text-green-600" /></div>
          ) : hodPart === "rejected" ? (
            <div className="bg-red-100 p-1.5 rounded-full"><XCircle className="h-4 w-4 text-red-600" /></div>
          ) : (
            <div className="bg-gray-200 p-1.5 rounded-full"><div className="h-4 w-4" /></div>
          )}
          <div>
            <p className={`text-sm font-semibold ${isHODApproved ? "text-green-900" : hodPart === "rejected" ? "text-red-900" : "text-gray-900"}`}>
              HOD Review
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Status: <span className="font-medium uppercase">{hodPart || "Pending"}</span>
            </p>
          </div>
        </div>

        {/* Rejection Comments (if any) */}
        {comments.length > 0 ? (
          <div className="pt-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Detailed Feedback</p>
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="relative pl-4 border-l-2 border-red-200 ml-2">
                  <div className="absolute w-2.5 h-2.5 bg-red-400 rounded-full -left-[6px] top-1.5 border-2 border-white shadow-sm" />
                  <div className="bg-white border rounded-md p-3 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-bold text-gray-800">
                        {Array.isArray(comment.users) ? comment.users[0]?.name : (comment.users as any)?.name || "Reviewer"}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed italic">"{comment.comment}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (coPart === "rejected" || hodPart === "rejected") && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
            No feedback comments have been added yet for this rejected submission.
          </div>
        )}
      </div>
    </div>
  )
}
