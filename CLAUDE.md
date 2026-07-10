# Ethica

매일 하나의 철학적 딜레마에 답하며 자신의 철학 성향을 축적해가는 모바일 앱.
최종 목적은 성향 진단이 아니라 **철학 교육**이다.

## 저장소 구조

npm workspaces 모노레포. 루트는 `D:\ethica`.

```
server/    NestJS + TypeORM + MySQL
front/     React Native / Expo (아직 없음)
```

**git 명령은 항상 모노레포 루트에서 실행한다.**

## 명령어

```bash
docker compose up -d                      # MySQL (host 3308 → container 3306)
npm run start:dev --workspace=server      # 개발 서버
npm run lint --workspace=server           # ESLint (--fix 포함)
npm run test --workspace=server           # Jest
npm run build --workspace=server
```

## 검증

코드를 수정한 뒤에는 반드시 아래를 통과시킨다. 통과 전에 "완료"라고 보고하지 말 것.

```bash
npm run lint --workspace=server
npm run test --workspace=server
```

CI(`.github/workflows/ci.ethica.yml`)가 ESLint로 게이팅한다. 로컬에서 먼저 걸러라.

## 아키텍처

도메인별 수직 슬라이스 + DDD 레이어드. 의존성은 항상 안쪽(domain)으로만 향한다.

```
src/<domain>/
  domain/            엔티티, 인터페이스, DI 토큰, enum — 프레임워크 의존 없음
  application/       서비스
  infrastructure/    TypeORM 레포지토리 구현, 인코더 구현
  presentation/      컨트롤러, DTO (dto/req, dto/res)
```

도메인 구현은 위 순서로 한 도메인씩 끝까지 간다.
엔티티 → 레포지토리 인터페이스 → 구현 → 서비스 → 컨트롤러 → 모듈 와이어링.

## 코드 규칙

**의존성 역전**

레포지토리와 인코더는 `domain/`에 인터페이스 + Symbol 토큰, `infrastructure/persistence/`에 구현.
현재 토큰: `USER_REPOSITORY`, `AUTH_REPOSITORY`, `PASSWORD_ENCODER`.

인터페이스는 런타임에 사라진다. 주입할 때 반드시 이 형태를 지킨다.

```ts
import { USER_REPOSITORY } from '../domain/repository/user.repository.token';
import type { UserRepository } from '../domain/repository/user.repository';

constructor(
  @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
) {}
```

토큰은 일반 import, 인터페이스는 `import type`.

**리치 도메인 모델**

비즈니스 로직은 엔티티 메서드에 둔다. 서비스는 조율만 한다.
`User.signup(name)` 정적 팩토리, `withdraw()`, `changeName()`, `changeDailyTime()`, `completeOnboarding()`.

**식별자**

- BIGINT PK는 TypeScript에서 `string`으로 매핑된다
- 외부(JWT payload, API 응답)에는 UUID(`userId`)만 노출
- 서버가 내부에서 BIGINT PK로 해석한다

**모듈 간 의존**

토큰을 `exports`로 내보내 해결한다. 예: `UserModule`이 `USER_REPOSITORY`를 export하고 `AuthModule`이 `UserModule`을 import.

## 반복해서 밟은 지뢰

- `softRemove`는 다른 필드 변경을 저장하지 않는다. 필드를 바꿨으면 `save` 먼저, 그다음 `softRemove`
- 메모리에 로드된 엔티티는 `softRemove(entity)`, id/조건 기반은 `softDelete(condition)`
- `JwtModule.register` + `process.env`는 초기화 타이밍 문제를 일으킨다. `registerAsync` + `ConfigService`를 쓴다
- **async 레포지토리 호출에 `await` 누락** — 가장 자주 나는 실수다. 매번 확인할 것
- 단일 엔티티 쓰기에 트랜잭션은 불필요하다. 다중 테이블 쓰기(회원가입, 탈퇴)에는 필수다
- `class-validator`와 `class-transformer`는 항상 함께 설치한다
- `useGlobalPipes`는 `app.listen()` 앞에 둔다
- `synchronize: true`는 개발 전용. 프로덕션 전에 마이그레이션으로 전환할 것

## API 계약

**Swagger가 단일 소스다.** `@nestjs/swagger` 데코레이터를 DTO/컨트롤러에 붙인다.
Claude 프로젝트의 `API 명세서.md`는 설계 논의용이며, 코드와 어긋나면 코드가 옳다.

에러 응답은 전역 `ExceptionFilter`에서 한 형태로 통일한다. 프론트는 `message`가 아니라 `code`로 분기한다.

```json
{ "code": "AUTH_INVALID_CREDENTIALS", "message": "이메일 또는 비밀번호가 올바르지 않습니다" }
```

JWT에서 userId를 꺼내는 공통 인증 패턴은 여기 한 번만 적는다. 엔드포인트마다 반복 설명하지 않는다.

## 브랜치

`main` ← `develop` ← `feat/*`, `infra/*`

## 나와 일하는 방식

- 한국어로, 간결하고 직설적으로
- Spring / JPA 비유로 설명한다. NestJS/TypeORM을 Spring 배경에서 배우는 중이다
- 폴더 구조는 내가 정한다. 묻지 말고, 요청하지 않은 구조 제안을 하지 마라
- 이미 내린 결론을 다시 설명하지 마라
- 직접 타이핑하며 익히는 쪽을 선호한다. 다만 **전체 코드를 요청하면 전체를 준다**
- "현업식"을 기본값으로 한다