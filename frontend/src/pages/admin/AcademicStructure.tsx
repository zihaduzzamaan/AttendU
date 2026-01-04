import { useState, useEffect, useMemo } from 'react';
import {
    Building2,
    Layers,
    Puzzle,
    BookOpen,
    Plus,
    Trash2,
    Pencil,
    Search,
    Check,
    ChevronsUpDown
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { api, Faculty, Batch, Section, CourseCatalogItem } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";

const Combobox = ({
    items,
    value,
    onChange,
    placeholder = "Select item...",
    searchPlaceholder = "Search...",
    disabled = false
}: {
    items: { label: string; value: string }[],
    value: string,
    onChange: (val: string) => void,
    placeholder?: string,
    searchPlaceholder?: string,
    disabled?: boolean
}) => {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-[200px] justify-between", !value && "text-muted-foreground")}
                    disabled={disabled}
                >
                    {value
                        ? items.find((item) => item.value === value)?.label
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.value}
                                    value={item.label} // IMPORTANT: Command searches by label usually
                                    onSelect={() => {
                                        onChange(item.value === value ? "" : item.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {item.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const AcademicStructure = () => {
    const { toast } = useToast();

    // State for data
    const [departments, setDepartments] = useState<Faculty[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [catalog, setCatalog] = useState<CourseCatalogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter States
    const [filterDept, setFilterDept] = useState(''); // Empty string for 'Reset' state
    const [filterBatch, setFilterBatch] = useState('');
    const [filterSemester, setFilterSemester] = useState<string>('');

    // Modal States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('departments');
    const [newItemName, setNewItemName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [selectedParentId, setSelectedParentId] = useState('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [dialogDeptId, setDialogDeptId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Mode State
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
        setFilterDept('');
        setFilterBatch('');
        setFilterSemester('');
        setSelectedParentId('');
        setNewItemName('');
        setNewCode('');
        setSearchQuery('');
        setIsEditMode(false);
        setEditId('');
    };

    const formatSemester = (sem: number) => {
        const j = sem % 10;
        const k = sem % 100;
        if (j === 1 && k !== 11) return `${sem}st Sem`;
        if (j === 2 && k !== 12) return `${sem}nd Sem`;
        if (j === 3 && k !== 13) return `${sem}rd Sem`;
        return `${sem}th Sem`;
    };

    const handleEdit = (type: string, item: any) => {
        setIsEditMode(true);
        setEditId(item.id);
        setNewItemName(item.name || item.subject_name);

        if (type === 'batches') {
            setSelectedParentId(item.faculty_id);
        } else if (type === 'sections') {
            const batch = batches.find(b => b.id === item.batch_id);
            if (batch) {
                setDialogDeptId(batch.faculty_id);
                setSelectedParentId(item.batch_id);
            }
        } else if (type === 'catalog') {
            setNewCode(item.subject_code);
            setSelectedParentId(item.faculty_id);
            setSelectedSemester(item.semester_level.toString());
        }

        setIsDialogOpen(true);
    };

    const handleAdd = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            if (isEditMode && editId) {
                // ... (Update Logic Same as Before)
                // Handle Update
                let updateData: any = {};
                let table = 'faculties';

                if (activeTab === 'batches') {
                    table = 'batches';
                    updateData = { name: newItemName, faculty_id: selectedParentId };
                } else if (activeTab === 'sections') {
                    table = 'sections';
                    updateData = { name: newItemName, batch_id: selectedParentId };
                } else if (activeTab === 'catalog') {
                    table = 'course_catalog';
                    updateData = {
                        subject_name: newItemName,
                        subject_code: newCode,
                        faculty_id: selectedParentId,
                        semester_level: parseInt(selectedSemester)
                    };
                } else {
                    updateData = { name: newItemName };
                }

                await api.updateResource(table, editId, updateData);
                toast({ title: 'Success', description: 'Item updated successfully' });
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

    const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || 'Unknown';

    // Memoized Filter Options
    const deptOptions = useMemo(() => departments.map(d => ({ label: d.name, value: d.id })), [departments]);

    const batchOptions = useMemo(() => {
        if (!filterDept) return [];
        return batches
            .filter(b => b.faculty_id === filterDept)
            .map(b => ({ label: `Batch ${b.name}`, value: b.id })); // Added "Batch" prefix for clarity
    }, [batches, filterDept]);

    const sectionOptions = useMemo(() => {
        if (!filterBatch) return [];
        return sections
            .filter(s => s.batch_id === filterBatch)
            .map(s => ({ label: `Section ${s.name}`, value: s.id }));
    }, [sections, filterBatch]);


    const semesterOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => ({ label: formatSemester(i), value: i.toString() }));


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

                {/* Global Toolbar */}
                <div className="mt-4 sm:mt-6 flex flex-col items-start gap-4 p-4 border rounded-lg bg-card/50">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
                        {/* Dynamic Filters based on Tab */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">Filters:</span>

                            {/* Department Filter - Always visible unless in Dept tab where search is enough */}
                            {activeTab !== 'departments' && (
                                <Combobox
                                    items={deptOptions}
                                    value={filterDept}
                                    onChange={(val) => {
                                        setFilterDept(val);
                                        setFilterBatch(''); // Reset batch when dept changes
                                    }}
                                    placeholder="Select Department..."
                                    searchPlaceholder="Search Dept..."
                                />
                            )}

                            {/* Batch Filter - Visible for Sections */}
                            {activeTab === 'sections' && (
                                <Combobox
                                    items={batchOptions}
                                    value={filterBatch}
                                    onChange={setFilterBatch}
                                    placeholder={filterDept ? "Select Batch..." : "Select Dept First"}
                                    disabled={!filterDept}
                                />
                            )}

                            {/* Semester Filter - Visible for Catalog */}
                            {activeTab === 'catalog' && (
                                <Combobox
                                    items={semesterOptions}
                                    value={filterSemester}
                                    onChange={setFilterSemester}
                                    placeholder="Select Semester..."
                                />
                            )}
                        </div>

                        {/* Search & Add */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
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
                                    <Button size="icon"><Plus className="w-4 h-4" /></Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-4">
                                    {/* ... (Dialog Content Same as Before - keeping it valid) ... */}
                                    <DialogHeader>
                                        <DialogTitle className="capitalize">{isEditMode ? 'Edit' : 'Add New'} {activeTab === 'catalog' ? 'Subject' : activeTab.slice(0, -1)}</DialogTitle>
                                        {!isEditMode && (
                                            <div className="flex items-center gap-2 pt-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={isBulkMode} onChange={(e) => setIsBulkMode(e.target.checked)} className="w-4 h-4" />
                                                    <span className="text-sm text-muted-foreground">Bulk Mode</span>
                                                </label>
                                            </div>
                                        )}
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        {activeTab === 'departments' && (
                                            isBulkMode ? (
                                                <div className="grid gap-2"><Label>Names</Label><textarea value={bulkDepartments} onChange={(e) => setBulkDepartments(e.target.value)} className="min-h-[100px] w-full border rounded-md p-2 text-sm" /></div>
                                            ) : (
                                                <div className="grid gap-2"><Label>Name</Label><Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} /></div>
                                            )
                                        )}
                                        {activeTab === 'batches' && (
                                            <>
                                                <div className="grid gap-2"><Label>Department</Label><Select onValueChange={setSelectedParentId} value={selectedParentId}><SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                                                {isBulkMode ? (
                                                    <div className="grid grid-cols-2 gap-2"><div><Label>Start</Label><Input value={initialBatch} onChange={e => setInitialBatch(e.target.value)} /></div><div><Label>End</Label><Input value={finalBatch} onChange={e => setFinalBatch(e.target.value)} /></div></div>
                                                ) : (
                                                    <div className="grid gap-2"><Label>Name</Label><Input value={newItemName} onChange={e => setNewItemName(e.target.value)} /></div>
                                                )}
                                            </>
                                        )}
                                        {activeTab === 'sections' && (
                                            <>
                                                <div className="grid gap-2"><Label>Department</Label><Select onValueChange={(v) => { setDialogDeptId(v); setSelectedParentId('') }}><SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                                                <div className="grid gap-2"><Label>Batch</Label><Select onValueChange={setSelectedParentId} value={selectedParentId} disabled={!dialogDeptId}><SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger><SelectContent>{batches.filter(b => b.faculty_id === dialogDeptId).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
                                                {!isBulkMode ? <div className="grid gap-2"><Label>Name</Label><Input value={newItemName} onChange={e => setNewItemName(e.target.value)} /></div> : null}
                                                {isBulkMode && (<div className="grid grid-cols-2 gap-2"><div><Label>Start</Label><Input value={initialSection} onChange={e => setInitialSection(e.target.value.toUpperCase())} maxLength={1} /></div><div><Label>End</Label><Input value={finalSection} onChange={e => setFinalSection(e.target.value.toUpperCase())} maxLength={1} /></div></div>)}
                                            </>
                                        )}
                                        {activeTab === 'catalog' && (
                                            <>
                                                <div className="grid gap-2"><Label>Department</Label><Select onValueChange={setSelectedParentId} value={selectedParentId}><SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                                                <div className="grid gap-2"><Label>Semester</Label><Select onValueChange={setSelectedSemester} value={selectedSemester}><SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger><SelectContent>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => <SelectItem key={i} value={i.toString()}>{formatSemester(i)}</SelectItem>)}</SelectContent></Select></div>
                                                {isBulkMode ? <div className="grid gap-2"><Label>Subjects</Label><textarea value={bulkSubjects} onChange={e => setBulkSubjects(e.target.value)} className="min-h-[100px] w-full border rounded-md p-2 text-sm" /></div> : (
                                                    <><div className="grid gap-2"><Label>Code</Label><Input value={newCode} onChange={e => setNewCode(e.target.value)} /></div><div className="grid gap-2"><Label>Name</Label><Input value={newItemName} onChange={e => setNewItemName(e.target.value)} /></div></>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <DialogFooter><Button onClick={handleAdd}>{isLoading ? 'Saving...' : 'Save'}</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
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
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit('faculties', dept)} className="mr-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete('faculties', dept.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="batches" className="space-y-4">
                    <Card>
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Current Sem</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {batches.filter(b => (!filterDept || b.faculty_id === filterDept) && b.name.includes(searchQuery)).map(batch => (
                                    <TableRow key={batch.id}>
                                        <TableCell>{batch.name}</TableCell>
                                        <TableCell>{getDeptName(batch.faculty_id)}</TableCell>
                                        <TableCell>{formatSemester(batch.current_semester)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit('batches', batch)} className="mr-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete('batches', batch.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="sections" className="space-y-4">
                    <Card>
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Batch</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {sections.filter(s => {
                                    const b = batches.find(bat => bat.id === s.batch_id);
                                    if (filterDept && b?.faculty_id !== filterDept) return false;
                                    if (filterBatch && s.batch_id !== filterBatch) return false;
                                    return s.name.includes(searchQuery);
                                }).map(section => (
                                    <TableRow key={section.id}>
                                        <TableCell>{section.name}</TableCell>
                                        <TableCell>{batches.find(b => b.id === section.batch_id)?.name || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit('sections', section)} className="mr-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete('sections', section.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="catalog" className="space-y-4">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow className="h-10">
                                    <TableHead className="py-2">Code</TableHead>
                                    <TableHead className="py-2">Name</TableHead>
                                    <TableHead className="py-2">Department</TableHead>
                                    <TableHead className="py-2">Semester</TableHead>
                                    <TableHead className="text-right py-2">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {catalog.filter(c => {
                                    if (filterDept && c.faculty_id !== filterDept) return false;
                                    if (filterSemester && c.semester_level !== parseInt(filterSemester)) return false;
                                    return c.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) || c.subject_code.toLowerCase().includes(searchQuery.toLowerCase());
                                }).map(item => (
                                    <TableRow key={item.id} className="h-8">
                                        <TableCell className="font-mono text-xs py-1">{item.subject_code}</TableCell>
                                        <TableCell className="text-xs py-1 font-medium">{item.subject_name}</TableCell>
                                        <TableCell className="text-xs py-1 text-muted-foreground">{getDeptName(item.faculty_id)}</TableCell>
                                        <TableCell className="text-xs py-1">{formatSemester(item.semester_level)}</TableCell>
                                        <TableCell className="text-right py-1">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit('catalog', item)} className="h-6 w-6 p-0 mr-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Pencil className="w-3 h-3" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete('course_catalog', item.id)} className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></Button>
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
