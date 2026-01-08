import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { InquiryResponseService } from '../services/inquiry-response.service';
import { CreateInquiryResponseDto } from '../dto/create-inquiry-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { type IRequestCustom } from 'src/interfaces/custom-request.interface';

@Controller('inquiry-responses')
export class InquiryResponseController {
  constructor(
    private readonly inquiryResponseService: InquiryResponseService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(
    @Body() createInquiryResponseDto: CreateInquiryResponseDto,
    @Req() req: IRequestCustom,
  ) {
    return this.inquiryResponseService.create(
      createInquiryResponseDto,
      req.user?._id as string,
    );
  }
}
