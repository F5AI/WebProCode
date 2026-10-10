import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, LoaderCircle, LockKeyhole } from 'lucide-react';
import { api } from '../api';
import type { User } from '../types';
import DialogShell from './DialogShell';

type Props = { onClose: () => void; onSuccess: (user: User) => void };

export default function AuthDialog({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(''); setBusy(true);
    try {
      const result = await api<{ user: User }>(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
      onSuccess(result.user);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể đăng nhập. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };

  return <DialogShell title={mode === 'login' ? 'Chào mừng bạn trở lại.' : 'Bắt đầu hành trình làm phim AI.'} eyebrow="F5 AI CLUB" onClose={onClose} className="df-auth-dialog">
    <div className="df-dialog-body">
      <p className="df-description">Một tài khoản để tham gia câu lạc bộ và truy cập tài nguyên dành cho thành viên.</p>
      <div className="df-tabs" aria-label="Chọn hình thức truy cập">
        <button type="button" className={mode === 'login' ? 'df-tab-active' : ''} aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Đăng nhập</button>
        <button type="button" className={mode === 'register' ? 'df-tab-active' : ''} aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>Tạo tài khoản</button>
      </div>
      <form onSubmit={submit} className="df-form">
        {mode === 'register' && <label className="df-field">Tên của bạn<input data-dialog-focus name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Bạn muốn được gọi là gì?" maxLength={100} required disabled={busy} /></label>}
        <label className="df-field">Email<input data-dialog-focus={mode === 'login' ? true : undefined} name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@email.com" maxLength={254} required disabled={busy} /></label>
        <label className="df-field">Mật khẩu<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ít nhất 8 ký tự" minLength={8} maxLength={128} required disabled={busy} /></label>
        {error && <p className="df-error" role="alert">{error}</p>}
        <button className="df-button df-button-primary df-button-full" type="submit" disabled={busy}>{busy ? <LoaderCircle size={18} className="df-spin" /> : <ArrowRight size={18} />}{busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản miễn phí'}</button>
      </form>
      <div className="df-auth-note"><Check size={16} /><span>Tài nguyên cơ bản luôn miễn phí. Không cần thẻ thanh toán.</span></div>
      <p className="df-security-note"><LockKeyhole size={13} /> Mật khẩu được bảo vệ khi lưu trữ.</p>
    </div>
  </DialogShell>;
}
