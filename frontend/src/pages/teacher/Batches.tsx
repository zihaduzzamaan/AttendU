import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BookOpen, Plus, Trash2, GraduationCap, Search, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

const Batches = () => {
    const { user } = useAuth();
    const { toast: useToastHook } = useToast();
    const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<any | null>(null);
    const [classStudents, setClassStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingStudents, setIsFetchingStudents] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Hierarchical Data for Add Dialog
    const [faculties, setFaculties] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [catalogSubjects, setCatalogSubjects] = useState<any[]>([]); // New Catalog Subjects

    // Form state
    const [selectedFacultyId, setSelectedFacultyId] = useState("");
    const [selectedBatchId, setSelectedBatchId] = useState("");
    const [selectedSectionId, setSelectedSectionId] = useState("");
    const [selectedCatalogId, setSelectedCatalogId] = useState(""); // Replaces selectedSubjectId

    useEffect(() => {
        fetchData();
        fetchStructure();
    }, [user?.teacher_id]);

    const fetchData = async () => {
        if (!user?.teacher_id) {
            console.warn('⚠️ Batches: No teacher_id found');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await api.getTeacherAssignments(user.teacher_id);
            setAssignedClasses(data || []);
        } catch (e) {
            useToastHook({ title: "Error", description: "Failed to load assigned classes", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStructure = async () => {
        try {
            const [f, b, s] = await Promise.all([
                api.getFaculties(),
                api.getBatches(),
                api.getSections(),
            ]);
            setFaculties(f || []);
            setBatches(b || []);
            setSections(s || []);
        } catch (e) {
            console.error("Failed to load structure", e);
        }
    };

    // Filter Logic
    const filteredBatches = batches.filter(b => b.faculty_id === selectedFacultyId);
    const filteredSections = sections.filter(s => s.batch_id === selectedBatchId);

    // When Batch is selected, fetch compatible subjects from Course Catalog
    useEffect(() => {
        if (selectedBatchId) {
            const batch = batches.find(b => b.id === selectedBatchId);
            if (batch) {
                // Fetch catalog for this Faculty + Semester
                const fetchCatalog = async () => {
                    try {
                        const data = await api.getCourseCatalog(batch.faculty_id, batch.current_semester);
                        setCatalogSubjects(data || []);
                    } catch (e) {
                        console.error("Failed to fetch catalog subjects", e);
                        setCatalogSubjects([]);
                    }
                };
                fetchCatalog();
            }
        } else {
            setCatalogSubjects([]);
        }
    }, [selectedBatchId, batches]);


    const handleAddAssignment = async () => {
        if (!selectedCatalogId || !selectedSectionId || !user?.teacher_id) {
            toast.error("Please select all fields");
            return;
        }

        const alreadyAssigned = assignedClasses.some(a =>
            a.course_catalog_id === selectedCatalogId && a.section_id === selectedSectionId
        );
        if (alreadyAssigned) {
            toast.error("You are already assigned to this subject/section");
            return;
        }

        setIsSaving(true);
        try {
            await api.createTeacherAssignment(user.teacher_id, selectedSectionId, selectedCatalogId);
            toast.success("Assignment added!");
            setIsDialogOpen(false);
            resetForm();
            fetchData();
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Failed to add assignment");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAssignment = async (assignmentId: string) => {
        if (!confirm("Remove this assignment?")) return;
        try {
            await api.deleteTeacherAssignment(assignmentId);
            toast.success("Assignment removed");
            fetchData();
        } catch (e) {
            toast.error("Failed to remove assignment");
        }
    };

    const resetForm = () => {
        setSelectedFacultyId("");
        setSelectedBatchId("");
        setSelectedSectionId("");
        setSelectedCatalogId("");
    };

    const handleClassClick = async (assignment: any) => {
        setSelectedClass(assignment);
        setIsFetchingStudents(true);
        try {
            const students = await api.getStudentsBySection(assignment.section_id);
            setClassStudents(students || []);
        } catch (e) {
            useToastHook({ title: "Error", description: "Failed to load students", variant: "destructive" });
        } finally {
            setIsFetchingStudents(false);
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Batches</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your subject assignments
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 w-full sm:w-auto">
                            <Plus className="w-4 h-4" />
                            <span>Add Assignment</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-4">
                        <DialogHeader>
                            <DialogTitle>Add Subject Assignment</DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm">
                                Select the subject you want to teach
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 py-2">
                            <div className="grid gap-2">
                                <Label className="text-sm">Department</Label>
                                <Select value={selectedFacultyId} onValueChange={(v) => { setSelectedFacultyId(v); setSelectedBatchId(""); setSelectedSectionId(""); setSelectedCatalogId(""); }}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {faculties.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-sm">Batch</Label>
                                <Select value={selectedBatchId} onValueChange={(v) => { setSelectedBatchId(v); setSelectedSectionId(""); setSelectedCatalogId(""); }} disabled={!selectedFacultyId}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select Batch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} (Sem {b.current_semester})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-sm">Section</Label>
                                <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedBatchId}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select Section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-sm">Subject (from Catalog)</Label>
                                <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId} disabled={!selectedBatchId}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {catalogSubjects.length === 0 ? (
                                            <SelectItem value="none" disabled>No subjects found for this semester</SelectItem>
                                        ) : (
                                            catalogSubjects.map(sub => (
                                                <SelectItem key={sub.id} value={sub.id}>
                                                    {sub.subject_name} ({sub.subject_code})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 sm:flex-none">Cancel</Button>
                            <Button onClick={handleAddAssignment} disabled={!selectedCatalogId || !selectedSectionId || isSaving} className="flex-1 sm:flex-none">
                                {isSaving ? "Adding..." : "Add"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search your classes..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {
                !isLoading ? (
                    assignedClasses.length > 0 ? (
                        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {assignedClasses
                                .filter(a =>
                                    a.course_catalog?.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    a.course_catalog?.subject_code?.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((assignment) => (
                                    <Card
                                        key={assignment.id}
                                        className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group"
                                    >
                                        <CardHeader className="space-y-1 pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <CardTitle className="flex items-center gap-2 text-base md:text-lg leading-tight">
                                                    <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
                                                    <span className="truncate">{assignment.course_catalog?.subject_name}</span>
                                                </CardTitle>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteAssignment(assignment.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                            <CardDescription className="text-xs truncate">
                                                {assignment.course_catalog?.subject_code}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-0" onClick={() => handleClassClick(assignment)}>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-xs sm:text-sm">
                                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    <span className="font-medium truncate">
                                                        {assignment.section?.batch?.name}
                                                        <span className="text-muted-foreground font-normal ml-1">
                                                            (Sem {assignment.section?.batch?.current_semester})
                                                        </span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                                    <Users className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">Section {assignment.section?.name}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-14 h-14 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center">
                                        <BookOpen className="w-7 h-7 md:w-8 md:h-8 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1 px-4">
                                        <h3 className="font-semibold text-base md:text-lg">No Assignments Yet</h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Tap "Add Assignment" to start
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                ) : (
                    <div className="py-12 text-center text-sm">Loading...</div>
                )
            }

            <Dialog open={!!selectedClass} onOpenChange={(open) => !open && setSelectedClass(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] mx-4">
                    <DialogHeader>
                        <DialogTitle className="text-base md:text-lg">Student List</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm line-clamp-2">
                            {selectedClass && (
                                <>
                                    {selectedClass.course_catalog?.subject_name} - {selectedClass.section?.batch?.name} ({selectedClass.section?.name})
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="border rounded-md mt-2 max-h-[60vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background">
                                <TableRow>
                                    <TableHead className="text-xs sm:text-sm">ID</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                                    <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Email</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!isFetchingStudents ? (
                                    classStudents.length > 0 ? (
                                        classStudents.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium text-xs sm:text-sm">{student.student_id}</TableCell>
                                                <TableCell className="text-xs sm:text-sm max-w-[120px] sm:max-w-none truncate">{student.profile?.name}</TableCell>
                                                <TableCell className="hidden sm:table-cell text-xs sm:text-sm truncate max-w-[150px]">{student.profile?.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={student.is_active ? 'default' : 'secondary'} className="text-[10px] sm:text-xs px-1.5 py-0">
                                                        {student.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-xs sm:text-sm text-muted-foreground">
                                                No students found
                                            </TableCell>
                                        </TableRow>
                                    )
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-xs sm:text-sm text-muted-foreground">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default Batches;
