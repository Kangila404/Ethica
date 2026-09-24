import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ArchiveListResponse } from "../presentation/dto/res/archive.response.dto";
import { ArchiveDetailResponse } from "../presentation/dto/res/archive-detail-response.dto";
import { User } from "src/user/domain/model/user.entity";
import { USER_REPOSITORY, type UserRepository } from "src/user/domain/repository/user.repository";
import { USER_ANSWER_REPOSITORY, type UserAnswerRepository } from "../domain/repository/user-answer.repository";
import { QUESTION_REPOSITORY, type QuestionRepository } from "src/question/domain/repository/question.repository";
import { ANSWER_REPOSITORY, type AnswerRepository } from "src/question/domain/repository/answer.repository";
import { UserStatus } from "src/user/domain/enum/user-status.enum";
import {
    FOLLOWUP_ANSWER_REPOSITORY,
    type FollowupAnswerRepository,
} from "src/question/domain/repository/followup-answer.repository";
import {
    USER_FOLLOWUP_ANSWER_REPOSITORY,
    type UserFollowupAnswerRepository,
} from "../domain/repository/user-followup-answer.repository";

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
        private readonly questionRepository:QuestionRepository,
        @Inject(FOLLOWUP_ANSWER_REPOSITORY)
        private readonly followupAnswerRepository: FollowupAnswerRepository,
        @Inject(USER_FOLLOWUP_ANSWER_REPOSITORY)
        private readonly userFollowupAnswerRepository: UserFollowupAnswerRepository,
    ){}

    async getUserAnswers(userId:string):Promise<ArchiveListResponse>{
        const user = await this.findUserByUserId(userId);
        this.validateUserStatus(user);
        const userAnswers = await this.userAnswerRepository.findByUserId(user.id, false);
       
        const answerIds = userAnswers.map((userAnswer) => userAnswer.answerId);

        const answers = await this.answerRepository.findByIds(answerIds);
        
        const questionIds = [...new Set(answers.map((answer) => answer.questionId))];
        const questions = await this.questionRepository.findByIds(questionIds);

        const answersById = new Map(answers.map((answer) => [answer.id, answer]));
        const questionsById = new Map(
            questions.map((question) => [question.id, question]),
        );

        const items = userAnswers.map((userAnswer) => {
                const answer = answersById.get(userAnswer.answerId);
                if(!answer){
                    throw new NotFoundException('선택지를 찾을 수 없습니다.');
                }

                const question = questionsById.get(answer.questionId);
                if(!question){
                    throw new NotFoundException('질문을 찾을 수 없습니다.');
                }

                return {
                    userAnswerId : userAnswer.id,
                    serviceDate : userAnswer.answeredAt.toLocaleDateString('en-CA',{timeZone: 'Asia/Seoul'}),
                    questionPreview : question.stage1Body,
                };
            });

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

        const userFollowupAnswers =
            await this.userFollowupAnswerRepository.findAllByUserId(user.id);
        const followupAnswerIds = userFollowupAnswers
            .filter((userFollowupAnswer) => !userFollowupAnswer.isOnboarding)
            .map((userFollowupAnswer) => userFollowupAnswer.followupAnswerId);

        const followupAnswers = followupAnswerIds.length
            ? await this.followupAnswerRepository.findByIds(followupAnswerIds)
            : [];
        const followupAnswer = followupAnswers.find(
            (candidate) => candidate.questionId === question.id,
        ) ?? null;

        return ArchiveDetailResponse.of(
            userAnswer,
            question,
            answer,
            followupAnswer,
        );
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
