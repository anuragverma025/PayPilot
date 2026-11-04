import { AIService } from '../services/ai.service.js';
import { chatRequestSchema } from '../validators/assistant.validator.js';

export const chatWithAssistant = async (req, res, next) => {
  try {
    const { message, forceRecommend } = chatRequestSchema.parse(req.body);
    const decisionReport = await AIService.processShoppingRequest(message, { forceRecommend });

    res.status(200).json({
      success: true,
      data: decisionReport
    });
  } catch (error) {
    next(error);
  }
};
