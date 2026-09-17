# 보고용 EC2 데모

URL: https://quaternior.github.io/lab-cloud-cost-dashboard/demo/

- 가상 사용자: jhkim00, jake, dgkim. 12개 가상 run, 2026년 7~9월, 2026-09-17 00:00 UTC 고정 스냅샷.
- EC2 G6e만 사용: g6e.2xlarge (L40S ×1, 8 vCPU, 64 GiB), g6e.4xlarge (×1, 16 vCPU, 128 GiB), g6e.12xlarge (×4, 48 vCPU, 384 GiB).
- 사양 출처: https://aws.amazon.com/ec2/instance-types/g6e/
- 가상 시간당 단가: 각각 $2 / $3 / $8. 실제 AWS 가격·견적·청구 내역이 아니다. EC2 컴퓨팅 외 비용은 제외한다.
- `data.json`의 실행 구간을 월별로 나누어 비용·시간을 계산하므로 월/사용자/표의 합계가 일치한다. 9월은 월중 예시다.
- 사용자 선택은 요약·차트·목록에 적용된다. 검색/상태는 목록만 좁힌다. 실행 상태는 보고 월과 별개인 고정 스냅샷 기준이다.
- 실제 `../data/dashboard.json`이나 클라우드 API를 읽지 않는다. 자동 수집은 이 디렉토리를 수정하지 않는다.
- 인쇄/PDF 저장 시에도 가상 데이터 안내가 표시된다. 로컬 확인은 저장소 루트에서 `python3 -m http.server 8000`, `/demo/`로 접속.
