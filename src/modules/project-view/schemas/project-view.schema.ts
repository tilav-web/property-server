import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectViewDocument = Document & ProjectView;

@Schema({ timestamps: false })
export class ProjectView {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  // Auth user uchun userId, anonim uchun SHA256(IP)
  @Prop({ type: String, required: true })
  viewerId: string;

  @Prop({ type: Date, default: () => new Date() })
  viewedAt: Date;
}

export const ProjectViewSchema = SchemaFactory.createForClass(ProjectView);

// Bir user/IP 30 kun ichida bir marta hisoblanadi
ProjectViewSchema.index({ projectId: 1, viewerId: 1 }, { unique: true });
// 30 kundan keyin avtomatik o'chadi
ProjectViewSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 2592000 });
