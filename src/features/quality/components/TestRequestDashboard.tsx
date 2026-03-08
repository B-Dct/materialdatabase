import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { parseISO, format, differenceInDays, isValid } from 'date-fns';
import { Activity, ClipboardList, Clock, AlertTriangle } from 'lucide-react';

const COLORS = {
    requested: '#94a3b8',
    specimen_preparation: '#f97316',
    testing: '#3b82f6',
    completed: '#22c55e',
    canceled: '#ef4444'
};

export function TestRequestDashboard() {
    const { testRequests, testTasks } = useAppStore();

    const stats = useMemo(() => {
        const today = new Date();
        const currentYear = today.getFullYear();

        let activeCount = 0;
        let completedThisYear = 0;
        let totalThisYear = 0;
        let totalTurnaroundDays = 0;
        let completedWithTurnaround = 0;
        let overdueCount = 0;

        const statusCounts: Record<string, number> = {
            requested: 0,
            specimen_preparation: 0,
            testing: 0,
            completed: 0,
            canceled: 0
        };

        const monthlyVolume = Array(12).fill(0).map((_, i) => ({
            name: format(new Date(2000, i, 1), 'MMM'),
            requests: 0,
            completed: 0
        }));

        testRequests.forEach(req => {
            const reqDate = parseISO(req.createdAt);
            const isThisYear = isValid(reqDate) && reqDate.getFullYear() === currentYear;

            if (isThisYear) {
                totalThisYear++;
                monthlyVolume[reqDate.getMonth()].requests++;
            }

            if (req.status !== 'completed' && req.status !== 'canceled') {
                activeCount++;
            }

            if (statusCounts[req.status] !== undefined) {
                statusCounts[req.status]++;
            }

            // Check if overdue
            let isOverdue = false;
            if (req.targetDate && req.status !== 'completed' && req.status !== 'canceled') {
                const target = parseISO(req.targetDate);
                if (isValid(target) && target < today) isOverdue = true;
            } else if (req.status !== 'completed' && req.status !== 'canceled') {
                // Check if any tasks are overdue
                const tasks = testTasks[req.id] || [];
                const hasOverdueTask = tasks.some(t => {
                    if (t.status === 'done' || t.status === 'canceled' || !t.targetDate) return false;
                    const tgt = parseISO(t.targetDate);
                    return isValid(tgt) && tgt < today;
                });
                if (hasOverdueTask) isOverdue = true;
            }

            if (isOverdue) overdueCount++;

            // Turnaround calculation (estimated for completed)
            if (req.status === 'completed' && isValid(reqDate)) {
                if (isThisYear) completedThisYear++;

                // Try finding actual completion date via tasks
                const tasks = testTasks[req.id] || [];
                let completionDate = reqDate; // fallback
                if (tasks.length > 0) {
                    const latestTask = [...tasks].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                    if (latestTask && isValid(parseISO(latestTask.updatedAt))) {
                        completionDate = parseISO(latestTask.updatedAt);
                    }
                }

                if (isThisYear && completionDate.getMonth() !== undefined) {
                    monthlyVolume[completionDate.getMonth()].completed++;
                }

                const days = differenceInDays(completionDate, reqDate);
                if (days >= 0) {
                    totalTurnaroundDays += days;
                    completedWithTurnaround++;
                }
            }
        });

        const avgTurnaround = completedWithTurnaround > 0 ? Math.round(totalTurnaroundDays / completedWithTurnaround) : 0;

        const distributionData = Object.entries(statusCounts)
            .filter(([_, count]) => count > 0)
            .map(([status, count]) => ({
                name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value: count,
                fill: COLORS[status as keyof typeof COLORS] || '#000'
            }));

        return {
            activeCount,
            totalThisYear,
            completedThisYear,
            avgTurnaround,
            overdueCount,
            monthlyVolume,
            distributionData
        };
    }, [testRequests, testTasks]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                        <Activity className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeCount}</div>
                        <p className="text-xs text-muted-foreground">In progress or queue</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
                        <AlertTriangle className={`h-4 w-4 ${stats.overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.overdueCount}</div>
                        <p className="text-xs text-muted-foreground">Require immediate attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgTurnaround} <span className="text-sm font-normal text-muted-foreground">days</span></div>
                        <p className="text-xs text-muted-foreground">Based on completed requests</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Requests This Year</CardTitle>
                        <ClipboardList className="h-4 w-4 text-slate-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalThisYear}</div>
                        <p className="text-xs text-muted-foreground">{stats.completedThisYear} completed ({stats.totalThisYear > 0 ? Math.round(stats.completedThisYear / stats.totalThisYear * 100) : 0}%)</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {stats.distributionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.distributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.distributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Monthly Volume ({new Date().getFullYear()})</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthlyVolume} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tickMargin={10} />
                                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="requests" name="Incoming" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                                <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
