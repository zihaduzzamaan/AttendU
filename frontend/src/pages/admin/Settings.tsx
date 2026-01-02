
import { useState } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
    const { toast } = useToast();
    const [config, setConfig] = useState({
        systemName: 'University Attendance System',
        branding: 'University of Technology',
        maintenanceMode: false,
        faceRecognitionEnabled: true,
    });

    const handleSave = () => {
        // Save to backend or local storage logic here
        toast({ title: 'Settings saved', description: 'System configuration updated successfully.' });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
                <p className="text-muted-foreground">
                    Configure general system preferences.
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>General Information</CardTitle>
                        <CardDescription>Basic system identity and branding.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>System Name</Label>
                            <Input
                                value={config.systemName}
                                onChange={(e) => setConfig({ ...config, systemName: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>University Branding</Label>
                            <Input
                                value={config.branding}
                                onChange={(e) => setConfig({ ...config, branding: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-destructive/20">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <CardTitle>System Control</CardTitle>
                        </div>
                        <CardDescription>Advanced controls and maintenance.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Maintenance Mode</Label>
                                <p className="text-sm text-muted-foreground">Disable all access except for admins.</p>
                            </div>
                            <Switch
                                checked={config.maintenanceMode}
                                onCheckedChange={(checked) => setConfig({ ...config, maintenanceMode: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Face Recognition</Label>
                                <p className="text-sm text-muted-foreground">Enable or disable global face recognition features.</p>
                            </div>
                            <Switch
                                checked={config.faceRecognitionEnabled}
                                onCheckedChange={(checked) => setConfig({ ...config, faceRecognitionEnabled: checked })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button onClick={handleSave} className="gap-2">
                        <Save className="w-4 h-4" />
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
