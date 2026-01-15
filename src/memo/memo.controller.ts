import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { MemoService } from './memo.service';
import { CreateMemoDto } from './dto/create-memo.dto';
import { UpdateMemoDto } from './dto/update-memo.dto';
import { AssignMemoDto } from './dto/assign-memo.dto';

// import { MemoStatus } from './entities/memo-status.enum';
// import { MemoActionType } from './entities/memo-action-type.enum';

@Controller('memos')
export class MemoController {
  constructor(private readonly memoService: MemoService) {}
  
  @Post()
  async create(@Body() createMemoDto: CreateMemoDto) {
    return await this.memoService.createMemo(createMemoDto);
  }
  
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMemoDto: UpdateMemoDto,
    @Query('userId') userId: string,
  ) {
    return await this.memoService.updateMemo(id, updateMemoDto, userId);
  }
  
  @Post(':id/assign')
  async assign(
    @Param('id') id: string,
    @Body() assignMemoDto: AssignMemoDto,
  ) {
    return await this.memoService.assignMemo(id, assignMemoDto);
  }
  
  @Put(':id/status')
  async changeStatus(
    @Param('id') id: string,
    @Body('status') status: MemoStatus,
    @Query('userId') userId: string,
  ) {
    return await this.memoService.changeStatus(id, status, userId);
  }
  
  @Get(':id')
  async getCurrent(@Param('id') id: string) {
    return await this.memoService.getCurrentMemo(id);
  }
  
  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return await this.memoService.getMemoHistory(id);
  }
  
  @Get(':id/version/:version')
  async getVersion(
    @Param('id') id: string,
    @Param('version') version: number,
  ) {
    return await this.memoService.getMemoAtVersion(id, +version);
  }
  
  @Get(':id/path')
  async getRevisionPath(
    @Param('id') id: string,
    @Query('fromVersion') fromVersion?: number,
  ) {
    return await this.memoService.getRevisionPath(id, fromVersion ? +fromVersion : undefined);
  }
  
  @Get('user/:userId')
  async getUserMemos(@Param('userId') userId: string) {
    return await this.memoService.getUserMemos(userId);
  }
  
  // ============================================
  // Git-like Checkout Endpoints
  // ============================================
  
  @Get(':id/checkout/latest')
  async checkoutLatest(@Param('id') id: string) {
    return await this.memoService.checkoutLatest(id);
  }
  
  @Get(':id/checkout/root')
  async checkoutRoot(@Param('id') id: string) {
    return await this.memoService.checkoutRoot(id);
  }
  
  @Get(':id/checkout/version/:version')
  async checkoutVersion(
    @Param('id') id: string,
    @Param('version') version: number,
  ) {
    return await this.memoService.checkoutVersion(id, +version);
  }
  
  @Get(':id/checkout/node/:nodeId')
  async checkoutNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
  ) {
    return await this.memoService.checkoutNode(id, nodeId);
  }
  
  @Get(':id/checkout/timestamp')
  async checkoutByTimestamp(
    @Param('id') id: string,
    @Query('timestamp') timestamp: string,
  ) {
    return await this.memoService.checkoutByTimestamp(id, new Date(timestamp));
  }
  
  @Get(':id/checkout/action/:actionType')
  async checkoutByAction(
    @Param('id') id: string,
    @Param('actionType') actionType: MemoActionType,
  ) {
    return await this.memoService.checkoutByAction(id, actionType);
  }
  
  @Get(':id/navigate/next/:nodeId')
  async navigateNext(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
  ) {
    return await this.memoService.navigateNext(id, nodeId);
  }
  
  @Get(':id/navigate/previous/:nodeId')
  async navigatePrevious(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
  ) {
    return await this.memoService.navigatePrevious(id, nodeId);
  }
  
  @Get(':id/timeline')
  async getTimeline(@Param('id') id: string) {
    return await this.memoService.getTimelineView(id);
  }
  
  @Get(':id/compare')
  async compareVersions(
    @Param('id') id: string,
    @Query('versionA') versionA: number,
    @Query('versionB') versionB: number,
  ) {
    return await this.memoService.compareVersions(id, +versionA, +versionB);
  }
}
