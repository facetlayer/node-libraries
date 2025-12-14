import Anthropic from '@anthropic-ai/sdk';

/**
 * Creates an Anthropic client using the ANTHROPIC_API_KEY environment variable.
 */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set.\n\n' +
      'To get an API key:\n' +
      '1. Go to https://console.anthropic.com/\n' +
      '2. Create an API key\n' +
      '3. Set it in your environment:\n' +
      '   export ANTHROPIC_API_KEY="your-api-key-here"\n'
    );
  }

  return new Anthropic({ apiKey });
}
