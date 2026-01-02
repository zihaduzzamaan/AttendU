import { useState, useEffect } from 'react';
import {
    Building2,
    Layers,
    Puzzle,
    BookOpen,
    Plus,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api, Faculty, Batch, Section, Subject } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const AcademicStructure = () => {
    const { toast } = useToast();

    // State for data
    const [departments, setDepartments] = useState<Faculty[]>([]); // Using Faculty interface but keeping 'departments' var name for UI consistency
    const [batches, setBatches] = useState<Batch[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter States
    const [filterDept, setFilterDept] = useState('all');
    const [filterBatch, setFilterBatch] = useState('all');

    // Modal States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('departments');
    const [newItemName, setNewItemName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [selectedParentId, setSelectedParentId] = useState('');
    const [dialogDeptId, setDialogDeptId] = useState(''); // For hierarchical selection in modal

    // Fetch Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [deptsData, batchesData, sectionsData, subjectsData] = await Promise.all([
                api.getFaculties(),
                api.getBatches(),
                api.getSections(),
                api.getSubjects()
            ]);
            setDepartments(deptsData);
            setBatches(batchesData);
            setSections(sectionsData);
            setSubjects(subjectsData);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        setFilterDept('all');
        setFilterBatch('all');
        setSelectedParentId('');
        setNewItemName('');
        setNewCode('');
    };

    const handleAdd = async () => {
        if (!newItemName) return;

        try {
            if (activeTab === 'departments') {
                await api.createFaculty(newItemName);
            } else if (activeTab === 'batches') {
                if (!selectedParentId) throw new Error('Department is required');
                await api.createBatch(selectedParentId, newItemName);
            } else if (activeTab === 'sections') {
                if (!selectedParentId) throw new Error('Batch is required');
                await api.createSection(selectedParentId, newItemName);
            } else if (activeTab === 'subjects') {
                if (!selectedParentId) throw new Error('Section is required');
                // NOTE: Using 'Section' as parent for Subject based on DB Schema, 
                // but simpler UI might select 'Department' -> 'Batch' -> 'Section'? 
                // For now, let's assume the UI passes Section ID.
                if (!newCode) throw new Error('Subject code is required');
                await api.createSubject(selectedParentId, newItemName, newCode);
            }

            toast({ title: 'Success', description: 'Item added successfully' });
            fetchData(); // Refresh
            setIsDialogOpen(false);
            setNewItemName('');
            setNewCode('');
            setSelectedParentId('');
            setDialogDeptId('');
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to create item', variant: 'destructive' });
        }
    };

    const handleDelete = async (table: string, id: string) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        try {
            await api.deleteResource(table, id);
            toast({ title: 'Deleted', description: 'Item deleted successfully' });
            fetchData();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to delete item', variant: 'destructive' });
        }
    };

    // Helper to get Department Name
    const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || 'Unknown';
    const getBatchName = (id: string) => batches.find(b => b.id === id)?.name || 'Unknown';
    const getSectionName = (id: string) => sections.find(s => s.id === id)?.name || 'Unknown';

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Academic Structure</h2>
                <p className="text-muted-foreground">Manage departments, batches, sections, and subjects.</p>
            </div>

            <Tabs defaultValue="departments" onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="departments">Departments</TabsTrigger>
                    <TabsTrigger value="batches">Batches</TabsTrigger>
                    <TabsTrigger value="sections">Sections</TabsTrigger>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                </TabsList>

                <div className="mt-6 flex justify-end">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2"><Plus className="w-4 h-4" /> Add New</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="capitalize">Add New {activeTab.slice(0, -1)}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                {activeTab === 'subjects' && (
                                    <div className="grid gap-2">
                                        <Label>Subject Code</Label>
                                        <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. CSE-101" />
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <Label>Name</Label>
                                    <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Enter name" />
                                </div>

                                {/* Batches -> Select Dept */}
                                {activeTab === 'batches' && (
                                    <div className="grid gap-2">
                                        <Label>Department</Label>
                                        <Select onValueChange={setSelectedParentId}>
                                            <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                            <SelectContent>
                                                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Sections -> Select Dept -> Select Batch */}
                                {activeTab === 'sections' && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label>Department</Label>
                                            <Select onValueChange={(val) => { setDialogDeptId(val); setSelectedParentId(''); }}>
                                                <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                                <SelectContent>
                                                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Batch</Label>
                                            <Select onValueChange={setSelectedParentId} disabled={!dialogDeptId}>
                                                <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                                                <SelectContent>
                                                    {batches.filter(b => b.faculty_id === dialogDeptId).map(b => (
                                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}

                                {/* Subjects -> Select Dept -> Select Batch -> Select Section (Since Subject is linked to Section) */}
                                {activeTab === 'subjects' && (
                                    <>
                                        {/* Simplified Drilldown for Subjects */}
                                        <div className="grid gap-2">
                                            <Label>Department</Label>
                                            <Select onValueChange={(val) => setDialogDeptId(val)}>
                                                <SelectTrigger><SelectValue placeholder="Filter Batches by Department" /></SelectTrigger>
                                                <SelectContent>
                                                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* Ideally we need 3 levels here: Dept -> Batch -> Section */}
                                        {/* For simplicity/space, let's just list all sections if no filters, or filter by logic. 
                                            But 'selectedParentId' must be SECTION ID.
                                         */}
                                        <div className="grid gap-2">
                                            <Label>Section</Label>
                                            <Select onValueChange={setSelectedParentId}>
                                                <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                                                <SelectContent>
                                                    {sections.filter(s => {
                                                        if (!dialogDeptId) return true;
                                                        const batch = batches.find(b => b.id === s.batch_id);
                                                        return batch?.faculty_id === dialogDeptId;
                                                    }).map(s => {
                                                        const batch = batches.find(b => b.id === s.batch_id);
                                                        const dept = departments.find(d => d.id === batch?.faculty_id);
                                                        return (
                                                            <SelectItem key={s.id} value={s.id}>
                                                                {s.name} ({dept?.name} - {batch?.name})
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAdd}>Save Changes</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* DEPARTMENTS */}
                <TabsContent value="departments">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {departments.map((dept) => (
                                    <TableRow key={dept.id}>
                                        <TableCell className="font-medium">{dept.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete('faculties', dept.id)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* BATCHES */}
                <TabsContent value="batches" className="space-y-4">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {batches.map((batch) => (
                                    <TableRow key={batch.id}>
                                        <TableCell className="font-medium">{batch.name}</TableCell>
                                        <TableCell>{getDeptName(batch.faculty_id)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete('batches', batch.id)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* SECTIONS */}
                <TabsContent value="sections" className="space-y-4">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Batch</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sections.map((section) => {
                                    const batch = batches.find(b => b.id === section.batch_id);
                                    return (
                                        <TableRow key={section.id}>
                                            <TableCell className="font-medium">{section.name}</TableCell>
                                            <TableCell>{batch ? `${batch.name} (${getDeptName(batch.faculty_id)})` : 'Unknown'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete('sections', section.id)}>
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* SUBJECTS */}
                <TabsContent value="subjects">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Section (Batch/Dept)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subjects.map((subject) => {
                                    const section = sections.find(s => s.id === subject.section_id);
                                    const batch = section ? batches.find(b => b.id === section.batch_id) : null;
                                    const dept = batch ? departments.find(d => d.id === batch.faculty_id) : null;

                                    return (
                                        <TableRow key={subject.id}>
                                            <TableCell className="font-mono">{subject.code}</TableCell>
                                            <TableCell className="font-medium">{subject.name}</TableCell>
                                            <TableCell>
                                                {section ? `${section.name} - ${batch?.name} (${dept?.name})` : 'Unknown'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete('subjects', subject.id)}>
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AcademicStructure;
