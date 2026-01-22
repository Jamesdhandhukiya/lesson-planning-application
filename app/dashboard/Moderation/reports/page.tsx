"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft } from "lucide-react"
import { useDashboardContext } from "@/context/DashboardContext"
import { ReviewAllSubmissions } from "@/components/ReviewAllSubmissions"

export default function ModerationReportsPage() {
  const { userData } = useDashboardContext()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading check
    if (userData) {
      setIsLoading(false)
    }
  }, [userData])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pt-3 px-5">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!userData?.auth_id) {
    return (
      <div className="min-h-screen bg-white pt-3 px-5">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-red-600">Unable to identify user. Please log in again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-3 px-5">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-2 rounded-lg mb-6">
        <div>
          <p className="text-[#1A5CA1] font-manrope font-bold text-[25px] leading-[25px]">
            Review All Submissions
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Review exam papers submitted by faculty for approval
          </p>
        </div>
        <Link href="/dashboard/Moderation">
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="mt-6">
        <ReviewAllSubmissions userId={userData.auth_id} />
      </div>
    </div>
  )
}
