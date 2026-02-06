/**
 * 책임: 기존 import 경로 호환성을 유지하기 위한 타입 재export를 제공한다.
 * 협력: 외부 코드가 report-types.ts를 계속 참조해도 동일 타입 계약을 사용한다.
 * 비책임: 실제 타입 정의 원본의 유지보수는 담당하지 않는다.
 */

export * from './harness/domain/harness-types.ts';
