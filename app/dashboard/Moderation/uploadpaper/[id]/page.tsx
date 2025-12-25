"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Workflow, FileText, ArrowLeft, Upload, MessageSquare, X } from "lucide-react";
import { fetchViewLP } from "@/app/dashboard/actions/fetchViewLP";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";

type CieItem = {
  type?: string;
  date?: string;
  duration?: number;
  marks?: number;
  blooms_taxonomy?: string[];
  evaluation_pedagogy?: string;
  other_pedagogy?: string;
  co_mapping?: string[];
  pso_mapping?: string[];
  peo_mapping?: string[];
  skill_mapping?: { skill?: string; details?: string }[] | string[];
  units_covered?: string[];
  practicals_covered?: string[];
};

export default function ModerationSubjectPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const [division, setDivision] = useState("");
  const [department, setDepartment] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [termStartDate, setTermStartDate] = useState("");
  const [termEndDate, setTermEndDate] = useState("");
  const [general, setGeneral] = useState<any>({});
  const [units, setUnits] = useState<any[]>([]);
  const [practicals, setPracticals] = useState<any[]>([]);
  const [cies, setCies] = useState<CieItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const channelRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileMap, setFileMap] = useState<Record<number, File | null>>({});
  const [selectedFileName, setSelectedFileName] = useState<Record<number, string>>({});
  const [attachmentsMap, setAttachmentsMap] = useState<Record<number, { id: string; name: string }[]>>({});
  const [commentsListMap, setCommentsListMap] = useState<Record<number, { id: string; text: string; author?: string; createdAt: string }[]>>({});

  const activeCie = useMemo(() => cies[activeIndex], [cies, activeIndex]);

  // Helper function to calculate academic year from term start date
  const getAcademicYear = (dateString: string) => {
    if (!dateString) return "N/A";
    const parts = dateString.split("-");
    if (parts.length === 3) {
      // Handle DD-MM-YYYY format
      const year = Number.parseInt(parts[2], 10);
      return `${year}-${String((year % 100) + 1).padStart(2, "0")}`;
    }
    // Try YYYY-MM-DD format
    if (parts.length === 3 && parts[0].length === 4) {
      const year = Number.parseInt(parts[0], 10);
      return `${year}-${String((year % 100) + 1).padStart(2, "0")}`;
    }
    return "N/A";
  };

  useEffect(() => {
    const load = async () => {
      const subjectId = params?.id as string;
      if (!subjectId) {
        setError("Invalid subject ID");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchViewLP(subjectId);
        if (!result?.success || !result.data) {
          setError("No lesson plan found for this subject.");
          return;
        }
        const assignment = result.userRoleData as any || {};
        const formRow = result.data as any || {};
        const form = formRow.form || formRow;
        const subjectsData = formRow.subjects || assignment.subjects || form.subjects || {};
        const metadata = subjectsData.metadata || form.metadata || {};
        
        setSubjectName(assignment.subjects?.name || subjectsData.name || "");
        setSubjectCode(assignment.subjects?.code || subjectsData.code || "");
        setFacultyName(assignment.users?.name || "");
        setFacultyEmail(assignment.users?.email || "");
        setDivision(assignment.division || "");
        setDepartment(
          assignment.departments?.name
            ? `${assignment.departments.name}${assignment.departments.abbreviation_depart ? ` (${assignment.departments.abbreviation_depart})` : ""}`
            : assignment.subjects?.departments?.name || subjectsData.departments?.name || ""
        );
        
        // Extract term dates from metadata or generalDetails
        const startDate = metadata.term_start_date || form.generalDetails?.term_start_date || form.generalDetails?.termStartDate || "";
        const endDate = metadata.term_end_date || form.generalDetails?.term_end_date || form.generalDetails?.termEndDate || "";
        
        setTermStartDate(startDate);
        setTermEndDate(endDate);
        
        // Calculate academic year from term start date
        const calculatedAcademicYear = startDate ? getAcademicYear(startDate) : (assignment.academic_year || "");
        setAcademicYear(calculatedAcademicYear);
        
        setGeneral(form.generalDetails || {});
        setUnits(form.units || form.unitPlanning?.units || []);
        setPracticals(form.practicals || form.practicalPlanning?.practicals || []);
        setCies(form.cies || []);
        setActiveIndex(0);

        // Setup realtime subscription to keep moderation view in sync
        const facultyId = assignment.users?.id;
        const assignedSubjectId = assignment.subjects?.id || formRow.subject_id || subjectsData.id;
        if (facultyId && assignedSubjectId) {
          try {
            const channel = supabase
              .channel(`forms_${facultyId}_${assignedSubjectId}`)
              .on(
                "postgres_changes",
                {
                  event: "*",
                  schema: "public",
                  table: "forms",
                  filter: `faculty_id=eq.${facultyId},subject_id=eq.${assignedSubjectId}`,
                },
                (payload: any) => {
                  const ev = payload.eventType || payload.type || payload.event;
                  // On insert/update, refresh relevant pieces from payload.new
                  if (ev === "INSERT" || ev === "UPDATE") {
                    const newRow = payload.new || payload.record || payload;
                    if (newRow) {
                      const updatedForm = newRow.form || newRow;
                      setCies(updatedForm.cies || []);
                      setGeneral(updatedForm.generalDetails || {});
                      setUnits(updatedForm.units || updatedForm.unitPlanning?.units || []);
                      setPracticals(updatedForm.practicals || updatedForm.practicalPlanning?.practicals || []);
                      setActiveIndex(0);
                      toast.success("CIE data updated");
                    }
                  }
                }
              )
              .subscribe();
            // store channel for cleanup
            channelRef.current = channel;
          } catch (err) {
            console.warn("Realtime subscription failed", err);
          }
        }
      } catch (err) {
        console.error("Error loading subject moderation view:", err);
        setError("Failed to load data");
        toast.error("Unable to load lesson-plan data.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
    return () => {
      // cleanup realtime channel
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (e) {
          // ignore
        }
        channelRef.current = null;
      }
    };
  }, [params?.id]);

  return (
    <div className="min-h-screen bg-white pt-3 px-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[#1A5CA1] font-manrope font-bold text-[25px] leading-[25px]">
            {subjectName || "Subject"} {subjectCode ? `(${subjectCode})` : ""}
          </p>
          <p className="text-sm text-gray-600 mt-1">Moderation - CIE overview</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/Moderation")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Subjects
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading lesson-plan details...
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#1A5CA1]" />
                General & Faculty Info
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Subject</p>
                <p className="font-semibold text-[#1A5CA1]">
                  {subjectName || "N/A"} {subjectCode ? `(${subjectCode})` : ""}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Department</p>
                <p className="font-semibold">
                  {department || general?.department || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Faculty</p>
                <p className="font-semibold">{facultyName || "N/A"}</p>
                <p className="text-gray-600">{facultyEmail || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-500">Division</p>
                <p className="font-semibold">{general?.division || division || "N/A"}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-gray-500">Lecture hrs / week</p>
                  <p className="font-semibold">{general?.lecture_hours ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Lab hrs / week</p>
                  <p className="font-semibold">{general?.lab_hours ?? "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-500">Credits</p>
                <p className="font-semibold">{general?.credits ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-500">Term Duration</p>
                <p className="font-semibold">
                  {termStartDate || "N/A"}
                  {termEndDate ? ` to ${termEndDate}` : ""}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Academic Year</p>
                <p className="font-semibold">
                  {academicYear || "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* per-CIE upload/comments will appear below the CIE details */}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-[#1A5CA1]" />
                Continuous Internal Evaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cies.length === 0 ? (
                <p className="text-gray-600 text-sm">No CIE entries found.</p>
              ) : (
                <>
                  <div className="flex overflow-x-auto gap-2 pb-3">
                    {cies.map((cie, idx) => (
                      <Button
                        key={idx}
                        variant={idx === activeIndex ? "default" : "outline"}
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() => setActiveIndex(idx)}
                      >
                        {subjectName || "Subject"} — CIE {idx + 1}
                      </Button>
                    ))}
                  </div>

                  {activeCie && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <p className="text-gray-500">Type</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="bg-blue-50 text-[#1A5CA1]">
                            {activeCie.type || "N/A"}
                          </Badge>
                          {activeCie.marks !== undefined && (
                            <Badge variant="outline">Marks: {activeCie.marks}</Badge>
                          )}
                          {activeCie.duration !== undefined && (
                            <Badge variant="outline">Duration: {activeCie.duration} min</Badge>
                          )}
                        </div>
                      </div>
                      {/* (Per-CIE sub-cards removed — using global upload & comments below) */}

                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-semibold">{activeCie.date || "N/A"}</p>
                      </div>

                      <div>
                        <p className="text-gray-500">Evaluation Pedagogy</p>
                        <p className="font-semibold">
                          {activeCie.evaluation_pedagogy || activeCie.other_pedagogy || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Bloom&apos;s Taxonomy</p>
                        <p className="font-semibold">
                          {activeCie.blooms_taxonomy?.join(", ") || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">CO Mapping</p>
                        <p className="font-semibold">
                          {(() => {
                            const cos = general?.courseOutcomes || [];
                            if (!activeCie.co_mapping || activeCie.co_mapping.length === 0) return "N/A";
                            const mapped = activeCie.co_mapping.map((coId: string) => {
                              const idx = cos.findIndex((co: any) => co.id === coId);
                              return idx >= 0 ? `CO${idx + 1}` : coId;
                            });
                            return mapped.join(", ");
                          })()}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">PSO / PEO Mapping</p>
                        <p className="font-semibold">
                          {activeCie.pso_mapping?.join(", ") || "N/A"}{" "}
                          {activeCie.peo_mapping?.length ? ` | ${activeCie.peo_mapping.join(", ")}` : ""}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <p className="text-gray-500">Skill Mapping</p>
                        <p className="font-semibold">
                          {Array.isArray(activeCie.skill_mapping)
                            ? activeCie.skill_mapping
                                .map((s: any) =>
                                  typeof s === "string" ? s : `${s.skill || "Skill"}${s.details ? ` - ${s.details}` : ""}`
                                )
                                .join(", ")
                            : "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Units Covered</p>
                        <p className="font-semibold">
                          {(() => {
                            if (!activeCie.units_covered || activeCie.units_covered.length === 0) return "N/A";
                            const names = activeCie.units_covered.map((u) => {
                              const found = units.find((unit: any) => unit.id === u);
                              return found?.unit_name || u;
                            });
                            return names.join(", ");
                          })()}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Practicals Covered</p>
                        <p className="font-semibold">
                          {(() => {
                            if (!activeCie.practicals_covered || activeCie.practicals_covered.length === 0) return "N/A";
                            const names = activeCie.practicals_covered.map((p) => {
                              const found = practicals.find((pr: any) => pr.id === p);
                              return found?.practical_aim || p;
                            });
                            return names.join(", ");
                          })()}
                        </p>
                      </div>

                      {/* Small per-CIE upload box + comments list (specific to this CIE) */}
                      <div className="md:col-span-2">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-2">
                            <div className="border rounded-md p-3 bg-gray-50">
                              <p className="text-sm font-semibold text-gray-700 mb-2">Upload Files</p>
                              <div className="flex flex-col gap-3">
                                <div className="relative">
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0] || null;
                                      if (!f) return;
                                      const allowed = ["pdf","doc","docx","xls","xlsx","png","jpg","jpeg","webp"];
                                      const name = f.name || "";
                                      const ext = name.split('.').pop()?.toLowerCase() || "";
                                      if (!allowed.includes(ext)) {
                                        toast.error("Invalid file type. Allowed: pdf, doc, docx, xls, xlsx, png, jpg, jpeg, webp");
                                        e.currentTarget.value = "";
                                        return;
                                      }
                                      setFileMap(prev => ({ ...prev, [activeIndex]: f }));
                                      setSelectedFileName(prev => ({ ...prev, [activeIndex]: name }));
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                  />
                                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200">
                                    {selectedFileName[activeIndex] ? (
                                      <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-2">
                                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 mb-1">File Selected</p>
                                        <p className="text-sm text-gray-600 truncate max-w-full">{selectedFileName[activeIndex]}</p>
                                      </div>
                                    ) : (
                                      <>
                                        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-600 mb-1">
                                          <span className="font-medium text-blue-600">Click to choose file</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG, WEBP (max 10MB)
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex justify-center">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const file = fileMap[activeIndex];
                                      if (!file) {
                                        toast.error("Select a file to upload for this CIE.");
                                        return;
                                      }
                                      const id = String(Date.now());
                                      setAttachmentsMap(prev => {
                                        const list = prev[activeIndex] ? [...prev[activeIndex]] : [];
                                        list.push({ id, name: file.name });
                                        return { ...prev, [activeIndex]: list };
                                      });
                                      toast.success(`File attached to CIE ${activeIndex + 1}.`);
                                      setFileMap(prev => ({ ...prev, [activeIndex]: null }));
                                      setSelectedFileName(prev => ({ ...prev, [activeIndex]: "" }));
                                      if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Attach File
                                  </Button>
                                </div>

                                <div>
                                  <div className="flex flex-col gap-2">
                                    {(attachmentsMap[activeIndex] || []).map((att) => (
                                      <div key={att.id} className="flex items-center justify-between bg-white border rounded px-3 py-2">
                                        <div className="text-sm text-gray-700">{att.name}</div>
                                        <button
                                          onClick={() => setAttachmentsMap(prev => ({
                                            ...prev,
                                            [activeIndex]: (prev[activeIndex] || []).filter(a => a.id !== att.id)
                                          }))}
                                          className="text-gray-500 hover:text-red-600"
                                          aria-label="Remove file"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    ))}
                                    {(attachmentsMap[activeIndex] || []).length === 0 && (
                                      <div className="text-sm text-gray-600">No files attached for this CIE.</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-md p-3 bg-gray-50">
                              <p className="text-sm font-semibold text-gray-700 mb-2">Comments (HOD / Course Owner)</p>
                              <div className="flex flex-col gap-2">
                                {(commentsListMap[activeIndex] || []).map(c => (
                                  <div key={c.id} className="text-sm text-gray-700">
                                    <div className="text-gray-800 font-medium">{c.author || 'HOD'}</div>
                                    <div className="text-gray-600">{c.text}</div>
                                    <div className="text-xs text-gray-400">{c.createdAt}</div>
                                  </div>
                                ))}
                                {(commentsListMap[activeIndex] || []).length === 0 && (
                                  <div className="text-sm text-gray-600">No comments yet.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-6 mb-8">
            <Button variant="outline" onClick={() => {
              toast.info("Sending for review...");
              // Add send for review logic here
            }}>
              Send for Review
            </Button>
            <Button onClick={() => {
              toast.success("Submitted successfully!");
              // Add submit logic here
            }}>
              Submit
            </Button>
          </div>

        </div>
      )}
    </div>
  );
}

