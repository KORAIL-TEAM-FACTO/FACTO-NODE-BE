# Project Architecture Guide for AI Agents

> **Purpose**: This document provides a comprehensive guide for AI agents to understand and work with this DDD-based NestJS project.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Layer Responsibilities](#layer-responsibilities)
4. [Design Patterns](#design-patterns)
5. [Code Examples](#code-examples)
6. [Adding New Features](#adding-new-features)
7. [Important Rules](#important-rules)

---

## Architecture Overview

### Architectural Style
- **Domain-Driven Design (DDD)** - Tactical Patterns
- **Layered Architecture** - Separation of Concerns
- **Clean Architecture** - Dependency Inversion Principle
- **SOLID Principles** - Object-Oriented Design

### Dependency Flow
```
┌─────────────────────────────────────────────┐
│         Presentation Layer                  │
│         (Controllers)                       │
└──────────────────┬──────────────────────────┘
                   │ depends on
┌──────────────────▼──────────────────────────┐
│         Application Layer                   │
│         (Use Cases, DTOs)                   │
└──────────────────┬──────────────────────────┘
                   │ depends on
┌──────────────────▼──────────────────────────┐
│         Domain Layer                        │
│  (Entities, Value Objects, Interfaces)     │
└──────────────────▲──────────────────────────┘
                   │ depends on
┌──────────────────┴──────────────────────────┐
│         Infrastructure Layer                │
│    (Repository Implementations, DB)         │
└─────────────────────────────────────────────┘
```

**Key Principle**: Domain Layer has ZERO dependencies. Everything points inward to Domain.

---

## Directory Structure

```
src/
├── common/                          # Cross-cutting concerns
│   ├── decorators/                 # Custom decorators
│   ├── exceptions/                 # Custom exception classes
│   │   └── domain.exception.ts    # DomainException, EntityNotFoundException, etc.
│   ├── filters/                    # Exception filters
│   │   └── http-exception.filter.ts
│   ├── guards/                     # Auth/Authorization guards
│   ├── interceptors/               # Request/Response interceptors
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   └── pipes/                      # Validation pipes
│       └── validation.pipe.ts
│
├── shared/                          # Shared domain logic
│   ├── domain/
│   │   ├── base-entity.ts          # Base class for all entities
│   │   ├── aggregate-root.ts       # Base class for aggregates
│   │   ├── value-object.ts         # Base class for value objects
│   │   └── events/
│   │       └── domain-event.interface.ts
│   └── interfaces/
│       ├── repository.interface.ts # Generic repository interface
│       └── use-case.interface.ts   # Generic use case interface
│
├── infrastructure/                  # Infrastructure implementations
│   ├── config/
│   │   └── env.config.ts           # Environment configuration
│   ├── database/
│   │   └── in-memory.repository.ts # Base in-memory repository
│   └── logging/
│       └── logger.service.ts       # Custom logger service
│
├── modules/                         # Domain modules (Bounded Contexts)
│   ├── users/                      # Example: Users domain
│   │   ├── domain/                 # DOMAIN LAYER
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   └── email.vo.ts
│   │   │   ├── repositories/
│   │   │   │   └── user-repository.interface.ts
│   │   │   └── services/           # Domain services (if needed)
│   │   │
│   │   ├── application/            # APPLICATION LAYER
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   └── user-response.dto.ts
│   │   │   ├── use-cases/
│   │   │   │   ├── create-user.use-case.ts
│   │   │   │   ├── get-user.use-case.ts
│   │   │   │   ├── get-all-users.use-case.ts
│   │   │   │   ├── update-user.use-case.ts
│   │   │   │   └── delete-user.use-case.ts
│   │   │   └── services/           # Application services (if needed)
│   │   │
│   │   ├── infrastructure/         # INFRASTRUCTURE LAYER
│   │   │   ├── repositories/
│   │   │   │   └── user.repository.ts
│   │   │   └── persistence/        # ORM models (when using DB)
│   │   │
│   │   ├── presentation/           # PRESENTATION LAYER
│   │   │   └── controllers/
│   │   │       └── users.controller.ts
│   │   │
│   │   └── users.module.ts         # NestJS module
│   │
│   └── health/                     # Health check module
│       ├── presentation/
│       │   └── controllers/
│       │       └── health.controller.ts
│       └── health.module.ts
│
├── app.module.ts                    # Root module
└── main.ts                          # Application bootstrap
```

---

## Layer Responsibilities

### 1. Domain Layer (`modules/*/domain/`)

**Purpose**: Pure business logic. No framework dependencies.

**Contains**:
- **Entities**: Objects with identity (ID)
  - Inherit from `BaseEntity` or `AggregateRoot`
  - Contain business logic methods
  - Encapsulate business rules

- **Value Objects**: Immutable objects without identity
  - Inherit from `ValueObject<T>`
  - Self-validating
  - Equality based on value, not identity

- **Repository Interfaces**: Data access contracts
  - Define what operations are needed
  - No implementation details

- **Domain Services**: Business logic that doesn't fit in entities
  - Stateless
  - Operate on multiple entities

**Rules**:
- ❌ NO framework imports (except decorators for DI)
- ❌ NO database code
- ❌ NO HTTP code
- ✅ Pure TypeScript classes
- ✅ Business logic only

### 2. Application Layer (`modules/*/application/`)

**Purpose**: Orchestrate use cases and application workflows.

**Contains**:
- **Use Cases**: Single application actions
  - Implement `IUseCase<Request, Response>`
  - One public method: `execute()`
  - Coordinate domain objects
  - Return DTOs, not domain objects

- **DTOs**: Data Transfer Objects
  - Request DTOs (validation with `class-validator`)
  - Response DTOs (mapping from domain entities)

- **Application Services**: Coordinate multiple use cases

**Rules**:
- ✅ Depend on Domain Layer only
- ✅ Use repository interfaces (not implementations)
- ✅ Return DTOs to Presentation Layer
- ❌ NO HTTP concerns
- ❌ NO database implementation details

### 3. Infrastructure Layer (`modules/*/infrastructure/`)

**Purpose**: Implement technical capabilities (DB, external APIs, etc.).

**Contains**:
- **Repository Implementations**: Concrete data access
  - Implement repository interfaces from Domain Layer
  - Handle database/persistence logic
  - Map between domain entities and persistence models

- **Persistence Models**: ORM entities (TypeORM, Prisma, etc.)
  - Separate from domain entities

- **External Service Adapters**: Third-party API integrations

**Rules**:
- ✅ Implement interfaces from Domain Layer
- ✅ Handle all I/O operations
- ✅ Framework-specific code allowed
- ❌ NO business logic

### 4. Presentation Layer (`modules/*/presentation/`)

**Purpose**: Handle HTTP requests/responses.

**Contains**:
- **Controllers**: REST API endpoints
  - Thin layer - just routing
  - Call use cases
  - Transform use case responses to HTTP responses

**Rules**:
- ✅ Depend on Application Layer only
- ✅ Handle HTTP concerns (status codes, headers, etc.)
- ✅ Use DTOs for request/response
- ❌ NO business logic
- ❌ NO direct domain access

---

## Design Patterns

### 1. Repository Pattern

**Interface** (Domain Layer):
```typescript
// modules/users/domain/repositories/user-repository.interface.ts
export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findActiveUsers(): Promise<User[]>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
```

**Implementation** (Infrastructure Layer):
```typescript
// modules/users/infrastructure/repositories/user.repository.ts
@Injectable()
export class UserRepository extends InMemoryRepository<User> implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    // Implementation
  }
}
```

**Dependency Injection** (Module):
```typescript
{
  provide: USER_REPOSITORY,
  useClass: UserRepository,
}
```

**Usage** (Application Layer):
```typescript
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}
}
```

### 2. Use Case Pattern

Every user action = one use case.

```typescript
@Injectable()
export class CreateUserUseCase implements IUseCase<CreateUserDto, UserResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(request: CreateUserDto): Promise<UserResponseDto> {
    // 1. Validate business rules
    // 2. Create domain entity
    // 3. Persist via repository
    // 4. Return DTO
  }
}
```

### 3. Entity Pattern

```typescript
export class User extends AggregateRoot {
  private _name: string;
  private _email: Email; // Value Object

  // Private constructor - use factory methods
  private constructor(...) {
    super(...);
  }

  // Factory method for new entities
  static create(name: string, email: string): User {
    // Validation
    // Business rules
    return new User(...);
  }

  // Factory method for reconstitution from DB
  static reconstitute(...): User {
    return new User(...);
  }

  // Business methods
  updateName(name: string): void {
    // Validation
    // Business rules
    this._name = name;
    this.touch(); // Update timestamp
  }
}
```

### 4. Value Object Pattern

```typescript
export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(email: string): Email {
    if (!this.isValid(email)) {
      throw new InvalidValueException('email', email);
    }
    return new Email({ value: email.toLowerCase() });
  }

  private static isValid(email: string): boolean {
    // Validation logic
  }
}
```

---

## Code Examples

### Adding a New Entity

**1. Create Value Objects** (if needed):
```typescript
// modules/users/domain/value-objects/username.vo.ts
export class Username extends ValueObject<{ value: string }> {
  static create(username: string): Username {
    if (username.length < 3) {
      throw new InvalidValueException('username', username);
    }
    return new Username({ value: username });
  }

  get value(): string {
    return this.props.value;
  }
}
```

**2. Create Entity**:
```typescript
// modules/users/domain/entities/user.entity.ts
export class User extends AggregateRoot {
  private _username: Username;
  private _email: Email;

  static create(username: string, email: string): User {
    const usernameVO = Username.create(username);
    const emailVO = Email.create(email);
    return new User(generateId(), usernameVO, emailVO);
  }

  updateUsername(username: string): void {
    this._username = Username.create(username);
    this.touch();
  }
}
```

### Adding a New Use Case

```typescript
// modules/users/application/use-cases/activate-user.use-case.ts
@Injectable()
export class ActivateUserUseCase implements IUseCase<string, UserResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<UserResponseDto> {
    // 1. Get entity
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    // 2. Execute business logic
    user.activate();

    // 3. Persist
    const updatedUser = await this.userRepository.update(user);

    // 4. Return DTO
    return UserResponseDto.fromEntity(updatedUser);
  }
}
```

### Adding a New Controller Endpoint

```typescript
// modules/users/presentation/controllers/users.controller.ts
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly activateUserUseCase: ActivateUserUseCase,
  ) {}

  @Patch(':id/activate')
  @ApiOperation({ summary: '사용자 활성화' })
  async activateUser(@Param('id') id: string): Promise<UserResponseDto> {
    return this.activateUserUseCase.execute(id);
  }
}
```

---

## Adding New Features

### Step-by-Step Guide for AI Agents

#### 1. Adding a New Domain Module

**Step 1**: Create folder structure
```bash
mkdir -p src/modules/[domain-name]/{domain/{entities,value-objects,repositories,services},application/{use-cases,dto,services},infrastructure/{repositories,persistence},presentation/controllers}
```

**Step 2**: Domain Layer (bottom-up)
1. Create Value Objects (if needed)
2. Create Entity
3. Define Repository Interface

**Step 3**: Application Layer
1. Create DTOs (Request + Response)
2. Create Use Cases

**Step 4**: Infrastructure Layer
1. Implement Repository

**Step 5**: Presentation Layer
1. Create Controller

**Step 6**: Wire up Module
```typescript
@Module({
  controllers: [DomainController],
  providers: [
    // Use Cases
    CreateDomainUseCase,
    // ... other use cases

    // Repository
    {
      provide: DOMAIN_REPOSITORY,
      useClass: DomainRepository,
    },
  ],
  exports: [DOMAIN_REPOSITORY],
})
export class DomainModule {}
```

**Step 7**: Import in AppModule
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({...}),
    DomainModule, // Add here
  ],
})
export class AppModule {}
```

#### 2. Adding a New Use Case to Existing Domain

1. Create use case file in `application/use-cases/`
2. Implement `IUseCase<Request, Response>`
3. Inject required repositories
4. Register in module providers
5. Inject in controller
6. Create controller endpoint

#### 3. Adding Database Integration

When ready to switch from in-memory to real database:

**Step 1**: Install ORM
```bash
npm install @nestjs/typeorm typeorm pg
# or
npm install @prisma/client prisma
```

**Step 2**: Create persistence models in `infrastructure/persistence/`

**Step 3**: Update repository implementations
- Keep the same interface
- Change implementation to use ORM

**Step 4**: Map between domain entities and persistence models

---

## Important Rules

### Do's ✅

1. **Always use factory methods** for creating entities
   ```typescript
   const user = User.create(name, email); // ✅
   const user = new User(...); // ❌
   ```

2. **Use type imports** for interfaces in decorators
   ```typescript
   import type { IUserRepository } from '...'; // ✅
   import { IUserRepository } from '...'; // ❌ (causes TS1272 error)
   ```

3. **Return DTOs** from use cases, not entities
   ```typescript
   return UserResponseDto.fromEntity(user); // ✅
   return user; // ❌
   ```

4. **Use dependency injection** for repositories
   ```typescript
   @Inject(USER_REPOSITORY) private repo: IUserRepository // ✅
   private repo = new UserRepository(); // ❌
   ```

5. **Validate in Value Objects and Entities**
   ```typescript
   static create(email: string): Email {
     if (!this.isValid(email)) throw new Error(); // ✅
   }
   ```

6. **Keep controllers thin**
   ```typescript
   async createUser(@Body() dto: CreateUserDto) {
     return this.createUserUseCase.execute(dto); // ✅ One-liner
   }
   ```

### Don'ts ❌

1. **Don't put business logic in controllers**
   ```typescript
   // ❌ Bad
   async createUser(@Body() dto: CreateUserDto) {
     if (dto.age < 18) throw new Error();
     // ... more logic
   }
   ```

2. **Don't import implementations in use cases**
   ```typescript
   // ❌ Bad
   import { UserRepository } from 'infrastructure/...';

   // ✅ Good
   import type { IUserRepository } from 'domain/...';
   ```

3. **Don't expose domain entities in controllers**
   ```typescript
   // ❌ Bad
   @Get(':id')
   async getUser(): Promise<User> { ... }

   // ✅ Good
   @Get(':id')
   async getUser(): Promise<UserResponseDto> { ... }
   ```

4. **Don't use anemic domain models**
   ```typescript
   // ❌ Bad - just getters/setters
   class User {
     getName() { return this.name; }
     setName(name) { this.name = name; }
   }

   // ✅ Good - business methods
   class User {
     updateName(name: string) {
       if (!name) throw new Error();
       this._name = name;
       this.touch();
     }
   }
   ```

5. **Don't mix layers**
   ```typescript
   // ❌ Bad - controller calling repository directly
   constructor(private userRepository: UserRepository) {}

   // ✅ Good - controller calling use case
   constructor(private createUserUseCase: CreateUserUseCase) {}
   ```

---

## TypeScript Configuration Notes

### Important tsconfig Settings

```json
{
  "compilerOptions": {
    "isolatedModules": true,          // Required for NestJS
    "emitDecoratorMetadata": true,     // Required for DI
    "experimentalDecorators": true,    // Required for decorators
  }
}
```

When using `isolatedModules` + `emitDecoratorMetadata`, you MUST use `import type` for interfaces in constructor parameters.

---

## Testing Strategy

### Unit Tests

**Domain Layer**:
- Test entity business methods
- Test value object validation
- No mocking needed (pure logic)

**Application Layer**:
- Test use cases
- Mock repositories
- Verify business workflows

**Infrastructure Layer**:
- Test repository implementations
- Use test database or in-memory

**Presentation Layer**:
- Test controllers
- Mock use cases
- Verify HTTP responses

### Example Test Structure
```typescript
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
      // ... other methods
    };

    useCase = new CreateUserUseCase(mockRepository);
  });

  it('should create user when email is unique', async () => {
    // Arrange
    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.save.mockResolvedValue(/* ... */);

    // Act
    const result = await useCase.execute({ name: 'John', email: 'john@example.com' });

    // Assert
    expect(result).toBeDefined();
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
```

---

## Common Patterns Reference

### 1. Injecting Repository with Symbol
```typescript
// Define symbol
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

// Module
{
  provide: USER_REPOSITORY,
  useClass: UserRepository,
}

// Use case
constructor(
  @Inject(USER_REPOSITORY)
  private readonly userRepository: IUserRepository,
) {}
```

### 2. DTO Mapping
```typescript
export class UserResponseDto {
  id: string;
  name: string;
  email: string;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email.value, // Extract value from Value Object
    };
  }
}
```

### 3. Global Error Handling
```typescript
// All exceptions are caught by HttpExceptionFilter
// Domain exceptions (DomainException) → 400 Bad Request
// Not found (EntityNotFoundException) → 404 Not Found
// Others → 500 Internal Server Error
```

### 4. Response Format
```typescript
// All responses are wrapped by TransformInterceptor
{
  "success": true,
  "data": { /* your data */ },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## API Endpoint Conventions

### REST Naming
- `POST /api/v1/users` - Create
- `GET /api/v1/users` - Get all
- `GET /api/v1/users/:id` - Get one
- `PUT /api/v1/users/:id` - Update (full)
- `PATCH /api/v1/users/:id` - Update (partial)
- `DELETE /api/v1/users/:id` - Delete
- `PATCH /api/v1/users/:id/activate` - Custom action

### Swagger Documentation
```typescript
@ApiTags('users')              // Group endpoints
@ApiOperation({ summary: '' }) // Describe endpoint
@ApiResponse({ status: 200 })  // Document responses
```

---

## Environment Configuration

### .env Structure
```env
# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=*

# Database (when adding)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=dbname
# DB_USER=user
# DB_PASSWORD=password
```

### Accessing Config
```typescript
constructor(private configService: ConfigService) {}

const port = this.configService.get<number>('PORT');
```

---

## Quick Reference for AI Agents

### When Adding New Features, Ask:

1. **Which layer does this belong to?**
   - Business rule? → Domain Layer
   - Use case orchestration? → Application Layer
   - Database/API? → Infrastructure Layer
   - HTTP endpoint? → Presentation Layer

2. **Does this need a new entity or value object?**
   - Has identity? → Entity
   - Immutable value? → Value Object
   - Just data transfer? → DTO

3. **Is this a new use case?**
   - User action? → Create new use case
   - Part of existing action? → Add to existing use case

4. **What dependencies are needed?**
   - Repository? → Inject interface, not implementation
   - Other services? → Inject via DI

### File Naming Conventions

- Entities: `*.entity.ts`
- Value Objects: `*.vo.ts`
- Repositories (interface): `*-repository.interface.ts`
- Repositories (impl): `*.repository.ts`
- Use Cases: `*-*.use-case.ts` (e.g., `create-user.use-case.ts`)
- DTOs: `*.dto.ts`
- Controllers: `*.controller.ts`
- Modules: `*.module.ts`

---

## Summary for AI Agents

**This project follows strict layered architecture with DDD principles.**

**Key Points**:
1. Domain Layer is independent (no external dependencies)
2. Use cases orchestrate domain logic
3. Repositories hide data access details
4. Controllers are thin HTTP adapters
5. DTOs separate internal and external models
6. Dependency injection everywhere
7. Type imports for interfaces in constructors

**When in doubt**:
- Business logic → Domain Layer
- Workflow → Application Layer
- I/O → Infrastructure Layer
- HTTP → Presentation Layer

---

**Last Updated**: 2024-12-14
**Project**: Mobok Call Server
**Architecture**: DDD + Clean Architecture + NestJS
