import { useEffect, useState } from 'react';
import { Check, CircleCheck, LoaderCircle, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { api } from '../api';
import type { Order } from '../types';
import DialogShell from './DialogShell';
import ContentManager from './ContentManager';

type Props = { onClose: () => void; onResourcesChange?: () => void };
type AdminOrder = Order & { user?: { name: string; email: string } };
type Interest = { id: string; user: { name: string; email: string }; createdAt: string };
const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
const date = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value));

export default function AdminDialog({ onClose, onResourcesChange }: Props) {
  const [tab, setTab] = useState<'resources' | 'members'>('resources');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setError(''); setLoading(true);
    try {
      const [orderResult, interestResult] = await Promise.all([api<{ orders: AdminOrder[] }>('/api/admin/orders'), api<{ interests: Interest[] }>('/api/admin/interests')]);
      setOrders(orderResult.orders); setInterests(interestResult.interests);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể tải dữ liệu quản trị.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const approve = async (order: AdminOrder) => {
    setBusy(order.id); setError(''); setMessage('');
    try {
      await api(`/api/admin/orders/${encodeURIComponent(order.id)}/approve`, { method: 'POST', body: '{}' });
      setConfirm(null); await load();
      setMessage(`Đã xác nhận ${order.reference}. Quyền truy cập cao cấp của thành viên đã được mở.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể xác nhận thanh toán.'); }
    finally { setBusy(null); }
  };
  const pending = orders.filter((order) => order.status === 'pending');

  return <DialogShell title="Quản lý Studio" eyebrow="KHÔNG GIAN QUẢN TRỊ" onClose={onClose} wide className="df-admin-dialog">
    <div className="df-dialog-body">
      <div className="df-tabs" aria-label="Chọn phần quản trị">
        <button type="button" className={tab === 'resources' ? 'df-tab-active' : ''} aria-pressed={tab === 'resources'} onClick={() => setTab('resources')}>Tài nguyên</button>
        <button type="button" className={tab === 'members' ? 'df-tab-active' : ''} aria-pressed={tab === 'members'} onClick={() => setTab('members')}>Thành viên & thanh toán</button>
      </div>
      <div hidden={tab !== 'resources'}><ContentManager onResourcesChange={onResourcesChange} /></div>
      <div hidden={tab !== 'members'}>
      <div className="df-admin-toolbar"><p><ShieldCheck size={17} /> Xác nhận chuyển khoản để mở quyền thành viên.</p><button className="df-button df-button-secondary" type="button" onClick={() => void load()} disabled={loading || busy !== null}><RefreshCw size={15} className={loading ? 'df-spin' : ''} /> Làm mới</button></div>
      {error && <p className="df-error" role="alert">{error}</p>}
      {message && <p className="df-success" role="status"><CircleCheck size={18} />{message}</p>}
      {loading && <div className="df-loading" role="status"><LoaderCircle size={22} className="df-spin" /> Đang tải dữ liệu…</div>}
      {!loading && <><div className="df-admin-stats"><div><span>Chờ xác nhận</span><strong>{pending.length}</strong></div><div><span>Đã xác nhận</span><strong>{orders.filter((order) => order.status === 'approved').length}</strong></div><div><span>Đăng ký quan tâm</span><strong>{interests.length}</strong></div></div><section className="df-admin-section"><h3>Yêu cầu thanh toán</h3>{!orders.length ? <div className="df-empty"><ShieldCheck size={25} /><p>Chưa có yêu cầu thanh toán.</p></div> : <div className="df-admin-orders">{orders.map((order) => <article className="df-admin-order" key={order.id}><div className="df-admin-order-info"><strong>{order.user?.name || 'Thành viên'}</strong><span>{order.user?.email}</span><code>{order.reference}</code><small>{date(order.createdAt)}</small></div><div className="df-admin-order-action"><strong>{money(order.amount)}</strong>{order.status === 'approved' ? <span className="df-history-approved"><CircleCheck size={15} />Đã xác nhận</span> : confirm === order.id ? <div className="df-approval-confirm"><p>Bạn đã đối chiếu và nhận đủ khoản chuyển này?</p><div><button className="df-button df-button-primary" type="button" onClick={() => void approve(order)} disabled={busy !== null}>{busy === order.id ? <LoaderCircle className="df-spin" size={15} /> : <Check size={15} />}Đã nhận, mở quyền</button><button className="df-button df-button-secondary" type="button" onClick={() => setConfirm(null)} disabled={busy !== null}>Hủy</button></div></div> : <button className="df-button df-button-secondary" type="button" onClick={() => setConfirm(order.id)} disabled={busy !== null}>Xác nhận chuyển khoản</button>}</div></article>)}</div>}</section><section className="df-admin-section"><h3><Users size={19} /> Danh sách quan tâm</h3>{!interests.length ? <p className="df-small-muted">Chưa có thành viên đăng ký nhận thông báo mở cửa.</p> : <div className="df-interest-list">{interests.map((item) => <div key={item.id}><span><strong>{item.user.name}</strong><small>{item.user.email}</small></span><time dateTime={item.createdAt}>{date(item.createdAt)}</time></div>)}</div>}</section></>}
      </div>
    </div>
  </DialogShell>;
}
