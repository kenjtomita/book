import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const config = {
  api: {
    bodySize: '10mb',
  },
};

export default async function handler(req, res) {
  console.log('=== Process Image API Called ===');
  console.log('Request method:', req.method);
  console.log('OpenAI API Key configured:', !!process.env.OPENAI_API_KEY);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      console.error('No imageUrl provided in request');
      return res.status(400).json({ error: 'No imageUrl provided' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      return res.status(500).json({ error: 'OpenAI API key is not configured' });
    }

    // Validate the image URL
    try {
      console.log('Validating image URL:', imageUrl);
      new URL(imageUrl);
    } catch (e) {
      console.error('Invalid image URL provided:', e.message);
      return res.status(400).json({ error: 'Invalid image URL provided' });
    }

    console.log('Making OpenAI API request...');
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "This is a book cover. Please extract the book title and author. Return ONLY a JSON object with 'title' and 'author' fields. If you can't find either, return empty strings for those fields." 
            },
            {
              type: "image_url",
              image_url: imageUrl,
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    console.log('OpenAI API response received:', response.choices[0].message.content);

    try {
      // Parse the response text as JSON
      const result = JSON.parse(response.choices[0].message.content);
      console.log('Successfully parsed response as JSON:', result);
      return res.status(200).json({
        title: result.title || '',
        author: result.author || ''
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError.message);
      console.error('Raw response content:', response.choices[0].message.content);
      // If parsing fails, try to extract information from the raw text
      const text = response.choices[0].message.content;
      const titleMatch = text.match(/"title":\s*"([^"]+)"/);
      const authorMatch = text.match(/"author":\s*"([^"]+)"/);
      
      const extractedData = {
        title: titleMatch ? titleMatch[1] : '',
        author: authorMatch ? authorMatch[1] : ''
      };
      console.log('Extracted data from raw text:', extractedData);
      return res.status(200).json(extractedData);
    }
  } catch (error) {
    console.error('=== Error in process-image API ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.response) {
      console.error('OpenAI API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    // Check for specific OpenAI API errors
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        error: 'OpenAI API authentication failed',
        message: 'Please check your API key configuration'
      });
    }
    
    return res.status(500).json({ 
      error: 'Error processing image',
      message: error.message,
      details: error.response?.data || error.toString()
    });
  }
} 