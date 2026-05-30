import React, { useState, useEffect } from 'react';
import {
  FileText, TrendingUp, CheckCircle, XCircle, FolderKanban, Users, IndianRupee, Bell,
  ArrowUpRight, Clock,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, FunnelChart, Funnel, LabelList, Legend,
} from 'recharts';
import API from '../api/axios';
import Spinner from '../components/common/Spinner';
import StatusBadge from '../components/common/StatusBadge';
import { Card, CardHeader, CardBody } from '../components/common/FormComponents';

const COLORS = ['#3b82f6', '#f97316', '#a855f7', '#eab308', '#22c55e', '#ef4444', '#6b7280', '#10b981'];

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between`}>
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
  </div>
);

const formatCurrency = (val) =>
  val >= 100000
    ? `₹${(val / 100000).toFixed(1)}L`
    : `₹${val?.toLocaleString('en-IN') || 0}`;

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [recent, setRecent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, recentRes] = await Promise.all([
          API.get('/dashboard/stats'),
          API.get('/dashboard/recent'),
        ]);
        setStats(statsRes.data.data.stats);
        setCharts(statsRes.data.data.charts);
        setRecent(recentRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Inquiries" value={stats?.totalInquiries || 0} icon={FileText} color="bg-blue-600" />
        <StatCard label="New Inquiries" value={stats?.newInquiries || 0} icon={ArrowUpRight} color="bg-indigo-500" />
        <StatCard label="Ongoing" value={stats?.ongoingInquiries || 0} icon={TrendingUp} color="bg-orange-500" />
        <StatCard label="Quotation Sent" value={stats?.quotationSent || 0} icon={FileText} color="bg-purple-500" />
        <StatCard label="Won Projects" value={stats?.wonProjects || 0} icon={CheckCircle} color="bg-green-600" />
        <StatCard label="Lost" value={stats?.lostProjects || 0} icon={XCircle} color="bg-red-500" />
        <StatCard label="Completed Projects" value={stats?.completedProjects || 0} icon={FolderKanban} color="bg-emerald-600" />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(stats?.monthlyRevenue)}
          icon={IndianRupee}
          color="bg-teal-600"
          sub={`Total: ${formatCurrency(stats?.totalRevenue)}`}
        />
      </div>

      {/* Alerts row */}
      {stats?.pendingFollowUps > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Bell size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{stats.pendingFollowUps}</strong> pending follow-up{stats.pendingFollowUps > 1 ? 's' : ''} require your attention.
          </p>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inquiry Trend */}
        <Card>
          <CardHeader title="Inquiry Trend" subtitle="Last 6 months" />
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts?.inquiryTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="inquiries" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader title="Revenue by Month" subtitle="Project order values" />
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts?.revenueByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pie */}
        <Card>
          <CardHeader title="Inquiry Status Distribution" />
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={charts?.statusDistribution || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {(charts?.statusDistribution || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Sales Funnel */}
        <Card>
          <CardHeader title="Sales Funnel" />
          <CardBody>
            <div className="space-y-3 pt-2">
              {(charts?.salesFunnel || []).map((item, i) => {
                const max = charts?.salesFunnel?.[0]?.count || 1;
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={item.stage}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.stage}</span>
                      <span className="font-semibold text-gray-800">{item.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inquiries */}
        <Card>
          <CardHeader title="Recent Inquiries" />
          <div className="divide-y divide-gray-50">
            {recent?.recentInquiries?.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No inquiries yet</p>
            )}
            {recent?.recentInquiries?.map((inq) => (
              <div key={inq._id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inq.customerName}</p>
                  <p className="text-xs text-gray-400">{inq.inquiryId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={inq.priority} size="xs" />
                  <StatusBadge status={inq.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Projects */}
        <Card>
          <CardHeader title="Recent Projects" />
          <div className="divide-y divide-gray-50">
            {recent?.recentProjects?.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No projects yet</p>
            )}
            {recent?.recentProjects?.map((proj) => (
              <div key={proj._id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{proj.projectName}</p>
                  <p className="text-xs text-gray-400">{proj.projectId} · ₹{proj.orderValue?.toLocaleString('en-IN')}</p>
                </div>
                <StatusBadge status={proj.projectStatus} size="xs" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
