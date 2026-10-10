import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, CircleCheck, FileText, Film, LoaderCircle, Pencil, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { api } from '../api';
import type { Download, Resource } from '../types';

type EditableResource = Resource & { freeVideoFile?: string | null; premiumVideoFile?: string | null };
type Props = { onResourcesChange?: () => void };
const categories = ['Kịch bản', 'Nhân vật', 'Bối cảnh', 'Video', 'Hậu kỳ'];
const covers = [
  { value: '/images/hero.png', label: 'Bộ phim · Khung cảnh điện ảnh' },
  { value: '/images/character.png', label: 'Nhân vật · Chân dung' },
  { value: '/images/script.svg', label: 'Kịch bản · Câu chuyện' },
  { value: '/images/workflow.svg', label: 'Workflow · Quy trình' },
  { value: '/images/edit.svg', label: 'Hậu kỳ · Dựng phim' },
];
const freshResource = (): EditableResource => ({ id: '', title: '', description: '', type: 'guide', category: 'Kịch bản', image: '/images/hero.png', duration: '10 phút', level: 'Cơ bản', author: 'F5 AI', sections: [{ title: '', body: '' }], freeDownloads: [], premiumDownloads: [], premiumBenefit: '', videoUrl: null, featured: false, step: 1, freeVideoFile: null, premiumVideoFile: null });

export default function ContentManager({ onResourcesChange }: Props) {
  const [resources, setResources] = useState<EditableResource[]>([]);
  const [draft, setDraft] = useState<EditableResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const editor = useRef<HTMLElement>(null);
  const unavailable = busy !== null || uploading !== null;

  const load = async () => {
    setLoading(true); setError('');
    try { const result = await api<{ resources: EditableResource[] }>('/api/admin/resources'); setResources(result.resources); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể tải tài nguyên.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (draft) editor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [draft?.id]);

  const update = <K extends keyof EditableResource>(key: K, value: EditableResource[K]) => setDraft((previous) => previous ? { ...previous, [key]: value } : previous);
  const edit = (resource: EditableResource) => {
    setDraft({ ...resource, sections: (resource.sections || []).map((section) => ({ ...section })), freeDownloads: (resource.freeDownloads || []).map((file) => ({ ...file })), premiumDownloads: (resource.premiumDownloads || []).map((file) => ({ ...file })) });
    setError(''); setMessage(''); setDeleteId(null);
  };
  const setSection = (index: number, key: 'title' | 'body', value: string) => {
    setDraft((previous) => previous ? { ...previous, sections: (previous.sections || []).map((section, i) => i === index ? { ...section, [key]: value } : section) } : previous);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!draft) return;
    setBusy('save'); setError(''); setMessage('');
    const isNew = !draft.id;
    try {
      const { id, ...fields } = draft;
      const result = await api<{ resource: EditableResource }>(isNew ? '/api/admin/resources' : `/api/admin/resources/${encodeURIComponent(id)}`, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify({ resource: isNew ? fields : draft }) });
      setResources((previous) => isNew ? [...previous, result.resource] : previous.map((resource) => resource.id === id ? result.resource : resource));
      setDraft(null); setMessage(`Đã ${isNew ? 'đăng' : 'cập nhật'} “${result.resource.title}”. Tài nguyên đã hiển thị trong thư viện.`);
      onResourcesChange?.();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể lưu tài nguyên.'); }
    finally { setBusy(null); }
  };

  const remove = async (resource: EditableResource) => {
    setBusy(resource.id); setError(''); setMessage('');
    try {
      await api(`/api/admin/resources/${encodeURIComponent(resource.id)}`, { method: 'DELETE' });
      setResources((previous) => previous.filter((item) => item.id !== resource.id));
      if (draft?.id === resource.id) setDraft(null);
      setDeleteId(null); setMessage(`Đã gỡ “${resource.title}” khỏi thư viện.`); onResourcesChange?.();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể gỡ tài nguyên.'); }
    finally { setBusy(null); }
  };

  const upload = async (files: FileList | null, tier: 'free' | 'premium', kind: 'download' | 'video') => {
    if (!files?.length || !draft) return;
    setUploading(`${tier}-${kind}`); setError('');
    const received: Download[] = [];
    try {
      if (kind === 'download' && (draft[`${tier}Downloads`]?.length || 0) + files.length > 30) throw new Error('Mỗi nhóm miễn phí hoặc cao cấp có tối đa 30 file.');
      for (const file of Array.from(files)) {
        if (file.size > 100 * 1024 * 1024) throw new Error(`“${file.name}” vượt quá 100 MB. Vui lòng nén hoặc chia nhỏ file.`);
        const body = new FormData(); body.append('file', file);
        const response = await fetch(`/api/admin/uploads?tier=${tier}`, { method: 'POST', credentials: 'same-origin', body });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Chưa thể tải file lên.');
        received.push({ name: result.name, file: result.file, mime: result.mime });
      }
      setDraft((previous) => {
        if (!previous) return previous;
        if (kind === 'video') return { ...previous, [`${tier}VideoFile`]: received[0].file, ...(tier === 'free' ? { videoUrl: null } : {}) };
        return { ...previous, [`${tier}Downloads`]: [...(previous[`${tier}Downloads`] || []), ...received] };
      });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể tải file lên.'); }
    finally { setUploading(null); }
  };

  const downloads = (tier: 'free' | 'premium') => {
    if (!draft) return null;
    const key = `${tier}Downloads` as const;
    return <div className="df-cms-files"><div className="df-cms-label-row"><h4>{tier === 'free' ? 'File miễn phí' : 'File cao cấp'}</h4><span>{draft[key]?.length || 0} / 30</span></div><p>{tier === 'free' ? 'Mọi người có thể tải. Gồm hướng dẫn và workflow cơ bản đầy đủ.' : 'Chỉ thành viên còn hiệu lực được tải. Gồm workflow tối ưu và file nâng cao.'}</p>{(draft[key] || []).map((file, index) => <div className="df-cms-file" key={`${index}-${file.file}`}><FileText size={17} /><label className="df-sr-only" htmlFor={`cms-${tier}-file-${index}`}>Tên hiển thị của file {index + 1}</label><input id={`cms-${tier}-file-${index}`} value={file.name} maxLength={200} required onChange={(event) => update(key, (draft[key] || []).map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /><button className="df-cms-small-button" type="button" aria-label={`Gỡ file ${file.name}`} onClick={() => update(key, (draft[key] || []).filter((_, i) => i !== index))}><X size={15} /></button></div>)}<label className={`df-cms-upload ${unavailable ? 'df-cms-upload-disabled' : ''}`}><Upload size={16} />{uploading === `${tier}-download` ? 'Đang tải lên…' : 'Thêm file từ máy của bạn'}<input type="file" multiple accept=".html,.md,.csv,.srt,.json,.pdf,.zip,.txt,.py" disabled={unavailable || (draft[key]?.length || 0) >= 30} onChange={(event) => { void upload(event.target.files, tier, 'download'); event.target.value = ''; }} /></label><small>HTML, JSON, ZIP, PDF, TXT, MD, CSV, SRT, PY · Tối đa 100 MB / file</small></div>;
  };

  const video = (tier: 'free' | 'premium') => {
    if (!draft) return null;
    const key = `${tier}VideoFile` as const;
    return <div className="df-cms-video"><div className="df-cms-label-row"><h4>{tier === 'free' ? 'Video miễn phí / phần xem trước' : 'Video đầy đủ dành cho thành viên'}</h4><Film size={16} /></div>{draft[key] ? <div className="df-cms-video-attached"><Check size={16} /><span>Đã đính kèm video {tier === 'free' ? 'miễn phí' : 'cao cấp'}</span><button className="df-cms-small-button" type="button" onClick={() => update(key, null)} aria-label={`Gỡ video ${tier === 'free' ? 'miễn phí' : 'cao cấp'}`}><X size={15} /></button></div> : <label className={`df-cms-upload ${unavailable ? 'df-cms-upload-disabled' : ''}`}><Upload size={16} />{uploading === `${tier}-video` ? 'Đang tải video…' : 'Tải video lên'}<input type="file" accept=".mp4,.webm" disabled={unavailable} onChange={(event) => { void upload(event.target.files, tier, 'video'); event.target.value = ''; }} /></label>}<small>MP4 hoặc WebM · Tối đa 100 MB. {tier === 'premium' ? 'Video được bảo vệ bằng quyền thành viên.' : 'Dùng video ngắn hoặc nén để tải nhanh trên điện thoại.'}</small></div>;
  };

  return <div className="df-cms">
    <div className="df-cms-heading"><div><h3>Thư viện của bạn</h3><p>Đăng bài hướng dẫn, video, workflow và file thực hành.</p></div><button className="df-button df-button-primary" type="button" disabled={unavailable} onClick={() => { setDraft(freshResource()); setError(''); setMessage(''); setDeleteId(null); }}><Plus size={16} />Thêm tài nguyên</button></div>
    {message && <p className="df-success" role="status"><CircleCheck size={18} />{message}</p>}
    {error && <p className="df-error" role="alert">{error}</p>}
    {loading ? <div className="df-loading" role="status"><LoaderCircle className="df-spin" size={22} />Đang tải thư viện…</div> : resources.length ? <div className="df-cms-list">{resources.map((resource) => <div className="df-cms-resource" key={resource.id}><img src={resource.image} alt="" /><div><strong>{resource.title}</strong><span>{resource.category} · {resource.type === 'guide' ? 'Hướng dẫn' : resource.type === 'workflow' ? 'Workflow' : 'Video'} · Bước {resource.step}</span>{deleteId === resource.id && <div className="df-cms-delete-confirm"><p>Gỡ tài nguyên này khỏi thư viện công khai?</p><button className="df-button df-button-danger" type="button" disabled={unavailable} onClick={() => void remove(resource)}>{busy === resource.id ? <LoaderCircle size={14} className="df-spin" /> : <Trash2 size={14} />}Gỡ tài nguyên</button><button className="df-button df-button-secondary" type="button" disabled={unavailable} onClick={() => setDeleteId(null)}>Hủy</button></div>}</div><div className="df-cms-resource-actions"><button type="button" className="df-cms-small-button" aria-label={`Sửa ${resource.title}`} disabled={unavailable} onClick={() => edit(resource)}><Pencil size={17} /></button><button type="button" className="df-cms-small-button" aria-label={`Gỡ ${resource.title}`} disabled={unavailable} onClick={() => setDeleteId(resource.id)}><Trash2 size={16} /></button></div></div>)}</div> : <div className="df-empty"><FileText size={26} /><p>Chưa có tài nguyên. Thêm bài đầu tiên để bắt đầu.</p><button className="df-button df-button-secondary" type="button" onClick={() => void load()}>Tải lại danh sách</button></div>}
    {draft && <section className="df-cms-editor" ref={editor}><div className="df-cms-editor-heading"><h3>{draft.id ? 'Chỉnh sửa tài nguyên' : 'Tài nguyên mới'}</h3><button className="df-cms-small-button" type="button" onClick={() => setDraft(null)} disabled={unavailable} aria-label="Đóng phần chỉnh sửa"><X size={18} /></button></div><p className="df-small-muted">Nội dung được hiển thị công khai ngay khi bạn lưu. File cao cấp và video đầy đủ chỉ mở cho thành viên.</p><form onSubmit={save}><fieldset disabled={unavailable} className="df-cms-fieldset"><div className="df-form"><label className="df-field">Tiêu đề<input value={draft.title} onChange={(event) => update('title', event.target.value)} minLength={3} maxLength={200} placeholder="Ví dụ: Tạo nhân vật nhất quán cho phim 3 phút" required /></label><label className="df-field">Mô tả ngắn<textarea value={draft.description} onChange={(event) => update('description', event.target.value)} maxLength={1000} rows={3} placeholder="Người học sẽ làm được gì sau khi thực hành?" required /></label><div className="df-cms-form-grid"><label className="df-field">Loại tài nguyên<select value={draft.type} onChange={(event) => update('type', event.target.value as Resource['type'])}><option value="guide">Bài hướng dẫn</option><option value="workflow">Workflow</option><option value="video">Bài học video</option></select></label><label className="df-field">Chủ đề<select value={draft.category} onChange={(event) => update('category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="df-field">Thời lượng đọc / thực hành<input value={draft.duration} maxLength={100} onChange={(event) => update('duration', event.target.value)} placeholder="20 phút" required /></label><label className="df-field">Trình độ<select value={draft.level} onChange={(event) => update('level', event.target.value)}><option>Cơ bản</option><option>Trung cấp</option><option>Nâng cao</option>{!['Cơ bản', 'Trung cấp', 'Nâng cao'].includes(draft.level) && <option>{draft.level}</option>}</select></label><label className="df-field">Vị trí trong lộ trình<input value={draft.step} type="number" min={1} max={99} required onChange={(event) => update('step', Number(event.target.value))} /></label><label className="df-field">Tác giả<input value={draft.author} maxLength={100} required onChange={(event) => update('author', event.target.value)} /></label></div><label className="df-field">Ảnh bìa<select value={draft.image} onChange={(event) => update('image', event.target.value)}>{covers.map((cover) => <option key={cover.value} value={cover.value}>{cover.label}</option>)}{!covers.some((cover) => cover.value === draft.image) && <option value={draft.image}>Ảnh bìa hiện tại</option>}</select></label><img className="df-cms-cover-preview" src={draft.image} alt="Xem trước ảnh bìa" /><label className="df-cms-checkbox"><input type="checkbox" checked={draft.featured} onChange={(event) => update('featured', event.target.checked)} />Đề xuất tài nguyên này trong thư viện</label><div className="df-cms-section-title"><h4>Nội dung bài hướng dẫn</h4><span>{draft.sections?.length || 0} / 50 phần</span></div><p className="df-small-muted">Viết đủ quy trình cơ bản để người học có thể hoàn thành sản phẩm miễn phí.</p>{(draft.sections || []).map((section, index) => <div className="df-cms-section" key={index}><div className="df-cms-label-row"><span>PHẦN {index + 1}</span><button type="button" className="df-cms-small-button" aria-label={`Gỡ phần ${index + 1}`} onClick={() => update('sections', (draft.sections || []).filter((_, i) => i !== index))}><Trash2 size={15} /></button></div><label className="df-field">Tiêu đề phần<input value={section.title} maxLength={200} required onChange={(event) => setSection(index, 'title', event.target.value)} placeholder="Bước 1: Chuẩn bị công cụ" /></label><label className="df-field">Hướng dẫn<textarea value={section.body} rows={6} maxLength={20000} required onChange={(event) => setSection(index, 'body', event.target.value)} placeholder="Viết từng bước, ví dụ và lưu ý thực hành. Xuống dòng để chia ý." /></label></div>)}<button className="df-button df-button-secondary" type="button" disabled={(draft.sections?.length || 0) >= 50} onClick={() => update('sections', [...(draft.sections || []), { title: '', body: '' }])}><Plus size={16} />Thêm phần hướng dẫn</button><div className="df-cms-section-title"><h4>Video</h4><span>KHÔNG BẮT BUỘC</span></div><div className="df-cms-media-grid">{video('free')}{video('premium')}</div>{!draft.freeVideoFile && <label className="df-field">Hoặc đường dẫn video miễn phí trực tiếp<input type="url" value={draft.videoUrl || ''} onChange={(event) => update('videoUrl', event.target.value || null)} placeholder="https://…/video.mp4" /><span className="df-small-muted">Dùng đường dẫn MP4 / WebM có quyền truy cập công khai, không dùng link trang YouTube.</span></label>}<div className="df-cms-section-title"><h4>File tải về</h4><span>MIỄN PHÍ & CAO CẤP</span></div><div className="df-cms-media-grid">{downloads('free')}{downloads('premium')}</div><label className="df-field">Lợi ích của bản cao cấp<textarea value={draft.premiumBenefit} rows={3} maxLength={1000} onChange={(event) => update('premiumBenefit', event.target.value)} placeholder="Nêu cụ thể cách bản cao cấp giúp nhanh hơn, tốt hơn, rẻ hơn hoặc dễ vận hành hơn." /></label></div></fieldset>{uploading && <p className="df-cms-upload-status" role="status"><LoaderCircle className="df-spin" size={17} />Đang tải lên. Vui lòng giữ cửa sổ này mở.</p>}{error && <p className="df-error" role="alert">{error}</p>}<div className="df-cms-save-row"><button className="df-button df-button-secondary" type="button" disabled={unavailable} onClick={() => setDraft(null)}>Hủy chỉnh sửa</button><button className="df-button df-button-primary" type="submit" disabled={unavailable}>{busy === 'save' ? <LoaderCircle size={17} className="df-spin" /> : <Save size={17} />}{busy === 'save' ? 'Đang lưu…' : draft.id ? 'Lưu thay đổi' : 'Đăng tài nguyên'}</button></div></form></section>}
  </div>;
}
