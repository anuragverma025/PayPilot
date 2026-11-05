import { AIService } from '../services/ai.service.js';
import { chatRequestSchema } from '../validators/assistant.validator.js';

export const chatWithAssistant = async (req, res, next) => {
  try {
    const { message, forceRecommend, conversationHistory, previousRequirements } =
      chatRequestSchema.parse(req.body);

    const decisionReport = await AIService.processShoppingRequest(message, {
      forceRecommend,
      conversationHistory,
      previousRequirements
    });

    res.status(200).json({
      success: true,
      data: decisionReport
    });
  } catch (error) {
    next(error);
  }
};
