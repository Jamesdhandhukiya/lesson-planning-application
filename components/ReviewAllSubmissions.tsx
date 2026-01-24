"use client"

import { useEffect, useState } from "react"
import { Loader2, Eye, Download, CheckCircle, XCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/utils/supabase/client"
import { toast } from "sonner"
import { fetchPapersForReview, updateSubmissionStatus, rejectSubmissionWithComment } from "@/app/dashboard/actions/fetchForReview"
import { fetchLessonPlanBySubjectId } from "@/app/dashboard/actions/fetchLessonPlanBySubject"
import { getSignedUrl } from "@/app/dashboard/actions/getSignedUrl"
import { ExamDetailsModal } from "@/components/modals/ExamDetailsModal"
import { RejectionCommentModal } from "@/components/modals/RejectionCommentModal"

interface Submission {
  id: string
  subject_id: string
  faculty_id: string
  cie_index: number
  file_name: string
  file_type: string
  storage_path: string
  created_at: string
  status: string
  feedback?: string
  subjects: any
  users: any
}

interface LessonPlanData {
  cies?: any[]
  generalDetails?: any
  units?: any[]
  practicals?: any[]
}

interface ReviewAllSubmissionsProps {
  userId: string
}

export function ReviewAllSubmissions({ userId }: ReviewAllSubmissionsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [lessonPlanCache, setLessonPlanCache] = useState<Record<string, LessonPlanData>>({})
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [showExamDetails, setShowExamDetails] = useState(false)
  const [approveLoading, setApproveLoading] = useState<string | null>(null)
  const [rejectLoading, setRejectLoading] = useState<string | null>(null)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectionSubmission, setRejectionSubmission] = useState<Submission | null>(null)

  useEffect(() => {
    const loadSubmissions = async () => {
      setIsLoading(true)
      try {
        console.log("Loading submissions for user:", userId)
        const result = await fetchPapersForReview(userId)
        console.log("Fetch result:", result)
        if (result.success) {
          console.log("Submissions loaded:", result.data?.length)
          setSubmissions(result.data as Submission[])
        } else {
          console.log("Fetch error:", result.error)
          toast.error(result.error || "Failed to load submissions")
          setSubmissions([])
        }
      } catch (error) {
        console.error("Error loading submissions:", error)
        toast.error("Unable to load submissions for review")
        setSubmissions([])
      } finally {
        setIsLoading(false)
      }
    }

    loadSubmissions()
  }, [userId])

  const loadLessonPlan = async (subjectId: string) => {
    if (lessonPlanCache[subjectId]) return lessonPlanCache[subjectId]

    try {
      const result = await fetchLessonPlanBySubjectId(subjectId)
      if (result?.success && result.data) {
        const data = result.data
        const formContent = data.form || data
        const lessonPlan: LessonPlanData = {
          cies: formContent.cies || [],
          generalDetails: formContent.generalDetails || {},
          units: formContent.units || formContent.unitPlanning?.units || [],
          practicals: formContent.practicals || formContent.practicalPlanning?.practicals || [],
        }
        setLessonPlanCache((prev) => ({ ...prev, [subjectId]: lessonPlan }))
        return lessonPlan
      } else {
        console.error("Failed to load lesson plan:", result?.error)
      }
    } catch (error) {
      console.error("Error loading lesson plan:", error)
    }
    return undefined
  }

  const handleViewExamDetails = async (submission: Submission) => {
    setSelectedSubmission(submission)
    try {
      const lessonPlan = await loadLessonPlan(submission.subject_id)
      if (!lessonPlan) {
        toast.error("Unable to load exam details - lesson plan not found")
        return
      }
      setShowExamDetails(true)
    } catch (error) {
      console.error("Error loading exam details:", error)
      toast.error("Failed to load exam details")
    }
  }

  const handleViewPaper = async (submission: Submission) => {
    try {
      const result = await getSignedUrl(submission.storage_path)
      if (result.success && result.signedUrl) {
        window.open(result.signedUrl, "_blank")
        toast.success("Opening paper in new tab...")
      } else {
        toast.error("Failed to open paper: " + (result.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Error opening paper:", error)
      toast.error("Failed to open paper")
    }
  }

  const handleApprove = async (submission: Submission) => {
    setApproveLoading(submission.id)
    try {
      const result = await updateSubmissionStatus(submission.id, "approved")
      if (result.success) {
        toast.success("Paper approved successfully!")
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submission.id ? { ...s, status: "approved" } : s
          )
        )
      } else {
        toast.error(result.error || "Failed to approve")
      }
    } catch (error) {
      console.error("Approve error:", error)
      toast.error("An error occurred")
    } finally {
      setApproveLoading(null)
    }
  }

  const handleReject = async (submission: Submission) => {
    setRejectionSubmission(submission)
    setShowRejectionModal(true)
  }

  const handleRejectionCommentSubmit = async (submissionId: string, comment: string) => {
    try {
      const result = await rejectSubmissionWithComment(submissionId, comment, userId)
      if (result.success) {
        // Update local state
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId ? { ...s, status: "rejected" } : s
          )
        )
        return { success: true }
      } else {
        return { success: false, error: result.error || "Failed to reject paper" }
      }
    } catch (error) {
      console.error("Error rejecting paper:", error)
      return { success: false, error: "An error occurred" }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-600 py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading submissions for review...
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No submissions yet</p>
        <p className="text-sm text-gray-500">Papers uploaded by faculty will appear here</p>
      </div>
    )
  }

  // Group submissions by subject
  const groupedBySubject: Record<string, Submission[]> = {}
  submissions.forEach((sub) => {
    const subjectData = Array.isArray(sub.subjects) ? sub.subjects[0] : sub.subjects
    const key = subjectData?.id || sub.subject_id
    if (!groupedBySubject[key]) {
      groupedBySubject[key] = []
    }
    groupedBySubject[key].push(sub)
  })

  return (
    <>
      <div className="space-y-6 py-8  mx-auto">
        {Object.entries(groupedBySubject).map(([subjectId, subjectSubmissions]) => {
          const firstSub = subjectSubmissions[0]
          const subjectData = Array.isArray(firstSub.subjects) ? firstSub.subjects[0] : firstSub.subjects
          return (
            <Card key={subjectId}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#1A5CA1]" />
                  {subjectData?.name} ({subjectData?.code})
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Semester {subjectData?.semester} • Department: {subjectData?.departments?.[0]?.name || subjectData?.departments?.name}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subjectSubmissions.map((submission) => {
                    const userData = Array.isArray(submission.users) ? submission.users[0] : submission.users
                    return (
                      <div
                        key={submission.id}
                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      >
                        {/* Single line row */}
                        <div className="flex flex-wrap items-center gap-4 justify-between">
                          {/* Left: Subject & Faculty */}
                          <div className="flex-1 min-w-[200px]">
                            <p className="text-sm font-semibold">
                              {userData?.name} • CIE {submission.cie_index + 1}
                            </p>
                            <p className="text-xs text-gray-600">{submission.file_name}</p>
                          </div>

                          {/* Middle: Status & Info */}
                          <div className="flex items-center gap-3">
                            <Badge
                              className={
                                submission.status === "approved"
                                  ? "bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700"
                                  : submission.status === "rejected"
                                    ? "bg-red-100 text-red-700 hover:bg-red-100 hover:text-red-700"
                                    : submission.status === "sent-for-review"
                                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-700"
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-100 hover:text-gray-700"
                              }
                            >
                              {submission.status || "pending"}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(submission.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Right: Action Buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewExamDetails(submission)}
                              className="text-xs px-2 py-1"
                            >
                              Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewPaper(submission)}
                              className="text-xs px-2 py-1"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>

                            {submission.status === "sent-for-review" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                                  onClick={() => handleApprove(submission)}
                                  disabled={approveLoading === submission.id}
                                >
                                  {approveLoading === submission.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs px-2 py-1"
                                  onClick={() => handleReject(submission)}
                                  disabled={showRejectionModal && rejectionSubmission?.id === submission.id}
                                >
                                  {showRejectionModal && rejectionSubmission?.id === submission.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div >

      {/* Exam Details Modal */}
      {
        selectedSubmission && (
          <ExamDetailsModal
            isOpen={showExamDetails}
            onClose={() => {
              setShowExamDetails(false)
              setSelectedSubmission(null)
            }}
            examDetails={lessonPlanCache[selectedSubmission.subject_id]?.cies?.[selectedSubmission.cie_index] || {}}
            general={lessonPlanCache[selectedSubmission.subject_id]?.generalDetails}
            units={lessonPlanCache[selectedSubmission.subject_id]?.units}
            practicals={lessonPlanCache[selectedSubmission.subject_id]?.practicals}
            cieIndex={selectedSubmission.cie_index}
            subjectName={Array.isArray(selectedSubmission.subjects) ? selectedSubmission.subjects[0]?.name : selectedSubmission.subjects?.name}
          />
        )
      }

      {/* Rejection Comment Modal */}
      {
        rejectionSubmission && (
          <RejectionCommentModal
            isOpen={showRejectionModal}
            onClose={() => {
              setShowRejectionModal(false)
              setRejectionSubmission(null)
            }}
            submissionId={rejectionSubmission.id}
            facultyName={Array.isArray(rejectionSubmission.users) ? rejectionSubmission.users[0]?.name : rejectionSubmission.users?.name}
            fileName={rejectionSubmission.file_name}
            onCommentSubmitted={() => {
              setShowRejectionModal(false)
              setRejectionSubmission(null)
            }}
            onSubmitComment={handleRejectionCommentSubmit}
          />
        )
      }

    </>
  )
}
