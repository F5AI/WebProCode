# Bối cảnh sản phẩm và quyết định đã chốt

Tài liệu này dành cho agent tiếp quản bằng Claude Code Desktop, không có lịch sử hội thoại. Đọc cùng mã nguồn thực tế, [README.md](../README.md), [OPEN-WEBSITE.md](../OPEN-WEBSITE.md) và những tài liệu handover còn lại. Các mục ghi **đã yêu cầu**, **đã thực hiện**, **đề xuất** và **chưa hoàn thành** có ý nghĩa khác nhau; không biến một lựa chọn triển khai của agent thành lời xác nhận của chủ website.

## 1. Kết quả người dùng cần

Người dùng muốn một website tiếng Việt chia sẻ tài nguyên AI miễn phí, sau đó chuyển người đã nhận được giá trị sang câu lạc bộ trả phí theo tháng. Chủ đề khởi đầu là làm phim AI: kịch bản, tạo nhân vật, tạo môi trường, workflow ComfyUI tạo video mã nguồn mở và hậu kỳ. Website cần đơn giản, đủ chức năng và hiển thị tốt trên PC, tablet, mobile. Người dùng nhắc Patreon như nguồn tham khảo và cho phép chủ động đề xuất thêm tính năng.

Đầu ra học tập cụ thể đã chốt là **hoàn thành một tập phim ngắn AI dài 3 phút, với đầy đủ quy trình**. Bản miễn phí cần bao quát các bước đến đầu ra; bản trả phí cải thiện tốc độ, chất lượng, chi phí và độ tiện lợi khi vận hành. Giá trị bán là công cụ và phương pháp làm tốt hơn, không phải giữ thiếu một bước bắt buộc ở bản miễn phí.

Kết quả bàn giao quan trọng nhất lúc tiếp quản: đưa người dùng tới **một website thực sự có thể mở và thao tác**, rồi hoàn tất những điều kiện vận hành còn thiếu. Lần bàn giao trước đã có mã nguồn và ảnh nhưng chưa có URL công khai, khiến người dùng hỏi “website tôi đâu.”. Không lặp lại việc coi ảnh kiểm thử, file code hoặc Publish môi trường cloud là website đã triển khai.

## 2. Những câu trả lời và chỉ đạo đã có

| Nội dung | Thông tin đã chốt từ người dùng | Hệ quả cho sản phẩm |
|---|---|---|
| Hình thức thu phí | “tham gia câu lạc bộ trả phí theo tháng, để truy cập bản cao cấp của các tài nguyên đã xem” | Gắn quyền lợi cao cấp trực tiếp với từng bài miễn phí; có quyền thành viên và thời hạn truy cập. |
| Các loại tài nguyên | Video xem phần đầu hoặc một phần; workflow cơ bản và workflow tốt hơn cho người trả phí; bài học HTML và file thực hành liên quan | Mỗi bài có nội dung, file, video miễn phí/cao cấp riêng khi đã có media thật. |
| Đối tượng | “dân văn phòng mới tiếp xúc AI, hoặc đã tiếp xúc nhưng chưa kiểm soát được như ý” | Tiếng Việt dễ hiểu, từng bước, ví dụ cụ thể, chỉ rõ yêu cầu phần cứng và phương án máy yếu. |
| Chủ đề | Quy trình kịch bản phim AI, tạo hình nhân vật/môi trường, ComfyUI video mã nguồn mở | Giữ tập trung vào pipeline sản xuất phim, tránh biến thư viện thành danh mục công cụ AI chung. |
| Nhu cầu | Làm nhanh, dễ, tự động, ưu tiên rẻ hoặc miễn phí; làm kênh video ngắn hoặc YouTube | Tài nguyên phải dùng được trong sản xuất thực tế, có file và giảm thao tác lặp. |
| Động cơ trả phí | Tiện hơn, nhanh hơn và giúp họ có khả năng kiếm tiền | Nêu lợi ích đo được; không bảo đảm thu nhập hay kết quả kênh. |
| Đầu ra học tập | “1 tập phim ngắn AI 3 phút” | Một lộ trình thống nhất 180 giây, thay vì nhiều bài rời rạc. |
| Mức độ hoàn thiện | “hoàn thiện, đầy đủ quy trình” | Có kịch bản, shotlist, asset, chuyển động/animatic, dựng, âm thanh và xuất file. |
| Tiêu chí giá trị | “tốc độ, chất lượng, chi phí và sự tiện lợi dễ vận hành” | Mọi nâng cấp trả phí nên giải thích tác động lên ít nhất một tiêu chí này. |
| Quyền chủ động | “chủ động đề xuất và tự thực hiện mà không hỏi lại bất cứ thứ gì” | Không khởi động lại cuộc phỏng vấn. Tiếp tục với phán đoán hợp lý; chỉ báo rõ giới hạn thực tế khi thiếu quyền truy cập, thông tin hoặc tài nguyên bắt buộc. |

Ban đầu người dùng yêu cầu hỏi từng câu mở để thống nhất góc nhìn. Chỉ đạo chủ động cuối cùng thay thế nhu cầu hỏi lại. Không hỏi lại thương hiệu, chân dung khách hàng, định dạng tài nguyên hay đầu ra đã trả lời.

Thông tin người dùng ngoài các câu trả lời trên chưa có. Không tự dựng tiểu sử, doanh thu, tên giảng viên, quy mô cộng đồng, tài khoản ngân hàng, domain hoặc cam kết của người dùng.

## 3. Những lựa chọn do agent đã thực hiện

- Tên sản phẩm hiện tại: **F5 AI Studio**; gói thành viên: **Studio Club**. Đây là lựa chọn triển khai dựa trên repository `F5AI/WebProCode`, chưa phải thông tin thương hiệu riêng được người dùng cung cấp.
- Giá khởi điểm: **199.000đ / 30 ngày**. Đây là đề xuất đã cài vào UI/backend, không phải câu trả lời xác nhận giá của người dùng. Hằng số `PLAN_PRICE` và `PLAN_DAYS` nằm trong `server/index.mjs`; phần hiển thị giá còn có trong `src/App.tsx`, cần sửa thống nhất nếu thay đổi.
- Thanh toán hiện tại: chuyển khoản ngân hàng, quản trị viên đối chiếu và duyệt. Không có cổng thanh toán tự động, webhook ngân hàng, lưu thẻ hoặc thu tiền định kỳ.
- Thời hạn hiện tại là **30 ngày liên tục**, không phải một tháng lịch. Mỗi đơn được duyệt cộng 30 ngày từ mốc muộn hơn giữa hiện tại và ngày hết hạn đã có; duyệt lại cùng đơn không cộng thêm lần nữa.
- Bộ học mẫu xuyên suốt là **“Chiếc ô cuối cùng”**: nhân vật Mai tan làm giữa trời mưa, phải chọn giữ chiếc ô duy nhất hay giúp một người khác. Kế hoạch 5 cảnh, mỗi cảnh 6 shot, mỗi shot 6 giây, tổng 30 shot / 180 giây.
- Giao diện màu kem/trắng ngà, cam nhấn, hình minh họa điện ảnh; sidebar desktop, drawer và thanh điều hướng dưới trên mobile; font Be Vietnam Pro đóng gói cục bộ.
- Hình hero là cảnh phi hành gia trên sa mạc với hành tinh lớn; ảnh nhân vật là nữ phi hành gia. Đây là minh họa tạo riêng, không phải ảnh hoàn chỉnh của phim mẫu “Chiếc ô cuối cùng”. Có thông tin nguồn tại `public/images/credits.json`.
- Không chọn dịch vụ trả phí bên ngoài cho bản nền tảng. Backend Express + SQLite phục vụ đầy đủ tài khoản, quyền, nội dung và file.

## 4. Hành trình người dùng mục tiêu

1. Vào thư viện, hiểu ngay đây là tài nguyên làm phim AI cho người mới và có thể bắt đầu miễn phí.
2. Xem lộ trình bốn chặng, mở bài đầu tiên, đọc hướng dẫn, tải file mẫu và tạo một kết quả nhỏ.
3. Tiếp tục kịch bản → shotlist/storyboard → nhân vật và bối cảnh → keyframe → chuyển động hoặc animatic → dựng, âm thanh và xuất MP4 3 phút.
4. Ở từng bài, thấy rõ bản miễn phí dùng được việc gì và bản cao cấp giảm thời gian hoặc tăng khả năng vận hành ở đâu.
5. Khi có nhu cầu, mở Studio Club, đăng ký/đăng nhập, xem quyền lợi và điều kiện 30 ngày.
6. Nếu chưa cấu hình nhận tiền, đăng ký quan tâm; nếu đã cấu hình, tạo đơn và nhận số tiền, tài khoản nhận, mã chuyển khoản riêng.
7. Sau khi người quản trị xác nhận khoản nhận thật, truy cập file và video cao cấp trong thời hạn còn hiệu lực.

Người dùng không phải trả phí hoặc tạo tài khoản để đọc tài nguyên và tải file miễn phí. Lưu bài hiện dùng trình duyệt, không cần tài khoản và chưa đồng bộ giữa các thiết bị.

## 5. Những chức năng đã triển khai

### Khám phá và học

- Thư viện bài viết với hình, chủ đề, định dạng, thời gian đọc/thực hành gợi ý, mức độ và trạng thái miễn phí.
- Tìm kiếm tiếng Việt có dấu/không dấu; lọc chủ đề Kịch bản, Nhân vật, Bối cảnh, Video, Hậu kỳ; lọc định dạng hướng dẫn/workflow/bài học video.
- Sắp xếp đề xuất, bước cuối trước và tên A→Z. “Bước cuối trước” là thứ tự lộ trình, chưa phải sắp xếp theo thời điểm xuất bản thật.
- Modal bài học: nội dung chia mục, danh sách tải file miễn phí và quyền lợi/tài nguyên cao cấp tương ứng.
- Liên kết chia sẻ bài bằng `?resource=<id>`; mở/đóng bài gắn với lịch sử trình duyệt.
- Lưu/bỏ lưu bài trong `localStorage` với khóa `f5ai-saved`; trang Đã lưu, thông báo thao tác và trạng thái rỗng.
- Lộ trình bốn chặng, trang bắt đầu/trợ giúp và FAQ về máy yếu, miễn phí, video, doanh thu và quyền thành viên.
- Điều hướng responsive, modal cuộn trên điện thoại, Escape/focus trong dialog, phím `/` để tìm kiếm.

### Tài khoản và câu lạc bộ

- Đăng ký, đăng nhập, đăng xuất; mật khẩu được băm; phiên cookie phía server.
- Kiểm tra quyền thành viên ở backend trước khi tải file hoặc phát video cao cấp.
- Nếu chưa có đủ `BANK_NAME`, `BANK_ACCOUNT`, `BANK_ACCOUNT_NAME`, chưa mở checkout; tài khoản có thể đăng ký quan tâm, server lưu theo user và không nhân đôi đăng ký.
- Nếu đủ cấu hình ngân hàng, tạo đơn chuyển khoản với mã tham chiếu riêng; một đơn đang chờ có thể được trả lại thay vì tạo liên tục đơn trùng.
- Quản trị viên xem đơn và duyệt sau đối chiếu; giữ trạng thái/người duyệt/thời điểm duyệt, cập nhật hạn thành viên theo giao dịch dữ liệu.
- Quyền hết hạn khiến tài nguyên cao cấp bị khóa lại. Không giả lập việc người dùng đã chuyển tiền hoặc đã được ngân hàng xác nhận.
- Tài khoản admin luôn có quyền cao cấp để quản lý/kiểm tra nội dung, dù không có hạn thành viên; khi kiểm thử khóa quyền hoặc hết hạn, dùng tài khoản thường.

### Quản trị nội dung

- Tài khoản quản trị được tạo chủ động bằng cấu hình riêng và `npm run admin`; không có admin mặc định hoặc mật khẩu mặc định.
- Đăng, sửa, gỡ tài nguyên; thay đổi phần nội dung, file miễn phí/cao cấp và video miễn phí/cao cấp.
- Tải file và MP4/WebM lên máy chủ; giới hạn hiện tại 100 MB một upload. Video lớn hơn cần cách lưu/phát phù hợp khi mở rộng.
- Xem danh sách quan tâm và đơn thành viên; duyệt đơn qua UI quản trị.
- Bộ bài ban đầu lấy từ `server/content.json`. Bài do quản trị viên cập nhật và dấu gỡ bài được lưu SQLite; không giả định sửa seed JSON sẽ ghi đè những thay đổi quản trị đã có.

## 6. Bộ nội dung chính xác đang có

Nguồn đối chiếu: `server/content.json`, `server/assets/free/`, `server/assets/premium/`. Đây là **bộ seed 8 bài**, không tính nội dung được thêm vào database sau đó. Có **14 file miễn phí duy nhất**, **3 file cao cấp duy nhất**; các bài có **16 liên kết tải miễn phí + 8 liên kết tải cao cấp**, tổng 24 liên kết vì nhiều bài dùng lại cùng file.

| Thứ tự / ID | Bài và định dạng | Chủ đề / thời gian gợi ý | File miễn phí gắn với bài | File cao cấp gắn với bài |
|---|---|---|---|---|
| 1 / `roadmap` | Lộ trình: phim AI 3 phút (`guide`, nổi bật) | Kịch bản / 10 phút | `roadmap.html`, `shotlist-3-minutes.csv` | `plan-film.py` |
| 2 / `script` | Viết kịch bản có thể sản xuất (`guide`) | Kịch bản / 12 phút | `script-prompts.md`, `script.html` | `advanced-prompt-pack.md` |
| 3 / `storyboard` | Chia 30 shot cho phim 180 giây (`guide`) | Kịch bản / 15 phút | `shotlist-3-minutes.csv`, `storyboard.html` | `plan-film.py` |
| 4 / `character` | Tạo nhân vật dễ giữ nhất quán (`guide`) | Nhân vật / 14 phút | `character-prompts.md`, `character.html` | `advanced-prompt-pack.md` |
| 5 / `environment` | Tạo bối cảnh dùng lại qua nhiều shot (`guide`) | Bối cảnh / 11 phút | `environment-prompts.md`, `environment.html` | `advanced-prompt-pack.md` |
| 6 / `comfyui` | ComfyUI: tạo keyframe đầu tiên (`workflow`, nổi bật) | Video / 18 phút | `comfyui-basic-sd15.json`, `comfyui.html` | `plan-film.py` |
| 7 / `video` | Từ keyframe đến một clip ngắn (`video`, nổi bật) | Video / 16 phút, Trung cấp | `video.html`, `shotlist-3-minutes.csv` | `production-checklist.html` |
| 8 / `edit` | Dựng, âm thanh và xuất tập phim (`guide`) | Hậu kỳ / 20 phút | `edit.html`, `sample-subtitles.srt` | `production-checklist.html` |

Các bài khác mang mức độ Cơ bản. Thời gian trên là gợi ý nội dung, **không phải độ dài video đang tồn tại**.

### 14 file miễn phí duy nhất

| File | Công dụng |
|---|---|
| `roadmap.html` | Hướng dẫn toàn quy trình và tiêu chí hoàn thành phim 3 phút. |
| `script.html` | Bài học kịch bản, giới hạn sản xuất và kiểm tra câu chuyện. |
| `script-prompts.md` | Prompt viết kịch bản và khung 5 cảnh để sửa theo ý tưởng. |
| `storyboard.html` | Chia shot, storyboard, animatic và quy ước quản lý asset. |
| `shotlist-3-minutes.csv` | 30 shot × 6 giây; các cột shot, cảnh, thời điểm bắt đầu, thời lượng, hành động, camera, prompt, chuyển động, voiceover, trạng thái. |
| `character.html` | Khóa đặc điểm nhận diện, chọn ảnh tham chiếu và kiểm tra nhất quán. |
| `character-prompts.md` | Mẫu mô tả nhân vật và góc máy. |
| `environment.html` | Tạo bối cảnh, ánh sáng, sơ đồ vị trí và continuity. |
| `environment-prompts.md` | Prompt bối cảnh và bảng kiểm liên tục cảnh. |
| `comfyui.html` | Cài model phù hợp, nạp workflow ảnh, chạy thử và xử lý lỗi. |
| `comfyui-basic-sd15.json` | Workflow UI ComfyUI 7 node lõi, checkpoint SD1.5, text-to-image 768×432, batch 1, 20 steps; không phải graph tạo video. |
| `video.html` | Chọn template video chính thức, thử một shot, đo chi phí/thời gian và phương án dựng ảnh khi thiếu GPU. |
| `edit.html` | Dựng, thu/chuẩn bị âm thanh, phụ đề, kiểm tra và xuất MP4. |
| `sample-subtitles.srt` | Mẫu phụ đề để sửa và nhập vào phần mềm dựng. |

### 3 file cao cấp duy nhất

| File | Giá trị hiện có | Giới hạn cần nói đúng |
|---|---|---|
| `advanced-prompt-pack.md` | Bộ prompt kiểm tra câu chuyện, nhân vật, bối cảnh và chất lượng xuyên quy trình. | Là tài liệu prompt, chưa phải dịch vụ AI hoặc workflow video tự động. |
| `production-checklist.html` | Bảng kiểm chất lượng, sản xuất, bàn giao và tái sử dụng project. | Không tự phân tích ảnh/video hoặc tự duyệt chất lượng. |
| `plan-film.py` | Python standard library: tạo timing CSV, ghi chú review prompt; đọc CSV có sẵn; khi có tên checkpoint thì xuất request body ComfyUI `/prompt` theo từng shot. | Không tự viết câu chuyện bằng AI, tải model, gửi job, tạo video, dịch prompt hoặc bảo đảm nhất quán nhân vật. Payload chỉ cho pipeline ảnh SD1.5; cần kiểm tra trước khi gửi đến instance ComfyUI của người dùng. |

Số lượng và quyền truy cập cao cấp đã có, nhưng kỳ vọng người dùng về **workflow video “xịn hơn”** chưa được đáp ứng đầy đủ bởi bộ seed. Agent tiếp quản nên bổ sung workflow video thật đã kiểm thử và ví dụ đầu ra trước khi mô tả gói trả phí như một bộ tự động hóa video hoàn chỉnh.

## 7. Phương án miễn phí để hoàn thành phim 3 phút

Website hướng dẫn hai cấp thực hành:

1. **Phương án máy văn phòng:** viết kịch bản và shotlist, tạo/chọn ảnh hợp lệ, dựng animatic/ảnh tĩnh có pan/zoom, thêm giọng đọc và âm thanh, phụ đề, xuất H.264 MP4 dài 180 giây. Dùng công cụ miễn phí như Shotcut hoặc Kdenlive và Audacity. Đây là phương án hoàn thành phim ảnh tĩnh có chuyển động khung hình, không được gọi là video sinh từ model cho toàn bộ shot.
2. **Phương án có GPU phù hợp:** tạo keyframe bằng ComfyUI và model tương thích, chọn template video được hỗ trợ theo tài liệu chính thức, thử một clip, đo VRAM/thời gian/chất lượng rồi thay các shot trong cùng timeline. Model/video graph là phần phải kiểm tra thực tế trên phần cứng cụ thể.

Chuỗi thực hành chi tiết: một ý tưởng có nhân quả → 5 cảnh → 30 shot → khóa nhân vật và hai bối cảnh → tạo keyframe và chọn ảnh → tạo clip hoặc pan/zoom → dựng đúng 180 giây → âm thanh và phụ đề → xuất MP4 → xem lại file đã xuất.

“Miễn phí” ở đây là tài nguyên học và công cụ ưu tiên miễn phí; không đồng nghĩa website cung cấp miễn phí GPU, dịch vụ tạo AI, model không điều kiện sử dụng, giọng đọc trả phí hoặc tài sản của bên thứ ba. Giữ cách diễn đạt này rõ và dễ hiểu.

Tiêu chí phim đầu tay: câu chuyện hiểu được; nhân vật nhận ra được giữa các shot; không có lỗi hình rõ; âm thanh nghe rõ; phụ đề phù hợp; timeline và file xuất đủ 3 phút. Bộ tài liệu là khởi đầu thực hành, chưa có bằng chứng rằng một người mới đã làm trọn bộ phim bằng chính bộ tài nguyên này.

## 8. Trạng thái chưa hoàn thành và giới hạn quan trọng

- **Chưa có URL công khai của website.** Không có hosting/domain được xác nhận, và môi trường cloud trước đó không có chức năng chuyển tiếp preview được hỗ trợ. Mã nguồn chạy được không đồng nghĩa người dùng đã truy cập được.
- `website-preview.html` là bản HTML ngoại tuyến độc lập có UI, bài học, tìm/lọc/lưu và file miễn phí. Tài khoản, ghi dữ liệu, thanh toán, quyền thành viên và quản trị vẫn cần ứng dụng server đầy đủ; bản ngoại tuyến không được dùng để nhận tiền.
- **Cả 8 bài seed đều có `videoUrl: null`.** Chưa có video giảng viên, bản xem thử hoặc video cao cấp thật. UI ghi rõ chờ bổ sung; không đặt placeholder giả rồi coi là video khóa học. Backend và quản trị đã hỗ trợ tải/phát MP4/WebM hai tier; video 1 giây trong kiểm thử chỉ là fixture chức năng.
- Chưa có bộ phim AI 3 phút hoàn chỉnh để trình diễn, project dựng thật hoặc asset phim mẫu đã render hàng loạt.
- Workflow SD1.5 đã kiểm tra cấu trúc; **chưa render trên GPU**. Không có ComfyUI runtime/model/GPU đóng gói. Không có workflow video thực tế đã chạy để xác nhận chất lượng, chi phí hoặc tốc độ.
- Chưa có tài khoản quản trị mặc định, thông tin ngân hàng thật, giao dịch ngân hàng thật hoặc dữ liệu thành viên sản xuất. Không đưa fixture kiểm thử vào website thật.
- Chưa có tự động gia hạn, email xác minh/khôi phục mật khẩu, đồng bộ bài đã lưu theo tài khoản, bình luận, phân tích chuyển đổi, hệ thống gửi email hoặc video CDN.
- Chưa xác minh quyền thương mại của bất kỳ model bên ngoài nào; phải kiểm tra model cụ thể trước khi đưa hướng dẫn/asset ra thị trường.

## 9. Thứ tự công việc tiếp quản

### Ưu tiên 0: người dùng mở được website

1. Giải nén dự án, mở thư mục gốc trong Claude Code Desktop, đọc tài liệu handover, kiểm tra môi trường và chạy bản đầy đủ.
2. Cho người dùng thấy đúng UI và thao tác trên trình duyệt của máy desktop. Kiểm tra cả frontend và API, không chỉ mở screenshot.
3. Nếu đã có quyền hosting/domain trong môi trường tiếp quản, chuẩn bị và thực hiện triển khai có HTTPS, lưu bền vững `.data`, thiết lập origin/cookie đúng, rồi xác nhận URL thực sự mở được từ bên ngoài.
4. Nếu chưa có thông tin/quyền hosting, hoàn thành bản chạy local và bộ triển khai cụ thể; ghi chính xác yếu tố đang thiếu. Không tạo địa chỉ giả, tự mua dịch vụ, coi link file là URL live hoặc nói đã deploy khi chưa có bằng chứng.

### Ưu tiên 1: đủ điều kiện học và vận hành

1. Kiểm tra luồng thư viện → bài → download → lộ trình trên desktop/tablet/mobile.
2. Tạo admin bằng thông tin riêng của chủ website khi đã có, không phát minh mật khẩu/tài khoản.
3. Bổ sung video giảng viên thật có phần miễn phí và cao cấp; đảm bảo bản miễn phí vẫn bao quát đầy đủ quy trình.
4. Làm một phim mẫu 3 phút và đóng gói project/asset được phép chia sẻ; cập nhật hướng dẫn theo những lỗi gặp trong thực hành.
5. Thử workflow ảnh/video trên GPU thực, ghi model/version/VRAM, cấu hình, thời gian và chi phí quan sát được; tạo bản cơ bản và bản nâng cao thật sự khác nhau về tiện lợi hoặc kết quả.
6. Chỉ mở nhận tiền sau khi có cấu hình ngân hàng thật và quyền lợi có thể bàn giao. Kiểm thử phần mềm với fixture riêng, không tạo giao dịch thật chỉ để “test”.

### Ưu tiên 2: đề xuất nâng cấp sau khi có người dùng

Các mục dưới đây là **đề xuất**, chưa phải chức năng đã triển khai hoặc yêu cầu đã chốt:

| Đề xuất | Vấn đề giải quyết | Mức triển khai phù hợp |
|---|---|---|
| Đánh dấu đã học và tiến độ bốn chặng | Người mới biết đang ở đâu, bước nào tiếp theo | Bắt đầu bằng localStorage; đồng bộ tài khoản chỉ khi cần. |
| Mỗi workflow có bảng máy/model/VRAM/thời gian/chi phí | Giảm thử sai và giúp chọn cấu hình rẻ | Thêm sau khi có số đo thật; ghi ngày và cấu hình đo. |
| Changelog và phiên bản file | Người trả phí biết có gì mới; tránh workflow lỗi do model/node đổi | Metadata và lịch sử phiên bản đơn giản trước. |
| Trang so sánh miễn phí/cao cấp với ví dụ trước-sau | Làm rõ lợi ích trả phí | Dùng cùng một task, số thao tác và kết quả thật; không hứa tăng doanh thu. |
| Reset mật khẩu qua email và xác minh email | Giảm việc hỗ trợ thủ công khi có tài khoản thật | Chọn dịch vụ gửi mail khi có nhu cầu và quyền truy cập; không giả lập email gửi thành công. |
| Phân tích funnel tối giản | Biết người dùng bỏ ở bước đọc/tải/join/checkout nào | Đo sự kiện cần thiết; ưu tiên thư viện, lượt tải và đăng ký quan tâm trước. |
| Tự động đối soát thanh toán | Giảm việc duyệt đơn khi lượng người dùng tăng | Sau khi vận hành chuyển khoản thủ công ổn; dùng provider có quyền và kiểm tra webhook/idempotency. |
| Khu trưng bày phim học viên | Tạo bằng chứng sản phẩm và cảm hứng | Chỉ đăng khi có quyền tác giả và sự đồng ý cần thiết. |
| Bình luận/hỏi đáp | Giải đáp lỗi workflow và tạo giá trị cộng đồng | Làm sau nội dung và triển khai; phải có người quản trị, tránh mở một cộng đồng rỗng. |

Không thêm đồng thời nhiều chức năng chỉ vì giống Patreon. Mô hình tham khảo hữu ích là bài miễn phí → quyền lợi rõ → đăng ký thành viên; ưu tiên sự đơn giản và đầu ra thực hành.

## 10. Tiêu chí nghiệm thu cho agent tiếp quản

### Website có thể bàn giao

- Có cách mở bản đầy đủ cụ thể trên máy người dùng; nếu mục tiêu phiên tiếp quản là deploy, có URL HTTPS công khai đã được mở kiểm tra. Phân biệt rõ offline preview, ứng dụng local và website public trong báo cáo cuối.
- Nội dung UI bằng tiếng Việt, không có đường dẫn ảnh/font hỏng, không cần CDN để tải asset mặc định.
- Không cuộn ngang ở viewport 360/390 px, tablet 820 px và desktop 1440 px; menu, bài học, download, login và club dùng được ở các kích thước này.
- Tìm kiếm không dấu, lọc, lưu/bỏ lưu và đường dẫn bài hoạt động; trạng thái lỗi/rỗng có hướng xử lý.
- File miễn phí tải thật đúng nội dung; file/video cao cấp không lộ qua URL public hoặc bản HTML ngoại tuyến.

### Quyền thành viên và quản trị

- Khách chưa đăng nhập và tài khoản chưa là thành viên không tải/phát được cao cấp ngay cả khi gọi trực tiếp API.
- Không cấu hình ngân hàng thì không tạo checkout nhận tiền; đăng ký quan tâm được lưu đúng, không giả lập cấp quyền.
- Có cấu hình ngân hàng thì đơn hiển thị đúng số tiền/mã chuyển khoản; chỉ thao tác admin đã đối chiếu mới cấp quyền; duyệt cùng đơn hai lần không cộng hai lần.
- Ngày hết hạn hiển thị đúng; thành viên hết hạn bị khóa lại; gia hạn còn hạn cộng từ ngày hết hạn hiện có.
- Admin đăng/sửa/gỡ bài và tải file/video hoạt động; thay đổi còn sau khi restart; dữ liệu SQLite và uploads được giữ bền vững khi deploy.

### Chất lượng nội dung và lời hứa

- Không ghi “có video”, “workflow video đã chạy”, “hoàn thành tự động”, “miễn phí GPU” hay “bảo đảm kiếm tiền” khi chưa có bằng chứng tương ứng.
- Người mới có thể đi trọn lộ trình và biết rõ phương án máy yếu. Khi bổ sung phim mẫu thật, các file tải phải khớp với hướng dẫn và phiên bản đã kiểm thử.
- Mỗi nội dung cao cấp giải thích phần tiết kiệm thao tác, thời gian, chi phí hoặc cải thiện chất lượng; nếu chưa đo, dùng ngôn ngữ mô tả cơ chế thay vì bịa số phần trăm.
- Báo cáo cuối ghi những gì đã chạy thử thực tế, những gì chỉ kiểm tra cấu trúc và những yếu tố còn cần chủ website cung cấp. Không mô tả kế hoạch tương lai như tính năng đang hoạt động.

## 11. Nguyên tắc làm việc trong lần tiếp quản

Giữ phạm vi tập trung: làm cho website mở được, có tài nguyên hữu ích và vận hành rõ ràng. Không viết lại toàn bộ stack chỉ để đổi công cụ, không mở cuộc phỏng vấn mới, không tạo thêm dịch vụ trả phí nếu chưa có lý do. Khi chủ động chọn một chi tiết còn trống, ghi lựa chọn và lý do trong bàn giao thay vì biến nó thành yêu cầu của người dùng.

Người dùng đã cho phép chủ động triển khai các công việc phù hợp mục tiêu. Việc thiếu thông tin ngân hàng thật, video thật hoặc quyền hosting không phải lý do dừng toàn bộ: tiếp tục những việc độc lập, chuẩn bị phần còn lại thành kết quả có thể kiểm tra, rồi báo đúng điểm chưa thể thực hiện.
