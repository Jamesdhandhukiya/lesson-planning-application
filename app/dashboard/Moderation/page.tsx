"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Workflow, Eye, Edit, Upload, CheckCircle} from "lucide-react";
import { useDashboardContext } from "@/context/DashboardContext";
import { useMemo } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { RoleDataItem } from "@/context/DashboardContext";


export default function ModerationPage() {
  const { roleData, currentRole, setCurrentRole } = useDashboardContext();

  if (!currentRole) {
    return (
      <div className="min-h-screen bg-white pt-3 px-5">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const handleRoleChange = (roleName: string) => {
    const selected = roleData.find((r) => r.role_name === roleName);
    if (selected) setCurrentRole(selected);
  };

  return (
    <div className="min-h-screen bg-white pt-3 px-5">

      {/* Header */}
      <div className="flex justify-between items-center px-5 py-3 border-2 rounded-lg">
        <div>
          <p className="text-[#1A5CA1] font-manrope font-bold text-[25px] leading-[25px]">
            Moderation
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {currentRole.role_name === "Faculty"
              ? "Manage moderation workflows and review items"
              : "Review submissions from faculty members"}
          </p>
        </div>

        {/** Use a deduplicated list of roles like lesson-planning module */}
        <Select value={currentRole.role_name} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={currentRole.role_name === "Faculty" ? "Subject Teacher" : currentRole.role_name} />
          </SelectTrigger>

          <SelectContent>
            {(() => {
              const unique = new Map();
              roleData.forEach((r) => {
                if (!unique.has(r.role_name)) unique.set(r.role_name, r);
              });
              return Array.from(unique.values()).map((role, idx) => (
                <SelectItem value={role.role_name} key={idx}>
                  {role.role_name === "Faculty" ? "Subject Teacher" : role.role_name}
                </SelectItem>
              ));
            })()}
          </SelectContent>
        </Select>
      </div>


      {/* ================== ROLE BASED UI ================== */}
      <div className="mt-6">

        {currentRole.role_name === "Faculty" ? (
          // ================== FACULTY VIEW ==================
          <div className="mt-6 flex flex-col gap-6">

           {/* BOX 1 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm w-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-md bg-blue-50">
                  <Workflow className="h-5 w-5 text-[#1A5CA1]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1A5CA1]">
                  Paper Upload
                </h3>
              </div>

              <p className="text-gray-600 mb-4">Submit & Review moderation papers.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">

                {/* Upload Button */}
                <Link href="/dashboard/Moderation/uploadpaper" className="w-full">
                  <Button size="sm" className="w-full">
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </Link>

                {/* Comments Button */}
                <Link href="/dashboard/Moderation/comments" className="w-full">
                  <Button size="sm" variant="outline" className="w-full">
                    <Eye className="h-4 w-4 mr-1" />
                    Comments
                  </Button>
                </Link>

                <Link href="/dashboard/Moderation/status" className="w-full">
                  <Button size="sm" className="w-full">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Status
                  </Button>
                </Link>

              </div>
            </div>


          </div>

        ) : currentRole.role_name === "HOD" ? (
          // ================== HOD VIEW (ONE BOX ONLY) ==================
          <div className="mt-6 flex flex-col gap-6">

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm w-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-md bg-blue-50">
                  <Workflow className="h-5 w-5 text-[#1A5CA1]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1A5CA1]">
                  Review Submissions
                </h3>
              </div>

              <p className="text-gray-600 mb-4">
                View and verify moderation papers submitted by faculty.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-2">
                <Link href="/dashboard/moderation/reports" className="w-full">
                  <Button size="sm" className="w-full">
                    <Eye className="h-4 w-4 mr-1" />
                    View All Submissions
                  </Button>
                </Link>
              </div>
            </div>

          </div>

        ) : (
          // ================== OTHER ROLES ==================
          <div className="text-center py-8">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-[#1A5CA1] mb-2">Not Allowed</h3>
              <p className="text-gray-600 mb-4">Only Faculty & HOD have access.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
 