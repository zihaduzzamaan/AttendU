import { useState, useEffect } from 'react';
import {
    Users,
    GraduationCap,
    Search,
    CheckCircle,
    XCircle,
    MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const UserManagement = () => {
    const { toast } = useToast();
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [studentsData, teachersData] = await Promise.all([
                api.getStudents(),
                api.getTeachers()
            ]);
            setStudents(studentsData || []);
            setTeachers(teachersData || []);
            // console.log("Debug students", studentsData);
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleStatus = async (id: string, role: string, currentStatus: boolean) => {
        const table = role === 'student' ? 'students' : 'teachers';
        try {
            await api.updateResource(table, id, { is_active: !currentStatus });
            toast({ title: "Updated", description: "Status updated successfully." });
            fetchData();
        } catch (e) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    // Filter
    const filteredStudents = students.filter(s =>
    (s.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredTeachers = teachers.filter(t =>
        t.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 sm:space-y-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h2>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                        Manage students and teachers access
                    </p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        className="pl-8 h-9 sm:h-10 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Tabs defaultValue="students" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="students" className="gap-2 text-sm">
                        <Users className="w-4 h-4" /> <span className="hidden sm:inline">Students</span><span className="sm:hidden">Students</span>
                    </TabsTrigger>
                    <TabsTrigger value="teachers" className="gap-2 text-sm">
                        <GraduationCap className="w-4 h-4" /> <span className="hidden sm:inline">Teachers</span><span className="sm:hidden">Teachers</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="students" className="mt-4 sm:mt-6">
                    <div className="rounded-md border bg-card overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[100px]">Student ID</TableHead>
                                    <TableHead className="min-w-[150px]">Name</TableHead>
                                    <TableHead className="hidden md:table-cell">Batch</TableHead>
                                    <TableHead className="hidden md:table-cell">Section</TableHead>
                                    <TableHead className="min-w-[100px]">Face Reg</TableHead>
                                    <TableHead className="min-w-[80px]">Status</TableHead>
                                    <TableHead className="text-right min-w-[70px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-mono text-xs sm:text-sm">{student.student_id}</TableCell>
                                        <TableCell className="min-w-0">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm truncate max-w-[150px] sm:max-w-none">{student.profile?.name}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none">{student.profile?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {student.section?.batch ? (
                                                <div className="flex flex-col">
                                                    <span>{student.section.batch.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Sem {student.section.batch.current_semester}
                                                    </span>
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {student.section?.name || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {student.face_registered ? (
                                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 text-xs whitespace-nowrap">Registered</Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200 text-xs whitespace-nowrap">Pending</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {student.is_active ? (
                                                <Badge variant="default" className="bg-green-600 text-xs whitespace-nowrap">Active</Badge>
                                            ) : (
                                                <Badge variant="destructive" className="text-xs whitespace-nowrap">Disabled</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => toggleStatus(student.id, 'student', student.is_active)}>
                                                        {student.is_active ? 'Disable Account' : 'Enable Account'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="teachers" className="mt-4 sm:mt-6">
                    <div className="rounded-md border bg-card overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[100px]">Teacher ID</TableHead>
                                    <TableHead className="min-w-[150px]">Name</TableHead>
                                    <TableHead className="hidden md:table-cell">Subjects</TableHead>
                                    <TableHead className="min-w-[80px]">Status</TableHead>
                                    <TableHead className="text-right min-w-[70px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTeachers.map((teacher) => (
                                    <TableRow key={teacher.id}>
                                        <TableCell className="font-mono text-xs sm:text-sm">{teacher.employee_id || `T-${teacher.id.slice(0, 4)}`}</TableCell>
                                        <TableCell className="min-w-0">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm truncate max-w-[150px] sm:max-w-none">{teacher.profile?.name}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none">{teacher.profile?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {teacher.faculty?.name || 'General'}
                                        </TableCell>
                                        <TableCell>
                                            {teacher.is_active ? (
                                                <Badge variant="default" className="bg-green-600 text-xs whitespace-nowrap">Active</Badge>
                                            ) : (
                                                <Badge variant="destructive" className="text-xs whitespace-nowrap">Disabled</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => toggleStatus(teacher.id, 'teacher', teacher.is_active)}>
                                                        {teacher.is_active ? 'Disable Account' : 'Enable Account'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem disabled>
                                                        Manage Profile
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default UserManagement;
