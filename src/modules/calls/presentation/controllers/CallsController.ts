import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { InitiateCallUseCase } from '../../application/use-cases/InitiateCall.use-case';
import { ConnectCallUseCase } from '../../application/use-cases/ConnectCall.use-case';
import { EndCallUseCase } from '../../application/use-cases/EndCall.use-case';
import { GetCallUseCase } from '../../application/use-cases/GetCall.use-case';
import { ProcessAIConversationUseCase } from '../../application/use-cases/ProcessAIConversation.use-case';
import { WebRTCConfigService } from '../../application/services/WebRTCConfigService';
import { InitiateCallRequestDto } from '../../application/dto/request/InitiateCallRequest.dto';
import { ProcessAudioRequestDto } from '../../application/dto/request/ProcessAudioRequest.dto';
import { CallResponseDto } from '../../application/dto/response/CallResponse.dto';
import { AIConversationResponseDto } from '../../application/dto/response/AIConversationResponse.dto';
import { WebRTCConfigResponseDto } from '../../application/dto/response/WebRTCConfigResponse.dto';

/**
 * Calls Controller
 *
 * @description
 * - WebRTC 기반 통화 관리 API
 * - ChatGPT AI 대화 처리
 * - 통화 시작, 연결, 종료
 */
@ApiTags('calls')
@Controller('calls')
export class CallsController {
  constructor(
    private readonly initiateCallUseCase: InitiateCallUseCase,
    private readonly connectCallUseCase: ConnectCallUseCase,
    private readonly endCallUseCase: EndCallUseCase,
    private readonly getCallUseCase: GetCallUseCase,
    private readonly processAIConversationUseCase: ProcessAIConversationUseCase,
    private readonly webrtcConfigService: WebRTCConfigService,
  ) {}

  /**
   * WebRTC 설정 가져오기
   *
   * @returns WebRTC ICE 서버 설정 (Google STUN 서버)
   */
  @Get('config')
  @ApiOperation({
    summary: 'WebRTC 설정 조회',
    description: '클라이언트에서 사용할 WebRTC 설정을 반환합니다 (Google STUN 서버)',
  })
  @ApiResponse({
    status: 200,
    description: 'WebRTC 설정 조회 성공',
    type: WebRTCConfigResponseDto,
  })
  getWebRTCConfig(): { config: WebRTCConfigResponseDto } {
    const config = this.webrtcConfigService.getWebRTCConfiguration();
    return { config: config as WebRTCConfigResponseDto };
  }

  /**
   * 통화 시작
   *
   * @param request - 통화 시작 요청 데이터
   * @returns 생성된 통화 정보 (WebRTC 세션 ID 포함)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '통화 시작',
    description: 'WebRTC 세션을 생성하고 통화를 시작합니다',
  })
  @ApiResponse({
    status: 201,
    description: '통화가 성공적으로 시작됨',
    type: CallResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '이미 진행 중인 통화가 있음',
  })
  async initiateCall(
    @Body() request: InitiateCallRequestDto,
  ): Promise<{ call: CallResponseDto }> {
    const call = await this.initiateCallUseCase.execute(request);
    return { call };
  }

  /**
   * 통화 연결
   *
   * @param id - 통화 ID
   * @returns 연결된 통화 정보
   */
  @Post(':id/connect')
  @ApiOperation({
    summary: '통화 연결',
    description: '대기 중인 통화를 연결하고 대화를 시작합니다',
  })
  @ApiParam({
    name: 'id',
    description: '통화 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: '통화 연결 성공',
    type: CallResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '통화를 찾을 수 없음',
  })
  async connectCall(
    @Param('id') id: string,
  ): Promise<{ call: CallResponseDto }> {
    const call = await this.connectCallUseCase.execute({ callId: id });
    return { call };
  }

  /**
   * 통화 종료
   *
   * @param id - 통화 ID
   * @returns 종료된 통화 정보
   */
  @Post(':id/end')
  @ApiOperation({
    summary: '통화 종료',
    description: '진행 중인 통화를 종료합니다',
  })
  @ApiParam({
    name: 'id',
    description: '통화 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: '통화 종료 성공',
    type: CallResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '통화를 찾을 수 없음',
  })
  async endCall(@Param('id') id: string): Promise<{ call: CallResponseDto }> {
    const call = await this.endCallUseCase.execute({ callId: id });
    return { call };
  }

  /**
   * 통화 정보 조회
   *
   * @param id - 통화 ID
   * @returns 통화 정보
   */
  @Get(':id')
  @ApiOperation({
    summary: '통화 정보 조회',
    description: '통화 ID로 통화 정보를 조회합니다',
  })
  @ApiParam({
    name: 'id',
    description: '통화 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: '통화 조회 성공',
    type: CallResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '통화를 찾을 수 없음',
  })
  async getCall(@Param('id') id: string): Promise<{ call: CallResponseDto }> {
    const call = await this.getCallUseCase.execute(id);
    return { call };
  }

  /**
   * AI 대화 처리
   *
   * @param file - 오디오 파일 (WebM, MP3, WAV 등)
   * @param body - 요청 데이터 (callId, systemPrompt)
   * @returns AI 응답 (텍스트 및 오디오)
   */
  @Post('conversation/process')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'AI 대화 처리',
    description:
      '사용자 음성을 텍스트로 변환하고, ChatGPT로 응답을 생성하며, 음성으로 변환합니다',
  })
  @ApiResponse({
    status: 200,
    description: 'AI 대화 처리 성공',
    type: AIConversationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '통화를 찾을 수 없음',
  })
  @ApiResponse({
    status: 503,
    description: 'AI 서비스를 사용할 수 없음',
  })
  async processAIConversation(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: ProcessAudioRequestDto,
  ): Promise<{
    conversation: AIConversationResponseDto;
    audioUrl: string;
  }> {
    const result = await this.processAIConversationUseCase.execute({
      callId: body.callId,
      audioBuffer: file.buffer,
      systemPrompt: body.systemPrompt,
    });

    // In production, upload audioBuffer to cloud storage and return URL
    // For now, we'll return a base64 encoded audio
    const audioBase64 = result.audioBuffer.toString('base64');

    const conversation: AIConversationResponseDto = {
      userMessage: result.userMessage,
      aiResponse: result.aiResponse,
      sentiment: result.sentiment,
      timestamp: new Date().toISOString(),
    };

    return {
      conversation,
      audioUrl: `data:audio/mp3;base64,${audioBase64}`,
    };
  }
}
