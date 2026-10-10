import { useEffect, useState } from 'react';
import { ArrowRight, Check, CircleCheck, Copy, Gauge, Gem, LoaderCircle, Mail, RefreshCw, Sparkles, Wallet } from 'lucide-react';
import { api } from '../api';
import type { Order, PaymentConfig, User } from '../types';
import DialogShell from './DialogShell';

type Props = { user: User | null; onClose: () => void; onLogin: () => void; onUserChange: (user: User) => void };
type Config = PaymentConfig;
const money = (amount: number, currency = 'VND') => new Intl.NumberFormat('vi-VN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
const date = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'Asia/Bangkok' }).format(new Date(value));

export default function MembershipDialog({ user, onClose, onLogin, onUserChange }: Props) {
  const [config, setConfig] = useState<Config | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'order' | 'interest' | 'refresh' | null>(null);
  const [copied, setCopied] = useState('');

  const load = async (refreshUser = false) => {
    setError('');
    try {
      const [payment, history] = await Promise.all([
        api<Config>('/api/membership/config'),
        user ? api<{ orders: Order[] }>('/api/membership/orders') : Promise.resolve({ orders: [] }),
      ]);
      setConfig(payment); setOrders(history.orders);
      if (refreshUser && user) {
        const session = await api<{ user: User | null }>('/api/session');
        if (session.user) onUserChange(session.user);
        else setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể tải thông tin câu lạc bộ.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [user?.id]);

  const join = async () => {
    if (!user) { onLogin(); return; }
    setBusy('order'); setError('');
    try {
      const result = await api<{ order: Order; payment?: Config }>('/api/membership/orders', { method: 'POST', body: '{}' });
      setOrders((previous) => [result.order, ...previous.filter((item) => item.id !== result.order.id)]);
      if (result.payment) setConfig(result.payment);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể tạo yêu cầu tham gia.'); }
    finally { setBusy(null); }
  };

  const interest = async () => {
    if (!user) { onLogin(); return; }
    setBusy('interest'); setError('');
    try {
      await api<{ registered: boolean }>('/api/membership/interest', { method: 'POST', body: '{}' });
      setConfig((previous) => previous ? { ...previous, interested: true } : previous);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể đăng ký nhận thông báo.'); }
    finally { setBusy(null); }
  };

  const refresh = async () => { setBusy('refresh'); await load(true); setBusy(null); };
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(value); }
    catch { setError('Chưa thể sao chép tự động. Bạn có thể chọn và sao chép thông tin chuyển khoản bên dưới.'); }
  };
  const pending = orders.find((order) => order.status === 'pending');
  const bank = config?.bank || null;

  return <DialogShell title="Cùng làm phim AI tốt hơn." eyebrow="F5 AI CLUB · THÀNH VIÊN" onClose={onClose} className="df-membership-dialog">
    <div className="df-dialog-body">
      <p className="df-description">Bạn đã có đủ tài nguyên miễn phí để làm bộ phim đầu tiên. Câu lạc bộ giúp bạn đi xa hơn với quy trình tối ưu và các bộ công cụ nâng cao.</p>
      <div className="df-benefit-grid">
        <div><Gauge size={19} /><strong>Nhanh hơn</strong><span>Bớt thao tác lặp, dành thời gian cho ý tưởng.</span></div>
        <div><Gem size={19} /><strong>Chất lượng tốt hơn</strong><span>Kiểm soát nhân vật, cảnh và đầu ra rõ ràng.</span></div>
        <div><Wallet size={19} /><strong>Tối ưu chi phí</strong><span>Ưu tiên công cụ mở và quy trình tiết kiệm.</span></div>
        <div><Sparkles size={19} /><strong>Dễ vận hành</strong><span>File thực hành và hướng dẫn từng bước.</span></div>
      </div>
      {loading && <div className="df-loading" role="status"><LoaderCircle size={22} className="df-spin" /> Đang tải thông tin…</div>}
      {error && <p className="df-error" role="alert">{error}</p>}
      {!loading && !config && <button className="df-button df-button-secondary" type="button" onClick={() => { setLoading(true); void load(); }}>Thử lại</button>}
      {config && user?.isMember ? <div className="df-membership-active"><CircleCheck size={28} /><div><h3>Bạn đang là thành viên câu lạc bộ.</h3><p>{user.memberUntil ? `Quyền truy cập cao cấp có hiệu lực đến ${date(user.memberUntil)}.` : 'Quyền truy cập cao cấp của bạn đã được mở.'}</p></div><button className="df-button df-button-secondary" type="button" onClick={onClose}>Khám phá tài nguyên <ArrowRight size={16} /></button></div> : config && !config.paymentConfigured ? <div className="df-coming-soon"><span className="df-status-pill"><span /> SẮP MỞ CỬA</span><h3>Câu lạc bộ đang được chuẩn bị.</h3><p>Đăng ký quan tâm bằng tài khoản của bạn. Email được lưu để chủ câu lạc bộ liên hệ khi bắt đầu nhận thành viên.</p>{config.interested ? <div className="df-success" role="status"><CircleCheck size={19} /><span>Đã lưu đăng ký quan tâm của bạn. Bạn vẫn có thể tiếp tục học với toàn bộ tài nguyên miễn phí.</span></div> : <button className="df-button df-button-primary df-button-full" type="button" onClick={interest} disabled={busy !== null}>{busy === 'interest' ? <LoaderCircle size={17} className="df-spin" /> : <Mail size={17} />}{user ? 'Nhận thông báo mở cửa' : 'Đăng nhập để nhận thông báo'}</button>}<p className="df-small-muted">Chưa thu phí ở giai đoạn này.</p></div> : config && <div className="df-plan-card"><div className="df-plan-heading"><span>THÀNH VIÊN CÂU LẠC BỘ</span><Sparkles size={19} /></div><div className="df-plan-price">{money(config.price, config.currency)}<span> / {config.durationDays} ngày</span></div><ul className="df-plan-features"><li><Check size={16} /> Mở tất cả file và workflow cao cấp hiện có</li><li><Check size={16} /> Tài liệu hướng dẫn HTML và file thực hành</li><li><Check size={16} /> Truy cập tài nguyên mới trong thời hạn thành viên</li></ul>{!pending && <button className="df-button df-button-primary df-button-full" type="button" onClick={join} disabled={busy !== null}>{busy === 'order' ? <LoaderCircle className="df-spin" size={18} /> : <ArrowRight size={18} />}{user ? 'Tạo yêu cầu tham gia' : 'Đăng nhập để tham gia'}</button>}<p className="df-small-muted">Chuyển khoản ngân hàng · Xác nhận thủ công · Không tự động gia hạn</p></div>}
      {config?.paymentConfigured && pending && !user?.isMember && <section className="df-payment-panel"><div className="df-payment-heading"><h3>Thông tin chuyển khoản</h3><span className="df-pending-badge">Chờ xác nhận</span></div><p>Chuyển đúng số tiền và nội dung bên dưới. Quyền truy cập cao cấp sẽ được mở sau khi quản trị viên xác nhận khoản thanh toán.</p><dl className="df-payment-details"><div><dt>Số tiền</dt><dd>{money(pending.amount, config.currency)}</dd></div>{bank && <><div><dt>Ngân hàng</dt><dd>{bank.name}</dd></div><div><dt>Số tài khoản</dt><dd>{bank.account}<button className="df-copy-button" type="button" onClick={() => void copy(bank.account)} aria-label="Sao chép số tài khoản">{copied === bank.account ? <Check size={15} /> : <Copy size={15} />}</button></dd></div><div><dt>Chủ tài khoản</dt><dd>{bank.accountName}</dd></div></>}<div><dt>Nội dung</dt><dd><code>{pending.reference}</code><button className="df-copy-button" type="button" onClick={() => void copy(pending.reference)} aria-label="Sao chép nội dung chuyển khoản">{copied === pending.reference ? <Check size={15} /> : <Copy size={15} />}</button></dd></div></dl><button className="df-button df-button-secondary df-button-full" type="button" onClick={refresh} disabled={busy !== null}><RefreshCw className={busy === 'refresh' ? 'df-spin' : ''} size={16} />{busy === 'refresh' ? 'Đang kiểm tra…' : 'Kiểm tra trạng thái thanh toán'}</button><p className="df-small-muted">Yêu cầu: {pending.reference}. Giữ lại biên nhận chuyển khoản để đối chiếu.</p></section>}
      {orders.some((order) => order.status === 'approved') && <div className="df-order-history"><h3>Lịch sử đã xác nhận</h3>{orders.filter((order) => order.status === 'approved').map((order) => <div key={order.id}><span>{order.reference}<small>{date(order.createdAt)}</small></span><span>{money(order.amount, order.currency)}<small className="df-history-approved">Đã xác nhận</small></span></div>)}</div>}
    </div>
  </DialogShell>;
}
