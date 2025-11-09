import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Avatar,
  useTheme,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Message,
  Phone,
  WhatsApp,
  MoreVert,
  CheckCircle,
  Error,
  Warning,
  Schedule,
  Analytics,
  Storage,
  Speed,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Dados de exemplo
const messageData = [
  { name: 'Seg', enviadas: 240, recebidas: 180 },
  { name: 'Ter', enviadas: 320, recebidas: 280 },
  { name: 'Qua', enviadas: 280, recebidas: 250 },
  { name: 'Qui', enviadas: 350, recebidas: 320 },
  { name: 'Sex', enviadas: 420, recebidas: 380 },
  { name: 'Sáb', enviadas: 380, recebidas: 340 },
  { name: 'Dom', enviadas: 200, recebidas: 150 },
];

const statusData = [
  { name: 'Ativo', value: 45, color: '#4caf50' },
  { name: 'Pendente', value: 30, color: '#ff9800' },
  { name: 'Erro', value: 15, color: '#f44336' },
  { name: 'Pausado', value: 10, color: '#9e9e9e' },
];

const performanceData = [
  { time: '00:00', cpu: 30, memoria: 45, rede: 20 },
  { time: '04:00', cpu: 25, memoria: 40, rede: 18 },
  { time: '08:00', cpu: 45, memoria: 60, rede: 35 },
  { time: '12:00', cpu: 65, memoria: 70, rede: 50 },
  { time: '16:00', cpu: 55, memoria: 65, rede: 45 },
  { time: '20:00', cpu: 40, memoria: 50, rede: 30 },
  { time: '24:00', cpu: 35, memoria: 48, rede: 25 },
];

const recentActivities = [
  {
    id: 1,
    user: 'João Silva',
    action: 'Enviou mensagem',
    time: '5 min atrás',
    status: 'success',
    avatar: 'JS',
  },
  {
    id: 2,
    user: 'Maria Santos',
    action: 'Conectou instância',
    time: '15 min atrás',
    status: 'info',
    avatar: 'MS',
  },
  {
    id: 3,
    user: 'Pedro Costa',
    action: 'Erro na conexão',
    time: '30 min atrás',
    status: 'error',
    avatar: 'PC',
  },
  {
    id: 4,
    user: 'Ana Lima',
    action: 'Atualizou configurações',
    time: '1 hora atrás',
    status: 'warning',
    avatar: 'AL',
  },
];

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, color }) => {
  const theme = useTheme();
  const isPositive = change >= 0;

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}30`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${color}20`,
        }
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={color}>
              {value}
            </Typography>
            <Box display="flex" alignItems="center" mt={1}>
              {isPositive ? (
                <TrendingUp sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
              ) : (
                <TrendingDown sx={{ color: '#f44336', fontSize: 16, mr: 0.5 }} />
              )}
              <Typography
                variant="caption"
                color={isPositive ? '#4caf50' : '#f44336'}
                fontWeight="medium"
              >
                {Math.abs(change)}% vs último mês
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(icon as React.ReactElement, {
              sx: { fontSize: 28, color }
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Simular carregamento de dados
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const stats = [
    {
      title: 'Total de Instâncias',
      value: '24',
      change: 12,
      icon: <WhatsApp />,
      color: '#25D366',
    },
    {
      title: 'Mensagens Hoje',
      value: '3.2K',
      change: 8,
      icon: <Message />,
      color: '#2196f3',
    },
    {
      title: 'Usuários Ativos',
      value: '156',
      change: -3,
      icon: <People />,
      color: '#ff9800',
    },
    {
      title: 'Taxa de Entrega',
      value: '98.5%',
      change: 2,
      icon: <CheckCircle />,
      color: '#4caf50',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'error':
        return <Error sx={{ color: '#f44336' }} />;
      case 'warning':
        return <Warning sx={{ color: '#ff9800' }} />;
      default:
        return <Schedule sx={{ color: '#2196f3' }} />;
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#0a0e27', minHeight: '100vh' }}>
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" color="white" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="grey.400">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} mb={4}>
        {/* Gráfico de Mensagens */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, backgroundColor: '#141937', border: '1px solid #1e2346' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" color="white">
                Fluxo de Mensagens
              </Typography>
              <IconButton size="small">
                <MoreVert sx={{ color: 'grey.400' }} />
              </IconButton>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={messageData}>
                <defs>
                  <linearGradient id="colorEnviadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2196f3" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2196f3" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorRecebidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4caf50" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2346" />
                <XAxis dataKey="name" stroke="#667085" />
                <YAxis stroke="#667085" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e2346',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="enviadas"
                  stroke="#2196f3"
                  fillOpacity={1}
                  fill="url(#colorEnviadas)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="recebidas"
                  stroke="#4caf50"
                  fillOpacity={1}
                  fill="url(#colorRecebidas)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Status Distribution */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, backgroundColor: '#141937', border: '1px solid #1e2346' }}>
            <Typography variant="h6" color="white" mb={3}>
              Distribuição de Status
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box mt={2}>
              {statusData.map((item) => (
                <Box key={item.name} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box display="flex" alignItems="center">
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2" color="grey.400">
                      {item.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="white" fontWeight="medium">
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Performance and Activities */}
      <Grid container spacing={3}>
        {/* Performance Monitor */}
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 3, backgroundColor: '#141937', border: '1px solid #1e2346' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" color="white">
                Monitor de Performance
              </Typography>
              <Box display="flex" gap={1}>
                <Chip icon={<Speed />} label="CPU" size="small" color="primary" />
                <Chip icon={<Storage />} label="Memória" size="small" color="success" />
                <Chip icon={<Analytics />} label="Rede" size="small" color="warning" />
              </Box>
            </Box>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2346" />
                <XAxis dataKey="time" stroke="#667085" />
                <YAxis stroke="#667085" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e2346',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#2196f3"
                  strokeWidth={2}
                  dot={{ fill: '#2196f3', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="memoria"
                  stroke="#4caf50"
                  strokeWidth={2}
                  dot={{ fill: '#4caf50', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="rede"
                  stroke="#ff9800"
                  strokeWidth={2}
                  dot={{ fill: '#ff9800', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 3, backgroundColor: '#141937', border: '1px solid #1e2346' }}>
            <Typography variant="h6" color="white" mb={3}>
              Atividades Recentes
            </Typography>
            <List sx={{ width: '100%' }}>
              {recentActivities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{
                        bgcolor: activity.status === 'success' ? '#4caf50' :
                                activity.status === 'error' ? '#f44336' :
                                activity.status === 'warning' ? '#ff9800' : '#2196f3'
                      }}>
                        {activity.avatar}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body1" color="white">
                          {activity.user}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="grey.400">
                            {activity.action}
                          </Typography>
                          <Typography variant="caption" color="grey.500">
                            {activity.time}
                          </Typography>
                        </Box>
                      }
                    />
                    {getStatusIcon(activity.status)}
                  </ListItem>
                  {index < recentActivities.length - 1 && (
                    <Divider variant="inset" component="li" sx={{ borderColor: '#1e2346' }} />
                  )}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;