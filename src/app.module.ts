import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { CallsModule } from './modules/calls/Calls.module';
import { WelfareServicesModule } from './modules/welfare-services/WelfareServices.module';
import { ChatModule } from './modules/chat/Chat.module';
import { LoggerService } from './infrastructure/logging/logger.service';

/**
 * Root Application Module
 * DDD 기반 아키텍처로 구성
 */
@Module({
  imports: [
    // Global Configuration
    // main.ts에서 이미 dotenv를 로드했으므로 process.env 사용
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true, // main.ts에서 이미 로드함
      cache: true,
      expandVariables: true,
    }),
    // TypeORM Configuration - ConfigModule 로드 후 실행
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // 환경변수 확인
        const dbHost = configService.get<string>('DB_HOST');
        const dbPort = configService.get<string>('DB_PORT');
        const dbUser = configService.get<string>('DB_USER');
        const dbPassword = configService.get<string>('DB_PASSWORD');
        const dbName = configService.get<string>('DB_NAME');

        console.log('[ConfigService] Environment variables loaded:', {
          DB_HOST: dbHost || 'UNDEFINED',
          DB_PORT: dbPort || 'UNDEFINED',
          DB_USER: dbUser || 'UNDEFINED',
          DB_NAME: dbName || 'UNDEFINED',
          DB_PASSWORD: dbPassword ? '***' : 'UNDEFINED',
        });

        // 필수 DB 설정 값 검증
        if (!dbHost || !dbPort || !dbUser || !dbName) {
          console.error('[TypeORM] Database configuration is incomplete. DB features will be disabled.');
          console.error('[TypeORM] Missing values:', {
            DB_HOST: !dbHost,
            DB_PORT: !dbPort,
            DB_USER: !dbUser,
            DB_NAME: !dbName,
          });

          // DB 설정이 없으면 autoLoadEntities를 false로 설정하여 연결 시도 안 함
          return {
            type: 'mysql' as const,
            autoLoadEntities: false,
            // 더미 설정 (연결 시도하지 않음)
            host: 'localhost',
            port: 3306,
            username: 'dummy',
            password: 'dummy',
            database: 'dummy',
            entities: [],
          };
        }

        const dbConfig = {
          type: 'mysql' as const,
          host: dbHost,
          port: parseInt(dbPort, 10),
          username: dbUser,
          password: dbPassword,
          database: dbName,
          entities: [__dirname + '/**/*.entity{.ts,.js}', __dirname + '/**/persistence/*Entity{.ts,.js}'],
          autoLoadEntities: true, // forFeature()로 등록된 엔티티 자동 로드
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          logging: true,
          logger: 'advanced-console' as const,
          connectTimeout: 10000,
          acquireTimeout: 10000,
          timeout: 10000,
          // 재시도 설정 추가
          retryAttempts: 3,  // 3회만 재시도
          retryDelay: 3000,  // 3초 간격
          extra: {
            connectionLimit: 5,
            connectTimeout: 10000,
            waitForConnections: true,
            queueLimit: 0,
          },
        };

        console.log('[TypeORM] Attempting to connect with config:', {
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          database: dbConfig.database,
        });

        return dbConfig;
      },
    }),
    // Domain Modules
    UsersModule,
    HealthModule,
    CallsModule,
    WelfareServicesModule,
    ChatModule,
  ],
  providers: [LoggerService],
})
export class AppModule {}
