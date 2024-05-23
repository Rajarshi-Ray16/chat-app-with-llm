// backend/utils/llmAPI.js
const axios = require('axios');

const generateLLMResponse = async (prompt) => {
  const url = process.env.LLM_API_URL;
  const apiKey = process.env.LLM_API_KEY;

  try {
    const response = await axios.post(
      url,
      {
        prompt: prompt,
        max_tokens: 150,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );
    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error generating response from LLM:', error);
    return 'The user is currently busy and cannot respond right now.';
  }
};

module.exports = { generateLLMResponse };
