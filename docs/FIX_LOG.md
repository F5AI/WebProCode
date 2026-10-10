# FIX LOG — sổ lỗi và sổ sửa (vai script supervisor)

> Mỗi lần anh Bruce báo sai, yêu cầu sửa hoặc đổi ý là **một mục**. Mỗi lần Claude sửa mà anh còn phải báo lại là **một take**.
> Claude ghi sổ này. Hộp đen (`.f5kit/`) lưu nguyên văn tin nhắn và transcript để đối chiếu.
> Mục mới thêm ở **cuối file**. Không xóa mục cũ: lỗi sai phân loại thì sửa trường `type` và ghi lý do.

## Cách ghi một mục
```
## FIX-007 · <tiêu đề ngắn, tiếng Việt đời thường>
- date: 2026-10-11 · type: spec-gap · takes: 2 · status: open
- Anh nói: "nguyên văn câu anh báo" (mỗi lần báo lại thêm một dòng, kèm giờ)
- Take 1: <Claude đã đổi gì> → <kết quả: anh báo vẫn sai / ổn>
- Take 2: …
- Gốc: <hỏi "tại sao" tới khi chạm thứ sửa được; một câu>
- Khóa: <tên test đỏ khi bỏ bản sửa> | không khóa được vì …
- Luật: R-xx (luật đã có mà bị bỏ qua) | đề xuất luật mới: …
- Commit: <hash>
```
- `status`: `open` (đang sửa) · `testing` (đã sửa, chờ anh xác nhận) · `closed` (anh xác nhận hoặc dùng tiếp không báo lại) · `wontfix` (quyết định không sửa, ghi lý do).
- `repeat_of: FIX-xxx` thêm vào dòng meta nếu lỗi cũ quay lại sau khi đã đóng. Đây là con số quan trọng nhất cần về 0.
- Commit sửa lỗi kết thúc bằng dòng `Fix: FIX-007 take 2`.

## Phân loại theo nguồn gốc (`type`) — sửa tận gốc ở đâu
| type | Nghĩa | Ví dụ | Sửa tận gốc ở |
|---|---|---|---|
| `spec-gap` | Anh chưa nói, spec chưa có | Không nói phải loại Shorts | Thêm câu hỏi vào PREFLIGHT |
| `misread` | Anh đã nói, Claude hiểu sai ý | "NotebookLM là lõi" bị làm thành phụ | Luật trong PLAYBOOK, định nghĩa từ |
| `code-bug` | Code sai thật | Nút bấm lỗi 500 | Test khóa |
| `fact` | Sai thông tin bên ngoài | Giá API, cách đếm quota | Tra nguồn chính thức, ghi ngày |
| `env` | Máy, hệ điều hành, dịch vụ ngoài | Windows cần admin, đăng nhập hết hạn | Ghi chú môi trường + app tự kiểm |
| `process` | Cách làm việc | Hai phiên ghi đè nhau, báo xong khi chưa nhìn | Luật quy trình trong PLAYBOOK |
| `changed-mind` | Anh đổi ý sau khi thấy bản chạy | Đổi 90 → 30 ngày | Không tính là lỗi; số nên nằm trong cài đặt |
| `feature` | Yêu cầu mới | Thêm phòng chờ | Không tính là lỗi |
| `advice` | Hỏi ý kiến, không sửa code | Tư vấn chia sẻ từ xa | Không tính là lỗi |

Ba con số theo dõi (tính trên 6 loại đầu, `/fix-review` tự tính):
1. **Đúng ngay take đầu**: % mục có `takes: 1`. Càng cao càng tốt.
2. **Take trung bình mỗi lỗi**: càng thấp càng tốt.
3. **Lỗi quay lại** (`repeat_of`): mục tiêu là 0.

---

## FIX-001 · Đổi giao diện sang theme tối, tối giản, chất công nghệ/điện ảnh
- date: 2026-10-11 · type: changed-mind · takes: 1 · status: testing
- Anh nói: "giao diện màu tối thật công nghệ, phong cách tối giản hiện đại với 2 tone màu chủ đạo gợi ý là đen trắng, hoặc xanh navi sẫm. cũng có thể chọn các tone màu điện ảnh và đậm chất art." (11/10/2026, chiều)
- Take 1: Chọn navy sẫm `#0b0e14` + trắng ngà `#eef1f6` làm hai tone chính, cam than `#ff6a3d` chỉ cho CTA/nhấn, vàng kim mờ cho khu CLB (chất điện ảnh). Quy toàn bộ màu hard-code của `src/styles.css` và `src/dialogs.css` về token trong `:root`; cập nhật theme-color, favicon, banner HTML offline; chụp lại 1440/820/390 → chờ anh xem.
- Gốc: Bản bàn giao chốt "nền sáng, cam nhấn" trước khi anh thấy bản chạy; anh đổi ý sau khi xem. Không phải lỗi; nhưng màu cũ nằm rải ở ~300 chỗ nên đổi theme tốn một vòng viết lại thay vì đổi một bảng token.
- Khóa: `tests/theme.test.mjs` (đỏ nếu :root về nền sáng, nếu dán lại màu kem cũ, hoặc nếu có màu hex ngoài token trong styles.css)
- Luật: R-14 (số/màu hay đổi phải nằm một chỗ) — nay đã đưa vào token. Đề xuất: PREFLIGHT câu 3 nên hỏi thêm "sáng hay tối, hai tone chính là gì" khi dựng giao diện mới.
- Commit: (điền sau khi commit)

## FIX-002 · Rà soát bảo mật, tối ưu code, dựng demo cục bộ trước khi bàn việc publish
- date: 2026-10-11 · type: feature · takes: 1 · status: closed
- Anh nói: "rà soát và tối ưu lại toàn bộ code, kiểm tra lỗ hổng bảo mật. hãy tự host và demo offline trên local trước, bao giờ sẵn sàng và được tôi duyệt đạt thì mới liệt kê các đầu việc như thuê server , tạo host để sẵn sàng publish." (11/10/2026, đêm)
- Take 1: Backend: CSP + X-Frame-Options + Permissions-Policy + HSTS (khi HTTPS); chặn ghi cross-site theo Sec-Fetch-Site, origin dev chỉ ngoài production; khóa đăng nhập theo email (10 sai/15 phút) thêm vào giới hạn theo IP; upload kiểm chữ ký nội dung và xóa file sai; scrypt bất đồng bộ; đăng ký trùng khi chạy đua trả 409; cache seed theo mtime, prepared statement cho đường nóng; `/assets` immutable, `index.html` revalidate, đường dẫn có đuôi lạ 404; `/api/health` kiểm DB + thư mục upload; tên file tải về dễ đọc; `PLAN_PRICE`/`PLAN_DAYS`/`COOKIE_SECURE`/`HOST` thành biến cấu hình. Frontend: giá đọc từ API, dọn type cũ. Demo: `scripts/demo-local.mjs` + `start-demo.cmd` chạy bản production ở `http://localhost:3080` với `.data-demo/` và `.env.demo` riêng. Sau đó sub-agent rà soát độc lập (R-13) tìm 3 điểm trung bình + 9 điểm thấp; đã sửa 12/12 điểm đáng sửa (limiter chỉ đếm lần sai, chủ tài khoản không bị khóa, cache catalogue, một đơn chờ/người, bank chỉ cho người đăng nhập, URL https, boolean env, APP_ORIGIN http bị bỏ ở production, HSTS sau proxy, CORP, xóa phiên khi đổi mật khẩu admin, VOLUME Docker). Test: 11/11 backend, build, test:admin, test:browser PASS cả hai lượt; đã nhìn demo ở 1440/820 → chờ anh duyệt.
- Gốc: Không phải lỗi; yêu cầu mới. Điểm đáng ghi: hai phiên Claude cùng sửa một thư mục trong cùng buổi (FIX-001 theme tối chạy song song), vi phạm R-07; phiên này né các file CSS/HTML/export của phiên kia.
- Khóa: `tests/backend.test.mjs` (3 test mới + sửa 2 test cũ: origin/header production, giá từ cấu hình, cache static, khóa theo email, upload giả)
- Luật: R-07 (một phiên, một thư mục) bị vi phạm do chạy song song; R-13 đã làm (sub-agent rà soát độc lập sau khi sửa).
- Anh xác nhận: "duyệt, tiến hành publish" (11/10/2026, đêm) → closed.
- Commit: 5821e1a

## FIX-003 · Tiến hành publish sau khi duyệt demo
- date: 2026-10-11 · type: feature · takes: 1 · status: open
- Anh nói: "duyệt, tiến hành publish" (11/10/2026, đêm)
- Take 1: Commit + push nhánh `claude-handover`; thêm `deploy/docker-compose.yml` + `deploy/Caddyfile` (HTTPS tự động), CI GitHub Actions (test, build, build image, health), runbook `handover/PUBLISH.md`. Phần cần tài khoản/tiền của anh (thuê VPS, mua domain, trỏ DNS) không tự làm được; ghi rõ từng bước và dữ liệu cần anh cấp.
- Gốc: Không phải lỗi; yêu cầu mới. Phụ thuộc ngoài: chưa có server, domain, tài khoản hosting hay bank thật được cấp.
- Khóa: không khóa được bằng test cục bộ vì phụ thuộc hạ tầng ngoài; CI `.github/workflows/ci.yml` khóa phần build image + health.
- Luật: R-06 (giá hosting tra nguồn chính thức, ghi ngày trong PUBLISH.md).
- Commit: 5821e1a
