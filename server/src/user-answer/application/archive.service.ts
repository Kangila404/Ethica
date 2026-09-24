import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ArchiveListResponse } from "../presentation/dto/res/archive.response.dto";
import { ArchiveDetailResponse } from "../presentation/dto/res/archive-detail-response.dto";
import { User } from "src/user/domain/model/user.entity";
import { USER_REPOSITORY, type UserRepository } from "src/user/domain/repository/user.repository";
import { USER_ANSWER_REPOSITORY, type UserAnswerRepository } from "../domain/repository/user-answer.repository";
import { QUESTION_REPOSITORY, type QuestionRepository } from "src/question/domain/repository/question.repository";
import { ANSWER_REPOSITORY, type AnswerRepository } from "src/question/domain/repository/answer.repository";
import { UserStatus } from "src/user/domain/enum/user-status.enum";

@Injectable()
export class ArchiveService {

    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository:UserRepository,
        @Inject(USER_ANSWER_REPOSITORY)
        private readonly userAnswerRepository:UserAnswerRepository,
        @Inject(ANSWER_REPOSITORY)
        private readonly answerRepository:AnswerRepository,
        @Inject(QUESTION_REPOSITORY)
        private readonly questionRepository:QuestionRepository
    ){}

    async getUserAnswers(userId:string):Promise<ArchiveListResponse>{
        const user = await this.findUserByUserId(userId);
        this.validateUserStatus(user);
        const userAnswers = await this.userAnswerRepository.findByUserId(user.id, false);
        
        const items = await Promise.all(
            userAnswers.map(async (userAnswer) => {
                const answer = await  this.answerRepository.findById(userAnswer.answerId);
                if(!answer){
                    throw new NotFoundException('선택지를 찾을 수 없습니다.');
                }

                const question = await this.questionRepository.findById(answer.questionId);
                if(!question){
                    throw new NotFoundException('질문을 찾을 수 없습니다.');
                }

                return {
                    userAnswerId : userAnswer.id,
                    serviceDate : userAnswer.answeredAt.toLocaleDateString('en-CA',{timeZone: 'Asia/Seoul'}),
                    questionPreview : question.stage1Body,
                };
            })
        )

        return ArchiveListResponse.of(items);
        
    }

    async getUserAnswer(userId:string, userAnswerId:string):Promise<ArchiveDetailResponse>{
        const user = await this.findUserByUserId(userId);
        this.validateUserStatus(user);

        const userAnswer = await this.userAnswerRepository.findByIdAndUserId(userAnswerId, user.id);

        if(!userAnswer){
            throw new NotFoundException('답변 기록을 찾을 수 없습니다.');
        }

        if (userAnswer.isOnboarding) {
            throw new NotFoundException('답변 기록을 찾을 수 없습니다.');
        }

        const answer = await this.answerRepository.findById(userAnswer.answerId);
        if(!answer){
            throw new NotFoundException('선택지를 찾을 수 없습니다.');
        }

        const question = await this.questionRepository.findById(answer.questionId);
        if (!question) {
            throw new NotFoundException('질문을 찾을 수 없습니다.');
        }

        return ArchiveDetailResponse.of(userAnswer, question, answer);
    }


    // ============== 메서드 모음 ============== //
    // 1. user 조회
    private async findUserByUserId(userId:string):Promise<User>{
        const user = await this.userRepository.findByUserId(userId);
        if(!user){
            throw new NotFoundException('유저를 찾을 수 없습니다.');
        }
        return user;
    }

    // 2. 유저 상태 검증
    private validateUserStatus(user:User):void{
        if(user.userStatus !== UserStatus.ACTIVE){
            throw new ForbiddenException('정지된 계정입니다.');
        }
    }

}