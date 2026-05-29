/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Scan, Languages, ChevronRight, HelpCircle, Menu, X, 
  CalendarDays, QrCode, Image as ImageIcon, Search, Sparkles, LogIn, LogOut, Users, Bell, Clock, MapPin, Download, ArrowLeft, BookOpen, ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Calendar from './components/Calendar';

// --- IMPORT FIREBASE ---
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

// Sửa type Module (Bên ngoài function App)
type Module = 'calendar' | 'converter' | 'find-good-days' | 'quick-lunar' | 'admin' | 'library'; 

// --- BẢNG ĐIỀU KHIỂN DÀNH CHO ADMIN (CẤU TRÚC VÀ GIAO DIỆN NÂNG CẤP) ---
const AdminPanel = () => {
  const [stats, setStats] = useState({ users: 0, events: 0, qrDownloads: 0, loading: true });
  const [userList, setUserList] = useState<any[]>([]);

  useEffect(() => {
     const fetchStats = async () => {
        try {
           const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');
           
           // 1. Quét dữ liệu người dùng và sự kiện (Như cũ)
           const usersSnap = await getDocs(collection(db, 'users'));
           const eventsSnap = await getDocs(collection(db, 'events'));
           
           let usersMap = new Map();
           usersSnap.forEach(doc => {
              const data = doc.data();
              usersMap.set(doc.id, {
                 id: doc.id,
                 displayName: data.displayName || 'Thành viên hệ thống',
                 email: data.email || 'Ẩn danh',
                 joinedDate: data.joinedDate || 'Chưa rõ',
                 lastLogin: data.lastLogin || 'Chưa rõ',
                 tools: data.tools || []
              });
           });

           eventsSnap.forEach(doc => {
              const data = doc.data();
              if (data.userId && !usersMap.has(data.userId)) {
                 usersMap.set(data.userId, {
                    id: data.userId,
                    displayName: 'Tài khoản cũ',
                    email: data.email || 'Không có email',
                    joinedDate: 'Trước hệ thống',
                    lastLogin: 'Chưa rõ',
                    tools: ['Lịch']
                 });
              } else if (data.userId && usersMap.has(data.userId)) {
                 const u = usersMap.get(data.userId);
                 if (!u.tools.includes('Lịch')) u.tools.push('Lịch');
              }
           });

           // 2. Lấy dữ liệu thống kê từ tính năng quét QR ẩn danh
           let qrCount = 0;
           const qrRef = doc(db, 'system_stats', 'qr_usage');
           const qrSnap = await getDoc(qrRef);
           if (qrSnap.exists()) {
               qrCount = qrSnap.data().totalDownloads || 0;
           }

           const list = Array.from(usersMap.values());
           setStats({ users: list.length, events: eventsSnap.size, qrDownloads: qrCount, loading: false });
           setUserList(list);
        } catch(e) { 
           console.error("Lỗi tải dữ liệu quản trị:", e); 
           setStats(s => ({...s, loading: false})); 
        }
     }
     fetchStats();
  }, []);

  const exportToCSV = () => {
    const headers = ["Họ và tên", "Email", "Ngày tham gia", "Công cụ sử dụng", "Cấp bậc", "Lần đăng nhập cuối"];
    const rows = userList.map(u => [
      u.displayName,
      u.email,
      u.joinedDate,
      u.tools ? u.tools.join(' - ') : 'Chưa rõ',
      ['hungvdtnai@gmail.com', 'hungvdtn@gmail.com'].includes(u.email?.toLowerCase()) ? "Quản trị viên" : "Người dùng",
      u.lastLogin
    ]);

    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_nguoi_dung_Van_phong_so_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
     <div className="p-4 md:p-8 text-slate-800 animate-in fade-in duration-500 font-sans">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-2xl font-bold text-[#0545E7] flex items-center gap-3">
            <Users size={28} /> Hệ thống kiểm soát thành viên Quản trị
          </h2>
          {!stats.loading && userList.length > 0 && (
            <button onClick={exportToCSV} className="px-5 py-2.5 bg-gradient-to-r from-[#0545E7] to-sky-400 text-white font-bold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-blue-500/30 border-none flex items-center gap-2 text-sm uppercase tracking-wide">
            <Download size={18} /> XUẤT DỮ LIỆU BÁO CÁO (CSV)
          </button>
          )}
        </div>

        {stats.loading ? (
           <p className="text-slate-600 flex items-center gap-2">Đang thiết lập kết nối và trích xuất dữ liệu đám mây...</p>
        ) : (
           <div className="space-y-8">
              {/* CHUYỂN TỪ GRID 2 CỘT SANG GRID 3 CỘT ĐỂ CHỨA THỐNG KÊ QR */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-8 rounded-2xl border border-sky-900/50 shadow-[0_0_30px_rgba(56,189,248,0.1)] relative overflow-hidden group hover:border-sky-500 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={64}/></div>
                    <h3 className="text-slate-600 font-bold mb-2 uppercase tracking-widest text-base relative z-10">Tổng tài khoản</h3>
                    <p className="text-5xl font-black text-sky-400 relative z-10">{stats.users}</p>
                    <p className="text-sm text-slate-500 mt-2 relative z-10">Tài khoản định danh hệ thống</p>
                 </div>
                 
                 <div className="bg-white p-8 rounded-2xl border border-emerald-900/50 shadow-[0_0_30px_rgba(5,150,105,0.1)] relative overflow-hidden group hover:border-emerald-500 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CalendarDays size={64}/></div>
                    <h3 className="text-slate-600 font-bold mb-2 uppercase tracking-widest text-base relative z-10">Sự kiện Lịch</h3>
                    <p className="text-5xl font-black text-emerald-400 relative z-10">{stats.events}</p>
                    <p className="text-sm text-slate-500 mt-2 relative z-10">Hồ sơ công việc đồng bộ hóa</p>
                 </div>

                 {/* KHỐI THỐNG KÊ MỚI DÀNH CHO QR CODE */}
                 <div className="bg-white p-8 rounded-2xl border border-amber-900/50 shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden group hover:border-amber-500 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><QrCode size={64}/></div>
                    <h3 className="text-slate-600 font-bold mb-2 uppercase tracking-widest text-base relative z-10">Lượt tạo & Tải QR</h3>
                    <p className="text-5xl font-black text-amber-400 relative z-10">{stats.qrDownloads}</p>
                    <p className="text-sm text-slate-500 mt-2 relative z-10">Thống kê từ người dùng ẩn danh</p>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200">
                 <h3 className="text-lg font-bold text-[#0545E7] mb-6 uppercase tracking-widest mt-8">
            HỒ SƠ CHI TIẾT PHÂN TÍCH NGƯỜI DÙNG
          </h3>
                 <div className="overflow-x-auto custom-scrollbar">
                   <table className="w-full text-base text-left text-slate-700">
                     <thead className="text-sm text-slate-600 uppercase bg-slate-100/50 tracking-wider">
                       <tr>
                         <th className="px-6 py-4 rounded-tl-lg">Thông tin người dùng</th>
                         <th className="px-6 py-4">Sự kiện (Công cụ)</th>
                         <th className="px-6 py-4">Cấp bậc</th>
                         <th className="px-6 py-4 rounded-tr-lg">Lần đăng nhập cuối</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-[#1e293b]">
                       {userList.map((u, i) => {
                         const isCurrentAdmin = ['hungvdtnai@gmail.com', 'hungvdtn@gmail.com'].includes(u.email?.toLowerCase());
                         return (
                           <tr key={i} className="hover:bg-slate-100/30 transition-colors">
                             <td className="px-6 py-4 space-y-1">
                               <div className="font-bold text-white text-base">{u.displayName}</div>
                               <div className="text-sm text-sky-400 font-mono font-medium">{u.email}</div>
                               <div className="text-[11px] text-slate-500 font-medium pt-1">Tham gia: {u.joinedDate}</div>
                             </td>
                             <td className="px-6 py-4">
                               <div className="flex flex-wrap gap-1.5">
                                 {u.tools && u.tools.length > 0 ? (
                                   u.tools.map((toolName: string, tIdx: number) => (
                                     <span key={tIdx} className={`px-2.5 py-1 text-xs font-black uppercase rounded-md tracking-wider border ${toolName === 'Lịch' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                       {toolName === 'Lịch' ? 'Lịch Vạn Niên' : 'Rà lỗi văn bản'}
                                     </span>
                                   ))
                                 ) : (
                                   <span className="text-slate-600 text-sm italic">Không có dữ liệu</span>
                                 )}
                               </div>
                             </td>
                             <td className="px-6 py-4">
                               <span className={`px-2.5 py-1 text-xs font-black uppercase rounded-md tracking-wider border ${isCurrentAdmin ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>
                                 {isCurrentAdmin ? "Quản trị viên" : "Người dùng"}
                               </span>
                             </td>
                             <td className="px-6 py-4 font-bold text-slate-700 text-base">
                               {u.lastLogin}
                             </td>
                           </tr>
                         );
                       })}
                       {userList.length === 0 && (
                         <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">Hệ thống chưa ghi nhận tài khoản tương tác.</td></tr>
                       )}
                     </tbody>
                   </table>
                 </div>
              </div>
           </div>
        )}
     </div>
  );
};
// --- GIAO DIỆN THƯ VIỆN TÀI LIỆU ---
const LibraryPanel = () => {
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const DOCUMENTS = [
    { id: 1, title: 'Hiệp Kỷ Biện Phương Thư (Quyển 1)', desc: 'Tài liệu kinh điển nền tảng về trạch cát, xem ngày tốt xấu và âm dương ngũ hành.', file: '/docs/1. Hiep_ky_bien_phuong_thu_1.pdf' },
    { id: 2, title: 'Hiệp Kỷ Biện Phương Thư (Quyển 2)', desc: 'Phần tiếp theo của bộ Hiệp Kỷ Biện Phương Thư chuyên sâu về trạch cát.', file: '/docs/2. Hiep_ky_bien_phuong_thu_2.pdf' },
    { id: 3, title: 'Ngọc Hạp Thông Thư', desc: 'Cuốn sách gối đầu giường về xem ngày giờ, các sao tốt xấu lưu truyền trong dân gian.', file: '/docs/3. Ngoc_Hap_Thong_Thu.pdf' },
    { id: 4, title: 'Đổng Công Tuyển Trạch Nhật Yếu Dụng', desc: 'Bí quyết chọn ngày giờ tốt lành của Đổng Trọng Thư.', file: '/docs/4. Dong_cong_tuyen_trach_nhat_yeu_dung.pdf' },
    { id: 5, title: 'Thẩm Thị Huyền Không Học', desc: 'Tài liệu chuyên sâu về Huyền Không Phi Tinh, phong thủy nhà ở.', file: '/docs/5. Tham_Thi_Huyen_Khong.pdf' },
    { id: 6, title: 'Hoàng Đế Trạch Kinh', desc: 'Kinh điển phong thủy tướng trạch được ghi chép từ thời cổ đại.', file: '/docs/6. Hoang_de_trach_kinh.pdf' },
    { id: 7, title: 'Bát Trạch Chánh Tông', desc: 'Cơ sở lý luận về Bát Trạch phong thủy, hướng nhà hợp mệnh gia chủ.', file: '/docs/7. Bat-trach-chanh-tong.pdf' },
    { id: 8, title: 'Bát Trạch Minh Cảnh - Kim Oanh Ký', desc: 'Tài liệu diễn giải chi tiết về Bát Trạch Minh Cảnh.', file: '/docs/8. Bat-trach-minh-canh-kim-oanh-ky.pdf' },
    { id: 9, title: 'Kinh Dịch - Đạo người quân tử', desc: 'Tìm hiểu về Kinh Dịch và triết lý nhân sinh.', file: '/docs/9. Kinh_dich_dao_nguoi_quan_tu.pdf' },
    { id: 10, title: 'Mai Hoa Dịch Số', desc: 'Tuyệt kỹ dự đoán học dựa trên thời gian và vạn vật của Thiệu Khang Tiết.', file: '/docs/10. Mai_hoa_dich_so.pdf' },
    { id: 11, title: 'Phong Thủy Toàn Thư (Thiệu Vĩ Hoa)', desc: 'Tổng hợp kiến thức phong thủy ứng dụng hiện đại.', file: '/docs/11. Phong-thuy-toan-thu-thieu-vi-hoa-p.pdf' },
    { id: 12, title: 'Tăng San Bốc Dịch', desc: 'Sách kinh điển về gieo quẻ Lục Hào, phán đoán cát hung.', file: '/docs/12. Tang_san_boc_dich.pdf' },
  ];

  return (
    // Sử dụng class động: Khi mở tài liệu sẽ xóa bỏ p-4, md:p-6 và giới hạn max-w-6xl để tràn toàn màn hình
    <div className={`font-sans w-full ${!selectedDoc ? 'p-4 md:p-6 max-w-6xl mx-auto' : 'p-0'}`}>
      {!selectedDoc ? (
        // GIAO DIỆN DANH SÁCH TÀI LIỆU (Giữ nguyên khoảng cách đẹp mắt ban đầu)
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-2xl font-bold text-[#0545E7] flex items-center gap-3 mb-2 uppercase tracking-widest">
            <BookOpen size={28} /> Thư viện Phong thủy - Trạch cát
          </h2>
          <p className="text-slate-500 mb-8 font-medium">Kho lưu trữ các tài liệu kinh điển hỗ trợ tra cứu chuyên sâu.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {DOCUMENTS.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => setSelectedDoc(doc)}
                className="p-5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-[#0545E7] hover:shadow-[0_10px_20px_rgba(5,69,231,0.1)] hover:-translate-y-1 transition-all group flex gap-4 items-start"
              >
                <div className="p-3 bg-sky-50 text-[#0545E7] rounded-lg group-hover:bg-[#0545E7] group-hover:text-white transition-colors">
                   <FileText size={24} />
                </div>
                <div>
                   <h4 className="text-base font-bold text-slate-800 group-hover:text-[#0545E7] transition-colors leading-tight">{doc.title}</h4>
                   <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{doc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ) : (
        // GIAO DIỆN ĐỌC TÀI LIỆU - TỐI ƯU TRÀN VIỀN TUYỆT ĐỐI
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="flex flex-col h-[calc(100vh-65px)] w-full bg-white"
        >
          {/* Thanh công cụ điều hướng sát khít hai bên */}
          <div className="flex items-center justify-between bg-white px-6 py-3 border-b border-slate-200 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedDoc(null)} 
                className="p-2 bg-sky-50 text-[#0545E7] rounded-lg hover:bg-[#0545E7] hover:text-white transition-colors flex items-center gap-2 font-bold"
              >
                <ArrowLeft size={20} /> <span className="hidden sm:block">Quay lại</span>
              </button>
              <h3 className="font-bold text-slate-800 text-lg line-clamp-1 border-l-2 border-slate-200 pl-3">
                {selectedDoc.title}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedDoc(null)} 
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              title="Đóng tài liệu"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Khung chứa iframe loại bỏ hoàn toàn viền (border) và bo góc (rounded) để chạm sát đáy và hai bên */}
          <div className="flex-1 w-full bg-slate-100 overflow-hidden">
            <iframe 
              src={selectedDoc.file} 
              className="w-full h-full border-none m-0 p-0"
              title={selectedDoc.title}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

// --- NỘI DUNG TRỢ GIÚP THEO TỪNG CHỨC NĂNG ---
const HelpContent = ({ module }: { module: string }) => {
  switch (module) {
    case 'calendar':
      return (
        <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-sans">
           <h3 className="font-bold text-[#0545E7] text-lg">Hướng dẫn sử dụng Lịch Vạn niên AI</h3>
           <p>Ứng dụng Lịch Vạn niên AI được thiết kế với công nghệ lõi sử dụng thư viện mã nguồn mở Lunar Javascript. Đây là tài liệu tích hợp các lý luận cổ đại Trung Hoa (Hiệp Kỷ Biện Phương Thư) về thiên văn, trạch cát, thuật số làm nền tảng thuật toán. Ngoài ra, các quy tắc phân tích chọn ngày chuyên sâu được tham chiếu theo bộ sách cổ "Ngọc Hạp Thông Thư" của Việt Nam và những tài liệu kinh điển về phong thủy, trạch cát truyền thống.</p>
           <p>Lịch Vạn niên AI được bổ sung đầy đủ các ngày lễ tết theo quy định của Việt Nam. Ngày có đánh dấu màu đỏ là các ngày Chủ Nhật và các ngày lễ, Tết được nghỉ làm việc; ngày đánh dấu màu vàng là các ngày lễ/kỷ niệm thông thường, không được nghỉ; ngày màu xanh đen là ngày làm việc bình thường.</p>
           <p>Điểm khác biệt với các Lịch Vạn niên khác, Lịch Vạn niên AI còn có thể giúp người sử dụng lập lịch làm việc, bổ sung các sự kiện cần ghi nhớ vào lịch, đồng thời cài đặt cảnh báo nhắc lịch công việc bằng trình duyệt (tiếng kêu ting ting). Bạn có thể cài đặt cảnh báo trước 15 phút, 30 phút, trước 1 tiếng hoặc trước 1 ngày.</p>
           <p>Để ghi chú vào lịch bạn chỉ cần nháy thực đơn Thêm sự kiện và điền các thông tin cần thiết, sau đó lưu sự kiện.</p>
           <p className="font-bold text-[#0545E7] mt-4">Ngoài ra, Lịch Vạn niên AI còn có các tính năng chuyên sâu:</p>
           <ul className="list-none space-y-2">
             <li><strong className="text-slate-900">(1). Xem ngày chi tiết:</strong> Để biết tính chất tốt, xấu của ngày đó;</li>
             <li><strong className="text-slate-900">(2). Tìm các ngày tốt trong một tháng:</strong> Có thể tìm ngày tốt chung hoặc có thể tìm ngày tốt cho từng việc;</li>
             <li><strong className="text-slate-900">(3). Đổi ngày:</strong> Đổi ngày âm hoặc dương sang ngày dương hoặc âm tương ứng.</li>
	     <li><strong className="text-slate-900">(4). Tìm nhanh ngày âm lịch:</strong> Bạn chỉ cần nhập ngày tháng năm âm lịch muốn tìm, kết quả trả về ngày bạn muốn.</li>
           </ul>
        </div>
      );

    case 'find-good-days':
      return (
        <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-sans">
           <h3 className="font-bold text-[#0545E7] text-lg">Hướng dẫn Tìm ngày tốt trong tháng</h3>
           <p>Tính năng này tích hợp thuật toán ma trận chấm điểm tự động, hỗ trợ người dùng tìm kiếm và lọc mốc thời gian cát lợi nhất trong một tháng cụ thể, đồng thời loại bỏ hoàn toàn các yếu tố xung khắc bản mệnh.</p>
           <p className="font-bold text-[#0545E7]">Nguyên lý vận hành của bộ lọc:</p>
           <ul className="list-disc pl-5 space-y-2">
             <li><strong className="text-slate-900">Cơ chế sàng lọc Đại hung (Hard Kill):</strong> Hệ thống tự động ẩn và loại bỏ hoàn toàn những ngày phạm đại kỵ nghiêm trọng theo Ngọc Hạp Thông Thư như Sát Chủ, Thọ Tử, Vãng Vong, bất kể ngày đó có bao nhiêu cát tinh đi kèm.</li>
             <li><strong className="text-slate-900">Quy tắc bù trừ cứu giải:</strong> Đối với các hạn kỵ dân gian thông thường (Tam Nương, Nguyệt Kỵ), điểm số sẽ bị hạ nhưng nếu xuất hiện các Đại Cát Tinh có năng lực cứu giải (Thiên Xá, Nhân Chuyên, Sát Cống), thuật toán sẽ bù trừ điểm về mức an toàn.</li>
             <li><strong className="text-slate-900">Đối chiếu Lục xung bản mệnh:</strong> Khi Bạn nhập ngày sinh, hệ thống sẽ tự động quy đổi sang địa chi tương ứng để tính toán hạn đối xung (Lục xung, Thiên khắc Địa xung). Nếu ngày chọn xung khắc trực tiếp với tuổi gia chủ, hệ thống sẽ loại bỏ khỏi danh sách đề xuất.</li>
           </ul>
           <p className="font-bold text-[#0545E7]">Các bước thực hiện:</p>
           <ol className="list-decimal pl-5 space-y-1">
             <li><strong className="text-slate-900">Bước 1:</strong> Nhập Ngày - Tháng - Năm sinh (Dương lịch) để hệ thống xác lập bản mệnh phong thủy.</li>
             <li><strong className="text-slate-900">Bước 2:</strong> Chọn Tháng và Năm hành chính cần tra cứu ngày tốt.</li>
             <li><strong className="text-slate-900">Bước 3:</strong> Chọn danh mục công việc dự kiến tiến hành (Hôn thú, Xây dựng, Khai trương, Giao dịch...) để tối ưu hóa bộ lọc sao chuyên biệt.</li>
             <li><strong className="text-slate-900">Bước 4:</strong> Bấm "XEM KẾT QUẢ" để nhận danh sách ngày tốt xếp hạng từ cao xuống thấp.</li>
           </ol>
        </div>
      );

    case 'converter':
      return (
        <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-sans">
           <h3 className="font-bold text-[#0545E7] text-lg">Hướng dẫn Đổi ngày Âm - Dương</h3>
           <p>Công cụ hỗ trợ chuyển đổi tương quan hai chiều giữa lịch hành chính hiện đại (Dương lịch) và hệ thống lịch pháp trạch cát phương Đông (Âm lịch) một cách nhanh chóng và chính xác.</p>
           <p className="font-bold text-[#0545E7]">Phương thức vận hành:</p>
           <ul className="list-disc pl-5 space-y-2">
             <li><strong className="text-slate-900">Chuyển đổi Dương ➔ Âm:</strong> Nhập mốc thời gian hành chính hiện tại, thuật toán sẽ tính toán quỹ đạo mặt trăng để kết xuất ngày âm tương thích, đi kèm tên gọi Can Chi của ngày, tháng, năm hành niên.</li>
             <li><strong className="text-slate-900">Chuyển đổi Âm ➔ Dương:</strong> Nhập mốc ngày, tháng âm lịch (bao gồm tính toán các chu kỳ tháng nhuận nếu có), hệ thống sẽ quét vòng lặp để đưa ra mốc ngày Dương lịch chính xác ngoài thực tế.</li>
           </ul>
           <p><strong className="text-slate-900">Tiện ích liên kết:</strong> Sau khi hệ thống hiển thị kết quả quy đổi thành công, giao diện sẽ xuất hiện nút lệnh <strong>"Mở lịch ngày này"</strong>. Bạn có thể nhấp chọn để ứng dụng tự động điều hướng về trục chính Lịch Vạn Niên, phục vụ việc tra cứu sâu hệ thống sao hoặc thiết lập nhắc việc.</p>
        </div>
      );

    case 'quick-lunar':
      return (
        <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-sans">
           <h3 className="font-bold text-[#0545E7] text-lg">Hướng dẫn Tìm nhanh ngày âm</h3>
           <p>Tiện ích bổ trợ giúp rút ngắn tối đa thời gian và thao tác lật trang thủ công khi Bạn đã có sẵn một mốc thời gian cụ thể theo Âm lịch (ví dụ: ngày giỗ chạp, ngày lễ truyền thống hoặc các mốc sự kiện cổ) và cần kiểm tra hồ sơ phong thủy của ngày đó.</p>
           <p className="font-bold text-[#0545E7]">Phương thức sử dụng:</p>
           <ol className="list-decimal pl-5 space-y-1.5">
             <li><strong className="text-slate-900">Bước 1:</strong> Điền trực tiếp các thông số số liệu bao gồm Ngày âm lịch, Tháng âm lịch và Năm âm lịch vào các ô trống tương ứng.</li>
             <li><strong className="text-slate-900">Bước 2:</strong> Nhấn chọn nút lệnh <strong>"ĐI TỚI NGÀY"</strong> (hoặc nhấn phím Enter trên bàn phím máy tính).</li>
             <li><strong className="text-slate-900">Bước 3:</strong> Hệ thống tự động chuyển đổi mốc này sang dữ liệu lịch pháp hành chính và lập tức điều hướng màn hình hiển thị chính của thẻ "Lịch Vạn Niên" để Bạn xem chi tiết Trực, Nhị thập bát tú hoặc phân tích Cát - Hung.</li>
           </ol>
        </div>
      );

    default:
      return <p className="text-slate-600 italic">Nội dung hướng dẫn đang được cập nhật...</p>;
  }
};

// --- BẢNG TRỢ GIÚP NỔI (DRAGGABLE & RESIZABLE) ---
const DraggableHelp = ({ activeModule, onClose }: { activeModule: string, onClose: () => void }) => {
  const [pos, setPos] = useState({ x: window.innerWidth > 768 ? window.innerWidth - 450 : 20, y: 80 });
  const dragRef = useRef({ isDragging: false, origin: { x: 0, y: 0 } });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { isDragging: true, origin: { x: e.clientX - pos.x, y: e.clientY - pos.y } };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging) return;
    setPos({ x: e.clientX - dragRef.current.origin.x, y: e.clientY - dragRef.current.origin.y });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.isDragging = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      className="fixed z-50 bg-white/95 backdrop-blur-xl border-2 border-[#0545E7]/20 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col font-sans"
      style={{ left: pos.x, top: pos.y, width: window.innerWidth > 400 ? 400 : window.innerWidth - 40, height: 500, resize: 'both', overflow: 'hidden' }}
    >
      <div 
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        className="p-3 bg-gradient-to-r from-[#0545E7] to-sky-400 cursor-move flex justify-between items-center border-b border-blue-200 touch-none"
      >
         <h3 className="font-bold text-white flex items-center gap-2 pointer-events-none tracking-wide">
           <HelpCircle size={18}/> Trợ giúp
         </h3>
         
         <button 
           onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
           onClick={(e) => { e.stopPropagation(); onClose(); }}
           className="p-1.5 bg-white/20 hover:bg-rose-500 rounded-lg text-white hover:text-white transition-colors cursor-pointer"
         >
           <X size={18}/>
         </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-white">
         <HelpContent module={activeModule} />
      </div>
    </div>
  );
}

export default function App() {
  const [activeModule, setActiveModule] = useState<Module>('calendar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false); 

  // QUẢN LÝ TRẠNG THÁI ĐĂNG NHẬP
  const [user, setUser] = useState<User | null>(null);

  // --- TRẠNG THÁI QUẢN LÝ BÁO THỨC (ALARM) ---
  const [ringingEvent, setRingingEvent] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alarmedIds = useRef<Set<string>>(new Set());

  // THIẾT LẬP QUYỀN ADMIN
  const ADMIN_EMAILS = ['hungvdtnai@gmail.com', 'hungvdtn@gmail.com'];
  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');

  // Thuật toán tự động cập nhật vết đăng nhập và phân loại công cụ sử dụng lên Cloud Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => { 
        setUser(currentUser); 
        if (currentUser) {
           try {
              const { doc, setDoc, getDoc } = await import('firebase/firestore');
              const userRef = doc(db, 'users', currentUser.uid);
              const userSnap = await getDoc(userRef);
              
              const now = new Date();
              const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
              
              let currentModuleTag = '';
              if (activeModule === 'calendar') currentModuleTag = 'Lịch';
              if (activeModule === 'docreview') currentModuleTag = 'Rà lỗi';

              if (!userSnap.exists()) {
                 // Trường hợp tài khoản mới đăng nhập hệ sinh thái lần đầu
                 await setDoc(userRef, {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName || 'Thành viên Văn phòng số',
                    email: currentUser.email || '',
                    joinedDate: dateStr,
                    lastLogin: dateStr,
                    lastLoginTimestamp: Date.now(),
                    tools: currentModuleTag ? [currentModuleTag] : []
                 });
              } else {
                 // Trường hợp thành viên cũ quay lại tương tác hệ thống
                 const existingData = userSnap.data();
                 const currentTools = existingData.tools || [];
                 
                 if (currentModuleTag && !currentTools.includes(currentModuleTag)) {
                    currentTools.push(currentModuleTag);
                 }
                 
                 await setDoc(userRef, {
                    lastLogin: dateStr,
                    lastLoginTimestamp: Date.now(),
                    displayName: currentUser.displayName || existingData.displayName || 'Thành viên Văn phòng số',
                    tools: currentTools
                 }, { merge: true });
              }
           } catch(e) { console.error("Lỗi đồng bộ thông tin tài khoản:", e); }
        }
    });
    return () => unsubscribe();
  }, [activeModule]);

  // --- THUẬT TOÁN BÁO SỰ KIỆN KÈM VƯỢT RÀO CẢN DI ĐỘNG ---
  useEffect(() => {
    // Khởi tạo Audio
    audioRef.current = new Audio('/nhac_bao_hieu.mp3');
    audioRef.current.loop = true;
    audioRef.current.load();

    // Trick để "Mở khóa âm thanh" và "Xin quyền Thông báo" bằng tương tác ĐẦU TIÊN của người dùng
    const unlockAudioAndNotify = () => {
      // 1. Xin quyền thông báo ngay khi người dùng chạm vào màn hình (Bắt buộc với iOS/Android)
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission();
      }

      // 2. Mở khóa Audio
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      
      // Hủy lắng nghe sau khi đã mở khóa thành công
      window.removeEventListener('click', unlockAudioAndNotify);
      window.removeEventListener('touchstart', unlockAudioAndNotify);
    };

    window.addEventListener('click', unlockAudioAndNotify);
    window.addEventListener('touchstart', unlockAudioAndNotify);

    const checkAlarms = () => {
      const savedEvents = localStorage.getItem('user_events');
      if (!savedEvents) return;
      const events = JSON.parse(savedEvents);
      const now = new Date();

      events.forEach((ev: any) => {
        if (ev.reminderAdvance === -1) return;
        const [evY, evMo, evD] = ev.dateStr.split('-').map(Number); 
        const [evH, evM] = ev.time.split(':').map(Number);
        const eventTime = new Date(evY, evMo - 1, evD, evH, evM);
        const remindTime = new Date(eventTime.getTime() - (ev.reminderAdvance * 60000));
        
        const alarmKey = `${ev.id}-${now.getHours()}-${now.getMinutes()}`;

        // Kiểm tra giờ và chặn báo lặp lại trong cùng 1 phút
        if (
            remindTime.getFullYear() === now.getFullYear() && 
            remindTime.getMonth() === now.getMonth() && 
            remindTime.getDate() === now.getDate() && 
            remindTime.getHours() === now.getHours() && 
            remindTime.getMinutes() === now.getMinutes() &&
            !alarmedIds.current.has(alarmKey)
        ) {
            alarmedIds.current.add(alarmKey);
            setRingingEvent(ev); // Bật giao diện Chuông
            
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.log('Bị chặn âm thanh do chưa tương tác', e));
            }
            
            // BẮN THÔNG BÁO HỆ THỐNG VỚI QUYỀN ƯU TIÊN CAO
            if ('Notification' in window && Notification.permission === 'granted') { 
                new Notification(`BÁO VIỆC: ${ev.title}`, { 
                    body: `⏰ Lúc: ${ev.time}\n📍 Địa điểm: ${ev.location || 'Không có'}`, 
                    icon: '/log_amduong.png', 
                    requireInteraction: true, // Bắt buộc thông báo nằm lỳ trên màn hình cho đến khi tắt
                    vibrate: [200, 100, 200, 100, 200, 100, 200] // Rung mạnh trên điện thoại Android
                }); 
            }
        }
      });
    };

    // Kiểm tra liên tục mỗi 10 giây
    const interval = setInterval(checkAlarms, 10000); 
    return () => {
        clearInterval(interval);
        window.removeEventListener('click', unlockAudioAndNotify);
        window.removeEventListener('touchstart', unlockAudioAndNotify);
    };
  }, []);

  const stopAlarm = () => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }
      setRingingEvent(null);
  };

  const handleLogin = async () => { 
    try { 
      // Quay về dùng duy nhất 1 lệnh Popup cho cả Máy tính và Điện thoại (Giống như cũ)
      await signInWithPopup(auth, googleProvider); 
    } catch (error: any) { 
      console.error("Lỗi đăng nhập:", error); 
      if (error.code === 'auth/popup-blocked') {
         alert("Trình duyệt đang chặn cửa sổ đăng nhập. Vui lòng cấp quyền (Cho phép mở Pop-up) để tiếp tục.");
      } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
         alert("LỖI BẢO MẬT: Nếu bạn đang mở web từ trong ứng dụng Zalo/Facebook, vui lòng bấm nút 3 chấm góc phải, chọn 'Mở bằng trình duyệt' (Chrome/Safari) để đăng nhập!");
      }
    } 
  };
  
  const handleLogout = async () => { try { await signOut(auth); } catch (error) { console.error(error); } };

  const modules = [
    { id: 'calendar', label: 'Lịch Vạn Niên', icon: CalendarDays },
    { id: 'find-good-days', label: 'Tìm ngày tốt', icon: Search },
    { id: 'converter', label: 'Đổi ngày Âm - Dương', icon: ArrowRightLeft },
    { id: 'quick-lunar', label: 'Tìm nhanh Âm lịch', icon: Search },
    { id: 'library', label: 'Thư viện', icon: BookOpen },
  ];

  const displayModules = [...modules];
  if (isAdmin) {
     displayModules.push({ id: 'admin', label: 'Admin (Quản trị)', icon: Users });
  }

  return (
    <div className="flex h-screen w-full max-w-[100vw] bg-slate-50 text-[#e2e8f0] overflow-hidden relative">
      <style dangerouslySetInnerHTML={{__html: `
        * {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif !important;
        }
      `}} />

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 z-40 md:relative md:z-20 ${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out shadow-2xl overflow-x-hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex items-start justify-between border-b border-slate-200 flex-shrink-0">
            {(isSidebarOpen || isMobileMenuOpen) ? (
              <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-widest text-[#0545E7] uppercase whitespace-nowrap">LỊCH VẠN NIÊN</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs tracking-normal font-medium text-slate-600 uppercase">Xem ngày tốt xấu</span>
                  <img src="/logo_amduong.png" alt="Logo Lịch Vạn Niên AI" className="h-12 w-auto object-contain drop-shadow-md" />
                </div>
              </div>
            ) : (
              <div className="mt-1">
                 <img src="/logo_amduong.png" alt="Logo Lịch Vạn Niên AI" className="h-8 w-8 object-contain drop-shadow-md" />
              </div>
            )}
            <button onClick={() => { window.innerWidth < 768 ? setIsMobileMenuOpen(false) : setIsSidebarOpen(!isSidebarOpen); }} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors flex-shrink-0 mt-0.5">
              {isMobileMenuOpen ? <X size={18} /> : (isSidebarOpen ? <X size={18} className="hidden md:block" /> : <Menu size={18} className="hidden md:block" />)}
              {!isMobileMenuOpen && <X size={18} className="md:hidden" />}
            </button>
          </div>

        <nav className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {displayModules.map((m) => (
            <button
              key={m.id}
              onClick={() => { m.isExternal ? window.open(m.url, '_blank') : setActiveModule(m.id as Module); setIsMobileMenuOpen(false); }}
              className={activeModule === m.id ? 'sidebar-link-active w-full whitespace-nowrap' : 'sidebar-link w-full whitespace-nowrap'}
            >
              <m.icon size={18} className={activeModule === m.id ? 'text-white flex-shrink-0' : 'flex-shrink-0'} />
              {(isSidebarOpen || isMobileMenuOpen) && <span className="text-sm font-medium truncate">{m.label}</span>}
              {(isSidebarOpen || isMobileMenuOpen) && m.isExternal && <ChevronRight size={14} className="ml-auto opacity-50 flex-shrink-0" />}
            </button>
          ))}
        </nav>

        <div className="pb-6 border-t border-slate-200 flex-shrink-0 flex flex-col">
          {/* Nút Trợ giúp căn trái thẳng hàng với các thực đơn phía trên */}
          <button onClick={() => setShowHelpModal(true)} className="sidebar-link w-full whitespace-nowrap mb-2 mt-4">
            <HelpCircle size={18} className="flex-shrink-0" />
            {(isSidebarOpen || isMobileMenuOpen) && <span className="text-sm font-medium">Trợ giúp</span>}
          </button>
          
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 w-full">
        <header className="h-[70px] bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4 font-bold text-slate-500">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:text-brand transition-colors md:hidden"><Menu size={24} /></button>
            <div className="hidden sm:flex items-center gap-3 text-[11px] tracking-widest uppercase font-semibold">
              <span>Vị trí hiện tại:</span>
              <span className="text-[#0545E7] flex items-center gap-2"><ChevronRight size={12} className="text-slate-500" />{displayModules.find(m => m.id === activeModule)?.label || 'Ứng dụng ngoài'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            {user ? (
              <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 pr-3 rounded-full border border-slate-200">
                 <img src={user.photoURL || ''} alt="Avatar" className="w-8 h-8 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.3)]" title={user.email || ''} />
                 <button onClick={handleLogout} className="text-slate-600 hover:text-rose-400 transition-colors ml-1" title="Đăng xuất"><LogOut size={18} /></button>
              </div>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0545E7] to-sky-400 text-white border-none text-xs font-bold rounded-full transition-all hover:scale-105 shadow-lg shadow-brand/20">
                 <LogIn size={16} /> Đăng nhập
              </button>
            )}
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto overflow-x-hidden relative ${activeModule === 'qrcode' ? 'p-0' : 'p-4 md:p-6 lg:p-8'}`}>
          <div className="absolute inset-0 dot-grid opacity-10 pointer-events-none" />
          <div className="w-full mx-auto relative z-10 overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div key={activeModule} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3, ease: "easeOut" }} className="w-full">
                {activeModule === 'admin' ? (
                  <AdminPanel />
                ) : activeModule === 'library' ? (
                  <LibraryPanel />
                ) : (
                  <Calendar activeTab={activeModule} setActiveTab={setActiveModule} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* --- GIAO DIỆN BÁO SỰ KIỆN --- */}
      <AnimatePresence>
         {ringingEvent && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 50 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.9, y: 50 }} 
               className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[200] bg-rose-600 rounded-2xl shadow-[0_0_80px_rgba(225,29,72,0.6)] p-6 md:p-8 flex flex-col items-center gap-4 border-2 border-rose-400 w-[90%] max-w-sm font-sans"
            >
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner animate-bounce">
                  <Bell className="text-rose-600 animate-pulse" size={40} />
               </div>
               <div className="text-center">
                 <p className="text-rose-100 font-bold uppercase tracking-widest text-xs mb-1">Báo sự kiện</p>
                 <h3 className="text-xl md:text-2xl font-black text-white">{ringingEvent.title}</h3>
                 <p className="text-base font-bold text-rose-200 mt-2 flex items-center justify-center gap-2">
                    <Clock size={18}/> Thời gian: {ringingEvent.time}
                 </p>
                 {ringingEvent.location && (
                    <p className="text-sm font-medium text-rose-100 mt-1 flex items-center justify-center gap-1">
                       <MapPin size={16}/> {ringingEvent.location}
                    </p>
                 )}
               </div>
               <button 
                  onClick={stopAlarm} 
                  className="mt-4 bg-white text-rose-600 hover:bg-rose-100 w-full px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-colors shadow-lg"
               >
                  ĐÃ HIỂU / TẮT CHUÔNG
               </button>
            </motion.div>
         )}
      </AnimatePresence>

      {showHelpModal && <DraggableHelp activeModule={activeModule} onClose={() => setShowHelpModal(false)} />}
    </div>
  );
}