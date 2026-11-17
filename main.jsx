import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, isConfigured } from './supabase';
import { Plus, Wallet, TrendingUp, TrendingDown, Search, Pencil, Trash2, X, LogOut, CalendarDays, ArrowDownCircle, ArrowUpCircle, Sparkles, ChevronDown, RefreshCw } from 'lucide-react';
import './style.css';

const CATEGORIES = {
  expense: ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Nhà cửa', 'Hóa đơn', 'Sức khỏe', 'Giải trí', 'Giáo dục', 'Gia đình', 'Du lịch', 'Khác'],
  income: ['Lương', 'Thưởng', 'Kinh doanh', 'Đầu tư', 'Quà tặng', 'Thu nhập khác']
};
const money = n => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n || 0));
const today = () => new Date().toISOString().slice(0, 10);
const startMonth = () => `${today().slice(0,7)}-01`;

function parseAmount(raw) {
  const s = raw.toLowerCase().replace(/,/g, '.');
  const matches = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(triệu|tr|million|k|nghìn|ngàn|đ|đồng)?/gi)];
  if (!matches.length) return null;
  const m = matches[matches.length - 1];
  let n = Number(m[1]);
  const unit = (m[2] || '').toLowerCase();
  if (['triệu','tr','million'].includes(unit)) n *= 1000000;
  else if (['k','nghìn','ngàn'].includes(unit)) n *= 1000;
  return Math.round(n);
}
function guessType(text) {
  return /\b(lương|thu|nhận|được trả|thưởng|bán được|doanh thu|lãi|hoàn tiền|chuyển vào)\b/i.test(text) ? 'income' : 'expense';
}
function guessCategory(text, type) {
  const t = text.toLowerCase();
  const rules = type === 'income' ? [
    ['Lương', /lương|salary/], ['Thưởng', /thưởng|bonus/], ['Kinh doanh', /bán hàng|doanh thu|kinh doanh/], ['Đầu tư', /cổ tức|đầu tư|lãi tiết kiệm|lợi nhuận/], ['Quà tặng', /được tặng|quà|mừng tuổi/]
  ] : [
    ['Ăn uống', /ăn|uống|cafe|cà phê|trà sữa|cơm|phở|bún|bánh|đồ ăn|nhà hàng|siêu thị.*đồ ăn/],
    ['Di chuyển', /xăng|grab|taxi|xe bus|xe buýt|gửi xe|vé xe|rửa xe|sạc xe/],
    ['Mua sắm', /mua|quần áo|giày|túi|điện thoại|đồ dùng|shopee|lazada/],
    ['Nhà cửa', /tiền nhà|thuê nhà|sửa nhà|nội thất|điện nước|gas|đồ gia dụng/],
    ['Hóa đơn', /internet|wifi|điện thoại|đóng tiền điện|tiền điện|tiền nước|hóa đơn/],
    ['Sức khỏe', /thuốc|khám|bệnh viện|bác sĩ|nha khoa|gym|thể thao/],
    ['Giải trí', /phim|xem phim|karaoke|game|du lịch|vé xem|giải trí/],
    ['Giáo dục', /học|sách|khóa học|học phí|trường/],
    ['Gia đình', /bố mẹ|cha mẹ|con|vợ|chồng|biếu|gia đình/]
  ];
  return rules.find(([, re]) => re.test(t))?.[0] || (type === 'income' ? 'Thu nhập khác' : 'Khác');
}
function parseEntry(raw) {
  const amount = parseAmount(raw);
  const type = guessType(raw);
  const clean = raw.replace(/\d+(?:[.,]\d+)?\s*(triệu|tr|million|k|nghìn|ngàn|đ|đồng)?/gi, '').replace(/\s+/g, ' ').trim().replace(/[,:-]+$/, '');
  return { amount, type, category: guessCategory(raw, type), description: clean || (type === 'income' ? 'Khoản thu' : 'Khoản chi') };
}

function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false); const [authError, setAuthError] = useState('');
  const [entries, setEntries] = useState([]); const [loading, setLoading] = useState(false);
  const [quick, setQuick] = useState(''); const [quickError, setQuickError] = useState(''); const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('month'); const [from, setFrom] = useState(startMonth()); const [to, setTo] = useState(today());
  const [search, setSearch] = useState(''); const [typeFilter, setTypeFilter] = useState('all');
  const [editing, setEditing] = useState(null); const [form, setForm] = useState({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadEntries() {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
    if (error) setToast('Không tải được dữ liệu: ' + error.message); else setEntries(data || []);
    setLoading(false);
  }
  useEffect(() => { loadEntries(); }, [session?.user?.id]);
  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase.channel('transactions-sync-' + session.user.id).on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${session.user.id}` }, () => loadEntries()).subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);

  async function authenticate(e) {
    e.preventDefault(); setAuthBusy(true); setAuthError('');
    const result = authMode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    if (result.error) setAuthError(result.error.message);
    else if (authMode === 'signup' && !result.data.session) setAuthError('Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản, sau đó đăng nhập.');
    setAuthBusy(false);
  }
  async function addQuick(e) {
    e.preventDefault(); if (!quick.trim()) return;
    const parsed = parseEntry(quick);
    if (!parsed.amount || parsed.amount <= 0) { setQuickError('Chưa nhận diện được số tiền. Ví dụ: Ăn sáng 35k hoặc Lương 15 triệu.'); return; }
    setSaving(true); setQuickError('');
    const { error } = await supabase.from('transactions').insert({ user_id: session.user.id, description: parsed.description, amount: parsed.amount, type: parsed.type, category: parsed.category, date: today() });
    if (error) setQuickError(error.message); else { setQuick(''); setToast('Đã thêm khoản ' + (parsed.type === 'income' ? 'thu' : 'chi') + ' · ' + parsed.category); await loadEntries(); }
    setSaving(false);
  }
  function openEdit(item) { setEditing(item.id); setForm({ description: item.description, amount: item.amount, type: item.type, category: item.category, date: item.date }); }
  async function saveEdit(e) {
    e.preventDefault(); const { error } = await supabase.from('transactions').update({ ...form, amount: Number(form.amount) }).eq('id', editing);
    if (error) setToast('Lỗi cập nhật: ' + error.message); else { setEditing(null); setToast('Đã cập nhật khoản thu chi'); await loadEntries(); }
  }
  async function removeEntry(id) {
    if (!confirm('Bạn chắc chắn muốn xóa khoản này?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) setToast('Không thể xóa: ' + error.message); else { setToast('Đã xóa khoản thu chi'); await loadEntries(); }
  }
  function changeFilter(v) {
    setFilter(v); const d = new Date();
    if (v === 'today') { setFrom(today()); setTo(today()); }
    if (v === 'month') { setFrom(startMonth()); setTo(today()); }
    if (v === '7days') { const x = new Date(); x.setDate(x.getDate() - 6); setFrom(x.toISOString().slice(0,10)); setTo(today()); }
    if (v === 'all') { setFrom(''); setTo(''); }
  }
  const filtered = useMemo(() => entries.filter(x => (!from || x.date >= from) && (!to || x.date <= to) && (typeFilter === 'all' || x.type === typeFilter) && (!search || (x.description + ' ' + x.category).toLowerCase().includes(search.toLowerCase()))), [entries, from, to, typeFilter, search]);
  const totals = useMemo(() => ({ income: filtered.filter(x => x.type === 'income').reduce((a,x) => a + Number(x.amount), 0), expense: filtered.filter(x => x.type === 'expense').reduce((a,x) => a + Number(x.amount), 0) }), [filtered]);
  const categories = useMemo(() => {
    const map = {}; filtered.filter(x => x.type === 'expense').forEach(x => map[x.category] = (map[x.category] || 0) + Number(x.amount));
    return Object.entries(map).sort((a,b) => b[1]-a[1]);
  }, [filtered]);

  if (!isConfigured) return <Setup />;
  if (!session) return <div className="auth-page"><div className="auth-card"><div className="brand-mark"><Wallet size={24}/></div><p className="eyebrow">QUẢN LÝ TÀI CHÍNH CÁ NHÂN</p><h1>Sổ chi tiêu</h1><p className="muted">Ghi lại từng khoản nhỏ, nắm rõ dòng tiền mỗi ngày.</p><form onSubmit={authenticate} className="auth-form"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" required /></label><label>Mật khẩu<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" minLength="6" required /></label>{authError && <p className="error">{authError}</p>}<button className="primary full" disabled={authBusy}>{authBusy ? 'Đang xử lý...' : authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button></form><p className="switch-auth">{authMode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'} <button onClick={()=>{setAuthMode(authMode === 'login' ? 'signup' : 'login');setAuthError('')}}>{authMode === 'login' ? 'Đăng ký' : 'Đăng nhập'}</button></p><p className="tiny muted">Dữ liệu được lưu riêng theo tài khoản và đồng bộ giữa các thiết bị.</p></div></div>;

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark small"><Wallet size={19}/></div><span>Sổ chi tiêu</span></div><div className="user-area"><span className="user-email">{session.user.email}</span><button className="icon-btn" title="Tải lại dữ liệu" onClick={loadEntries}><RefreshCw size={17}/></button><button className="icon-btn" title="Đăng xuất" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/></button></div></header>
    <main className="main-content"><div className="page-heading"><div><p className="eyebrow">TỔNG QUAN TÀI CHÍNH</p><h1>Quản lý thu chi</h1><p className="muted">Theo dõi dòng tiền của bạn một cách đơn giản.</p></div><div className="date-range-label"><CalendarDays size={16}/>{from && to ? (from === to ? from : `${from} — ${to}`) : 'Toàn bộ thời gian'}</div></div>
    <section className="quick-card"><div className="quick-title"><div className="sparkle"><Sparkles size={18}/></div><div><h2>Ghi nhanh một khoản</h2><p>Nhập nội dung và số tiền, hệ thống tự phân loại.</p></div></div><form className="quick-form" onSubmit={addQuick}><input value={quick} onChange={e=>{setQuick(e.target.value);setQuickError('')}} placeholder="Ví dụ: Ăn sáng 35k · Đổ xăng 70 nghìn · Lương 15 triệu"/><button className="primary" disabled={saving}><Plus size={18}/>{saving ? 'Đang thêm' : 'Thêm khoản'}</button></form>{quickError && <p className="error quick-error">{quickError}</p>}<div className="examples">Thử nhập: <button onClick={()=>setQuick('Ăn sáng 35k')}>Ăn sáng 35k</button><button onClick={()=>setQuick('Đổ xăng 70 nghìn')}>Đổ xăng 70 nghìn</button><button onClick={()=>setQuick('Lương 15 triệu')}>Lương 15 triệu</button></div></section>
    <section className="summary-grid"><div className="summary-card"><div className="summary-icon income-icon"><TrendingUp size={19}/></div><p>Tổng thu</p><strong className="income-text">{money(totals.income)}</strong></div><div className="summary-card"><div className="summary-icon expense-icon"><TrendingDown size={19}/></div><p>Tổng chi</p><strong className="expense-text">{money(totals.expense)}</strong></div><div className="summary-card balance-card"><div className="summary-icon balance-icon"><Wallet size={19}/></div><p>Chênh lệch thu – chi</p><strong className={totals.income-totals.expense >= 0 ? 'income-text' : 'expense-text'}>{money(totals.income-totals.expense)}</strong></div></section>
    <section className="content-grid"><div className="panel transactions-panel"><div className="panel-heading"><div><h2>Lịch sử giao dịch</h2><p className="muted">{filtered.length} khoản thu chi</p></div><div className="filter-pills"><button className={filter==='today'?'active':''} onClick={()=>changeFilter('today')}>Hôm nay</button><button className={filter==='7days'?'active':''} onClick={()=>changeFilter('7days')}>7 ngày</button><button className={filter==='month'?'active':''} onClick={()=>changeFilter('month')}>Tháng này</button><button className={filter==='all'?'active':''} onClick={()=>changeFilter('all')}>Tất cả</button></div></div>
    <div className="advanced-filters"><label>Từ ngày<input type="date" value={from} onChange={e=>{setFrom(e.target.value);setFilter('custom')}}/></label><label>Đến ngày<input type="date" value={to} onChange={e=>{setTo(e.target.value);setFilter('custom')}}/></label><label className="search-field"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm nội dung, danh mục..."/></label><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">Tất cả giao dịch</option><option value="expense">Khoản chi</option><option value="income">Khoản thu</option></select></div>
    {loading ? <div className="empty-state">Đang tải dữ liệu...</div> : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><Wallet size={25}/></div><strong>Chưa có giao dịch nào</strong><span>Thử thêm một khoản ở ô ghi nhanh phía trên nhé.</span></div> : <div className="transaction-list">{filtered.map(item=><div className="transaction-row" key={item.id}><div className={'transaction-icon '+(item.type==='income'?'income-bg':'expense-bg')}>{item.type==='income'?<ArrowDownCircle size={19}/>:<ArrowUpCircle size={19}/>}</div><div className="transaction-info"><strong>{item.description}</strong><span>{item.category} <i>·</i> {new Date(item.date+'T00:00:00').toLocaleDateString('vi-VN')}</span></div><strong className={'transaction-amount '+(item.type==='income'?'income-text':'expense-text')}>{item.type==='income'?'+':'−'}{money(item.amount)}</strong><div className="row-actions"><button className="icon-btn" title="Sửa" onClick={()=>openEdit(item)}><Pencil size={16}/></button><button className="icon-btn danger-hover" title="Xóa" onClick={()=>removeEntry(item.id)}><Trash2 size={16}/></button></div></div>)}</div>}</div>
    <aside className="panel category-panel"><div className="panel-heading"><div><h2>Chi tiêu theo nhóm</h2><p className="muted">Phân bổ các khoản chi</p></div></div>{categories.length===0?<div className="mini-empty">Chưa có dữ liệu chi tiêu.</div>:<div className="category-list">{categories.map(([name,value])=><div className="category-item" key={name}><div className="category-meta"><span>{name}</span><strong>{money(value)}</strong></div><div className="bar-track"><div className="bar-fill" style={{width:`${totals.expense ? value/totals.expense*100 : 0}%`}}/></div><small>{totals.expense ? (value/totals.expense*100).toFixed(1) : 0}% tổng chi</small></div>)}</div>}<div className="category-note">Danh mục được nhận diện tự động từ nội dung. Bạn có thể thay đổi bất kỳ lúc nào khi chỉnh sửa giao dịch.</div></aside></section>
    <footer>Thông tin thu chi của bạn được lưu trên tài khoản riêng. <span>Đồng bộ đa thiết bị</span></footer></main>
    {editing && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null)}}><form className="edit-modal" onSubmit={saveEdit}><div className="modal-heading"><div><p className="eyebrow">CHỈNH SỬA</p><h2>Cập nhật giao dịch</h2></div><button type="button" className="icon-btn" onClick={()=>setEditing(null)}><X size={20}/></button></div><label>Loại giao dịch<select value={form.type} onChange={e=>setForm({...form,type:e.target.value,category:CATEGORIES[e.target.value][0]})}><option value="expense">Chi tiêu</option><option value="income">Thu nhập</option></select></label><label>Nội dung<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required/></label><label>Số tiền (VNĐ)<input type="number" min="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/></label><label>Danh mục<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES[form.type]?.map(c=><option key={c}>{c}</option>)}</select></label><label>Ngày giao dịch<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setEditing(null)}>Hủy</button><button className="primary">Lưu thay đổi</button></div></form></div>}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function Setup() { return <div className="setup-page"><div className="setup-card"><div className="brand-mark"><Wallet size={24}/></div><p className="eyebrow">CẦN KẾT NỐI CƠ SỞ DỮ LIỆU</p><h1>Thiết lập Sổ chi tiêu</h1><p>Ứng dụng đã sẵn sàng. Bạn cần tạo một dự án Supabase và thêm hai thông tin kết nối vào biến môi trường của Netlify để dữ liệu đồng bộ trên mọi thiết bị.</p><ol><li>Tạo project miễn phí tại <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.</li><li>Trong Supabase, mở <b>SQL Editor</b> và chạy nội dung file <code>supabase-schema.sql</code> trong bộ mã nguồn.</li><li>Lấy <b>Project URL</b> và <b>anon public key</b> tại Project Settings → API.</li><li>Thêm vào Netlify: <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code>, sau đó deploy lại.</li></ol><p className="tiny muted">Hướng dẫn chi tiết nằm trong README.md của bộ mã nguồn.</p></div></div> }

createRoot(document.getElementById('root')).render(<App/>);
