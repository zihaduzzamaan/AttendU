import { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { toast } from 'sonner';

const AttendanceManagement = () => {
    const [records, setRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await api.getAttendanceHistory({});
            setRecords(data || []);
        } catch (error) {
            toast.error("Failed to load attendance records");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Attendance Records</h2>
                <p className="text-muted-foreground">
                    View all student attendance logs.
                </p>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Timestamp</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!isLoading ? (
                            records.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell>{formatDate(record.date)}</TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{record.student?.profile?.name}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{record.student?.student_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{record.subject?.name}</TableCell>
                                    <TableCell>
                                        <Badge className={`capitalize ${record.status === 'present' ? 'bg-green-600 hover:bg-green-700' :
                                                record.status === 'absent' ? 'bg-red-600 hover:bg-red-700' :
                                                    'bg-yellow-600 hover:bg-yellow-700'
                                            }`}>
                                            {record.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(record.timestamp).toLocaleTimeString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Loading records...
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && records.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No attendance records found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default AttendanceManagement;
