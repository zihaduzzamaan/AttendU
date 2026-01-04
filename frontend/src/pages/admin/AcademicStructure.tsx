import { useState, useEffect } from 'react';
import {
    Building2,
    Layers,
    Puzzle,
    BookOpen,
    Plus,
    Trash2,
    Pencil,
    Search,
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
import { api, Faculty, Batch, Section, CourseCatalogItem } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const AcademicStructure = () => {
    const { toast } = useToast();

    // State for data
    const [departments, setDepartments] = useState<Faculty[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [catalog, setCatalog] = useState<CourseCatalogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter States
    const [filterDept, setFilterDept] = useState('all');
    const [filterBatch, setFilterBatch] = useState('all');
    const [filterSemester, setFilterSemester] = useState<string>('all');

    // Modal States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('departments');
    const [newItemName, setNewItemName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [selectedParentId, setSelectedParentId] = useState('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [dialogDeptId, setDialogDeptId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Mode State - Keeping simple for now (Catalog might need update logic added later)
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState('');

    // Bulk add states
    const [bulkDepartments, setBulkDepartments] = useState('');
    const [bulkSubjects, setBulkSubjects] = useState('');
    const [initialBatch, setInitialBatch] = useState('');
    const [finalBatch, setFinalBatch] = useState('');
    const [initialSection, setInitialSection] = useState('');
    const [finalSection, setFinalSection] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false);

    // Fetch Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [deptsData, batchesData, sectionsData, catalogData] = await Promise.all([
                api.getFaculties(),
                api.getBatches(),
                api.getSections(),
                api.getCourseCatalog()
            ]);
            setDepartments(deptsData || []);
            setBatches(batchesData || []);
            setSections(sectionsData || []);
            setCatalog(catalogData || []);
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
        setFilterSemester('all');
        setSelectedParentId('');
        setNewItemName('');
        setNewCode('');
        setSearchQuery('');

    };

    const handleEdit = (type: string, item: any) => {
        setIsEditMode(true);
        setEditId(item.id);
        setNewItemName(item.name);

        if (type === 'batches') {
            setSelectedParentId(item.faculty_id);
        } else if (type === 'sections') {
            const batch = batches.find(b => b.id === item.batch_id);
            if (batch) {
                setDialogDeptId(batch.faculty_id);
                setSelectedParentId(item.batch_id);
            }
        }
        // Catalog edit logic could be added here

        setIsDialogOpen(true);
    };

    const handleAdd = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            if (isEditMode && editId) {
                // Handle Update
                let updateData: any = { name: newItemName };
                let table = 'faculties';
                if (activeTab === 'batches') table = 'batches';
                if (activeTab === 'sections') table = 'sections';
                // Catalog update not fully implemented in this refactor step, assumes delete/re-add for now or simple name update

                if (table !== 'faculties' && table !== 'batches' && table !== 'sections') {
                    // Skip catalog update for now
                } else {
                    await api.updateResource(table, editId, updateData);
                    toast({ title: 'Success', description: 'Item updated successfully' });
                }
            } else {
                // Handle Create
                if (activeTab === 'departments') {
                    if (isBulkMode) {
                        const lines = bulkDepartments.split('\n').filter(l => l.trim());
                        const promises = lines.map(name => api.createFaculty(name.trim()));
                        await Promise.all(promises);
                        toast({ title: 'Success', description: `Added ${lines.length} departments` });
                    } else {
                        await api.createFaculty(newItemName);
                        toast({ title: 'Success', description: 'Department added' });
                    }
                } else if (activeTab === 'batches') {
                    if (!selectedParentId) throw new Error("Department required");
                    if (isBulkMode) {
                        // ... (keep existing bulk batch logic if needed, simplied for brevity)
                        const start = parseInt(initialBatch);
                        const end = parseInt(finalBatch);
                        const promises = [];
                        for (let i = start; i <= end; i++) promises.push(api.createBatch(selectedParentId, i.toString()));
                        await Promise.all(promises);
                        toast({ title: 'Success', description: 'Batches added' });
                    } else {
                        await api.createBatch(selectedParentId, newItemName);
                        toast({ title: 'Success', description: 'Batch added' });
                    }
                } else if (activeTab === 'sections') {
                    if (!selectedParentId) throw new Error("Batch required");
                    if (isBulkMode) {
                        const start = initialSection.toUpperCase().charCodeAt(0);
                        const end = finalSection.toUpperCase().charCodeAt(0);
                        const promises = [];
                        for (let i = start; i <= end; i++) promises.push(api.createSection(selectedParentId, String.fromCharCode(i)));
                        await Promise.all(promises);
                        toast({ title: 'Success', description: 'Sections added' });
                    } else {
                        await api.createSection(selectedParentId, newItemName);
                        toast({ title: 'Success', description: 'Section added' });
                    }
                } else if (activeTab === 'catalog') {
                    if (!selectedParentId) throw new Error("Department required");
                    if (!selectedSemester) throw new Error("Semester required");

                    const semesterInt = parseInt(selectedSemester);

                    if (isBulkMode) {
                        const lines = bulkSubjects.split('\n').filter(l => l.trim());
                        const promises = [];
                        for (const line of lines) {
                            // Attempt to parse Code - Name
                            // If not just use name and generate code
                            let name = line;
                            let code = "SUB";
                            if (line.includes('-')) {
                                const parts = line.split('-');
                                code = parts[0].trim();
                                name = parts.slice(1).join('-').trim();
                            } else {
                                code = name.substring(0, 3).toUpperCase();
                            }
                            promises.push(api.createCatalogSubject(selectedParentId, semesterInt, name, code));
                        }
                        await Promise.all(promises);
                        toast({ title: 'Success', description: `Added ${lines.length} subjects to catalog` });
                    } else {
                        if (!newItemName || !newCode) throw new Error("Name and Code required");
                        await api.createCatalogSubject(selectedParentId, semesterInt, newItemName, newCode);
                        toast({ title: 'Success', description: 'Subject added to catalog' });
                    }
                }
            }

            fetchData();
            setIsDialogOpen(false);
            resetForm();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to save item', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setNewItemName('');
        setNewCode('');
        setSelectedParentId('');
        setDialogDeptId('');
        setSelectedSemester('');
        setBulkDepartments('');
        setBulkSubjects('');
        setInitialBatch('');
        setFinalBatch('');
        setInitialSection('');
        setFinalSection('');
        setIsBulkMode(false);
        setIsEditMode(false);
        setEditId('');
    };

    const handleDelete = async (table: string, id: string) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        try {
            if (table === 'course_catalog') {
                await api.deleteCatalogSubject(id);
            } else {
                await api.deleteResource(table, id);
            }
            toast({ title: 'Deleted', description: 'Item deleted successfully' });
            fetchData();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to delete item', variant: 'destructive' });
        }
    };

    // Helper to get Department Name
    const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || 'Unknown';

    return (
        <div className="space-y-4 sm:space-y-6 pb-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Academic Structure</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage departments, batches, sections, and catalog</p>
            </div>

            <Tabs defaultValue="departments" onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                    <TabsTrigger value="departments" className="text-xs sm:text-sm px-2 py-2">Depts</TabsTrigger>
                    <TabsTrigger value="batches" className="text-xs sm:text-sm px-2 py-2">Batches</TabsTrigger>
                    <TabsTrigger value="sections" className="text-xs sm:text-sm px-2 py-2">Sections</TabsTrigger>
                    <TabsTrigger value="catalog" className="text-xs sm:text-sm px-2 py-2">Course Catalog</TabsTrigger>
                </TabsList>

                {/* Search and Add Header */}
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`Search ${activeTab}...`}
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4" /> Add New</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-4">
                            <DialogHeader>
                                <DialogTitle className="capitalize">Add New {activeTab === 'catalog' ? 'Subject' : activeTab.slice(0, -1)}</DialogTitle>
                                <div className="flex items-center gap-2 pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={isBulkMode} onChange={(e) => setIsBulkMode(e.target.checked)} className="w-4 h-4" />
                                        <span className="text-sm text-muted-foreground">Bulk Mode</span>
                                    </label>
                                </div>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                {activeTab === 'departments' && (
                                    isBulkMode ? (
                                        <div className="grid gap-2">
                                            <Label>Names (one per line)</Label>
                                            <textarea value={bulkDepartments} onChange={(e) => setBulkDepartments(e.target.value)} className="min-h-[100px] w-full border rounded-md p-2 text-sm" />
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            <Label>Name</Label>
                                            <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                                        </div>
                                    )
                                )}

                                {activeTab === 'batches' && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label>Department</Label>
                                            <Select onValueChange={setSelectedParentId} value={selectedParentId}>
                                                <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        {isBulkMode ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><Label>Start</Label><Input value={initialBatch} onChange={e => setInitialBatch(e.target.value)} placeholder="40" /></div>
                                                <div><Label>End</Label><Input value={finalBatch} onChange={e => setFinalBatch(e.target.value)} placeholder="45" /></div>
                                            </div>
                                        ) : (
                                            <div className="grid gap-2"><Label>Name</Label><Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g. 45" /></div>
                                        )}
                                    </>
                                )}

                                {activeTab === 'sections' && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label>Department</Label>
                                            <Select onValueChange={(v) => { setDialogDeptId(v); setSelectedParentId('') }}>
                                                <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Batch</Label>
                                            <Select onValueChange={setSelectedParentId} disabled={!dialogDeptId}>
                                                <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                                                <SelectContent>{batches.filter(b => b.faculty_id === dialogDeptId).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        {isBulkMode ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><Label>Start</Label><Input value={initialSection} onChange={e => setInitialSection(e.target.value.toUpperCase())} placeholder="A" maxLength={1} /></div>
                                                <div><Label>End</Label><Input value={finalSection} onChange={e => setFinalSection(e.target.value.toUpperCase())} placeholder="F" maxLength={1} /></div>
                                            </div>
                                        ) : (
                                            <div className="grid gap-2"><Label>Name</Label><Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="A" /></div>
                                        )}
                                    </>
                                )}

                                {activeTab === 'catalog' && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label>Department</Label>
                                            <Select onValueChange={setSelectedParentId} value={selectedParentId}>
                                                <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Semester</Label>
                                            <Select onValueChange={setSelectedSemester} value={selectedSemester}>
                                                <SelectTrigger><SelectValue placeholder="Select Semester" /></SelectTrigger>
                                                <SelectContent>
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SelectItem key={i} value={i.toString()}>Semester {i}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {isBulkMode ? (
                                            <div className="grid gap-2">
                                                <Label>Subjects (Code - Name)</Label>
                                                <textarea value={bulkSubjects} onChange={(e) => setBulkSubjects(e.target.value)} className="min-h-[100px] w-full border rounded-md p-2 text-sm" placeholder="CSE-101 - Intro to CS&#10;MAT-101 - Math I" />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid gap-2"><Label>Code</Label><Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="CSE-101" /></div>
                                                <div className="grid gap-2"><Label>Name</Label><Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Computer Fundamental" /></div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAdd} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <TabsContent value="departments">
                    <Card>
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {departments.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map(dept => (
                                    <TableRow key={dept.id}>
                                        <TableCell className="font-medium">{dept.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" className="mr-2 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={async () => {
                                                const confirmMsg = `⚠️ END SEMESTER for ${dept.name}?\nType "CONFIRM".`;
                                                if (prompt(confirmMsg) !== "CONFIRM") return;
                                                try {
                                                    await api.endSemester(dept.id);
                                                    toast({ title: "Success", description: "Semester ended." });
                                                    await fetchData();
                                                } catch (e: any) {
                                                    toast({ title: "Error", description: e.message, variant: "destructive" });
                                                }
                                            }}>End Sem</Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete('faculties', dept.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="batches" className="space-y-4">
                    <div className="flex gap-3">
                        <Label className="text-sm self-center">Filter Dept:</Label>
                        <Select value={filterDept} onValueChange={setFilterDept}><SelectTrigger className="w-48"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Current Sem</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {batches.filter(b => (filterDept === 'all' || b.faculty_id === filterDept) && b.name.includes(searchQuery)).map(batch => (
                                    <TableRow key={batch.id}>
                                        <TableCell>{batch.name}</TableCell>
                                        <TableCell>{getDeptName(batch.faculty_id)}</TableCell>
                                        <TableCell>Semester {batch.current_semester}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete('batches', batch.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="sections" className="space-y-4">
                    <div className="flex gap-3 items-center flex-wrap">
                        <Label>Filter Dept:</Label>
                        <Select value={filterDept} onValueChange={v => { setFilterDept(v); setFilterBatch('all') }}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                        <Label>Batch:</Label>
                        <Select value={filterBatch} onValueChange={setFilterBatch}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{batches.filter(b => filterDept === 'all' || b.faculty_id === filterDept).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Batch</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {sections.filter(s => {
                                    const b = batches.find(bat => bat.id === s.batch_id);
                                    if (filterDept !== 'all' && b?.faculty_id !== filterDept) return false;
                                    if (filterBatch !== 'all' && s.batch_id !== filterBatch) return false;
                                    return s.name.includes(searchQuery);
                                }).map(section => (
                                    <TableRow key={section.id}>
                                        <TableCell>{section.name}</TableCell>
                                        <TableCell>{batches.find(b => b.id === section.batch_id)?.name || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete('sections', section.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="catalog" className="space-y-4">
                    <div className="flex gap-3 items-center flex-wrap">
                        <Label>Filter Dept:</Label>
                        <Select value={filterDept} onValueChange={setFilterDept}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                        <Label>Semester:</Label>
                        <Select value={filterSemester} onValueChange={setFilterSemester}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SelectItem key={i} value={i.toString()}>Sem {i}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Semester</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {catalog.filter(c => {
                                    if (filterDept !== 'all' && c.faculty_id !== filterDept) return false;
                                    if (filterSemester !== 'all' && c.semester_level !== parseInt(filterSemester)) return false;
                                    return c.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) || c.subject_code.toLowerCase().includes(searchQuery.toLowerCase());
                                }).map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono">{item.subject_code}</TableCell>
                                        <TableCell>{item.subject_name}</TableCell>
                                        <TableCell>{getDeptName(item.faculty_id)}</TableCell>
                                        <TableCell>Semester {item.semester_level}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete('course_catalog', item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AcademicStructure;
