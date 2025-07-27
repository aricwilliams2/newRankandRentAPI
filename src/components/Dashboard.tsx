import React from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Checkbox,
  Divider,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  CircularProgress,
  Alert,
  Skeleton,
} from "@mui/material";
import { TrendingUp, Users, Globe2, Phone, DollarSign, Plus, Calendar, Edit2, Trash2, Refresh } from "lucide-react";
import { apiService, Website, Task, DashboardStats, Activity } from "../services/api";

// Transform API data to match frontend expectations
const transformWebsiteData = (apiWebsite: Website) => ({
  id: apiWebsite.id,
  domain: apiWebsite.domain,
  niche: apiWebsite.niche,
  status: apiWebsite.status,
  monthlyRevenue: parseFloat(apiWebsite.monthly_revenue),
  phoneNumbers: [],
  leads: [],
  seoMetrics: {
    domainAuthority: apiWebsite.domain_authority,
    backlinks: apiWebsite.backlinks,
    organicKeywords: apiWebsite.organic_keywords,
    organicTraffic: apiWebsite.organic_traffic,
    topKeywords: apiWebsite.top_keywords || [],
    competitors: apiWebsite.competitors || [],
    lastUpdated: new Date(apiWebsite.seo_last_updated || apiWebsite.updated_at),
  },
  createdAt: new Date(apiWebsite.created_at),
  updatedAt: new Date(apiWebsite.updated_at),
});

const transformTaskData = (apiTask: Task) => ({
  id: apiTask.id,
  websiteId: apiTask.website_id,
  title: apiTask.title,
  description: apiTask.description,
  status: apiTask.status,
  priority: apiTask.priority,
  assignee: apiTask.assignee,
  dueDate: new Date(apiTask.due_date),
  websiteDomain: apiTask.website_domain,
  createdAt: new Date(apiTask.created_at),
  updatedAt: new Date(apiTask.updated_at),
});

export default function Dashboard() {
  const theme = useTheme();
  
  // State management
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [websites, setWebsites] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  
  // Loading states
  const [tasksLoading, setTasksLoading] = React.useState(true);
  const [websitesLoading, setWebsitesLoading] = React.useState(true);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [activitiesLoading, setActivitiesLoading] = React.useState(true);
  
  // Error states
  const [error, setError] = React.useState<string | null>(null);
  
  // UI state
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);
  const [taskFilter, setTaskFilter] = React.useState("all");
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    website_id: "",
    priority: "medium",
    status: "todo",
    assignee: "",
    due_date: "",
  });

  // Load initial data
  React.useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      await Promise.all([
        loadWebsites(),
        loadTasks(),
        loadStats(),
        loadActivities(),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    }
  };

  const loadWebsites = async () => {
    try {
      setWebsitesLoading(true);
      const response = await apiService.getWebsites({ status: 'active' });
      const transformedWebsites = response.data.map(transformWebsiteData);
      setWebsites(transformedWebsites);
    } catch (error) {
      console.error('Failed to load websites:', error);
    } finally {
      setWebsitesLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      setTasksLoading(true);
      const response = await apiService.getTasks({ sort_by: 'created_at', sort_dir: 'desc' });
      const transformedTasks = response.data.map(transformTaskData);
      setTasks(transformedTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const response = await apiService.getDashboardStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      setActivitiesLoading(true);
      const response = await apiService.getRecentActivity(10);
      if (response.success) {
        setActivities(response.data);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleTaskDialogOpen = (task?: any) => {
    if (task) {
      setSelectedTask(task);
      setFormData({
        title: task.title,
        description: task.description,
        website_id: task.websiteId,
        priority: task.priority,
        status: task.status,
        assignee: task.assignee,
        due_date: task.dueDate.toISOString().split("T")[0],
      });
    } else {
      setSelectedTask(null);
      setFormData({
        title: "",
        description: "",
        website_id: "",
        priority: "medium",
        status: "todo",
        assignee: "",
        due_date: "",
      });
    }
    setTaskDialogOpen(true);
  };

  const handleTaskDialogClose = () => {
    setTaskDialogOpen(false);
    setSelectedTask(null);
  };

  const handleTaskSubmit = async () => {
    try {
      if (selectedTask) {
        await apiService.updateTask(selectedTask.id, formData);
      } else {
        await apiService.createTask(formData);
      }
      handleTaskDialogClose();
      loadTasks(); // Reload tasks after creating/updating
    } catch (error) {
      console.error('Failed to save task:', error);
      setError('Failed to save task. Please try again.');
    }
  };

  const handleTaskDelete = async (id: string) => {
    try {
      await apiService.deleteTask(id);
      loadTasks(); // Reload tasks after deletion
    } catch (error) {
      console.error('Failed to delete task:', error);
      setError('Failed to delete task. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "warning";
      case "todo":
        return "info";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "default";
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === "all") return true;
    return task.status === taskFilter;
  });

  // Convert stats to the format expected by the UI
  const statsArray = stats ? [
    { 
      label: stats.totalRevenue.label, 
      value: stats.totalRevenue.value, 
      change: stats.totalRevenue.change, 
      icon: DollarSign 
    },
    { 
      label: stats.activeWebsites.label, 
      value: stats.activeWebsites.value, 
      change: stats.activeWebsites.change, 
      icon: Globe2 
    },
    { 
      label: stats.totalLeads.label, 
      value: stats.totalLeads.value, 
      change: stats.totalLeads.change, 
      icon: TrendingUp 
    },
    { 
      label: stats.activeClients.label, 
      value: stats.activeClients.value, 
      change: stats.activeClients.change, 
      icon: Users 
    },
    { 
      label: stats.totalPhones.label, 
      value: stats.totalPhones.value, 
      change: stats.totalPhones.change, 
      icon: Phone 
    },
  ] : [];

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" startIcon={<Refresh />} onClick={loadDashboardData}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard Overview
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <ButtonGroup variant="outlined" size="small">
            <Button onClick={() => setTaskFilter("all")} variant={taskFilter === "all" ? "contained" : "outlined"}>
              All
            </Button>
            <Button onClick={() => setTaskFilter("todo")} variant={taskFilter === "todo" ? "contained" : "outlined"}>
              To Do
            </Button>
            <Button onClick={() => setTaskFilter("in_progress")} variant={taskFilter === "in_progress" ? "contained" : "outlined"}>
              In Progress
            </Button>
            <Button onClick={() => setTaskFilter("completed")} variant={taskFilter === "completed" ? "contained" : "outlined"}>
              Completed
            </Button>
          </ButtonGroup>
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={() => handleTaskDialogOpen()}>
            Add Task
          </Button>
          <Button variant="outlined" startIcon={<Refresh size={20} />} onClick={loadDashboardData}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsLoading ? (
          // Show loading skeletons
          Array.from({ length: 5 }).map((_, index) => (
            <Grid item xs={12} md={6} lg={4} xl={2.4} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="circular" width={24} height={24} sx={{ mb: 2 }} />
                  <Skeleton variant="text" height={40} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" height={20} />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          statsArray.map((stat) => {
            const Icon = stat.icon;
            return (
              <Grid item xs={12} md={6} lg={4} xl={2.4} key={stat.label}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                      <Icon size={24} color={theme.palette.primary.main} />
                      <Typography color="success.main" variant="body2">
                        {stat.change}
                      </Typography>
                    </Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {stat.value}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {stat.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* Tasks Table */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="medium" sx={{ mb: 3 }}>
                Project Tasks
              </Typography>
              {tasksLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Task</TableCell>
                        <TableCell>Website</TableCell>
                        <TableCell>Assignee</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTasks.map((task) => {
                        const website = websites.find((w) => w.id === task.websiteId);
                        return (
                          <TableRow key={task.id}>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {task.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {task.description}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Globe2 size={16} />
                                <Typography variant="body2">
                                  {task.websiteDomain || website?.domain || "Unassigned"}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{task.assignee}</Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Calendar size={16} />
                                <Typography variant="body2">{task.dueDate.toLocaleDateString()}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip size="small" label={task.priority} color={getPriorityColor(task.priority)} />
                            </TableCell>
                            <TableCell>
                              <Chip size="small" label={task.status} color={getStatusColor(task.status)} />
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                                <IconButton size="small" onClick={() => handleTaskDialogOpen(task)}>
                                  <Edit2 size={16} />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => handleTaskDelete(task.id)}>
                                  <Trash2 size={16} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="medium" sx={{ mb: 2 }}>
                Recent Activity
              </Typography>
              {activitiesLoading ? (
                <Box>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
                      <Skeleton variant="text" height={16} width="60%" />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ "& > *:not(:last-child)": { mb: 2 } }}>
                  {activities.length > 0 ? (
                    activities.map((activity, index) => (
                      <React.Fragment key={activity.id}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            p: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                bgcolor: "primary.main",
                              }}
                            />
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {activity.title}
                              </Typography>
                              {activity.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {activity.description}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {activity.timeAgo}
                          </Typography>
                        </Box>
                        {index < activities.length - 1 && <Divider />}
                      </React.Fragment>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No recent activity
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onClose={handleTaskDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedTask ? "Edit Task" : "Add New Task"}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField 
              label="Title" 
              fullWidth 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
            />
            <TextField 
              label="Description" 
              fullWidth 
              multiline 
              rows={3} 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
            />
            <FormControl fullWidth>
              <InputLabel>Website</InputLabel>
              <Select 
                value={formData.website_id} 
                label="Website" 
                onChange={(e) => setFormData({ ...formData, website_id: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {websites.map((website) => (
                  <MenuItem key={website.id} value={website.id}>
                    {website.domain}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField 
              label="Assignee" 
              fullWidth 
              value={formData.assignee} 
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })} 
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select 
                value={formData.priority} 
                label="Priority" 
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select 
                value={formData.status} 
                label="Status" 
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="todo">To Do</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
            <TextField 
              label="Due Date" 
              type="date" 
              fullWidth 
              value={formData.due_date} 
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} 
              InputLabelProps={{ shrink: true }} 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTaskDialogClose}>Cancel</Button>
          <Button variant="contained" onClick={handleTaskSubmit}>
            {selectedTask ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}