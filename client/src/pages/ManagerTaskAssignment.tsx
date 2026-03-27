import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2, CheckCircle2, AlertCircle, Clock, Trash2, AlertTriangle, User } from 'lucide-react';

const TASK_TYPES = [
  { value: 'planting', label: 'Planting' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'fertilization', label: 'Fertilization' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'weed_control', label: 'Weed Control' },
  { value: 'harvest', label: 'Harvest' },
  { value: 'equipment_maintenance', label: 'Equipment Maintenance' },
  { value: 'soil_testing', label: 'Soil Testing' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-blue-500 text-white' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500 text-white' },
  { value: 'high', label: 'High', color: 'bg-orange-500 text-white' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500 text-white' },
];

const STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800 border border-blue-300' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 border border-green-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border border-gray-300' },
];

interface NewTask {
  title: string;
  description: string;
  taskType: string;
  priority: string;
  dueDate: string;
  dueTime: string;
  assignedToUserId: number;
  fieldId?: number;
}

export function ManagerTaskAssignment() {
  const { user } = useAuth();
  const [farmId] = useState<number>(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const now = new Date();

  const createTaskMutation = trpc.fieldWorker.createTask.useMutation({
    onSuccess: () => {
      utils.fieldWorker.getTasks.invalidate({ farmId });
      setNewTask({
        title: '',
        description: '',
        taskType: 'monitoring',
        priority: 'medium',
        dueDate: new Date().toISOString().split('T')[0],
        dueTime: '09:00',
        assignedToUserId: 0,
      });
      setIsDialogOpen(false);
    },
  });

  const deleteTaskMutation = trpc.fieldWorker.deleteTask.useMutation({
    onSuccess: () => utils.fieldWorker.getTasks.invalidate({ farmId }),
  });

  const updateStatusMutation = trpc.fieldWorker.updateTaskStatus.useMutation({
    onSuccess: () => {
      utils.fieldWorker.getTasks.invalidate({ farmId });
      setUpdatingTaskId(null);
    },
    onError: () => setUpdatingTaskId(null),
  });

  const [newTask, setNewTask] = useState<NewTask>({
    title: '',
    description: '',
    taskType: 'monitoring',
    priority: 'medium',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '09:00',
    assignedToUserId: 0,
  });

  const { data: allTasks = [], isLoading: isLoadingTasks } = trpc.fieldWorker.getTasks.useQuery({ farmId });
  const { data: fieldWorkers = [], isLoading: isLoadingWorkers } = trpc.workforce.workers.list.useQuery({ farmId });

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesSearch =
        searchQuery === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.assignedWorkerName || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [allTasks, filterStatus, filterPriority, searchQuery]);

  const isOverdue = (task: typeof allTasks[0]) => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.dueDate) < now;
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || newTask.assignedToUserId === 0) {
      alert('Please fill in all required fields and select a worker.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createTaskMutation.mutateAsync({
        farmId,
        title: newTask.title,
        description: newTask.description,
        taskType: newTask.taskType as any,
        priority: newTask.priority as any,
        dueDate: `${newTask.dueDate}T${newTask.dueTime}:00`,
        assignedToUserId: newTask.assignedToUserId,
        fieldId: newTask.fieldId,
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdatingTaskId(taskId);
    try {
      await updateStatusMutation.mutateAsync({
        taskId,
        status: newStatus as 'pending' | 'in_progress' | 'completed',
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update task status. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTaskMutation.mutateAsync({ taskId });
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const getPriorityStyle = (priority: string) =>
    PRIORITIES.find((p) => p.value === priority)?.color || 'bg-gray-500 text-white';

  const getStatusStyle = (status: string) =>
    STATUSES.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-600';

  const overdueCount = allTasks.filter(isOverdue).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Task Management</h1>
            <p className="text-muted-foreground">Assign and monitor field worker tasks</p>
          </div>
          <div className="flex items-center gap-3">
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                {overdueCount} overdue task{overdueCount > 1 ? 's' : ''}
              </div>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>Assign a task to a field worker</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Task Title *</label>
                    <Input
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="e.g., Monitor crop health in Field A"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Task Type *</label>
                    <Select value={newTask.taskType} onValueChange={(v) => setNewTask({ ...newTask, taskType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Description *</label>
                    <Textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Detailed instructions for the task"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Assign To *</label>
                    <Select
                      value={newTask.assignedToUserId > 0 ? newTask.assignedToUserId.toString() : ''}
                      onValueChange={(v) => setNewTask({ ...newTask, assignedToUserId: parseInt(v) })}
                      disabled={isLoadingWorkers}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingWorkers ? 'Loading workers...' : 'Select field worker'} />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldWorkers.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">No workers available</div>
                        ) : (
                          fieldWorkers.map((w) => (
                            <SelectItem key={w.id} value={w.id.toString()}>
                              {w.name}{w.email ? ` (${w.email})` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Priority</label>
                    <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Due Date *</label>
                      <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Due Time</label>
                      <Input type="time" value={newTask.dueTime} onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Task'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Search</label>
                <Input placeholder="Search tasks or workers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Priority</label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="w-full" onClick={() => { setSearchQuery(''); setFilterStatus('all'); setFilterPriority('all'); }}>
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-3">
          {isLoadingTasks ? (
            <Card>
              <CardContent className="pt-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Loading tasks...</p>
              </CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="pt-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {allTasks.length === 0 ? 'No tasks yet. Create your first task!' : 'No tasks match your filters.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const overdue = isOverdue(task);
              return (
                <Card
                  key={task.taskId}
                  className={`transition-shadow hover:shadow-md ${overdue ? 'border-red-300 bg-red-50/30' : ''}`}
                >
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {overdue && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3" /> OVERDUE
                            </span>
                          )}
                          <h3 className={`text-base font-semibold ${overdue ? 'text-red-700' : 'text-foreground'}`}>
                            {task.title}
                          </h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPriorityStyle(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                        )}

                        {/* Meta row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Assigned To</p>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {task.assignedWorkerName || `Worker #${task.assignedToUserId}`}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Type</p>
                            <p className="font-medium text-foreground capitalize">{task.taskType.replace(/_/g, ' ')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Due Date</p>
                            <p className={`font-medium ${overdue ? 'text-red-600' : 'text-foreground'}`}>
                              {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                            <p className="font-medium text-foreground">{new Date(task.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Right side: status dropdown + delete */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          {updatingTaskId === task.taskId ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Select
                              value={task.status}
                              onValueChange={(v) => handleStatusChange(task.taskId, v)}
                              disabled={updatingTaskId !== null}
                            >
                              <SelectTrigger className={`h-8 text-xs w-36 ${getStatusStyle(task.status)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.filter(s => s.value !== 'cancelled').map((s) => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteTask(task.taskId)}
                            disabled={deleteTaskMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">Total Tasks</p>
              <p className="text-2xl font-bold text-foreground">{allTasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{allTasks.filter((t) => t.status === 'pending').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{allTasks.filter((t) => t.status === 'in_progress').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">{allTasks.filter((t) => t.status === 'completed').length}</p>
            </CardContent>
          </Card>
          <Card className={overdueCount > 0 ? 'border-red-300' : ''}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">Overdue</p>
              <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-foreground'}`}>{overdueCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
