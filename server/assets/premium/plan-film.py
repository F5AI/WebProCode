#!/usr/bin/env python3
"""F5 AI Studio: local shot-plan scaffolding, Python standard library only.

Examples:
  python plan-film.py --minutes 3 --shots 30 --output film-plan
  python plan-film.py --input shotlist-3-minutes.csv --model YOUR_SD15_MODEL.safetensors --output film-api

Creates timing CSV, prompt review notes and optional ComfyUI /prompt request
bodies. Does not create or download a model, submit jobs, synthesize video,
translate prompts, or guarantee consistency. Review each prompt before use.
"""
import argparse
import csv
import json
from pathlib import Path


def positive_int(value):
    result = int(value)
    if not 1 <= result <= 300:
        raise argparse.ArgumentTypeError('shots must be between 1 and 300')
    return result


def api_request(model, prompt, seed, filename):
    return {'prompt': {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': model}},
        '2': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['1', 1]}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': 'low quality, blurry, malformed hands, text, watermark, logo', 'clip': ['1', 1]}},
        '4': {'class_type': 'EmptyLatentImage', 'inputs': {'width': 768, 'height': 432, 'batch_size': 1}},
        '5': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['2', 0], 'negative': ['3', 0], 'latent_image': ['4', 0], 'seed': seed, 'steps': 20, 'cfg': 7, 'sampler_name': 'euler', 'scheduler': 'normal', 'denoise': 1.0}},
        '6': {'class_type': 'VAEDecode', 'inputs': {'samples': ['5', 0], 'vae': ['1', 2]}},
        '7': {'class_type': 'SaveImage', 'inputs': {'images': ['6', 0], 'filename_prefix': filename}},
    }}


def main():
    parser = argparse.ArgumentParser(description='Tạo shotlist, bảng review prompt và payload API ảnh SD1.5. Không gửi job tự động.')
    parser.add_argument('--minutes', type=float, default=3, help='Tổng phút khi không dùng --input; mặc định 3.')
    parser.add_argument('--shots', type=positive_int, default=30, help='Số shot từ 1 đến 300; mặc định 30.')
    parser.add_argument('--input', type=Path, help='CSV có cột action, duration_seconds và prompt/prompt_notes (nếu có).')
    parser.add_argument('--output', type=Path, default=Path('film-plan'), help='Thư mục đầu ra mới, không được tồn tại sẵn.')
    parser.add_argument('--model', help='Tên checkpoint SD1.5 thực tế trong ComfyUI. Có tham số này mới xuất payload API.')
    parser.add_argument('--character', default='fictional Vietnamese adult woman, black bob haircut, mustard jacket, dark teal canvas bag')
    parser.add_argument('--setting', default='office entrance at rainy dusk, cool blue street and warm amber light')
    parser.add_argument('--style', default='cinematic illustration')
    parser.add_argument('--seed', type=int, default=1001)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Thư mục đầu ra đã tồn tại. Chọn tên khác để bảo vệ file hiện có.')
    if args.seed < 0:
        parser.error('--seed phải là số nguyên không âm.')
    if args.model and ('/' in args.model or '\\' in args.model):
        parser.error('--model chỉ nhận tên file checkpoint, không nhận đường dẫn.')
    rows = []
    if args.input:
        try:
            with args.input.open(encoding='utf-8-sig', newline='') as source:
                original = list(csv.DictReader(source))
            if not original or len(original) > 300:
                raise ValueError('CSV cần từ 1 đến 300 dòng shot.')
            elapsed = 0
            for index, row in enumerate(original):
                duration = int(row['duration_seconds'])
                if duration <= 0:
                    raise ValueError('duration_seconds phải là số nguyên dương.')
                action = row.get('action', '').strip()
                if not action:
                    raise ValueError('Mỗi dòng phải có action.')
                rows.append({'shot_id': f'shot-{index+1:03d}', 'scene': row.get('scene', ''), 'start_seconds': elapsed, 'duration_seconds': duration, 'action': action, 'camera': row.get('camera', 'medium'), 'prompt': row.get('prompt') or row.get('prompt_notes') or '', 'status': 'todo'})
                elapsed += duration
        except (OSError, UnicodeError, KeyError, ValueError) as exc:
            parser.error(str(exc))
    else:
        try:
            total = round(args.minutes * 60)
        except (ValueError, OverflowError):
            parser.error('--minutes cần là số hữu hạn.')
        if total < args.shots or total > 86400:
            parser.error('Tổng thời lượng phải từ số shot đến 86400 giây; mỗi shot ít nhất 1 giây.')
        base, remainder = divmod(total, args.shots)
        elapsed = 0
        for index in range(args.shots):
            duration = base + (1 if index < remainder else 0)
            rows.append({'shot_id': f'shot-{index+1:03d}', 'scene': min(5, index * 5 // args.shots + 1), 'start_seconds': elapsed, 'duration_seconds': duration, 'action': 'REPLACE: one visible action for this shot', 'camera': ['wide shot', 'medium shot', 'close-up'][index % 3], 'prompt': '', 'status': 'todo'})
            elapsed += duration
    args.output.mkdir(parents=True)
    review = ['# Prompt review trước khi Queue', '', 'Các prompt là nháp hoặc scaffold; hãy thay hành động và kiểm tra nhận diện trước khi chạy. Nếu action là tiếng Việt, dịch sang mô tả phù hợp với model đang dùng.', '', f'Tổng thời lượng: {sum(row["duration_seconds"] for row in rows)} giây / {len(rows)} shot.', '']
    if args.model:
        (args.output / 'api').mkdir()
    for index, row in enumerate(rows):
        if not row['prompt']:
            row['prompt'] = f'{args.style}, {args.character}, {args.setting}, {row["action"]}, {row["camera"]}'
        else:
            row['prompt'] = f'{row["prompt"]}, ACTION: {row["action"]}, {row["camera"]}'
        review += [f'## {row["shot_id"]} — {row["start_seconds"]}s / {row["duration_seconds"]}s', row['prompt'], '', '- [ ] Hành động đủ đơn giản', '- [ ] Nhân vật, bối cảnh, ánh sáng đúng', '- [ ] Không có placeholder REPLACE', '']
        if args.model:
            request = api_request(args.model, row['prompt'], args.seed + index, 'F5AI/' + row['shot_id'])
            (args.output / 'api' / (row['shot_id'] + '.json')).write_text(json.dumps(request, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    with (args.output / 'shotlist.csv').open('w', encoding='utf-8-sig', newline='') as output:
        writer = csv.DictWriter(output, fieldnames=['shot_id', 'scene', 'start_seconds', 'duration_seconds', 'action', 'camera', 'prompt', 'status'])
        writer.writeheader()
        writer.writerows(rows)
    (args.output / 'prompt-review.md').write_text('\n'.join(review), encoding='utf8')
    readme = '''# Gói kế hoạch phim

1. Mở shotlist.csv trong Excel/Sheets, thay hành động nếu còn REPLACE.
2. Kiểm tra prompt-review.md trước khi tạo ảnh. Công cụ chỉ tổ chức dữ liệu, không viết câu chuyện bằng AI và không bảo đảm chất lượng hình.
3. Nếu có api/, đó là request body cho endpoint POST /prompt của ComfyUI, không phải workflow giao diện kéo thả. Chỉ dành cho checkpoint SD1.5 đã cài. Kiểm tra model và prompt trước khi gửi từng request đến instance ComfyUI do bạn kiểm soát.
4. Để thử một request trên máy đang chạy ComfyUI tại localhost:8188, dùng lệnh bên dưới sau khi kiểm tra cấu hình. Lệnh này tạo một job và dùng tài nguyên máy; script plan-film.py tự nó không gửi job.

    curl --fail -H 'Content-Type: application/json' --data-binary @api/shot-001.json http://127.0.0.1:8188/prompt

5. Không đổi sang model video/SDXL/Flux trên cùng graph. Ảnh keyframe cần pipeline video riêng để tạo chuyển động.
6. Giữ file gốc và bản đã sửa riêng. Seed hỗ trợ lặp lại trong cùng pipeline, không khóa nhận diện nhân vật.
'''
    (args.output / 'README.md').write_text(readme, encoding='utf8')
    print(f'Đã tạo {len(rows)} shot, tổng {sum(row["duration_seconds"] for row in rows)} giây tại {args.output}. Kiểm tra prompt trước khi dùng.')


if __name__ == '__main__':
    main()
