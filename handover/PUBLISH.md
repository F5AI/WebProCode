# Đưa F5 AI Studio lên Internet — runbook publish

Trạng thái ngày 11/10/2026: mã nguồn đã rà soát bảo mật, demo cục bộ đã được chủ dự án duyệt. **Chưa có** server, domain, tài khoản hosting hay bank thật được cấp cho agent, nên chưa có địa chỉ công khai. Tài liệu này là lộ trình chính xác để lên online trong một buổi khi đã có ba thứ: một VPS, một domain, thông tin nhận chuyển khoản.

## 0. Kiến trúc chọn mặc định

Một VPS Linux chạy Docker Compose với hai container: `app` (Node 24, Express, SQLite, uploads trong volume `f5-data`) và `caddy` (reverse proxy, tự xin và gia hạn chứng chỉ HTTPS Let's Encrypt). File ở `deploy/docker-compose.yml` và `deploy/Caddyfile`. Lý do: rẻ nhất, một máy, dữ liệu bền vững trên đĩa, không cần dịch vụ database ngoài, HTTPS tự động, backup chỉ là sao chép một volume.

Phương án bị loại: static hosting (Netlify/Vercel/GitHub Pages) vì không chạy được API + SQLite; PaaS có đĩa tạm (Heroku kiểu cũ, Render free) vì mất database khi restart; Kubernetes vì quá nặng cho một website nhỏ.

## 0b. Nhà cung cấp đã chọn cho chủ dự án ở Việt Nam (giá đọc từ trang chính thức ngày 11/10/2026)

| Hạng mục | Chọn | Giá niêm yết | Vì sao |
| --- | --- | --- | --- |
| VPS (chính) | **AZDIGI Pro VPS Platinum-2**: 2 vCPU Xeon Platinum, 2 GB RAM, 20 GB SSD RAID-10, 200 Mbps, backup tuần, DC Việt Nam | 199.000đ/tháng chu kỳ 12 tháng = 2.388.000đ/năm chưa VAT 8%; chu kỳ ngắn nhất 3 tháng | Người xem ở VN nên đặt máy ở VN cho nhanh; trả bằng chuyển khoản/MoMo/VNPay, có hóa đơn VAT, hỗ trợ tiếng Việt; đủ cho Node + SQLite + vài trăm người/ngày |
| VPS (thay thế) | **Vietnix VPS SSD Linux 1**: 2 CPU, 2 GB RAM, 40 GB SSD, 200 Mbps trong nước / 10 Mbps quốc tế, backup tuần | 210.000đ/tháng theo tháng; 178.500đ/tháng chu kỳ 2 năm; chưa VAT; hoàn tiền 30 ngày; mã VIETNIX_WELCOME giảm 5% | Chọn khi muốn trả theo tháng không cam kết, hoặc cần 40 GB cho nhiều video; nhược điểm băng thông quốc tế ra ngoài chỉ 10 Mbps |
| VPS (khi có khán giả ngoài VN) | DigitalOcean Basic 1 vCPU / 2 GiB / 50 GiB, region Singapore | 12 USD/tháng (1 GiB: 6 USD) cùng giá mọi region | Cần thẻ quốc tế; chỉ cân nhắc sau khi có người xem ngoài VN |
| Tên miền | **.vn** đăng ký tại Mắt Bão (hoặc tại AZDIGI cùng tài khoản VPS; phí nhà nước giống nhau) | Năm đầu 558.000đ, năm sau 458.000đ (gồm lệ phí + phí duy trì nhà nước 350.000đ + quản trị). Rẻ hơn: .com.vn 458.000đ/358.000đ; .id.vn 114.000đ/104.000đ (cá nhân) | .vn tin cậy nhất với người Việt và Google Việt Nam; .id.vn/.io.vn chỉ nên dùng nếu muốn tối thiểu chi phí |
| HTTPS | Let's Encrypt qua Caddy trong `deploy/` | 0đ | Tự gia hạn |
| Email gửi thông báo (sau này) | Chưa cần ở bản đầu | — | Chỉ cần khi làm xác minh email/đặt lại mật khẩu |

Tổng năm đầu với lựa chọn chính: 2.388.000đ + VAT 8% ≈ 2.579.000đ (VPS) + 558.000đ (.vn) ≈ **3,14 triệu đồng**, tức khoảng 262.000đ/tháng. Năm sau ≈ 3,04 triệu. Mua VPS tại cùng nhà cung cấp với domain để một tài khoản, một hóa đơn.

Nguồn: [AZDIGI Pro VPS](https://azdigi.com/pro-vps), [Vietnix VPS SSD](https://vietnix.vn/vps-ssd/), [DigitalOcean Droplet pricing](https://www.digitalocean.com/pricing/droplets), [Mắt Bão bảng giá tên miền](https://www.matbao.net/ten-mien/bang-gia-ten-mien.html). Giá có thể đổi; đối chiếu lại ở bước thanh toán.

## 1. Việc cần chủ dự án làm (cần tài khoản hoặc tiền)

| # | Việc | Gợi ý | Kết quả cần có |
| --- | --- | --- | --- |
| 1 | Thuê VPS Ubuntu 24.04, tối thiểu 1 vCPU / 2 GB RAM / 20 GB SSD, IPv4 | DigitalOcean Basic 1 GB khoảng 6 USD/tháng (nguồn tổng hợp kiểm lại ngày 03/09/2026, xem cuối file); Hetzner rẻ hơn nhưng giá/model đổi nhiều trong 2026, tra `hetzner.com/cloud` lúc mua. Nên lấy gói 2 GB để build image thoải mái. | Địa chỉ IP, SSH key đăng nhập `root` hoặc user có `sudo` |
| 2 | Mua hoặc dùng domain sẵn có | Ví dụ `studio.f5ai.vn` (tên chỉ là ví dụ) | Quyền sửa DNS |
| 3 | Trỏ DNS: bản ghi `A` của domain (và `www` nếu muốn) về IP VPS | TTL 300 giây | `nslookup <domain>` trả đúng IP |
| 4 | Chuẩn bị thông tin nhận chuyển khoản thật | Tên ngân hàng, số tài khoản, tên chủ tài khoản; đây là thông tin công khai với người đã đăng nhập | 3 giá trị `BANK_*` |
| 5 | Chọn email + mật khẩu quản trị (12–128 ký tự) | Không gửi qua chat; gõ trực tiếp trên server | Dùng một lần ở bước 2.5 |
| 6 | Tùy chọn: đổi giá/thời hạn gói | `PLAN_PRICE`, `PLAN_DAYS` | Số trong `.env` |

Cấp cho agent (nếu muốn agent triển khai thay): quyền SSH vào VPS và quyền sửa DNS. Không cần cấp mật khẩu admin hay bank; agent có thể để trống và chủ dự án điền sau.

## 2. Các bước trên server (khoảng 30 phút)

```bash
# 2.1 Cài Docker (Ubuntu 24.04)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# 2.2 Lấy mã nguồn
git clone -b claude-handover https://github.com/F5AI/WebProCode.git f5-ai-studio
cd f5-ai-studio

# 2.3 Cấu hình (chỉ sửa trên server, không commit)
cp .env.example .env
nano .env   # điền BANK_NAME, BANK_ACCOUNT, BANK_ACCOUNT_NAME; PLAN_* nếu đổi; để trống COOKIE_SECURE; TRUST_PROXY=1

# 2.4 Chạy (DOMAIN là domain đã trỏ DNS ở bước 1.3)
DOMAIN=studio.example.com docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml logs -f caddy   # chờ dòng "certificate obtained"

# 2.5 Tạo tài khoản quản trị (gõ mật khẩu trực tiếp, không lưu vào .env)
docker compose -f deploy/docker-compose.yml exec \
  -e F5AI_ADMIN_EMAIL=chu@domain.vn -e F5AI_ADMIN_PASSWORD='mat-khau-dai-cua-ban' \
  app node server/index.mjs --create-admin
```

Mở firewall chỉ 22, 80, 443 (`ufw allow 22,80,443/tcp && ufw enable`). Compose đã đặt `TRUST_PROXY=1` và `APP_ORIGIN=https://<DOMAIN>` cho container `app`; không cần đặt lại trong `.env`.

## 3. Nghiệm thu từ máy khác (bắt buộc trước khi báo "đã lên")

| Khi | Thì thấy |
| --- | --- |
| Mở `https://<domain>` trên điện thoại 4G | Trang chủ 8 bài, khóa HTTPS hợp lệ, không cảnh báo |
| `curl -sI https://<domain>/api/health` | `200`, có `strict-transport-security`, `content-security-policy`, `cross-origin-resource-policy` |
| Tạo tài khoản rồi tải lại trang | Vẫn đăng nhập (cookie `Secure` qua HTTPS) |
| Tải một file miễn phí | Tải được, tên file dễ đọc |
| Gọi `/api/downloads/<id>/premium/0` khi chưa đăng nhập / đã đăng nhập chưa trả phí | `401` / `403` |
| Đăng nhập admin, đăng một bài, upload một file | Bài hiện ngay cho khách; file tải được |
| `docker compose restart app` rồi tải lại | Tài khoản, bài, file vẫn còn (volume bền) |
| Thành viên tạo yêu cầu, admin xác nhận sau khi **thực sự thấy tiền** | Thành viên thấy "đang là thành viên", tải được file cao cấp |

## 4. Vận hành

- **Backup hằng ngày:** `docker run --rm -v f5-ai-studio_f5-data:/data -v $PWD/backup:/backup alpine tar czf /backup/f5-data-$(date +%F).tgz /data` (chạy bằng cron; giữ 14 bản). Khôi phục: dừng `app`, giải nén vào volume, chạy lại.
- **Cập nhật:** `git pull && DOMAIN=... docker compose -f deploy/docker-compose.yml up -d --build`. Có lỗi thì `git checkout <commit cũ>` rồi chạy lại lệnh đó.
- **Theo dõi:** `docker compose ps` (healthcheck `app`), `docker compose logs --since 1h app`. `/api/health` trả 503 khi database hoặc thư mục upload hỏng.
- **Không làm:** bật `COOKIE_SECURE=0` trên website thật; mở cổng 3001 ra ngoài; commit `.env`; copy file SQLite đang ghi thay cho backup đúng cách.

## 5. Còn thiếu sau khi lên online (backlog, không chặn publish)

- Xác minh email và đặt lại mật khẩu (cần một dịch vụ gửi mail).
- Đơn chờ không tự hết hạn; admin chưa có nút từ chối đơn.
- Nội dung thật: video giảng viên, workflow nâng cao đã render; hiện mới có bài viết và file thực hành.
- Giám sát uptime bên ngoài (ví dụ một dịch vụ ping miễn phí) và cảnh báo khi `/api/health` khác 200.

## Nguồn giá (tra ngày 11/10/2026)

- DigitalOcean Basic 1 GB: 6 USD/tháng, kiểm lại trên trang giá ngày 03/09/2026 theo [vpsbenchmarks.com](https://vpsbenchmarks.com/hosters/digitalocean/plans/std_1gb_1core) và [whtop.com](https://www.whtop.com/amp/plans/digitalocean.com/137790).
- Hetzner: các gói CX đổi model và tăng giá trong 2026, nguồn mâu thuẫn ([vincentschmalbach.com](https://www.vincentschmalbach.com/hetzner-cheap-cloud-unavailable-price-increases/), [kimmo.suominen.com](https://kimmo.suominen.com/stuff/cpc-2026-08.txt)); tra trực tiếp `hetzner.com/cloud` khi mua.
