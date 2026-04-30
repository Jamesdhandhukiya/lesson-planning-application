"use client"

import { useEffect, useState } from "react"
import { Loader2, Eye, Download, CheckCircle, XCircle, FileText, Clock } from "lucide-react"
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
import { RejectionCommentsHistory } from "@/components/RejectionCommentsHistory"

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
  roleName: string
}

export function ReviewAllSubmissions({ userId, roleName }: ReviewAllSubmissionsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [lessonPlanCache, setLessonPlanCache] = useState<Record<string, LessonPlanData>>({})
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [showExamDetails, setShowExamDetails] = useState(false)
  const [approveLoading, setApproveLoading] = useState<string | null>(null)
  const [rejectLoading, setRejectLoading] = useState<string | null>(null)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectionSubmission, setRejectionSubmission] = useState<Submission | null>(null)
  const [expandedFeedbackSubmissionId, setExpandedFeedbackSubmissionId] = useState<string | null>(null)

  useEffect(() => {
    const loadSubmissions = async () => {
      setIsLoading(true)
      try {
        console.log("Loading submissions for user:", userId)
        const result = await fetchPapersForReview(userId, roleName)
        if (result.success) {
          console.log("Submissions load success. Debug:", result.debug)
          console.log("Submissions loaded count:", result.data?.length)
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
  }, [userId, roleName])

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
      const statusValue = roleName === "Course Owner" ? "CO:approved" : "HOD:approved"
      const result = await updateSubmissionStatus(submission.id, statusValue)
      if (result.success) {
        toast.success("Paper approved successfully!")
        // Get the updated composite status from the response
        const newStatus = (result.data as any)?.[0]?.status || (statusValue.includes("CO:") ? `${statusValue.replace("CO:", "")}|sent-for-review` : `sent-for-review|${statusValue.replace("HOD:", "")}`)
        
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submission.id ? { ...s, status: newStatus } : s
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
      const statusValue = roleName === "Course Owner" ? "CO:rejected" : "HOD:rejected"
      const result = await rejectSubmissionWithComment(submissionId, comment, userId, statusValue)
      if (result.success) {
        // Update local state
        const newStatus = (result.data as any)?.[0]?.status || (statusValue.includes("CO:") ? `${statusValue.replace("CO:", "")}|sent-for-review` : `sent-for-review|${statusValue.replace("HOD:", "")}`)
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId ? { ...s, status: newStatus } : s
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

  const parseCompositeStatus = (status: string) => {
    const normalize = (value: string) => {
      if (!value) return "pending"
      if (value.startsWith("CO:")) return value.replace(/^CO:/, "")
      if (value.startsWith("HOD:")) return value.replace(/^HOD:/, "")
      return value
    }

    if (status?.includes("|")) {
      const [left, right] = status.split("|")
      return {
        coStatus: normalize(left || "pending"),
        hodStatus: normalize(right || "pending"),
      }
    }

    if (status?.startsWith("CO:")) {
      return { coStatus: normalize(status), hodStatus: "pending" }
    }

    if (status?.startsWith("HOD:")) {
      return { coStatus: "pending", hodStatus: normalize(status) }
    }

    return { coStatus: normalize(status || "pending"), hodStatus: normalize(status || "pending") }
  }

  const getReviewerTag = (reviewer: "CO" | "HOD", status: string) => {
    const normalized = status === "sent-for-review" || status === "submitted" || status === "pending" ? "pending" : status
    if (normalized === "approved") {
      return {
        icon: CheckCircle,
        label: reviewer,
        title: `${reviewer} accepted`,
        badgeClass: "bg-green-100 text-green-700",
      }
    }
    if (normalized === "rejected") {
      return {
        icon: XCircle,
        label: reviewer,
        title: `${reviewer} rejected`,
        badgeClass: "bg-red-100 text-red-700",
      }
    }
    return {
      icon: Clock,
      label: reviewer,
      title: `${reviewer} review pending`,
      badgeClass: "bg-gray-100 text-gray-700",
    }
  }

  const getRoleStatus = (status: string) => {
    if (!status) return "pending"
    const parts = status.split("|")
    if (parts.length === 2) {
      return roleName === "Course Owner" ? parts[0] : parts[1]
    }
    return status // Fallback for old simple status
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
                          <div className="flex flex-wrap gap-2 items-center">
                            {(() => {
                              const { coStatus, hodStatus } = parseCompositeStatus(submission.status)
                              const coTag = getReviewerTag("CO", coStatus)
                              const hodTag = getReviewerTag("HOD", hodStatus)
                              const COCmp = coTag.icon
                              const HODCmp = hodTag.icon

                              const bothPending = coStatus === "pending" && hodStatus === "pending"

                              if (bothPending) {
                                return (
                                  <Badge title="Pending review by CO and HOD" className="bg-gray-100 text-gray-700 text-xs py-1 px-2 inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Pending</span>
                                  </Badge>
                                )
                              }

                              return (
                                <>
                                  <Badge title={coTag.title} className={`${coTag.badgeClass} text-xs py-1 px-2 inline-flex items-center gap-1`}>
                                    <COCmp className="h-3.5 w-3.5" />
                                    <span>{coTag.label}</span>
                                  </Badge>
                                  <Badge title={hodTag.title} className={`${hodTag.badgeClass} text-xs py-1 px-2 inline-flex items-center gap-1`}>
                                    <HODCmp className="h-3.5 w-3.5" />
                                    <span>{hodTag.label}</span>
                                  </Badge>
                                </>
                              )
                            })()}
                            <span className="text-xs text-gray-500 mt-1">
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

                            {((roleName === "Course Owner" 
                                ? (submission.status.split("|")[0] || submission.status) 
                                : (submission.status.split("|")[1] || (submission.status.includes("|") ? "sent-for-review" : submission.status))) === "sent-for-review" || 
                              (roleName === "Course Owner" && (submission.status.split("|")[0] || submission.status) === "submitted") ||
                              (roleName === "HOD" && (submission.status.split("|")[1] || submission.status) === "submitted")) && (
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

                            {(() => {
                              const { coStatus, hodStatus } = parseCompositeStatus(submission.status)
                              const isRejectedByAny = coStatus === "rejected" || hodStatus === "rejected"
                              if (!isRejectedByAny) return null
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs px-2 py-1"
                                  onClick={() => setExpandedFeedbackSubmissionId(
                                    expandedFeedbackSubmissionId === submission.id ? null : submission.id
                                  )}
                                >
                                  {expandedFeedbackSubmissionId === submission.id ? "Hide Feedback" : "View Feedback"}
                                </Button>
                              )
                            })()}
                          </div>
                        </div>
                        {expandedFeedbackSubmissionId === submission.id && (
                          <div className="mt-3">
                            <RejectionCommentsHistory submissionId={submission.id} />
                          </div>
                        )}
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
