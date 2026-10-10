import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, ChevronRight,
  CircleHelp, Clapperboard, Compass, Crown, FileText, Film, FolderOpen, Layers,
  LogOut, Menu, Play, Search, ShieldCheck, Sparkles, WandSparkles, X,
  Clock3, PanelTop, Download, BookOpen,
} from 'lucide-react';
import { api } from './api';
import type { PaymentConfig, Resource, User } from './types';
import ResourceDialog from './components/ResourceDialog';
import AuthDialog from './components/AuthDialog';
import MembershipDialog from './components/MembershipDialog';
import AdminDialog from './components/AdminDialog';

type Page = 'discover' | 'roadmap' | 'saved' | 'help';
const categories = ['Tất cả', 'Kịch bản', 'Nhân vật', 'Bối cảnh', 'Video', 'Hậu kỳ'];
const typeLabels = { workflow: 'Workflow', video: 'Bài học video', guide: 'Hướng dẫn' };
const vnd = new Intl.NumberFormat('vi-VN');
const journeySteps = [
  { name: 'Ý tưởng & kịch bản', description: 'Từ một ý tưởng đến câu chuyện 3 phút', category: 'Kịch bản', icon: FileText },
  { name: 'Nhân vật & bối cảnh', description: 'Tạo thế giới nhất quán cho bộ phim', category: 'Nhân vật', icon: WandSparkles },
  { name: 'Biến ảnh thành chuyển động', description: 'Thực hành với workflow ComfyUI', category: 'Video', icon: Film },
  { name: 'Dựng phim & xuất bản', description: 'Ghép cảnh, âm thanh và hoàn thiện', category: 'Hậu kỳ', icon: Clapperboard },
];

function readSaved(): string[] {
  try { const value = JSON.parse(localStorage.getItem('f5ai-saved') || '[]'); return Array.isArray(value) ? value.filter(id => typeof id === 'string') : []; }
  catch { return []; }
}

export default function App() {
  const [page, setPage] = useState<Page>('discover');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [resourceType, setResourceType] = useState('all');
  const [sort, setSort] = useState('recommended');
  const [saved, setSaved] = useState<string[]>(readSaved);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'auth' | 'membership' | 'admin' | null>(null);
  const [authReturn, setAuthReturn] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState('');
  const [plan, setPlan] = useState<Pick<PaymentConfig, 'price' | 'durationDays'>>({ price: 199000, durationDays: 30 });
  const searchInput = useRef<HTMLInputElement>(null);

  async function loadResources() {
    setLoading(true); setError('');
    try { const result = await api<{ resources: Resource[] }>('/api/resources'); setResources(result.resources); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không tải được tài nguyên.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void loadResources();
    api<{user: User | null}>('/api/session').then(result => setUser(result.user)).catch(() => {});
    api<PaymentConfig>('/api/membership/config').then(result => setPlan({ price: result.price, durationDays: result.durationDays || 30 })).catch(() => {});
    const onPop = () => {
      const params = new URLSearchParams(location.search);
      setSelected(params.get('resource'));
    };
    onPop();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const isDialogOpen = Boolean(selected || dialog || mobileNav);
    document.body.style.overflow = isDialogOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selected, dialog, mobileNav]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.key === '/' && !selected && !dialog && !(target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)))) {
        event.preventDefault(); searchInput.current?.focus();
      }
      if (event.key === 'Escape' && mobileNav) setMobileNav(false);
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [selected, dialog, mobileNav]);

  function navigate(next: Page) {
    setPage(next); setMobileNav(false); setQuery(''); setCategory('Tất cả'); setResourceType('all');
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  function openResource(id: string) {
    setSelected(id);
    const url = new URL(location.href); url.searchParams.set('resource', id);
    history.pushState(null, '', url);
  }
  function closeResource() {
    setSelected(null);
    const url = new URL(location.href); url.searchParams.delete('resource');
    history.replaceState(null, '', url);
  }
  function toggleSaved(id: string) {
    setSaved(current => {
      const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
      try { localStorage.setItem('f5ai-saved', JSON.stringify(next)); } catch { setToast('Trình duyệt không cho phép lưu.'); }
      return next;
    });
  }
  function join() { closeResource(); setDialog('membership'); }
  async function logout() {
    try { await api('/api/auth/logout', {method: 'POST'}); setUser(null); setToast('Bạn đã đăng xuất.'); }
    catch (err) { setToast((err as Error).message); }
  }
  function startRoadmap() {
    const start = [...resources].sort((a,b) => a.step - b.step)[0];
    if (start) openResource(start.id); else navigate('roadmap');
  }
  const filtered = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
    const search = normalize(query.trim());
    return resources.filter(resource =>
      (page !== 'saved' || saved.includes(resource.id)) &&
      (category === 'Tất cả' || resource.category === category) &&
      (resourceType === 'all' || resource.type === resourceType) &&
      (!search || normalize(`${resource.title} ${resource.description} ${resource.category}`).includes(search))
    ).sort((a,b) => sort === 'title' ? a.title.localeCompare(b.title, 'vi') : sort === 'newest' ? b.step - a.step : Number(b.featured) - Number(a.featured) || a.step - b.step);
  }, [resources, query, category, resourceType, sort, saved, page]);
  const pageTitle = { discover: 'Khám phá', roadmap: 'Lộ trình làm phim', saved: 'Tài nguyên đã lưu', help: 'Hướng dẫn bắt đầu' }[page];

  return <div className="app-shell">
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Đóng menu" />}
    <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
      <a className="brand" href="/" onClick={event => { event.preventDefault(); navigate('discover'); }} aria-label="F5 AI Studio, trang chủ">
        <span className="brand-mark">f5<span>✳︎</span></span>
        <span className="brand-name">F5 AI<span>STUDIO</span></span>
      </a>
      <button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Đóng menu"><X size={21} /></button>
      <div className="sidebar-label">KHÔNG GIAN SÁNG TẠO</div>
      <nav className="main-nav" aria-label="Điều hướng chính">
        <button className={page === 'discover' ? 'active' : ''} onClick={() => navigate('discover')}><Compass size={19} />Khám phá<span className="nav-active-dot" /></button>
        <button className={page === 'roadmap' ? 'active' : ''} onClick={() => navigate('roadmap')}><Layers size={19} />Lộ trình làm phim</button>
        <button className={page === 'saved' ? 'active' : ''} onClick={() => navigate('saved')}><Bookmark size={19} />Đã lưu{saved.length > 0 && <span className="nav-mini">{saved.length}</span>}</button>
      </nav>
      <div className="sidebar-divider" />
      <div className="sidebar-label">CÙNG NHAU TIẾN XA HƠN</div>
      <button className="club-nav" onClick={() => {setMobileNav(false); join();}}><Crown size={19} />Câu lạc bộ Studio<ArrowUpRight size={15} /></button>
      <div className="sidebar-club">
        <span className="club-symbol"><Sparkles size={21} /></span>
        <h3>Ý tưởng lớn hơn.<br />Làm phim dễ hơn.</h3>
        <p>Workflow nâng cao và bộ công cụ dành cho thành viên.</p>
        <button onClick={join}>Khám phá Studio Club <ArrowRight size={15} /></button>
      </div>
      <div className="sidebar-bottom">
        <button className={page === 'help' ? 'help-button selected' : 'help-button'} onClick={() => navigate('help')}><CircleHelp size={18} />Bạn mới bắt đầu?</button>
        {user?.role === 'admin' && <button className="help-button" onClick={() => setDialog('admin')}><ShieldCheck size={18} />Quản lý Studio</button>}
        <div className="sidebar-signature">Một ý tưởng nhỏ. Vô hạn khả năng.<span>© {new Date().getFullYear()} F5 AI Studio</span></div>
      </div>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <div className="header-location"><button className="menu-toggle icon-button" onClick={() => setMobileNav(true)} aria-label="Mở menu"><Menu size={23} /></button><span className="breadcrumb-root">Studio</span><ChevronRight size={14} /><span>{pageTitle}</span></div>
        <div className="topbar-actions">
          <label className="header-search"><Search size={17} /><input ref={searchInput} type="search" aria-label="Tìm kiếm tài nguyên" placeholder="Tìm tài nguyên, workflow…" value={query} onChange={event => {setQuery(event.target.value); if(page === 'help' || page === 'roadmap') setPage('discover');}} /><kbd>/</kbd></label>
          <span className="header-divider" />
          {user ? <div className="account-area"><button className="account-button" onClick={() => setDialog('membership')} title="Thông tin thành viên"><span className="avatar">{user.name.charAt(0).toUpperCase()}</span><span className="account-name">{user.name.split(' ').pop()}<small>{user.isMember ? 'Studio Club' : 'Thành viên'}</small></span></button><button className="logout-button icon-button" onClick={() => void logout()} aria-label="Đăng xuất"><LogOut size={17} /></button></div> : <button className="login-button" onClick={() => setDialog('auth')}>Đăng nhập <ArrowUpRight size={15} /></button>}
        </div>
      </header>

      <main id="main-content" className="main-content">
        {page === 'discover' && <>
          <div className="welcome-line"><span><span className="live-dot" /> KHÔNG GIAN DÀNH CHO NGƯỜI SÁNG TẠO</span><span className="welcome-note">Bắt đầu nhỏ. Sáng tạo không giới hạn.</span></div>
          <section className="hero" aria-labelledby="hero-heading">
            <div className="hero-copy">
              <span className="hero-eyebrow"><Clapperboard size={14} /> MỘT Ý TƯỞNG. MỘT BỘ PHIM.</span>
              <h1 id="hero-heading">Biến ý tưởng<br />thành <span>thước phim.</span></h1>
              <p>Kho tài nguyên AI giúp bạn làm bộ phim đầu tiên.<br className="desktop-break" /> Dễ hiểu, dễ thực hành. Bắt đầu hoàn toàn miễn phí.</p>
              <div className="hero-actions"><button className="button button-primary" onClick={startRoadmap}>Bắt đầu sáng tạo <ArrowUpRight size={17} /></button><button className="hero-secondary" onClick={() => navigate('roadmap')}><span className="play-circle"><Play size={12} fill="currentColor" /></span>Xem lộ trình</button></div>
              <div className="hero-footnote"><span><Check size={13} /> Dành cho người mới</span><span><Check size={13} /> Ưu tiên công cụ miễn phí</span></div>
            </div>
            <div className="hero-art">
              <img src="/images/hero.png" alt="Một nhà thám hiểm giữa sa mạc và hành tinh khổng lồ, hình ảnh được tạo bằng AI" fetchPriority="high" />
              <div className="hero-art-shade" />
              <span className="art-label"><span className="live-dot" /> MADE WITH AI</span>
              <div className="art-caption"><span>IMAGINE. CREATE. REPEAT.</span><h2>Thế giới tiếp theo,<br />do bạn tạo nên.</h2></div>
              <span className="art-corner"><ArrowUpRight size={21} /></span>
              <span className="art-frame art-frame-tl" /><span className="art-frame art-frame-br" />
            </div>
          </section>
          <div className="feature-strip"><span><FolderOpen size={17} /><b>{resources.length || '8'}</b> tài nguyên thực hành</span><span><Layers size={17} />Workflow mã nguồn mở</span><span><Download size={17} />File sẵn sàng sử dụng</span><span><Sparkles size={17} />Từ ý tưởng đến phim 3 phút</span></div>
        </>}

        {(page === 'discover' || page === 'saved') && <section className="resource-section" aria-labelledby="resource-heading">
          <div className="section-heading"><div><span className="section-eyebrow">{page === 'saved' ? 'BỘ SƯU TẬP CỦA BẠN' : 'HỌC MỘT ĐIỀU MỚI. TẠO MỘT ĐIỀU HAY.'}</span><h2 id="resource-heading">{page === 'saved' ? 'Tài nguyên đã lưu' : 'Góc tài nguyên' }<span className="count-pill">{page === 'saved' ? resources.filter(r => saved.includes(r.id)).length : resources.length}</span></h2>{page === 'saved' && <p className="section-description">Những ý tưởng bạn muốn quay lại. Được lưu trên trình duyệt này.</p>}</div><div className="sort-control"><label htmlFor="resource-sort">Sắp xếp:</label><select id="resource-sort" value={sort} onChange={event => setSort(event.target.value)}><option value="recommended">Đề xuất cho bạn</option><option value="newest">Bước cuối trước</option><option value="title">Tên A → Z</option></select><ChevronDown size={14} /></div></div>
          <div className="resource-toolbar"><div className="category-tabs" role="group" aria-label="Lọc theo chủ đề">{categories.map(item => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item === 'Tất cả' && <PanelTop size={14} />}{item}</button>)}</div><label className="type-control"><span className="sr-only">Loại tài nguyên</span><select value={resourceType} onChange={event => setResourceType(event.target.value)}><option value="all">Mọi định dạng</option><option value="workflow">Workflow</option><option value="guide">Hướng dẫn</option><option value="video">Bài học video</option></select><ChevronDown size={14} /></label></div>
          {query && <div className="search-result-line">{filtered.length} kết quả cho “{query}”<button onClick={() => setQuery('')}>Xóa tìm kiếm <X size={13} /></button></div>}
          {loading ? <div className="resource-grid">{[1,2,3].map(n => <div className="skeleton-card" key={n}><div /><span /><span /></div>)}</div> : error ? <div className="empty-state"><CircleHelp size={32} /><h3>Chưa tải được tài nguyên</h3><p>{error}</p><button className="button button-primary" onClick={() => void loadResources()}>Thử lại</button></div> : filtered.length === 0 ? <div className="empty-state"><Bookmark size={34} /><h3>{page === 'saved' && !saved.length ? 'Dành một góc cho ý tưởng của bạn' : 'Chưa tìm thấy tài nguyên phù hợp'}</h3><p>{page === 'saved' && !saved.length ? 'Nhấn biểu tượng lưu trên tài nguyên bạn thích để quay lại bất cứ lúc nào.' : 'Thử từ khóa khác hoặc xem tất cả chủ đề.'}</p><button className="button button-secondary" onClick={() => {navigate('discover');}}>Khám phá tài nguyên <ArrowRight size={15} /></button></div> : <div className="resource-grid">{filtered.map(resource => <ResourceCard key={resource.id} resource={resource} isSaved={saved.includes(resource.id)} onOpen={() => openResource(resource.id)} onSave={() => toggleSaved(resource.id)} />)}</div>}
          {!loading && filtered.length > 0 && <div className="library-end"><span /><p><Sparkles size={13} /> Mọi hành trình đều bắt đầu bằng một lần thử.</p><span /></div>}
        </section>}

        {page === 'roadmap' && <section className="roadmap-page"><span className="section-eyebrow">LỘ TRÌNH DÀNH CHO NGƯỜI MỚI</span><h1>Tập phim AI đầu tiên.<br /><span>Từng bước một.</span></h1><p className="page-intro">Từ trang giấy trắng đến một tập phim ngắn 3 phút. Bạn được tiếp cận đầy đủ quy trình miễn phí, theo tốc độ của mình.</p><div className="roadmap-summary"><span><Clapperboard size={18} /> Đầu ra: phim ngắn 3 phút</span><span><Layers size={18} />4 chặng thực hành</span><span><Check size={18} />Không cần đăng ký trả phí</span></div><div className="roadmap-large">{journeySteps.map((step,index) => <div className="roadmap-stage" key={step.name}><div className="stage-number">0{index+1}</div><div className="stage-copy"><span className="stage-icon"><step.icon size={21} /></span><h2>{step.name}</h2><p>{step.description}</p><div className="stage-resources">{resources.filter(resource => index === 0 ? resource.category === 'Kịch bản' : index === 1 ? ['Nhân vật','Bối cảnh'].includes(resource.category) : index === 2 ? resource.category === 'Video' : resource.category === 'Hậu kỳ').map(resource => <button key={resource.id} onClick={() => openResource(resource.id)}><span><BookOpen size={16} />{resource.title}</span><ArrowUpRight size={16} /></button>)}</div></div></div>)}</div><div className="roadmap-note"><CircleHelp size={20} /><p><b>Chưa có máy mạnh? Vẫn bắt đầu được.</b> Làm bản animatic bằng ảnh, lời thoại và chuyển động máy quay trước. Các bài workflow có ghi rõ yêu cầu mô hình và phần cứng.</p></div></section>}

        {page === 'help' && <section className="help-page"><span className="section-eyebrow">MỘT ĐIỂM BẮT ĐẦU RÕ RÀNG</span><h1>Chào bạn.<br />Cùng làm một bộ phim nhé.</h1><p className="page-intro">Bạn không cần biết mọi thứ về AI để bắt đầu. Chọn một câu chuyện nhỏ, làm theo từng bước và tạo phiên bản đầu tiên.</p><div className="help-grid"><div className="help-block"><span>01</span><h2>Bắt đầu từ lộ trình</h2><p>Đi theo 4 chặng: kịch bản, tài sản hình ảnh, chuyển động và dựng phim. Bộ hướng dẫn cơ bản đủ cho cả quy trình.</p><button onClick={() => navigate('roadmap')}>Mở lộ trình <ArrowRight size={16} /></button></div><div className="help-block"><span>02</span><h2>Tải file và thực hành</h2><p>Mỗi bài có hướng dẫn cùng file HTML, mẫu prompt, shot list hoặc workflow JSON. Tải xuống để thực hành và đọc khi ngoại tuyến.</p><button onClick={startRoadmap}>Mở bài đầu tiên <ArrowRight size={16} /></button></div><div className="help-block"><span>03</span><h2>Nâng cấp khi bạn cần</h2><p>Bản miễn phí giúp bạn làm được. Studio Club giúp bạn làm nhanh hơn với bộ công cụ nâng cao và quy trình thuận tiện hơn.</p><button onClick={join}>Tìm hiểu câu lạc bộ <ArrowRight size={16} /></button></div></div><div className="faq-list"><h2>Một vài điều bạn có thể đang băn khoăn</h2>{[
          ['Tôi cần máy tính cấu hình như thế nào?', 'Bạn có thể viết kịch bản và dựng animatic với một máy tính văn phòng. Chạy ComfyUI với mô hình tạo ảnh hoặc video cần thêm GPU phù hợp; mỗi bài ghi rõ yêu cầu để bạn chọn cách thực hành theo máy đang có. Không bao gồm GPU hoặc chi phí dịch vụ đám mây.'],
          ['Tôi có cần trả phí để hoàn thành bộ phim không?', 'Không. Các bài và file cơ bản bao quát toàn bộ quy trình hoàn thành phim 3 phút. Tài nguyên CLB bổ sung tự động hóa và công cụ nâng cao. Các công cụ bên ngoài có thể có yêu cầu phần cứng hoặc phí riêng.'],
          ['Các bài có video hướng dẫn chưa?', 'Bộ tài nguyên ban đầu hiện có hướng dẫn văn bản và file thực hành. Những bài mang định dạng video được ghi rõ khi video minh họa chưa được bổ sung; bạn vẫn có thể đọc và thực hành theo hướng dẫn.'],
          ['Tham gia Studio Club có giúp tôi kiếm được tiền không?', 'Tài nguyên giúp bạn cải thiện quy trình sản xuất, nhưng không bảo đảm doanh thu. Hiệu quả kênh phụ thuộc nội dung, người xem và việc bạn thực hành, thử nghiệm.'],
          ['Quyền thành viên được tính như thế nào?', `Mỗi lần thanh toán được xác nhận sẽ mở quyền truy cập tài nguyên cao cấp trong ${plan.durationDays} ngày. Hiện dùng chuyển khoản có xác nhận, không tự động gia hạn hoặc trừ tiền.`],
        ].map(([question,answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></section>}

        {page === 'discover' && <section className="bottom-panels">
          <div className="journey-panel"><div className="panel-topline"><span className="section-eyebrow">TỪ SỐ 0 ĐẾN THƯỚC PHIM ĐẦU TIÊN</span><span className="tiny-badge">MIỄN PHÍ</span></div><h2>Một bộ phim. Bốn bước.</h2><p>Không lạc giữa hàng trăm công cụ. Cứ đi từng bước.</p><div className="mini-journey">{journeySteps.map((step,index) => <button key={step.name} onClick={() => {navigate('roadmap');}}><span className="journey-number">0{index+1}</span><step.icon size={20} /><span>{step.name}</span><ChevronRight size={15} /></button>)}</div><button className="text-link" onClick={() => navigate('roadmap')}>Khám phá lộ trình đầy đủ <ArrowRight size={16} /></button></div>
          <div className="membership-panel"><span className="membership-star">✳︎</span><span className="section-eyebrow">F5 AI STUDIO CLUB</span><h2>Sáng tạo nhiều hơn.<br />Thao tác ít hơn.</h2><p>Công cụ nâng cao cho những ý tưởng<br className="desktop-break" /> bạn muốn đưa xa hơn.</p><div className="club-features"><span><Check size={15} />Workflow nâng cao, dễ vận hành</span><span><Check size={15} />Bộ prompt & file thực hành cao cấp</span><span><Check size={15} />Công cụ tự động hóa quy trình</span></div><div className="membership-price"><b>{vnd.format(plan.price)}<span>đ</span></b><span>/ {plan.durationDays} ngày</span></div><button className="button club-join-button" onClick={join}>Khám phá quyền lợi thành viên <ArrowUpRight size={17} /></button><span className="club-fineprint">Gia hạn chủ động · Không tự động trừ tiền</span></div>
        </section>}

        <footer className="footer"><span className="footer-logo">f5<span>✳︎</span> <span>AI STUDIO</span></span><p>Sáng tạo là một hành trình. Bạn không phải đi một mình.</p><button onClick={() => navigate('help')}>Cần một điểm bắt đầu? <ArrowUpRight size={14} /></button></footer>
      </main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Điều hướng trên điện thoại"><button className={page === 'discover' ? 'active' : ''} onClick={() => navigate('discover')}><Compass size={20} /><span>Khám phá</span></button><button className={page === 'roadmap' ? 'active' : ''} onClick={() => navigate('roadmap')}><Layers size={20} /><span>Lộ trình</span></button><button className={page === 'saved' ? 'active' : ''} onClick={() => navigate('saved')}><Bookmark size={20} /><span>Đã lưu{saved.length > 0 ? ` (${saved.length})` : ''}</span></button><button onClick={join}><Crown size={20} /><span>Studio Club</span></button></nav>
    {selected && <ResourceDialog resourceId={selected} onClose={closeResource} user={user} onJoin={join} onSave={toggleSaved} isSaved={saved.includes(selected)} />}
    {dialog === 'auth' && <AuthDialog onClose={() => {setDialog(null); setAuthReturn(false);}} onSuccess={nextUser => {setUser(nextUser); setDialog(authReturn ? 'membership' : null); setAuthReturn(false); setToast(`Chào ${nextUser.name}, cùng sáng tạo nhé!`);}} />}
    {dialog === 'membership' && <MembershipDialog user={user} onClose={() => setDialog(null)} onLogin={() => {setAuthReturn(true); setDialog('auth');}} onUserChange={setUser} />}
    {dialog === 'admin' && <AdminDialog onClose={() => setDialog(null)} onResourcesChange={() => void loadResources()} />}
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
  </div>;
}

function ResourceCard({resource,isSaved,onOpen,onSave}: {resource:Resource;isSaved:boolean;onOpen:()=>void;onSave:()=>void}) {
  const TypeIcon = resource.type === 'workflow' ? Layers : resource.type === 'video' ? Film : FileText;
  return <article className="resource-card">
    <div className="card-image-wrapper"><button className="card-image-button" onClick={onOpen} aria-label={`Mở tài nguyên: ${resource.title}`}><img src={resource.image} alt="" loading="lazy" /><span className="card-image-shade" /><span className="image-open"><ArrowUpRight size={19} /></span></button><span className={`resource-kind ${resource.type}`}><TypeIcon size={13} />{typeLabels[resource.type]}</span><button className={`save-button ${isSaved ? 'saved' : ''}`} aria-label={isSaved ? `Bỏ lưu ${resource.title}` : `Lưu ${resource.title}`} aria-pressed={isSaved} onClick={onSave}><Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} /></button>{resource.type === 'video' && <span className="video-status"><FileText size={12} />Có hướng dẫn thực hành</span>}</div>
    <div className="card-body"><div className="card-category"><span>{resource.category}</span><span className="free-label"><span />MIỄN PHÍ</span></div><button className="card-title" onClick={onOpen}><h3>{resource.title}</h3></button><p className="card-description">{resource.description}</p><div className="card-meta"><span><Clock3 size={13} />{resource.duration}</span><span className="meta-dot">·</span><span>{resource.level}</span><span className="card-arrow"><ArrowUpRight size={16} /></span></div></div>
  </article>;
}
