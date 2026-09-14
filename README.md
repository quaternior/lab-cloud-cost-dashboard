# 연구실 클라우드 비용·실행 기록

[공개 대시보드](https://quaternior.github.io/lab-cloud-cost-dashboard/)의 정적 HTML/CSS/JS입니다. 데이터는 private `lab-cloud-cost-collector` 저장소에서 수집합니다.

- **AWS:** 월별·사용자별 CUR 비용, 미분류 비용, 인스턴스 이력. CUR 설정과 실제 보고서가 필요하며 누락 비용은 0으로 표시하지 않습니다.
- **GPU First:** 등록 사용자별 run·사양·상태 이력, 월별 실행 시간과 GPU 시간. 비용 수집/표시는 제공하지 않습니다.
- GPU First의 사용자 등록은 private 저장소의 `VESSL_TOKENS` JSON Secret 한 곳에서 관리합니다. 화면에 사용자명을 하드코딩하지 않습니다.
- GPU First는 running 상태 시간만 합산합니다. GPU 시간은 실행 시간 × GPU 개수이며, 대기 시간은 제외합니다. 청구 금액 추정이 아닙니다.
- 날짜·조회 월은 UTC 기준. 목록은 전체 누적 이력이고 수치·차트는 선택 월 기준입니다. 오래된 상태는 과거 관측으로 표시합니다.
- Azure는 아직 연결되지 않았습니다.

`data/dashboard.json`은 플랫폼별 스냅샷을 담은 v2 스키마입니다. 인증 정보와 원본 API 응답은 이 저장소에 넣지 않습니다. Pages는 `main` / root를 배포합니다.

로컬 미리보기: `python3 -m http.server 8000`.
