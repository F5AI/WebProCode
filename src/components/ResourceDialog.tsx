import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Bookmark, BookOpen, Check, Clock3, FileText, Film, Layers3, LoaderCircle, LockKeyhole, Sparkles } from 'lucide-react';
import { api } from '../api';
import type { Download, Resource, User } from '../types';
import DialogShell from './DialogShell';

type Props = { resourceId: string; onClose: () => void; user: User | null; onJoin: () => void; onSave: (id: string) => void; isSaved: boolean };
type DetailedResource = Resource & { premiumVideoUrl?: string | null; premiumVideoAvailable?: boolean };

export default function ResourceDialog({ resourceId, onClose, user, onJoin, onSave, isSaved }: Props) {
  const [resource, setResource] = useState<DetailedResource | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setResource(null); setError('');
    api<{ resource: DetailedResource }>(`/api/resources/${encodeURIComponent(resourceId)}`).then((result) => { if (alive) setResource(result.resource); }).catch((reason) => { if (alive) setError(reason instanceof Error ? reason.message : 'Chưa thể mở tài nguyên này.'); });
    return () => { alive = false; };
  }, [resourceId, user?.isMember, attempt]);

  const downloadList = (downloads: Download[], tier: 'free' | 'premium') => downloads.map((item, index) => {
    const allowed = tier === 'free' || resource?.premiumAvailable;
    return allowed ? <a className="df-download" key={`${tier}-${index}`} href={item.url || `/api/downloads/${encodeURIComponent(resourceId)}/${tier}/${index}`} download><FileText size={19} /><span>{item.name}<small>{item.mime?.includes('html') ? 'Tài liệu HTML · Mở bằng trình duyệt' : item.mime?.includes('json') ? 'File JSON · Workflow / dữ liệu' : 'Tệp thực hành'}</small></span><ArrowDownToLine size={17} /></a> : <div className="df-download df-download-locked" key={`${tier}-${index}`}><FileText size={19} /><span>{item.name}<small>Dành cho thành viên câu lạc bộ</small></span><LockKeyhole size={16} /></div>;
  });

  return <DialogShell title={resource?.title || 'Tài nguyên thực hành'} eyebrow="THƯ VIỆN F5 AI" onClose={onClose} wide className="df-resource-dialog">
    {!resource && !error && <div className="df-loading" role="status"><LoaderCircle className="df-spin" size={24} /> Đang mở tài nguyên…</div>}
    {error && <div className="df-dialog-body"><p className="df-error" role="alert">{error}</p><button className="df-button df-button-secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>Thử lại</button></div>}
    {resource && <>
      <div className="df-resource-cover"><img src={resource.image} alt="" /><div className="df-cover-label"><BookOpen size={16} /> HỌC VÀ LÀM NGAY</div></div>
      <div className="df-resource-layout">
        <article className="df-resource-article">
          <div className="df-resource-meta"><span><Clock3 size={15} />{resource.duration}</span><span><Layers3 size={15} />{resource.level}</span><span>{resource.author}</span></div>
          <p className="df-resource-intro">{resource.description}</p>
          <div className="df-free-notice"><Check size={18} /><span>Bản cơ bản được mở đầy đủ. Bạn có thể thực hành mà không cần nâng cấp.</span></div>
          {resource.videoUrl ? <video className="df-resource-video" controls preload="metadata" src={resource.videoUrl} aria-label={`Video hướng dẫn: ${resource.title}`} /> : <div className="df-video-note"><BookOpen size={20} /><div><strong>Hướng dẫn thực hành</strong><p>{resource.premiumVideoAvailable ? 'Bản hướng dẫn miễn phí có trong bài viết và file thực hành bên dưới.' : 'Làm theo các bước và tải file bên dưới. Video minh họa đang được chuẩn bị.'}</p></div></div>}
          {resource.premiumVideoAvailable && !resource.premiumVideoUrl && <div className="df-locked-video"><Film size={21} /><div><strong>Video hướng dẫn đầy đủ</strong><span>Dành cho thành viên câu lạc bộ</span></div><button className="df-button df-button-secondary" type="button" onClick={onJoin}><LockKeyhole size={14} />Mở quyền truy cập</button></div>}
          {resource.premiumVideoUrl && <section className="df-premium-video"><div className="df-eyebrow"><Sparkles size={14} /> VIDEO DÀNH CHO THÀNH VIÊN</div><h3>Video hướng dẫn đầy đủ</h3><video className="df-resource-video" controls preload="metadata" src={resource.premiumVideoUrl} aria-label={`Video cao cấp: ${resource.title}`} /></section>}
          {(resource.sections || []).map((section, index) => <section className="df-guide-section" key={`${index}-${section.title}`}><div className="df-section-heading"><span>{String(index + 1).padStart(2, '0')}</span><h3>{section.title}</h3></div><div className="df-section-text">{section.body}</div></section>)}
        </article>
        <aside className="df-resource-aside">
          <button className={`df-button df-button-secondary df-button-full ${isSaved ? 'df-saved' : ''}`} type="button" aria-pressed={isSaved} onClick={() => onSave(resource.id)}><Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} />{isSaved ? 'Đã lưu tài nguyên' : 'Lưu để học sau'}</button>
          <div className="df-download-group"><h3>Tài nguyên miễn phí <span>{resource.freeDownloads?.length || 0}</span></h3>{resource.freeDownloads?.length ? downloadList(resource.freeDownloads, 'free') : <p className="df-small-muted">Bạn có thể thực hành trực tiếp theo hướng dẫn.</p>}</div>
          <div className="df-premium-box"><div className="df-eyebrow"><Sparkles size={14} /> CÂU LẠC BỘ</div><h3>Làm tốt hơn. Nhanh hơn.</h3><p>{resource.premiumBenefit}</p>{resource.premiumDownloads?.length ? <div className="df-premium-downloads">{downloadList(resource.premiumDownloads, 'premium')}</div> : null}{resource.premiumAvailable ? <div className="df-member-tag"><Check size={15} /> Bạn có quyền truy cập cao cấp</div> : <button className="df-button df-button-primary df-button-full" type="button" onClick={onJoin}>Khám phá câu lạc bộ <ArrowRight size={16} /></button>}</div>
          <p className="df-aside-note">Bắt đầu bằng bản miễn phí. Nâng cấp khi bạn cần tiết kiệm thời gian và tối ưu công việc.</p>
        </aside>
      </div>
    </>}
  </DialogShell>;
}
