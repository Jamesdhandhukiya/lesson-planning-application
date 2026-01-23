"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface ExamDetails {
  type?: string
  date?: string
  duration?: number
  marks?: number
  blooms_taxonomy?: string[]
  evaluation_pedagogy?: string
  other_pedagogy?: string
  co_mapping?: string[]
  pso_mapping?: string[]
  peo_mapping?: string[]
  skill_mapping?: any[]
  units_covered?: string[]
  practicals_covered?: string[]
}

interface ExamDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  examDetails: ExamDetails
  general?: any
  units?: any[]
  practicals?: any[]
  cieIndex?: number
  subjectName?: string
}

export function ExamDetailsModal({
  isOpen,
  onClose,
  examDetails,
  general = {},
  units = [],
  practicals = [],
  cieIndex = 0,
  subjectName = "",
}: ExamDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {subjectName || "Subject"} - CIE {cieIndex + 1} Details
          </DialogTitle>
          <DialogDescription>
            Complete exam details and assessment information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <Badge variant="outline" className="bg-blue-50 text-[#1A5CA1] mt-1">
                    {examDetails.type || "N/A"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-semibold">{examDetails.date || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-semibold">{examDetails.duration ? `${examDetails.duration} minutes` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Marks</p>
                  <p className="font-semibold">{examDetails.marks || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessment Details */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div>
                <p className="text-sm text-gray-500 mb-1">Evaluation Pedagogy</p>
                <p className="font-semibold text-sm">
                  {examDetails.evaluation_pedagogy || examDetails.other_pedagogy || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Bloom&apos;s Taxonomy</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {examDetails.blooms_taxonomy && examDetails.blooms_taxonomy.length > 0 ? (
                    examDetails.blooms_taxonomy.map((level, idx) => (
                      <Badge key={idx} variant="outline">
                        {level}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-600">N/A</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">CO Mapping</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {examDetails.co_mapping && examDetails.co_mapping.length > 0 ? (
                    examDetails.co_mapping.map((coId: string, idx) => {
                      const cos = general?.courseOutcomes || []
                      const coIdx = cos.findIndex((co: any) => co.id === coId)
                      return (
                        <Badge key={idx} variant="outline">
                          {coIdx >= 0 ? `CO${coIdx + 1}` : coId}
                        </Badge>
                      )
                    })
                  ) : (
                    <span className="text-sm text-gray-600">N/A</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mapping Details */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div>
                <p className="text-sm text-gray-500 mb-1">PSO Mapping</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {examDetails.pso_mapping && examDetails.pso_mapping.length > 0 ? (
                    examDetails.pso_mapping.map((pso, idx) => (
                      <Badge key={idx} variant="outline">
                        {pso}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-600">N/A</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">PEO Mapping</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {examDetails.peo_mapping && examDetails.peo_mapping.length > 0 ? (
                    examDetails.peo_mapping.map((peo, idx) => (
                      <Badge key={idx} variant="outline">
                        {peo}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-600">N/A</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Units and Practicals */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div>
                <p className="text-sm text-gray-500 mb-1">Units Covered</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {examDetails.units_covered && examDetails.units_covered.length > 0 ? (
                    examDetails.units_covered.map((unitId: string, idx) => {
                      const unit = units.find((u) => u.id === unitId)
                      return (
                        <Badge key={idx} variant="outline">
                          {unit?.unit_name || unitId}
                        </Badge>
                      )
                    })
                  ) : (
                    <span className="text-sm text-gray-600">N/A</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Practicals Covered</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {examDetails.practicals_covered && examDetails.practicals_covered.length > 0 ? (
                    examDetails.practicals_covered.map((practicalId: string, idx) => {
                      const practical = practicals.find((p) => p.id === practicalId)
                      return (
                        <Badge key={idx} variant="outline">
                          {practical?.practical_aim || practicalId}
                        </Badge>
                      )
                    })
                  ) : (
                    <span className="text-sm text-gray-600">N/A</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skill Mapping */}
          {examDetails.skill_mapping && examDetails.skill_mapping.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500 mb-3">Skill Mapping</p>
                <div className="space-y-2">
                  {examDetails.skill_mapping.map((skill: any, idx: number) => {
                    const skillName =
                      typeof skill === "string" ? skill : skill.skill || "Skill"
                    const skillDetails =
                      typeof skill !== "string" ? skill.details : null
                    return (
                      <div
                        key={idx}
                        className="bg-gray-50 p-2 rounded border border-gray-200"
                      >
                        <p className="font-semibold text-sm">{skillName}</p>
                        {skillDetails && (
                          <p className="text-sm text-gray-600">{skillDetails}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
