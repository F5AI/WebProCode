# F5 AI Studio — bộ prompt sản xuất nâng cao

Đây là bộ mẫu biên tập để giảm việc nhập lại yêu cầu. Dùng với công cụ AI bạn có quyền sử dụng; không có model, video giảng viên hay dịch vụ trả phí bên ngoài được đóng gói. Kết quả cần kiểm tra bằng mắt và bằng timeline thật. Không bảo đảm thời gian, chi phí hay doanh thu.

## 1. Hồ sơ sản xuất dùng lại

Điền một lần và dán vào đầu mỗi yêu cầu:

```text
PHIM: [tên]
MỤC TIÊU: một tập 180 giây, hoàn chỉnh và dễ hiểu
KHÁN GIẢ: [đối tượng]
NHÂN VẬT: [tối đa 2, đều trưởng thành]
KHÔNG GIAN: [tối đa 2]
NHẬN DIỆN: [tóc, áo, túi/phụ kiện cố định]
PHONG CÁCH: [mô tả thống nhất]
BẢNG MÀU: [2–3 màu chủ đạo]
ÁNH SÁNG: [hướng, màu, thời điểm]
ĐẠO CỤ: [danh sách và ai giữ ở từng cảnh]
GIỚI HẠN: không đám đông, không giao đấu, không đọc chữ nhỏ trong ảnh
ĐẦU RA: bảng shot, một hành động/shot, 30 shot × 6 giây
```

## 2. Kiểm tra kịch bản theo nhân quả

```text
Bạn là biên tập phim ngắn. Đọc hồ sơ sản xuất và shotlist dưới đây.
Không thêm nhân vật/bối cảnh ngoài giới hạn. Kiểm tra từng chuyển cảnh:
- Nhân vật đang muốn gì?
- Điều gì khiến họ đổi hành động?
- Người xem đã nhìn thấy đủ thông tin để hiểu lựa chọn chưa?
- Kết thúc có trả lời tình huống mở đầu không?

Trả về bảng: mã shot | lỗi cụ thể | vì sao ảnh hưởng câu chuyện | sửa tối thiểu.
Kiểm tra tổng thời lượng riêng bằng cách cộng từng dòng.
Không tuyên bố bảng đạt yêu cầu nếu còn lỗi hoặc chưa kiểm chứng thời gian lời đọc.
[SHOTLIST]
```

## 3. Sinh prompt theo lô từ CSV

```text
Từ CSV và hồ sơ nhận diện bên dưới, viết một prompt ảnh tiếng Anh cho mỗi shot.
Đầu ra gồm: shot_id,prompt,negative_prompt,continuity_note.
Giữ nguyên các cụm nhận diện, bối cảnh, thời điểm và phong cách giữa các shot.
Chỉ thay hành động, cỡ cảnh và góc máy.
Không mô tả nhiều thời điểm trong một ảnh. Không thêm tên model hay node chưa được cung cấp.
Nếu thiếu dữ liệu, ghi NEEDS_REVIEW trong continuity_note.
Đừng tự hứa nhân vật sẽ giống tuyệt đối; đây là prompt-only và cần chọn ảnh thủ công.
[HỒ SƠ]
[CSV]
```

Sau khi kiểm tra, thêm cột `prompt` đã duyệt vào CSV để công cụ `plan-film.py --input ... --model ...` xuất payload API. Công cụ giữ `action` và `camera` trong prompt, nên hãy rà lại ngôn ngữ và loại bỏ thông tin trùng nếu cần trước khi Queue.

## 4. Kiểm tra nhân vật qua ảnh

Nếu công cụ đang dùng có thể đọc ảnh, gửi các ảnh tham chiếu mà bạn có quyền sử dụng:

```text
So sánh các ảnh này với ảnh chuẩn [A]. Kiểm tra tóc, màu áo, phụ kiện, tuổi cảm nhận,
tỷ lệ cơ thể, hướng sáng. Với mỗi ảnh, trả về: giống / chưa chắc / lệch;
nêu vị trí lệch cụ thể và đề xuất chỉnh prompt nhỏ nhất.
Không suy đoán danh tính người thật hoặc tuyên bố đo được độ giống chính xác.
Tôi sẽ quyết định duyệt bằng mắt.
```

Nếu công cụ không đọc ảnh, dùng checklist thủ công; đừng gửi prompt và coi đó là kiểm tra hình đã render.

## 5. Chuyển động có giới hạn

```text
Từ keyframe và hành động của shot, viết mô tả chuyển động cho clip khoảng [thời lượng].
Chỉ một chuyển động nhân vật và tối đa một chuyển động máy nhỏ.
Giữ trang phục, khuôn mặt và đạo cụ. Không tạo thêm người hoặc vật.
Trả 3 phương án từ ít chuyển động đến nhiều chuyển động, nêu rủi ro biến dạng ở mỗi phương án.
Không tự đặt fps, số frame hoặc độ phân giải nếu chưa có thông số template model.
```

Dùng đúng cấu hình frame/fps/độ phân giải của template video chính thức bạn đã chọn. Prompt không thay thế việc cài model hoặc kiểm tra GPU.

## 6. Duyệt bản cuối và quyết định tạo lại

```text
Dựa trên danh sách lỗi do tôi ghi khi xem bản render, phân loại theo:
A: gây sai câu chuyện hoặc lỗi hình/âm thanh rõ rệt — cần sửa trước xuất.
B: có thể xử lý bằng cắt, màu, phụ đề hoặc âm thanh — ưu tiên sửa trong editor.
C: khác biệt nhỏ chưa ảnh hưởng hiểu phim — có thể chấp nhận ở bản đầu.
Trả: shot_id | loại | cách sửa ít tốn tài nguyên nhất | cần tạo lại hay không | lý do.
Không khẳng định sẽ tiết kiệm một tỷ lệ chi phí cụ thể khi chưa có số liệu đo.
[LỖI ĐÃ QUAN SÁT]
```

## Theo dõi để tự tối ưu

Với mỗi thử nghiệm, ghi model/version, size, frames/fps (nếu là video), thời gian render, số lần thử, lý do bỏ và chi phí thực tế nếu có. Chỉ so sánh các cấu hình khi chất lượng và mục đích đủ tương đương. Khi đổi model hoặc phần cứng, thử lại một shot trước cả tập.
