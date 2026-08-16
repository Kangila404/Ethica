import { FollowupAnswer } from "src/question/domain/model/followup-answer.entity";

export class SubmitStageTwoResponse {
  explanation!: string | null;

  static from(followupAnswer: FollowupAnswer): SubmitStageTwoResponse {
    const res = new SubmitStageTwoResponse();
    res.explanation = followupAnswer.explanation;
    return res;
  }
}