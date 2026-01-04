import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BookOpen, Plus, Trash2, GraduationCap, Search, Calendar, RefreshCw, ChevronRight, School, UserCheck } from "lucide-react";
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

const Classes = () => {
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
            {/* Breadcrumbs - Desktop Only */}
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground px-1 mb-2">
                <School className="w-3 h-3" />
                <span>Teacher Portal</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-foreground font-medium">My Classes</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
                        My Classes
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground font-medium">
                        Manage your academic subjects and view student directories
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold h-11">
                            <Plus className="w-5 h-5" />
                            <span>Add New Assignment</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
                        <div className="p-6 bg-gradient-to-br from-primary/10 via-background to-background border-b">
                            <DialogHeader>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 rounded-lg bg-primary/20">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                    </div>
                                    <DialogTitle className="text-xl font-bold">Add Subject Assignment</DialogTitle>
                                </div>
                                <DialogDescription className="text-sm">
                                    Select the department and subject you want to teach
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-sm font-semibold">Department</Label>
                                <Select value={selectedFacultyId} onValueChange={(v) => { setSelectedFacultyId(v); setSelectedBatchId(""); setSelectedSectionId(""); setSelectedCatalogId(""); }}>
                                    <SelectTrigger className="h-11 bg-muted/30 border-border/50">
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {faculties.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-sm font-semibold">Class / Batch</Label>
                                <Select value={selectedBatchId} onValueChange={(v) => { setSelectedBatchId(v); setSelectedSectionId(""); setSelectedCatalogId(""); }} disabled={!selectedFacultyId}>
                                    <SelectTrigger className="h-11 bg-muted/30 border-border/50">
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} (Sem {b.current_semester})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-sm font-semibold">Section</Label>
                                    <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedBatchId}>
                                        <SelectTrigger className="h-11 bg-muted/30 border-border/50">
                                            <SelectValue placeholder="Section" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-sm font-semibold">Subject</Label>
                                    <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId} disabled={!selectedBatchId}>
                                        <SelectTrigger className="h-11 bg-muted/30 border-border/50">
                                            <SelectValue placeholder="Subject" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogSubjects.length === 0 ? (
                                                <SelectItem value="none" disabled>Empty catalog</SelectItem>
                                            ) : (
                                                catalogSubjects.map(sub => (
                                                    <SelectItem key={sub.id} value={sub.id}>
                                                        {sub.subject_code}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {selectedCatalogId && catalogSubjects.find(s => s.id === selectedCatalogId) && (
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium animate-in fade-in slide-in-from-top-2">
                                    Selected: {catalogSubjects.find(s => s.id === selectedCatalogId)?.subject_name}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-6 bg-muted/20 border-t flex gap-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 font-semibold rounded-lg">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddAssignment}
                                disabled={!selectedCatalogId || !selectedSectionId || isSaving}
                                className="flex-1 font-bold rounded-lg shadow-lg shadow-primary/20"
                            >
                                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Confirm Assignment"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Quick Stats - Desktop Layout */}
            {!isLoading && assignedClasses.length > 0 && (
                <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4 px-1">
                    <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                                <p className="text-2xl font-bold">{assignedClasses.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/10 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Unique Batches</p>
                                <p className="text-2xl font-bold">
                                    {new Set(assignedClasses.map(a => a.section?.batch_id)).size}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/10 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                                <UserCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Sections</p>
                                <p className="text-2xl font-bold">
                                    {new Set(assignedClasses.map(a => a.section_id)).size}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 px-1">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />
                    <Input
                        placeholder="Search your classes by name or code..."
                        className="pl-11 h-12 bg-card/60 backdrop-blur-md border-border/60 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-md rounded-2xl md:text-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-2xl bg-card/60 backdrop-blur-md border-border/60 hover:text-primary transition-all"
                    onClick={fetchData}
                >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {
                !isLoading ? (
                    assignedClasses.length > 0 ? (
                        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {assignedClasses
                                .filter(a =>
                                    a.course_catalog?.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    a.course_catalog?.subject_code?.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((assignment, index) => {
                                    // Dynamic accent colors based on index or subject code
                                    const accents = [
                                        'from-indigo-500 to-purple-600',
                                        'from-emerald-500 to-teal-600',
                                        'from-rose-500 to-pink-600',
                                        'from-amber-500 to-orange-600',
                                        'from-blue-500 to-cyan-600'
                                    ];
                                    const accentGradient = accents[index % accents.length];

                                    return (
                                        <Card
                                            key={assignment.id}
                                            className="group relative flex flex-col overflow-hidden border border-border/50 bg-card hover:bg-card/90 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8 cursor-pointer rounded-2xl min-h-[320px]"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                            onClick={() => handleClassClick(assignment)}
                                        >
                                            {/* Top Accent Bar */}
                                            <div className={`h-2.5 w-full bg-gradient-to-r ${accentGradient} opacity-90`} />

                                            <CardHeader className="space-y-4 pb-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="p-3.5 rounded-2xl bg-secondary/5 border border-border/40 shadow-inner group-hover:scale-110 group-hover:bg-primary/5 transition-all duration-500">
                                                        <BookOpen className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-10 w-10 rounded-xl"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteAssignment(assignment.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                                <div className="space-y-2.5">
                                                    <CardTitle className="text-xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors min-h-[3.2rem] line-clamp-2">
                                                        {assignment.course_catalog?.subject_name}
                                                    </CardTitle>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="font-mono text-[10px] tracking-widest px-2.5 py-0.5 rounded-lg border-primary/30 bg-primary/5 text-primary font-bold uppercase">
                                                            {assignment.course_catalog?.subject_code}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="space-y-6 pt-0 flex-1 flex flex-col justify-end">
                                                {/* Optimized Info Box - Data Grid */}
                                                <div className="grid grid-cols-2 gap-0 rounded-2xl bg-muted/20 border border-border/30 overflow-hidden shadow-inner">
                                                    <div className="p-4 space-y-1 border-r border-border/20 bg-background/40">
                                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black opacity-80">Batch</p>
                                                        <p className="text-base font-bold text-foreground truncate">{assignment.section?.batch?.name}</p>
                                                    </div>
                                                    <div className="p-4 space-y-1 bg-background/20">
                                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black opacity-80">Semester</p>
                                                        <p className="text-base font-bold text-foreground">Sem {assignment.section?.batch?.current_semester}</p>
                                                    </div>
                                                </div>

                                                {/* Professional Footer */}
                                                <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/40 group/footer">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2 rounded-xl bg-primary/10 group-hover/footer:bg-primary/20 transition-colors">
                                                            <Users className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <span className="text-[13px] font-black truncate text-foreground/80 uppercase tracking-tighter">Section {assignment.section?.name}</span>
                                                    </div>
                                                    <Button variant="link" size="sm" className="h-auto p-0 text-primary font-black hover:no-underline group/btn flex items-center gap-1 shrink-0">
                                                        <span>View Students</span>
                                                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                        </div>
                    ) : (
                        <Card className="border-dashed border-2 bg-muted/20">
                            <CardContent className="py-20 text-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                                        <GraduationCap className="w-10 h-10 text-primary" />
                                    </div>
                                    <div className="space-y-2 max-w-sm mx-auto">
                                        <h3 className="text-xl font-bold">Start Your Journey</h3>
                                        <p className="text-muted-foreground">
                                            You haven't assigned any classes to yourself yet. Use the "Add Assignment" button to begin managing your students.
                                        </p>
                                        <Button
                                            onClick={() => setIsDialogOpen(true)}
                                            className="mt-4 shadow-lg shadow-primary/20"
                                        >
                                            Assign First Class
                                        </Button>
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
                <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0 border-none shadow-2xl">
                    <div className="p-6 bg-gradient-to-br from-primary/10 via-background to-background border-b">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-primary/20">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                <DialogTitle className="text-xl font-bold">Student Directory</DialogTitle>
                            </div>
                            <DialogDescription className="text-sm font-medium text-foreground/80">
                                {selectedClass && (
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className="text-primary">{selectedClass.course_catalog?.subject_name}</span>
                                        <span className="text-muted-foreground">•</span>
                                        <span>{selectedClass.section?.batch?.name}</span>
                                        <span className="text-muted-foreground">•</span>
                                        <span>Section {selectedClass.section?.name}</span>
                                    </div>
                                )}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-auto p-2 sm:p-6 bg-muted/5">
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[100px] font-bold">ID</TableHead>
                                        <TableHead className="font-bold">Student Name</TableHead>
                                        <TableHead className="hidden md:table-cell font-bold">Email Address</TableHead>
                                        <TableHead className="text-right font-bold pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!isFetchingStudents ? (
                                        classStudents.length > 0 ? (
                                            classStudents.map((student) => (
                                                <TableRow key={student.id} className="group transition-colors hover:bg-muted/30">
                                                    <TableCell className="font-mono text-xs sm:text-sm font-medium py-4">
                                                        {student.student_id}
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm sm:text-base">{student.profile?.name}</span>
                                                            <span className="md:hidden text-xs text-muted-foreground mt-0.5">{student.profile?.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground py-4">
                                                        {student.profile?.email}
                                                    </TableCell>
                                                    <TableCell className="text-right py-4 pr-6">
                                                        <Badge
                                                            variant={student.is_active ? 'default' : 'secondary'}
                                                            className={`text-[10px] uppercase font-bold tracking-wider ${student.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' : ''}`}
                                                        >
                                                            {student.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-20">
                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                        <Search className="w-8 h-8 opacity-20" />
                                                        <p>No students enrolled in this section</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-20">
                                                <div className="flex flex-col items-center gap-4">
                                                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                                                    <p className="text-sm text-muted-foreground">Retrieving student data...</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="p-4 bg-muted/20 border-t flex justify-end">
                        <Button variant="outline" onClick={() => setSelectedClass(null)} className="rounded-lg">
                            Close Directory
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default Classes;
