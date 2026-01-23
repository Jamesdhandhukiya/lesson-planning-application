"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface RejectionCommentModalProps {
  isOpen: boolean
  onClose: () => void
  submissionId: string
  facultyName: string
  fileName: string
  onCommentSubmitted: () => void
  onSubmitComment: (submissionId: string, comment: string) => Promise<{ success: boolean; error?: string }>
}

export function RejectionCommentModal({
  isOpen,
  onClose,
  submissionId,
  facultyName,
  fileName,
  onCommentSubmitted,
  onSubmitComment,
}: RejectionCommentModalProps) {
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error("Please enter a comment before rejecting")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await onSubmitComment(submissionId, comment)
      if (result.success) {
        toast.success("Paper rejected with comments")
        setComment("")
        onCommentSubmitted()
        onClose()
      } else {
        toast.error(result.error || "Failed to submit rejection")
      }
    } catch (error) {
      console.error("Error submitting rejection:", error)
      toast.error("An error occurred while submitting rejection")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setComment("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#1A5CA1]">Reject Paper with Comments</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Paper Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div>
              <p className="text-sm text-gray-600">Faculty</p>
              <p className="font-semibold text-gray-900">{facultyName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">File</p>
              <p className="font-semibold text-gray-900 truncate">{fileName}</p>
            </div>
          </div>

          {/* Comment Box */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Rejection Comments <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Enter your feedback and reasons for rejection. This will be visible to the faculty member when they view the paper status."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[150px] resize-none"
            />
            <p className="text-xs text-gray-500">
              These comments will be stored as history and visible to the faculty member
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={handleSubmit}
            disabled={isSubmitting || !comment.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rejecting...
              </>
            ) : (
              "Reject Paper"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
