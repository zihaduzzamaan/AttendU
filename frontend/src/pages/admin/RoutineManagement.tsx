import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const RoutineManagement = () => {
    const { toast } = useToast();
    const [routines, setRoutines] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await api.getRoutines();
            setRoutines(data || []);
        } catch (error) {
            console.error("Failed to fetch routines", error);
            toast({ title: 'Error', description: 'Failed to load routines', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this routine?')) {
            try {
                await api.deleteResource('routines', id);
                toast({ title: 'Routine deleted' });
                fetchData();
            } catch (e) {
                toast({ title: 'Error', description: 'Failed to delete routine', variant: 'destructive' });
            }
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Routine Management</h2>
                <p className="text-muted-foreground">
                    View and manage class schedules.
                </p>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Day</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Teacher</TableHead>
                            <TableHead>Batch/Section</TableHead>
                            <TableHead>Room</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {routines.map((routine) => (
                            <TableRow key={routine.id}>
                                <TableCell className="font-medium">{routine.day_of_week}</TableCell>
                                <TableCell>{routine.start_time?.slice(0, 5)} - {routine.end_time?.slice(0, 5)}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{routine.subject?.name}</span>
                                        <span className="text-xs text-muted-foreground">{routine.subject?.code}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{routine.teacher?.name}</TableCell>
                                <TableCell>
                                    {routine.subject?.section?.batch?.name} - {routine.subject?.section?.name}
                                </TableCell>
                                <TableCell>{routine.room_id || 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(routine.id)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {routines.length === 0 && !isLoading && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No routines found.
                                </TableCell>
                            </TableRow>
                        )}
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Loading schedules...
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default RoutineManagement;
