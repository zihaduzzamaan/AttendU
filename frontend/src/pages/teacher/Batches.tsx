import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Users, BookOpen } from "lucide-react";
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

const Batches = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<any | null>(null);
    const [classStudents, setClassStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingStudents, setIsFetchingStudents] = useState(false);

    useEffect(() => {
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
                toast({ title: "Error", description: "Failed to load assigned classes", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user?.teacher_id]);

    const handleClassClick = async (assignment: any) => {
        setSelectedClass(assignment);
        setIsFetchingStudents(true);
        try {
            const students = await api.getStudentsBySection(assignment.subject?.section_id);
            setClassStudents(students || []);
        } catch (e) {
            toast({ title: "Error", description: "Failed to load students", variant: "destructive" });
        } finally {
            setIsFetchingStudents(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Batches</h1>
                <p className="text-muted-foreground mt-2">
                    Select a class to view registered students.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {!isLoading ? (
                    assignedClasses.map((assignment) => (
                        <Card
                            key={assignment.id}
                            className="cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => handleClassClick(assignment)}
                        >
                            <CardHeader className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    {assignment.subject?.name}
                                </CardTitle>
                                <CardDescription>
                                    {assignment.subject?.code}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Users className="w-4 h-4" />
                                        <span>
                                            {assignment.subject?.section?.batch?.name} • {assignment.subject?.section?.name}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center">Loading assigned classes...</div>
                )}

                {!isLoading && assignedClasses.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        No classes assigned yet. Contact administrator.
                    </div>
                )}
            </div>

            <Dialog open={!!selectedClass} onOpenChange={(open) => !open && setSelectedClass(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Student List</DialogTitle>
                        <DialogDescription>
                            {selectedClass && (
                                <>
                                    {selectedClass.subject?.name} - {selectedClass.subject?.section?.batch?.name} ({selectedClass.subject?.section?.name})
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="border rounded-md mt-4 max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!isFetchingStudents ? (
                                    classStudents.length > 0 ? (
                                        classStudents.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium">{student.student_id}</TableCell>
                                                <TableCell>{student.profile?.name}</TableCell>
                                                <TableCell>{student.profile?.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={student.is_active ? 'default' : 'secondary'}>
                                                        {student.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No students found in this section.
                                            </TableCell>
                                        </TableRow>
                                    )
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            Loading student list...
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Batches;
