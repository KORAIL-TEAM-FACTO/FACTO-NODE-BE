# Project Code Conventions

> **Target Audience**: AI Agents & Developers
> **Purpose**: Define strict coding standards for this NestJS DDD project

---

## Table of Contents
1. [Naming Conventions](#naming-conventions)
2. [File Structure](#file-structure)
3. [TypeScript Rules](#typescript-rules)
4. [Entity Patterns](#entity-patterns)
5. [DTO Patterns](#dto-patterns)
6. [Controller Patterns](#controller-patterns)
7. [Service Patterns](#service-patterns)
8. [Repository Patterns](#repository-patterns)
9. [Exception Handling](#exception-handling)
10. [Decorator Usage](#decorator-usage)
11. [Import Rules](#import-rules)
12. [Documentation](#documentation)

---

## Naming Conventions

### Files
- **PascalCase** for all files
- Entity: `User.entity.ts`
- Value Object: `Email.vo.ts`
- Repository Interface: `UserRepository.interface.ts`
- Repository Implementation: `UserRepository.ts`
- Use Case: `CreateUser.use-case.ts`
- DTO: `CreateUserRequest.dto.ts`, `UserResponse.dto.ts`
- Controller: `UserController.ts`
- Service: `UserService.ts`, `UserApplicationService.ts`
- Exception: `UserNotFoundException.ts`
- Enum: `UserStatus.enum.ts`
- Interface: `UserInterface.ts`

### Code Elements
```typescript
// Classes: PascalCase
class UserController {}
class UserService {}

// Methods: camelCase
async getUser() {}
async createUser() {}

// Variables: camelCase
const userId = '123';
let userName = 'John';

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// Interfaces: PascalCase + 'I' prefix (optional)
interface IUserRepository {}
type UserRepository = {...}

// Types: PascalCase + 'Type' suffix
type UserType = {...}

// Enums: PascalCase
enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// Decorators: camelCase
@currentUser()
@adminPermission()

// Folders: lowercase
src/modules/users/
src/modules/orders/

// Domain: Singular form
users/ (not user/)
orders/ (not order/)
```

---

## File Structure

### Domain Module Structure
```
modules/
└── users/                          # Domain name (singular)
    ├── domain/                     # DOMAIN LAYER
    │   ├── entities/
    │   │   └── User.entity.ts
    │   ├── value-objects/
    │   │   └── Email.vo.ts
    │   ├── repositories/
    │   │   └── UserRepository.interface.ts
    │   └── exceptions/             # Domain-specific exceptions
    │       ├── UserNotFoundException.ts
    │       └── UserErrorCode.enum.ts
    │
    ├── application/                # APPLICATION LAYER
    │   ├── use-cases/
    │   │   ├── CreateUser.use-case.ts
    │   │   ├── GetUser.use-case.ts
    │   │   └── UpdateUser.use-case.ts
    │   └── services/               # Application services
    │       └── UserApplicationService.ts
    │
    ├── infrastructure/             # INFRASTRUCTURE LAYER
    │   ├── repositories/
    │   │   └── UserRepository.ts
    │   └── persistence/
    │       └── UserPersistence.entity.ts  # ORM entity (if needed)
    │
    ├── presentation/               # PRESENTATION LAYER
    │   ├── controllers/
    │   │   └── UserController.ts
    │   └── dto/
    │       ├── request/
    │       │   ├── CreateUserRequest.dto.ts
    │       │   └── UpdateUserRequest.dto.ts
    │       └── response/
    │           └── UserResponse.dto.ts
    │
    └── Users.module.ts
```

### Critical Rules
- ❌ **NO `index.ts` files** (barrel exports forbidden)
- ✅ Always import from actual file path
- ✅ Each layer in separate folder
- ✅ Domain exceptions in `domain/exceptions/`

---

## TypeScript Rules

### Strict Type Safety
```typescript
// tsconfig.json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

### Always Specify Types
```typescript
// ✅ Good
async findUser(id: string): Promise<User | null> {
  return this.repository.findOne({ where: { id } });
}

// ❌ Bad - no return type
async findUser(id: string) {
  return this.repository.findOne({ where: { id } });
}
```

### Nullable Types
```typescript
// ✅ Good - explicit null
user: User | null;
email: string | undefined;

// ❌ Bad - implicit
user: User;  // Can be null but not typed
```

### Modern TypeScript Features
```typescript
// Optional chaining
const email = user?.profile?.email;

// Nullish coalescing
const name = user.name ?? 'Anonymous';

// Type guards
function isUser(obj: any): obj is User {
  return obj instanceof User;
}

// Generics
async findById<T extends BaseEntity>(id: string): Promise<T | null> {
  // ...
}

// Union types
type Status = 'active' | 'inactive' | 'pending';

// Discriminated unions
type Result =
  | { success: true; data: User }
  | { success: false; error: string };
```

### Forbidden
```typescript
// ❌ NEVER use 'any'
const data: any = await fetchData();

// ✅ Use proper types
const data: User = await fetchData();

// ✅ Or use 'unknown' if truly unknown
const data: unknown = await fetchData();
if (isUser(data)) {
  // now data is User
}
```

---

## Entity Patterns

### Entity Definition
```typescript
import { Entity, PrimaryColumn, Column } from 'typeorm';
import { AggregateRoot } from '@/shared/domain/AggregateRoot';
import { Email } from '../value-objects/Email.vo';

/**
 * User Entity - Aggregate Root
 *
 * @description
 * - 사용자 도메인의 루트 엔티티
 * - 사용자 생성, 수정, 활성화/비활성화 관리
 *
 * @example
 * const user = User.create('John Doe', 'john@example.com');
 * user.updateName('Jane Doe');
 * user.activate();
 */
@Entity('users')
export class User extends AggregateRoot {
  @PrimaryColumn({ name: 'user_id' })
  id: string;

  @Column({ name: 'user_name', nullable: false })
  private _name: string;

  @Column({ name: 'email', nullable: false })
  private _email: string;

  @Column({ name: 'is_active', nullable: false, default: true })
  private _isActive: boolean;

  // Private constructor - force use of factory methods
  private constructor() {
    super();
  }

  // Getters
  get name(): string {
    return this._name;
  }

  get email(): Email {
    return Email.create(this._email);
  }

  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Factory method for creating new user
   *
   * @param name - 사용자 이름
   * @param email - 이메일 주소
   * @returns 새로 생성된 User 엔티티
   * @throws {InvalidValueException} 잘못된 값 입력시
   */
  static create(name: string, email: string): User {
    const user = new User();
    user.id = crypto.randomUUID();
    user._name = name;
    user._email = email;
    user._isActive = true;
    return user;
  }

  /**
   * Factory method for reconstitution from DB
   */
  static reconstitute(
    id: string,
    name: string,
    email: string,
    isActive: boolean,
  ): User {
    const user = new User();
    user.id = id;
    user._name = name;
    user._email = email;
    user._isActive = isActive;
    return user;
  }

  /**
   * Update user name
   *
   * @param name - 새 이름
   * @throws {InvalidValueException} 이름이 빈 문자열인 경우
   */
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new InvalidValueException('name', name);
    }
    this._name = name;
    this.touch();
  }

  /**
   * Activate user account
   */
  activate(): void {
    this._isActive = true;
    this.touch();
  }

  /**
   * Deactivate user account
   */
  deactivate(): void {
    this._isActive = false;
    this.touch();
  }
}
```

### Key Rules
- ✅ Use `crypto.randomUUID()` for ID generation
- ✅ Private constructor + static factory methods
- ✅ `create()` for new entities
- ✅ `reconstitute()` for DB entities
- ✅ Private fields with public getters
- ✅ Business logic methods (not just getters/setters)
- ✅ Call `this.touch()` on state changes

---

## DTO Patterns

### Request DTO
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

/**
 * Create User Request DTO
 *
 * @description 사용자 생성 요청 데이터
 */
export class CreateUserRequest {
  @ApiProperty({
    description: '사용자 이름',
    example: '홍길동',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: '이메일 주소',
    example: 'hong@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
```

### Response DTO
```typescript
import { ApiProperty } from '@nestjs/swagger';

/**
 * User Response DTO
 *
 * @description 사용자 정보 응답 데이터
 */
export class UserResponse {
  @ApiProperty({ description: '사용자 ID' })
  id: string;

  @ApiProperty({ description: '사용자 이름' })
  name: string;

  @ApiProperty({ description: '이메일 주소' })
  email: string;

  @ApiProperty({ description: '활성 상태' })
  isActive: boolean;

  /**
   * Convert domain entity to response DTO
   */
  static fromEntity(user: User): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      isActive: user.isActive,
    };
  }
}
```

### DTO Location
```
presentation/
└── dto/
    ├── request/
    │   ├── CreateUserRequest.dto.ts
    │   ├── UpdateUserRequest.dto.ts
    │   └── UserFilterRequest.dto.ts
    └── response/
        ├── UserResponse.dto.ts
        └── UserListResponse.dto.ts
```

### Rules
- ✅ Validation decorators on request DTOs
- ✅ Swagger decorators for documentation
- ✅ Static `fromEntity()` method on response DTOs
- ✅ Separate request/response folders

---

## Controller Patterns

### Standard Controller
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateUserUseCase } from '../application/use-cases/CreateUser.use-case';
import { CreateUserRequest } from './dto/request/CreateUserRequest.dto';
import { UserResponse } from './dto/response/UserResponse.dto';
import { ResponseInterceptor } from '@/common/interceptors/ResponseInterceptor';

/**
 * User Controller
 *
 * @description
 * - 사용자 관련 HTTP 엔드포인트 관리
 * - 요청 검증 및 응답 반환만 담당
 * - 비즈니스 로직은 Use Case로 위임
 */
@ApiTags('users')
@Controller('users')
@UseInterceptors(ResponseInterceptor)
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
  ) {}

  /**
   * 사용자 생성
   *
   * @param request - 사용자 생성 요청 데이터
   * @returns 생성된 사용자 정보
   */
  @Post()
  @ApiOperation({ summary: '사용자 생성' })
  @ApiResponse({
    status: 201,
    description: '사용자가 성공적으로 생성됨',
    type: UserResponse,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 데이터',
  })
  async createUser(
    @Body() request: CreateUserRequest,
  ): Promise<{ user: UserResponse }> {
    const user = await this.createUserUseCase.execute(request);
    return { user };
  }

  /**
   * 사용자 조회
   *
   * @param id - 사용자 ID
   * @returns 사용자 정보
   * @throws {UserNotFoundException} 사용자를 찾을 수 없을 때
   */
  @Get(':id')
  @ApiOperation({ summary: '사용자 조회' })
  @ApiParam({
    name: 'id',
    description: '사용자 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 조회 성공',
    type: UserResponse,
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
  })
  async getUser(@Param('id') id: string): Promise<{ user: UserResponse }> {
    const user = await this.getUserUseCase.execute(id);
    return { user };
  }
}
```

### Controller Rules
- ✅ Thin controllers - only HTTP mapping
- ✅ Always wrap response in object: `{ user }`, `{ users }`
- ✅ Delegate all logic to use cases
- ✅ Use `@UseInterceptors(ResponseInterceptor)` at class level
- ✅ Complete Swagger documentation
- ❌ NO business logic in controllers
- ❌ NO direct repository access

---

## Service Patterns

### Service vs ApplicationService

**Service**: Business logic within single domain
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/entities/User.entity';
import { CreateUserRequest } from '../presentation/dto/request/CreateUserRequest.dto';
import { UserResponse } from '../presentation/dto/response/UserResponse.dto';

/**
 * User Service
 *
 * @description
 * - 사용자 도메인의 핵심 비즈니스 로직
 * - 단일 도메인 내 작업 처리
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 사용자 생성
   *
   * @param request - 사용자 생성 요청
   * @returns 생성된 사용자 정보
   * @throws {EmailAlreadyExistsException} 이메일이 이미 존재할 때
   */
  async create(request: CreateUserRequest): Promise<UserResponse> {
    // 1. Check duplicate email
    const existing = await this.userRepository.findOne({
      where: { _email: request.email },
    });

    if (existing) {
      throw new EmailAlreadyExistsException();
    }

    // 2. Create entity
    const user = User.create(request.name, request.email);

    // 3. Persist
    await this.userRepository.save(user);

    // 4. Return DTO
    return UserResponse.fromEntity(user);
  }

  /**
   * 사용자 조회
   *
   * @param id - 사용자 ID
   * @returns 사용자 정보
   * @throws {UserNotFoundException} 사용자를 찾을 수 없을 때
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }
}
```

**ApplicationService**: Orchestrate multiple domains
```typescript
import { Injectable } from '@nestjs/common';
import { UserService } from './UserService';
import { EmailService } from '@/modules/email/EmailService';
import { CreateUserRequest } from '../presentation/dto/request/CreateUserRequest.dto';
import { UserResponse } from '../presentation/dto/response/UserResponse.dto';

/**
 * User Application Service
 *
 * @description
 * - 여러 도메인 서비스 조율
 * - 복잡한 애플리케이션 워크플로우 처리
 */
@Injectable()
export class UserApplicationService {
  constructor(
    private readonly userService: UserService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * 사용자 생성 및 환영 이메일 발송
   *
   * @description
   * - 신규 사용자 등록 처리
   * - 이메일 중복 검증
   * - 환영 이메일 발송
   *
   * @param request - 사용자 생성 요청
   * @returns 생성된 사용자 정보
   * @throws {EmailAlreadyExistsException} 이메일 중복 시
   */
  async createUserWithWelcomeEmail(
    request: CreateUserRequest,
  ): Promise<UserResponse> {
    // 1. Create user (UserService)
    const user = await this.userService.create(request);

    // 2. Send welcome email (EmailService)
    await this.emailService.sendWelcome(user.email);

    return user;
  }
}
```

### Service Rules
- ✅ **Service**: Single domain business logic
- ✅ **ApplicationService**: Multi-domain orchestration
- ✅ Inject repositories in Service
- ✅ Inject services in ApplicationService
- ❌ NO HTTP concerns in services
- ❌ NO direct DB queries in ApplicationService

---

## Repository Patterns

### Repository Interface (Domain Layer)
```typescript
import { User } from '../entities/User.entity';

/**
 * User Repository Interface
 *
 * @description 사용자 데이터 접근 인터페이스
 */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
```

### Repository Implementation (Infrastructure Layer)
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserRepository } from '../../domain/repositories/UserRepository.interface';
import { User } from '../../domain/entities/User.entity';

/**
 * User Repository Implementation
 *
 * @description TypeORM을 사용한 사용자 리포지토리 구현
 */
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { _email: email } });
  }

  async findAll(): Promise<User[]> {
    return this.repository.find();
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async update(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
```

### Repository Rules
- ✅ Interface in Domain Layer
- ✅ Implementation in Infrastructure Layer
- ✅ Use Symbol for DI token
- ✅ Return domain entities, not ORM entities
- ❌ NO business logic in repositories

---

## Exception Handling

### Error Code Enum
```typescript
/**
 * User Error Codes
 *
 * @description
 * - 형식: HE_DDCCII
 * - DD: Domain (01=User, 02=Order, etc.)
 * - CC: Category (01=Not Found, 02=Validation, etc.)
 * - II: Increment
 */
export enum UserErrorCode {
  USER_NOT_FOUND = 'HE_010101',
  INVALID_EMAIL = 'HE_010102',
  EMAIL_ALREADY_EXISTS = 'HE_010103',
  INVALID_PASSWORD = 'HE_010104',
}
```

### Exception Class
```typescript
import { HttpException, HttpStatus } from '@nestjs/common';
import { UserErrorCode } from './UserErrorCode.enum';

/**
 * User Not Found Exception
 *
 * @description 사용자를 찾을 수 없을 때 발생하는 예외
 */
export class UserNotFoundException extends HttpException {
  constructor(userId?: string) {
    super(
      {
        code: UserErrorCode.USER_NOT_FOUND,
        message: '사용자를 찾을 수 없습니다',
        detail: userId ? `User ID: ${userId}` : undefined,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Email Already Exists Exception
 *
 * @description 이메일이 이미 존재할 때 발생하는 예외
 */
export class EmailAlreadyExistsException extends HttpException {
  constructor(email?: string) {
    super(
      {
        code: UserErrorCode.EMAIL_ALREADY_EXISTS,
        message: '이미 사용 중인 이메일입니다',
        detail: email,
      },
      HttpStatus.CONFLICT,
    );
  }
}
```

### Exception Rules
- ✅ Domain-specific exceptions in `domain/exceptions/`
- ✅ Error codes in enum format (HE_DDCCII)
- ✅ Extend `HttpException`
- ✅ User-friendly messages in Korean
- ✅ Throw exceptions in Service layer
- ❌ NO try-catch in controllers (let global filter handle it)
- ❌ NO generic error messages

### Exception Folder Structure
```
domain/
└── exceptions/
    ├── UserErrorCode.enum.ts
    ├── UserNotFoundException.ts
    ├── EmailAlreadyExistsException.ts
    └── InvalidPasswordException.ts
```

---

## Decorator Usage

### Decorator Order
```typescript
// 1. Class-level decorators (top to bottom)
@ApiTags('users')              // Swagger grouping
@Controller('v1/users')        // Route prefix
@UseInterceptors(ResponseInterceptor)  // Interceptors
@UseGuards(AuthGuard)          // Guards
export class UserController {}

// 2. Method-level decorators (top to bottom)
@Post()                        // HTTP method
@ApiOperation({ summary: '...' })  // Swagger operation
@ApiResponse({ status: 201 })  // Swagger responses
@AdminApiBearerAuth()          // Authentication
async createUser(
  @Body() request: CreateUserRequest,  // Parameter decorators
  @CurrentAdmin() admin: AdminUser,
) {}
```

### Parameter Decorator Order
```typescript
async method(
  @Param('id') id: string,      // 1. Path params
  @Body() body: DTO,            // 2. Body
  @Query() query: QueryDTO,     // 3. Query params
  @CurrentUser() user: User,    // 4. Custom decorators
  @Headers() headers: any,      // 5. Headers
) {}
```

### Swagger Decorators
```typescript
@ApiTags('users')
@Controller('v1/users')
export class UserController {
  @Post()
  @ApiOperation({
    summary: '사용자 생성',
    description: '새로운 사용자를 등록합니다',
  })
  @ApiResponse({
    status: 201,
    description: '사용자 생성 성공',
    type: UserResponse,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
  })
  async createUser(@Body() request: CreateUserRequest) {}
}
```

### Validation Decorators
```typescript
import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateUserRequest {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
```

---

## Import Rules

### Import Order
```typescript
// 1. NestJS core packages
import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// 2. Third-party packages
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

// 3. Internal modules (absolute paths preferred)
import { User } from '@/modules/users/domain/entities/User.entity';
import { UserResponse } from '@/modules/users/presentation/dto/response/UserResponse.dto';

// 4. Relative imports (same module only)
import { CreateUserUseCase } from '../use-cases/CreateUser.use-case';
import { UserService } from '../services/UserService';
```

### Import Rules
- ✅ Absolute paths preferred (`@/modules/...`)
- ✅ Group by category with blank lines
- ❌ **NEVER use barrel exports (`index.ts`)**
- ❌ **ALWAYS import from actual file**
- ❌ NO circular dependencies

### Example
```typescript
// ❌ Bad - barrel export
import { User, UserService } from '@/modules/users';

// ✅ Good - direct file imports
import { User } from '@/modules/users/domain/entities/User.entity';
import { UserService } from '@/modules/users/application/services/UserService';
```

---

## Documentation

### JSDoc Format
```typescript
/**
 * 사용자 생성
 *
 * @description
 * - 신규 사용자 등록 처리
 * - 이메일 중복 검증
 * - 환영 이메일 발송
 *
 * @param request - 사용자 생성 요청 데이터
 * @param request.name - 사용자 이름
 * @param request.email - 이메일 주소
 *
 * @returns Promise<UserResponse> 생성된 사용자 정보
 *
 * @throws {EmailAlreadyExistsException} 이메일이 이미 존재할 때
 * @throws {InvalidEmailException} 잘못된 이메일 형식일 때
 *
 * @example
 * const user = await createUser({
 *   name: '홍길동',
 *   email: 'hong@example.com'
 * });
 */
async createUser(request: CreateUserRequest): Promise<UserResponse> {
  // Implementation
}
```

### Documentation Rules
- ✅ Korean for user-facing descriptions
- ✅ `@description` for detailed explanation
- ✅ `@param` for all parameters
- ✅ `@returns` with type
- ✅ `@throws` for all exceptions
- ✅ `@example` for usage examples
- ✅ Comment complex business logic

---

## Module Configuration

### Module Structure
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/User.entity';
import { UserController } from './presentation/controllers/UserController';
import { UserService } from './application/services/UserService';
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { CreateUserUseCase } from './application/use-cases/CreateUser.use-case';
import { USER_REPOSITORY } from './domain/repositories/UserRepository.interface';

/**
 * User Module
 *
 * @description 사용자 도메인 모듈
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [
    UserController,
  ],
  providers: [
    // Services
    UserService,

    // Use Cases
    CreateUserUseCase,
    GetUserUseCase,

    // Repositories
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [
    UserService,
    USER_REPOSITORY,
  ],
})
export class UsersModule {}
```

### Module Rules
- ✅ One module per domain
- ✅ Clear dependency injection
- ✅ Export services that other modules need
- ❌ NO circular module dependencies

---

## Performance Best Practices

### Database Queries
```typescript
// ❌ Bad - N+1 query problem
async getUsersWithOrders() {
  const users = await this.userRepository.find();
  for (const user of users) {
    user.orders = await this.orderRepository.findByUserId(user.id);
  }
  return users;
}

// ✅ Good - join query
async getUsersWithOrders() {
  return this.userRepository.find({
    relations: ['orders'],
  });
}
```

### Pagination
```typescript
// ✅ Always paginate large datasets
async findAll(page: number = 1, limit: number = 20) {
  return this.repository.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
  });
}
```

### Indexing
```typescript
// ✅ Add indexes to frequently queried fields
@Entity('users')
@Index(['email'], { unique: true })
@Index(['createdAt'])
export class User {
  @Column({ name: 'email' })
  email: string;
}
```

---

## Testing Guidelines

### Unit Tests
```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: MockRepository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  describe('create', () => {
    it('should create user when email is unique', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue({ id: '123' });

      // Act
      const result = await service.create({
        name: 'John',
        email: 'john@example.com',
      });

      // Assert
      expect(result).toBeDefined();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw exception when email exists', async () => {
      // Arrange
      repository.findOne.mockResolvedValue({ id: '123' });

      // Act & Assert
      await expect(
        service.create({ name: 'John', email: 'john@example.com' }),
      ).rejects.toThrow(EmailAlreadyExistsException);
    });
  });
});
```

### Testing Rules
- ✅ Unit tests for Service layer
- ✅ Integration tests for Controllers
- ✅ Mock only external dependencies
- ✅ Test both success and failure scenarios
- ✅ Use AAA pattern (Arrange, Act, Assert)

---

## Quick Reference Checklist

### Before Committing Code

- [ ] File names in PascalCase
- [ ] No `index.ts` barrel exports
- [ ] All types explicitly defined
- [ ] No `any` types
- [ ] DTOs have validation decorators
- [ ] Controllers are thin (no business logic)
- [ ] Services handle business logic
- [ ] Exceptions have error codes
- [ ] JSDoc comments on public methods
- [ ] Swagger decorators on endpoints
- [ ] Tests for new features
- [ ] No circular dependencies
- [ ] No N+1 query problems
- [ ] Pagination for large datasets

---

**Last Updated**: 2024-12-14
**Project**: Mobok Call Server
**Framework**: NestJS + TypeScript + DDD
