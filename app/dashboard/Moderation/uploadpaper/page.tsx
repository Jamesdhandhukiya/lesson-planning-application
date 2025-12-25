"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow, Loader2, Upload } from "lucide-react";
import { useDashboardContext } from "@/context/DashboardContext";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { fetchFaculty } from "@/app/dashboard/actions/fetchFaculty";
import type { User_Role } from "@/types/types";
import { toast } from "sonner";

export default function ModerationUploadPage() {
  const { roleData, currentRole, setCurrentRole, userData } = useDashboardContext();
  const [assignments, setAssignments] = useState<User_Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRoleChange = (roleName: string) => {
    const selected = roleData.find((r) => r.role_name === roleName);
    if (selected) setCurrentRole(selected);
  };

  const filteredAssignments = useMemo(() => {
    if (currentRole?.role_name !== "Faculty") return [];
    return assignments.filter(
      (a) => a.users?.auth_id === userData?.auth_id && a.role_name === "Faculty" && a.subjects
    );
  }, [assignments, currentRole?.role_name, userData?.auth_id]);

  useEffect(() => {
    const load = async () => {
      if (!userData?.auth_id || !currentRole) return;
      setIsLoading(true);
      try {
        const data = await fetchFaculty();
        setAssignments(data || []);
      } catch (err) {
        console.error("Error loading assignments:", err);
        toast.error("Unable to load subjects.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userData?.auth_id, currentRole]);

  if (!currentRole) {
    return (
      <div className="min-h-screen bg-white pt-3 px-5">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-3 px-5">
      <div className="flex justify-between items-center px-5 py-3 border-2 rounded-lg">
        <div>
          <p className="text-[#1A5CA1] font-manrope font-bold text-[25px] leading-[25px]">
            Moderation - Upload
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Select a subject to view its CIE details before uploading.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <Link href="/dashboard/Moderation" className="w-full">
            <Button size="sm" className="w-full">
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {currentRole.role_name !== "Faculty" ? (
          <div className="text-center py-12 text-gray-600">
            Switch to Faculty role to view assigned subjects.
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading subjects...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            No subjects assigned. Please contact your HOD.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssignments.map((subj) => (
              <Card
                key={subj.id}
                className="hover:shadow-lg transition cursor-pointer"
                onClick={() => router.push(`/dashboard/Moderation/uploadpaper/${subj.id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-[#1A5CA1] flex items-center gap-2">
                    <Workflow className="h-5 w-5" />
                    {subj.subjects?.name || "Subject"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-[#1A5CA1] text-white">
                      {subj.subjects?.code || "Code"}
                    </Badge>
                    <Badge variant="outline" className="bg-gray-100 text-gray-800">
                      Sem {subj.subjects?.semester ?? "-"}
                    </Badge>
                    <Badge variant="outline">
                      {((subj as any).subjects?.lesson_plan_status || "draft").replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-gray-600">
                    Dept: {subj.subjects?.departments?.name || "N/A"}
                  </p>
                  <p className="text-gray-600">
                    Division: {subj.division || "N/A"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
