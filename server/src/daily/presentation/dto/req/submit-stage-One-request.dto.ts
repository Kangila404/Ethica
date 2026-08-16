import { ApiProperty } from "@nestjs/swagger";

export class SubmitStageOneRequest {
    @ApiProperty({example : 201})
    questionId!:string;

    @ApiProperty({example : 2001})
    answerId!:string;    
}